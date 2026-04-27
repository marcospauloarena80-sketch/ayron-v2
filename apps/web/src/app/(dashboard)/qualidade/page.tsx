'use client';

import { useState, useMemo } from 'react';
import {
  Star, Send, AlertTriangle, CheckCircle2, MessageSquare,
  ThumbsUp, ThumbsDown, Plus, X, Phone, Mail, Filter,
  TrendingUp, TrendingDown, Minus, ChevronDown, Bell,
  ClipboardList, User, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────────────

type TriggerMoment = 'consulta' | 'procedimento' | 'protocolo' | 'financeiro';
type SendChannel = 'whatsapp' | 'email' | 'ambos';
type SurveyStatus = 'enviada' | 'respondida' | 'pendente' | 'expirada';

interface SurveyResponse {
  id: string;
  patientName: string;
  patientId: string;
  responsible: string;
  moment: TriggerMoment;
  channel: SendChannel;
  sentAt: string;
  respondedAt?: string;
  status: SurveyStatus;
  score?: number;       // 0-10 NPS
  comment?: string;
  category?: string;
  alertCreated?: boolean;
  taskCreated?: boolean;
}

interface SurveyConfig {
  moments: TriggerMoment[];
  channels: SendChannel;
  alertThreshold: number;
  autoTask: boolean;
  delayMinutes: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_RESPONSES: SurveyResponse[] = [
  { id: 's1', patientName: 'Ana Lima', patientId: 'p1', responsible: 'Dra. Sarah', moment: 'consulta', channel: 'whatsapp', sentAt: '2026-04-20 10:30', respondedAt: '2026-04-20 11:15', status: 'respondida', score: 9, comment: 'Atendimento excelente! Muito satisfeita.', category: 'Elogio' },
  { id: 's2', patientName: 'Carlos Mendes', patientId: 'p2', responsible: 'Dr. Paulo', moment: 'procedimento', channel: 'email', sentAt: '2026-04-20 14:00', respondedAt: '2026-04-20 16:30', status: 'respondida', score: 3, comment: 'Esperei muito tempo, fui mal informado sobre o procedimento.', category: 'Reclamação', alertCreated: true, taskCreated: true },
  { id: 's3', patientName: 'Maria Souza', patientId: 'p3', responsible: 'Dra. Sarah', moment: 'consulta', channel: 'whatsapp', sentAt: '2026-04-21 09:00', respondedAt: '2026-04-21 09:45', status: 'respondida', score: 10, comment: 'Perfeito! Recomendo a todos.', category: 'Elogio' },
  { id: 's4', patientName: 'João Pereira', patientId: 'p4', responsible: 'Dr. Ricardo', moment: 'financeiro', channel: 'email', sentAt: '2026-04-21 11:00', respondedAt: '2026-04-21 13:00', status: 'respondida', score: 6, comment: 'Valores não foram explicados previamente.', category: 'Sugestão' },
  { id: 's5', patientName: 'Fernanda Costa', patientId: 'p5', responsible: 'Dra. Sarah', moment: 'protocolo', channel: 'whatsapp', sentAt: '2026-04-22 08:00', status: 'pendente' },
  { id: 's6', patientName: 'Roberto Alves', patientId: 'p6', responsible: 'Dr. Paulo', moment: 'consulta', channel: 'ambos', sentAt: '2026-04-22 10:00', respondedAt: '2026-04-22 11:30', status: 'respondida', score: 8, comment: 'Bom atendimento, apenas sala de espera estava cheia.', category: 'Sugestão' },
  { id: 's7', patientName: 'Lucia Ferreira', patientId: 'p7', responsible: 'Dr. Ricardo', moment: 'procedimento', channel: 'whatsapp', sentAt: '2026-04-23 09:00', status: 'expirada' },
  { id: 's8', patientName: 'Marcos Oliveira', patientId: 'p8', responsible: 'Dra. Sarah', moment: 'consulta', channel: 'email', sentAt: '2026-04-23 14:00', respondedAt: '2026-04-23 16:00', status: 'respondida', score: 2, comment: 'Consulta cancelada de última hora. Péssimo.', category: 'Reclamação', alertCreated: true, taskCreated: false },
  { id: 's9', patientName: 'Patricia Lima', patientId: 'p9', responsible: 'Dr. Paulo', moment: 'financeiro', channel: 'whatsapp', sentAt: '2026-04-24 10:00', respondedAt: '2026-04-24 11:00', status: 'respondida', score: 9, comment: 'Pagamento facilitado, ótimo!', category: 'Elogio' },
  { id: 's10', patientName: 'Bruno Santos', patientId: 'p10', responsible: 'Dr. Ricardo', moment: 'protocolo', channel: 'email', sentAt: '2026-04-25 09:00', status: 'enviada' },
];

const RADAR_DATA = [
  { metric: 'Localização', score: 9.2 },
  { metric: 'Infraestrutura', score: 8.7 },
  { metric: 'Atendimento', score: 9.5 },
  { metric: 'Pontualidade', score: 8.1 },
  { metric: 'Informação', score: 9.3 },
  { metric: 'Custo-benefício', score: 8.4 },
];

const NPS_TREND = [
  { month: 'Jan', nps: 62 },
  { month: 'Fev', nps: 68 },
  { month: 'Mar', nps: 71 },
  { month: 'Abr', nps: 74 },
];

const PATIENTS = [
  'Ana Lima', 'Carlos Mendes', 'Maria Souza', 'João Pereira',
  'Fernanda Costa', 'Roberto Alves', 'Patricia Lima', 'Bruno Santos',
];
const RESPONSIBLES = ['Dra. Sarah', 'Dr. Paulo', 'Dr. Ricardo', 'Dra. Camila'];

const MOMENT_LABELS: Record<TriggerMoment, string> = {
  consulta: 'Após Consulta',
  procedimento: 'Após Procedimento',
  protocolo: 'Após Protocolo',
  financeiro: 'Após Atendimento Financeiro',
};

const STATUS_CONFIG: Record<SurveyStatus, { label: string; color: string }> = {
  respondida: { label: 'Respondida', color: 'bg-green-100 text-green-700' },
  enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  expirada: { label: 'Expirada', color: 'bg-gray-100 text-gray-500' },
};

// ─── NPS Calculator ──────────────────────────────────────────────────────────

function calcNPS(responses: SurveyResponse[]) {
  const scored = responses.filter(r => r.score !== undefined);
  if (!scored.length) return 0;
  const promoters = scored.filter(r => r.score! >= 9).length;
  const detractors = scored.filter(r => r.score! <= 6).length;
  return Math.round(((promoters - detractors) / scored.length) * 100);
}

function npsLabel(nps: number) {
  if (nps >= 75) return { label: 'Excelente', color: 'text-green-600' };
  if (nps >= 50) return { label: 'Muito Bom', color: 'text-emerald-500' };
  if (nps >= 0) return { label: 'Bom', color: 'text-amber-500' };
  return { label: 'Crítico', color: 'text-red-500' };
}

// ─── Send Survey Modal ────────────────────────────────────────────────────────

function SendSurveyModal({ onClose, onSend }: {
  onClose: () => void;
  onSend: (r: SurveyResponse) => void;
}) {
  const [patient, setPatient] = useState('');
  const [responsible, setResponsible] = useState(RESPONSIBLES[0]);
  const [moment, setMoment] = useState<TriggerMoment>('consulta');
  const [channel, setChannel] = useState<SendChannel>('whatsapp');

  function handleSend() {
    if (!patient.trim()) { toast.error('Selecione o paciente'); return; }
    const now = new Date().toLocaleString('pt-BR').replace(',', '');
    const newR: SurveyResponse = {
      id: `s${Date.now()}`,
      patientName: patient,
      patientId: `p${Date.now()}`,
      responsible,
      moment,
      channel,
      sentAt: now,
      status: 'enviada',
    };
    onSend(newR);
    toast.success(`Pesquisa enviada para ${patient} via ${channel === 'whatsapp' ? 'WhatsApp' : channel === 'email' ? 'e-mail' : 'WhatsApp + e-mail'}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Enviar Pesquisa de Qualidade</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Paciente</label>
            <select value={patient} onChange={e => setPatient(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Selecionar paciente...</option>
              {PATIENTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Responsável</label>
            <select value={responsible} onChange={e => setResponsible(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              {RESPONSIBLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Momento de Disparo</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(MOMENT_LABELS) as [TriggerMoment, string][]).map(([k, v]) => (
                <button key={k} onClick={() => setMoment(k)}
                  className={cn('border rounded-lg px-3 py-2 text-xs text-left transition-colors',
                    moment === k ? 'border-violet-600 bg-violet-50 text-violet-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Canal de Envio</label>
            <div className="flex gap-2">
              {(['whatsapp', 'email', 'ambos'] as SendChannel[]).map(c => (
                <button key={c} onClick={() => setChannel(c)}
                  className={cn('flex-1 border rounded-lg px-3 py-2 text-xs transition-colors capitalize',
                    channel === c ? 'border-violet-600 bg-violet-50 text-violet-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                  {c === 'whatsapp' ? '📱 WhatsApp' : c === 'email' ? '📧 E-mail' : '📱+📧 Ambos'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
            <Send className="h-4 w-4" /> Enviar Pesquisa
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Respond Survey Modal (simulates patient response) ────────────────────────

function RespondSurveyModal({ survey, onClose, onRespond }: {
  survey: SurveyResponse;
  onClose: () => void;
  onRespond: (id: string, score: number, comment: string, category: string) => void;
}) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('Elogio');

  function handleSubmit() {
    if (score === null) { toast.error('Selecione uma nota'); return; }
    onRespond(survey.id, score, comment, category);
    toast.success('Resposta registrada com sucesso');
    onClose();
  }

  const scoreColor = score === null ? 'text-gray-400' : score >= 9 ? 'text-green-600' : score >= 7 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Registrar Resposta</h2>
            <p className="text-xs text-gray-500 mt-0.5">{survey.patientName} · {MOMENT_LABELS[survey.moment]}</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-5">
          {/* Score 0-10 */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-3">
              Nota do Paciente (0–10)
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => (
                <button key={i} onClick={() => setScore(i)}
                  className={cn('w-9 h-9 rounded-lg text-sm font-bold border transition-all',
                    score === i
                      ? i >= 9 ? 'bg-green-500 border-green-500 text-white'
                        : i >= 7 ? 'bg-amber-400 border-amber-400 text-white'
                          : 'bg-red-500 border-red-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400')}>
                  {i}
                </button>
              ))}
            </div>
            {score !== null && (
              <p className={cn('text-sm font-semibold mt-2', scoreColor)}>
                {score >= 9 ? '😍 Promotor' : score >= 7 ? '😐 Neutro' : '😞 Detrator'}
              </p>
            )}
          </div>
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Categoria do Feedback</label>
            <div className="flex gap-2">
              {['Elogio', 'Sugestão', 'Reclamação'].map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={cn('flex-1 border rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    category === cat
                      ? cat === 'Elogio' ? 'border-green-500 bg-green-50 text-green-700'
                        : cat === 'Reclamação' ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {cat === 'Elogio' ? '👍 ' : cat === 'Reclamação' ? '⚠️ ' : '💡 '}{cat}
                </button>
              ))}
            </div>
          </div>
          {/* Comment */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Comentário do Paciente</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder="Observações e feedback do paciente..."
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          {score !== null && score <= 6 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              Nota baixa detectada. Um alerta será criado automaticamente para a equipe.
              {category === 'Reclamação' && ' Reclamação será convertida em tarefa.'}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700 text-white">
            Registrar Resposta
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Survey Config Modal ──────────────────────────────────────────────────────

function ConfigModal({ config, onClose, onSave }: {
  config: SurveyConfig;
  onClose: () => void;
  onSave: (c: SurveyConfig) => void;
}) {
  const [draft, setDraft] = useState<SurveyConfig>({ ...config });

  function toggleMoment(m: TriggerMoment) {
    setDraft(prev => ({
      ...prev,
      moments: prev.moments.includes(m) ? prev.moments.filter(x => x !== m) : [...prev.moments, m],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[520px]">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Configurar Pesquisa de Qualidade</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Momentos de Disparo</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(MOMENT_LABELS) as [TriggerMoment, string][]).map(([k, v]) => (
                <label key={k} className={cn('flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer text-xs',
                  draft.moments.includes(k) ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600')}>
                  <input type="checkbox" checked={draft.moments.includes(k)} onChange={() => toggleMoment(k)} className="accent-violet-600" />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Canal Padrão</label>
            <div className="flex gap-2">
              {(['whatsapp', 'email', 'ambos'] as SendChannel[]).map(c => (
                <button key={c} onClick={() => setDraft(p => ({ ...p, channels: c }))}
                  className={cn('flex-1 border rounded-lg px-3 py-2 text-xs transition-colors',
                    draft.channels === c ? 'border-violet-600 bg-violet-50 text-violet-700 font-semibold' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {c === 'whatsapp' ? '📱 WhatsApp' : c === 'email' ? '📧 E-mail' : '📱+📧 Ambos'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Alerta abaixo de</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={10} value={draft.alertThreshold}
                  onChange={e => setDraft(p => ({ ...p, alertThreshold: Number(e.target.value) }))}
                  className="w-16 border rounded-lg px-2 py-1.5 text-sm text-center" />
                <span className="text-xs text-gray-500">/ 10</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Enviar após (min)</label>
              <input type="number" min={5} max={10080} value={draft.delayMinutes}
                onChange={e => setDraft(p => ({ ...p, delayMinutes: Number(e.target.value) }))}
                className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={draft.autoTask} onChange={e => setDraft(p => ({ ...p, autoTask: e.target.checked }))} className="accent-violet-600 w-4 h-4" />
            <span className="text-sm text-gray-700">Converter reclamações em tarefa automaticamente</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onSave(draft); toast.success('Configurações salvas'); onClose(); }}
            className="bg-violet-600 hover:bg-violet-700 text-white">
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PageTab = 'dashboard' | 'pesquisas' | 'configurar';

export default function QualidadePage() {
  const [activeTab, setActiveTab] = useState<PageTab>('dashboard');
  const [responses, setResponses] = useState<SurveyResponse[]>(MOCK_RESPONSES);
  const [config, setConfig] = useState<SurveyConfig>({
    moments: ['consulta', 'procedimento', 'protocolo', 'financeiro'],
    channels: 'whatsapp',
    alertThreshold: 7,
    autoTask: true,
    delayMinutes: 30,
  });
  const [showSend, setShowSend] = useState(false);
  const [showRespond, setShowRespond] = useState<SurveyResponse | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [filterMoment, setFilterMoment] = useState<TriggerMoment | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<SurveyStatus | 'all'>('all');

  // ── Computed ────────────────────────────────────────────────────────────────

  const answered = useMemo(() => responses.filter(r => r.score !== undefined), [responses]);
  const nps = useMemo(() => calcNPS(responses), [responses]);
  const { label: npsLabelStr, color: npsColor } = npsLabel(nps);
  const avgScore = useMemo(() => {
    if (!answered.length) return 0;
    return answered.reduce((s, r) => s + r.score!, 0) / answered.length;
  }, [answered]);
  const promoters = useMemo(() => answered.filter(r => r.score! >= 9).length, [answered]);
  const detractors = useMemo(() => answered.filter(r => r.score! <= 6).length, [answered]);
  const responseRate = responses.length
    ? Math.round((answered.length / responses.length) * 100) : 0;

  const filtered = useMemo(() => responses.filter(r => {
    if (filterMoment !== 'all' && r.moment !== filterMoment) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  }), [responses, filterMoment, filterStatus]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleSend(r: SurveyResponse) {
    setResponses(prev => [r, ...prev]);
  }

  function handleRespond(id: string, score: number, comment: string, category: string) {
    const now = new Date().toLocaleString('pt-BR').replace(',', '');
    const isLow = score <= config.alertThreshold;
    const isComplaint = category === 'Reclamação';
    setResponses(prev => prev.map(r => r.id === id ? {
      ...r,
      score,
      comment,
      category,
      status: 'respondida' as SurveyStatus,
      respondedAt: now,
      alertCreated: isLow,
      taskCreated: isLow && isComplaint && config.autoTask,
    } : r));
    if (isLow) {
      toast.warning(`⚠️ Alerta criado — ${score <= 6 ? 'nota baixa' : 'atenção necessária'}`);
    }
    if (isLow && isComplaint && config.autoTask) {
      toast.info('📋 Reclamação convertida em tarefa');
    }
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const TABS: { key: PageTab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard NPS' },
    { key: 'pesquisas', label: 'Pesquisas Enviadas' },
    { key: 'configurar', label: 'Configurar' },
  ];

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Qualidade" subtitle="NPS e pesquisas de satisfação" actions={
        <div className="flex gap-2">
          <Button onClick={() => setShowConfig(true)} variant="secondary" size="sm" className="gap-2" title="Configurar Pesquisa">
            <Filter className="h-4 w-4" /> Configurar
          </Button>
          <Button onClick={() => setShowSend(true)} className="bg-violet-600 hover:bg-violet-700 text-white gap-2" size="sm">
            <Send className="h-4 w-4" /> Enviar Pesquisa
          </Button>
        </div>
      } />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Dashboard ─────────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-white p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">NPS</p>
                <p className={cn('text-4xl font-black mt-1', npsColor)}>{nps}</p>
                <p className={cn('text-sm font-semibold mt-1', npsColor)}>{npsLabelStr}</p>
              </div>
              <div className="rounded-xl border bg-white p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nota Média</p>
                <p className="text-4xl font-black text-gray-900 mt-1">{avgScore.toFixed(1)}</p>
                <div className="flex gap-0.5 mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-3.5 w-3.5', i < Math.round(avgScore / 2) ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200')} />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-white p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Taxa de Resposta</p>
                <p className="text-4xl font-black text-gray-900 mt-1">{responseRate}%</p>
                <p className="text-xs text-gray-400 mt-1">{answered.length} de {responses.length} pesquisas</p>
              </div>
              <div className="rounded-xl border bg-white p-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Promotores</p>
                <p className="text-4xl font-black text-green-600 mt-1">{promoters}</p>
                <p className="text-xs text-red-500 mt-1">{detractors} detratores</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
              {/* NPS trend */}
              <div className="rounded-xl border bg-white p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Evolução do NPS</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={NPS_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="nps" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Radar */}
              <div className="rounded-xl border bg-white p-5">
                <h3 className="font-semibold text-gray-700 mb-4">Dimensões de Qualidade</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={RADAR_DATA}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <Radar dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold text-gray-700 mb-4">Distribuição de Feedbacks</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['Elogio', 'Sugestão', 'Reclamação'] as const).map(cat => {
                  const count = answered.filter(r => r.category === cat).length;
                  const pct = answered.length ? Math.round((count / answered.length) * 100) : 0;
                  const color = cat === 'Elogio' ? 'bg-green-500' : cat === 'Reclamação' ? 'bg-red-500' : 'bg-amber-400';
                  const textColor = cat === 'Elogio' ? 'text-green-600' : cat === 'Reclamação' ? 'text-red-600' : 'text-amber-600';
                  return (
                    <div key={cat} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={cn('font-medium', textColor)}>{cat}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Pesquisas ──────────────────────────────────────────────────────── */}
        {activeTab === 'pesquisas' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <select value={filterMoment} onChange={e => setFilterMoment(e.target.value as TriggerMoment | 'all')}
                className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                <option value="all">Todos os momentos</option>
                {(Object.entries(MOMENT_LABELS) as [TriggerMoment, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as SurveyStatus | 'all')}
                className="border rounded-lg px-3 py-1.5 text-sm bg-white">
                <option value="all">Todos os status</option>
                {(['respondida', 'enviada', 'pendente', 'expirada'] as SurveyStatus[]).map(s => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 self-center">{filtered.length} pesquisas</span>
            </div>

            {/* List */}
            <div className="space-y-3">
              {filtered.map(r => (
                <div key={r.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{r.patientName}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_CONFIG[r.status].color)}>
                          {STATUS_CONFIG[r.status].label}
                        </span>
                        {r.alertCreated && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <Bell className="h-3 w-3" /> Alerta
                          </span>
                        )}
                        {r.taskCreated && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <ClipboardList className="h-3 w-3" /> Tarefa
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />{r.responsible}</span>
                        <span>{MOMENT_LABELS[r.moment]}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{r.sentAt}</span>
                      </div>
                      {r.score !== undefined && (
                        <div className="mt-2 flex items-center gap-3">
                          <span className={cn('text-2xl font-black',
                            r.score >= 9 ? 'text-green-600' : r.score >= 7 ? 'text-amber-500' : 'text-red-500')}>
                            {r.score}
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={cn('h-3.5 w-3.5',
                                i < Math.round(r.score! / 2) ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-200')} />
                            ))}
                          </div>
                          {r.category && (
                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                              r.category === 'Elogio' ? 'bg-green-100 text-green-700'
                                : r.category === 'Reclamação' ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700')}>
                              {r.category}
                            </span>
                          )}
                        </div>
                      )}
                      {r.comment && (
                        <p className="mt-1.5 text-sm text-gray-600 italic">"{r.comment}"</p>
                      )}
                    </div>
                    {r.status !== 'respondida' && r.status !== 'expirada' && (
                      <Button size="sm" variant="secondary" onClick={() => setShowRespond(r)}
                        className="text-xs shrink-0">
                        Registrar Resposta
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Configurar ─────────────────────────────────────────────────────── */}
        {activeTab === 'configurar' && (
          <div className="max-w-xl space-y-4">
            <div className="rounded-xl border bg-white p-5 space-y-4">
              <h3 className="font-semibold text-gray-800">Configurações Atuais</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Momentos ativos</span>
                  <span className="font-medium text-gray-800">{config.moments.map(m => MOMENT_LABELS[m]).join(', ') || 'Nenhum'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Canal padrão</span>
                  <span className="font-medium text-gray-800 capitalize">{config.channels}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Alerta abaixo de</span>
                  <span className="font-medium text-red-600">{config.alertThreshold}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Enviar após</span>
                  <span className="font-medium text-gray-800">{config.delayMinutes} minutos</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Auto-tarefa para reclamações</span>
                  <span className={cn('font-medium', config.autoTask ? 'text-green-600' : 'text-gray-400')}>
                    {config.autoTask ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <Button onClick={() => setShowConfig(true)} variant="secondary" className="w-full mt-2">
                Editar Configurações
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showSend && <SendSurveyModal onClose={() => setShowSend(false)} onSend={handleSend} />}
      {showRespond && <RespondSurveyModal survey={showRespond} onClose={() => setShowRespond(null)} onRespond={handleRespond} />}
      {showConfig && <ConfigModal config={config} onClose={() => setShowConfig(false)} onSave={setConfig} />}
    </div>
  );
}
