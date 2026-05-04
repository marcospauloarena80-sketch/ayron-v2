import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface TranscriptSegment {
  speaker: 'doctor' | 'patient' | 'companion';
  text: string;
}

export interface ClinicalExtraction {
  queixa_principal: string;
  sintomas: string[];
  medicamentos_mencionados: string[];
  padroes: {
    sono?: string;
    intestino?: string;
    atividade_fisica?: string;
    libido?: string;
  };
  pendencias: string[];
}

const CHECKLIST = ['sono', 'intestino', 'atividade_fisica', 'alergias', 'medicamentos', 'libido'];

@Injectable()
export class AiTranscriptionService {
  private readonly logger = new Logger(AiTranscriptionService.name);
  private readonly client: OpenAI | null;

  constructor(private config: ConfigService) {
    const key = config.get<string>('OPENAI_API_KEY');
    this.client = key ? new OpenAI({ apiKey: key }) : null;
    if (!key) this.logger.warn('OPENAI_API_KEY not set — using mock transcription');
  }

  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    if (!this.client) return this.mockTranscription();

    try {
      const blob = new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/webm' });
      const file = new File([blob], filename, { type: 'audio/webm' });
      const resp = await this.client.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: 'pt',
        response_format: 'text',
      });
      return resp as unknown as string;
    } catch (err) {
      this.logger.error('Whisper error', err);
      return this.mockTranscription();
    }
  }

  async diarizeAndClassify(rawText: string): Promise<{ segments: TranscriptSegment[] }> {
    if (!this.client) return this.mockDiarization(rawText);

    try {
      const chat = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente médico. Dado o texto de uma transcrição de consulta médica em português, separe as falas por papel: "doctor" (médico), "patient" (paciente), "companion" (acompanhante). Retorne JSON puro: { "segments": [{ "speaker": "doctor"|"patient"|"companion", "text": "..." }] }. Se não conseguir distinguir o papel, use "doctor" para quem faz perguntas e "patient" para quem responde.`,
          },
          { role: 'user', content: rawText },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      });
      const parsed = JSON.parse(chat.choices[0].message.content ?? '{}') as { segments?: TranscriptSegment[] };
      return { segments: parsed.segments ?? [] };
    } catch (err) {
      this.logger.error('Diarization error', err);
      return this.mockDiarization(rawText);
    }
  }

  async extractClinicalData(segments: TranscriptSegment[]): Promise<ClinicalExtraction> {
    if (!this.client) return this.mockExtraction();

    const fullText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');

    try {
      const chat = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente médico. Extraia informações clínicas da transcrição. Retorne JSON puro com campos: { "queixa_principal": "string", "sintomas": ["string"], "medicamentos_mencionados": ["string"], "padroes": { "sono": "string?", "intestino": "string?", "atividade_fisica": "string?", "libido": "string?" }, "pendencias": ["sono"|"intestino"|"atividade_fisica"|"alergias"|"medicamentos"|"libido"] }. "pendencias" = itens do checklist [${CHECKLIST.join(', ')}] NÃO mencionados na conversa.`,
          },
          { role: 'user', content: fullText },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      });
      return JSON.parse(chat.choices[0].message.content ?? '{}') as ClinicalExtraction;
    } catch (err) {
      this.logger.error('Extraction error', err);
      return this.mockExtraction();
    }
  }

  // ── Mocks (used when OPENAI_API_KEY not set) ────────────────────────────────

  private mockTranscription(): string {
    return 'Médico: Como a senhora está se sentindo desde a última consulta? Paciente: Melhorei bastante, reduzi quase 3 quilos. O apetite está mais controlado. Médico: Ótimo. E o sono? Paciente: Ainda irregular, durmo umas seis horas. Médico: Vamos manter o protocolo e solicitar novos exames.';
  }

  private mockDiarization(text: string): { segments: TranscriptSegment[] } {
    const sentences = text.split(/(?<=[.?!])\s+/);
    return {
      segments: sentences.map((s, i) => ({
        speaker: (i % 2 === 0 ? 'doctor' : 'patient') as TranscriptSegment['speaker'],
        text: s.trim(),
      })),
    };
  }

  private mockExtraction(): ClinicalExtraction {
    return {
      queixa_principal: 'Perda de peso progressiva com boa tolerância à medicação',
      sintomas: ['Apetite reduzido', 'Sono irregular'],
      medicamentos_mencionados: ['Mounjaro', 'Tirzepatida'],
      padroes: { sono: 'Irregular, ~6h/noite', atividade_fisica: 'Não mencionado' },
      pendencias: ['intestino', 'atividade_fisica', 'alergias', 'libido'],
    };
  }
}
