// apps/web/src/components/clinical/consulta-ia-tab.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mic, MicOff, Brain, AlertTriangle, Sparkles,
  FileText, Pill, FlaskConical, ClipboardList, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TranscriptSegment {
  speaker: 'doctor' | 'patient' | 'companion';
  text: string;
}

interface ClinicalExtraction {
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

interface SessionData {
  id: string;
  transcript: { segments: TranscriptSegment[] } | null;
  structured_data: ClinicalExtraction | null;
  voice_file_url: string | null;
  summary_ai: string | null;
}

interface ConsultaIATabProps {
  patientId: string;
  patientName: string;
  patientSex?: 'M' | 'F';
  onFillEvolution: (data: { subjetivo: string; objetivo: string; avaliacao: string; plano: string }) => void;
  onFillAnamnese: (data: { queixa: string; habitos: string }) => void;
  onOpenReceita: () => void;
  onOpenExame: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PENDENCIA_LABELS: Record<string, string> = {
  sono: 'Qualidade do sono',
  intestino: 'Função intestinal',
  atividade_fisica: 'Atividade física',
  alergias: 'Alergias/intolerâncias',
  medicamentos: 'Medicamentos em uso',
  libido: 'Libido / vida sexual',
  ciclo_menstrual: 'Ciclo menstrual',
  metodo_contraceptivo: 'Método contraceptivo',
  queda_cabelo: 'Queda de cabelo',
  pele_unhas: 'Pele / unhas',
  efeitos_colaterais: 'Efeitos colaterais',
  antecedentes: 'Antecedentes ginecológicos/urológicos',
};

const CHECKLIST_BASE = ['sono', 'intestino', 'atividade_fisica', 'alergias', 'medicamentos', 'libido', 'queda_cabelo', 'pele_unhas', 'efeitos_colaterais'];
const CHECKLIST_FEMALE_EXTRA = ['ciclo_menstrual', 'metodo_contraceptivo', 'antecedentes'];

const SPEAKER_STYLES: Record<TranscriptSegment['speaker'], string> = {
  doctor: 'bg-primary/10 text-primary self-end ml-auto border border-primary/20',
  patient: 'bg-muted text-foreground self-start mr-auto border border-border',
  companion: 'bg-amber-50 text-amber-800 self-start mr-auto border border-amber-200',
};

const SPEAKER_LABELS: Record<TranscriptSegment['speaker'], string> = {
  doctor: 'Médico',
  patient: 'Paciente',
  companion: 'Acompanhante',
};

// ── Main Component ─────────────────────────────────────────────────────────────

export function ConsultaIATab({
  patientId,
  patientName: _patientName,
  patientSex,
  onFillEvolution,
  onFillAnamnese,
  onOpenReceita,
  onOpenExame,
}: ConsultaIATabProps) {
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch latest session if it exists
  const { data: session } = useQuery<SessionData | null>({
    queryKey: ['consultation-session', patientId],
    queryFn: () =>
      api.get(`/clinical/records/patient/${patientId}/latest-session`)
        .then(r => r.data)
        .catch(() => null),
    staleTime: 30_000,
    enabled: !sessionId,
  });

  const activeSession: SessionData | null = sessionId
    ? (qc.getQueryData(['consultation-session-detail', sessionId]) as SessionData ?? null)
    : session ?? null;

  const { data: sessionDetail } = useQuery<SessionData>({
    queryKey: ['consultation-session-detail', sessionId],
    queryFn: () => api.get(`/clinical/records/${sessionId}`).then(r => r.data),
    enabled: !!sessionId,
    refetchInterval: sessionId ? 5_000 : false,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionDetail?.transcript]);

  const transcribeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/clinical/records/${id}/transcribe`).then(r => r.data),
    onSuccess: (_: unknown, id: string) => {
      toast.success('Transcrição concluída');
      qc.invalidateQueries({ queryKey: ['consultation-session-detail', id] });
    },
    onError: () => toast.error('Erro na transcrição. Tente novamente.'),
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e: BlobEvent) => chunksRef.current.push(e.data);
      mr.onstop = () => stream.getTracks().forEach(t => t.stop());
      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
      toast.info('Gravando consulta...');
    } catch {
      toast.error('Microfone não autorizado. Verifique permissões do navegador.');
    }
  };

  const stopRecording = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.stop();
    setRecording(false);

    await new Promise(res => setTimeout(res, 200));

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    if (blob.size < 1000) {
      toast.error('Gravação muito curta. Tente novamente.');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('patient_id', patientId);
      form.append('audio', blob, 'consulta.webm');

      const createRes = await api.post('/clinical/records/upload-session', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newId: string = createRes.data.id;
      setSessionId(newId);
      transcribeMutation.mutate(newId);
      toast.success('Áudio enviado. Transcrevendo...');
    } catch {
      toast.error('Erro ao enviar áudio.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateEvolution = () => {
    const d = (sessionDetail ?? activeSession)?.structured_data;
    if (!d) { toast.error('Aguarde a extração clínica.'); return; }
    onFillEvolution({
      subjetivo: [d.queixa_principal, ...(d.sintomas ?? [])].filter(Boolean).join('. ') + '.',
      objetivo: '',
      avaliacao: d.medicamentos_mencionados?.length
        ? `Medicamentos mencionados: ${d.medicamentos_mencionados.join(', ')}.`
        : '',
      plano: '',
    });
  };

  const handleGenerateAnamnese = () => {
    const d = (sessionDetail ?? activeSession)?.structured_data;
    if (!d) { toast.error('Aguarde a extração clínica.'); return; }
    const habitos = Object.entries(d.padroes ?? {})
      .map(([k, v]) => `${PENDENCIA_LABELS[k] ?? k}: ${v}`)
      .join(' · ');
    onFillAnamnese({
      queixa: d.queixa_principal ?? '',
      habitos,
    });
  };

  const currentSession = sessionDetail ?? activeSession;
  const segments = currentSession?.transcript?.segments ?? [];
  const extraction = currentSession?.structured_data;
  const isProcessing = transcribeMutation.isPending || (!!sessionId && !sessionDetail?.transcript);

  return (
    <div className="space-y-4">
      {/* Recording controls */}
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Consulta IA — Captação Clínica
          </p>
          {recording && (
            <span className="text-xs text-red-500 animate-pulse font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
              Gravando...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={recording ? 'danger' : 'secondary'}
            size="sm"
            onClick={recording ? stopRecording : startRecording}
            disabled={uploading || isProcessing}
          >
            {recording
              ? <><MicOff className="h-3.5 w-3.5 mr-1.5" />Parar gravação</>
              : <><Mic className="h-3.5 w-3.5 mr-1.5" />Iniciar gravação</>
            }
          </Button>

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Transcrevendo e analisando...</span>
            </div>
          )}
        </div>

        {!recording && !uploading && !isProcessing && !currentSession && (
          <p className="text-xs text-muted-foreground mt-2">
            Grave a consulta para transcrição automática, extração clínica e sugestões de evolução.
          </p>
        )}
      </div>

      {/* Transcript — diarized bubbles */}
      {segments.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Transcrição da Consulta
          </p>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {segments.map((seg, i) => (
              <div key={i} className={cn('max-w-[80%] rounded-xl px-3 py-2', SPEAKER_STYLES[seg.speaker])}>
                <p className="text-[10px] font-bold mb-0.5 opacity-60 uppercase tracking-wide">
                  {SPEAKER_LABELS[seg.speaker]}
                </p>
                <p className="text-xs leading-relaxed">{seg.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* Clinical extraction */}
      {extraction && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-primary" />
            Extração Clínica — AYRON
          </p>

          {extraction.queixa_principal && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Queixa Principal</p>
              <p className="text-sm">{extraction.queixa_principal}</p>
            </div>
          )}

          {extraction.sintomas?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Sintomas</p>
              <div className="flex flex-wrap gap-1.5">
                {extraction.sintomas.map((s, i) => (
                  <span key={i} className="text-[11px] bg-muted px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {extraction.medicamentos_mencionados?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Medicamentos mencionados</p>
              <div className="flex flex-wrap gap-1.5">
                {extraction.medicamentos_mencionados.map((m, i) => (
                  <span key={i} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          )}

          {(() => {
            const checklist = patientSex === 'F'
              ? [...CHECKLIST_BASE, ...CHECKLIST_FEMALE_EXTRA]
              : CHECKLIST_BASE;
            const coveredInPatterns = Object.keys(extraction.padroes ?? {}).filter(
              k => !!(extraction.padroes as Record<string, string | undefined>)[k]
            );
            const backendPending = extraction.pendencias ?? [];
            const extraMissed = checklist.filter(
              item => !backendPending.includes(item) && !coveredInPatterns.includes(item)
            );
            const effectivePending = [...new Set([...backendPending, ...extraMissed])];
            if (effectivePending.length === 0) return null;
            return (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-[10px] font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Checklist clínico — itens não abordados ({effectivePending.length})
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {effectivePending.map((p, i) => (
                    <p key={i} className="text-xs text-amber-700">⚠️ {PENDENCIA_LABELS[p] ?? p}</p>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Action buttons */}
      {(segments.length > 0 || extraction) && (
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Ações Automáticas
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="secondary" size="sm" onClick={handleGenerateEvolution} className="flex-col h-auto py-3 gap-1">
              <FileText className="h-4 w-4" />
              <span className="text-[11px]">Gerar Evolução</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={handleGenerateAnamnese} className="flex-col h-auto py-3 gap-1">
              <ClipboardList className="h-4 w-4" />
              <span className="text-[11px]">Gerar Anamnese</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={onOpenReceita} className="flex-col h-auto py-3 gap-1">
              <Pill className="h-4 w-4" />
              <span className="text-[11px]">Sugerir Receita</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={onOpenExame} className="flex-col h-auto py-3 gap-1">
              <FlaskConical className="h-4 w-4" />
              <span className="text-[11px]">Sugerir Exames</span>
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Nenhum dado é salvo automaticamente — médico valida antes de confirmar.
          </p>
        </div>
      )}
    </div>
  );
}
