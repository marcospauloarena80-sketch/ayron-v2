export interface AyronContext {
  module: string;
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
  prontuarioId?: string;
  financialContext?: string;
  userId?: string;
  userRole?: string;
  clinicId?: string;
}

export interface AyronMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const MOCK_RESPONSES: Record<string, string[]> = {
  default: [
    'Entendido. Posso ajudar com informações do sistema AYRON.',
    'Analisando sua solicitação...',
    'Como posso te ajudar neste módulo?',
  ],
  patients: [
    'Posso ajudar com a busca de pacientes, histórico e protocolos.',
    'Para consultar prontuário, acesse o módulo Clínico.',
  ],
  agenda: [
    'Posso ajudar com agendamentos, disponibilidade e confirmações.',
    'Para agendar, clique em um horário vago na grade.',
  ],
  clinical: [
    'Posso ajudar com evoluções, receitas e exames.',
    'O prontuário atual está carregado no contexto.',
  ],
  financial: [
    'Posso ajudar com cobranças, pré-pagamentos e relatórios financeiros.',
  ],
};

function getMockResponse(context: AyronContext): string {
  const pool = MOCK_RESPONSES[context.module] ?? MOCK_RESPONSES.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function sendAyronMessage(
  message: string,
  history: AyronMessage[],
  context: AyronContext
): Promise<string> {
  try {
    const response = await fetch('/api/ayron/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, context }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.reply ?? getMockResponse(context);
  } catch {
    // Fallback mock — endpoint não disponível ainda
    await new Promise(r => setTimeout(r, 600));
    return getMockResponse(context);
  }
}
