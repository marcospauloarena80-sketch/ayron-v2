'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAlerts } from '@/lib/supabase/queries';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, ChevronDown, ChevronUp, CheckCheck, Clock, CheckCircle, X,
  Plus, RefreshCw, Package, DollarSign, Calendar, Activity, FileText, Inbox,
  AlertTriangle, TrendingDown, Syringe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'SNOOZED' | 'RESOLVED' | 'DISMISSED';
type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: string;
  rationale: string[];
  suggested_actions: { key: string; label: string }[];
  patient?: { id: string; full_name: string };
  created_at: string;
  snoozed_until?: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const NOW = new Date();
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86400000).toISOString();
const daysFromNow = (d: number) => new Date(NOW.getTime() + d * 86400000).toISOString();

const INITIAL_ALERTS: AlertItem[] = [
  // Retorno atrasado
  {
    id: 'A001', title: 'Retorno atrasado — Pedro Gomes',
    message: 'Pedro Gomes está há 87 dias sem retorno. Protocolo Mounjaro em risco de abandono.',
    severity: 'CRITICAL', status: 'OPEN', category: 'retorno',
    rationale: ['Última consulta: 29/01/2026', '87 dias sem retorno (limiar: 60d)', 'Protocolo ativo — 3 sessões pendentes'],
    suggested_actions: [{ key: 'contact', label: 'Enviar mensagem' }, { key: 'schedule', label: 'Agendar retorno' }],
    patient: { id: 'P004', full_name: 'Pedro Gomes' },
    created_at: daysAgo(1),
  },
  {
    id: 'A002', title: 'Retorno atrasado — Carlos Souza',
    message: 'Carlos Souza está há 62 dias sem retorno. Protocolo Protocolo Hormonal pausado.',
    severity: 'HIGH', status: 'OPEN', category: 'retorno',
    rationale: ['Última consulta: 24/02/2026', '62 dias sem retorno', 'Protocolo pausado por solicitação'],
    suggested_actions: [{ key: 'contact', label: 'Enviar mensagem' }],
    patient: { id: 'P002', full_name: 'Carlos Souza' },
    created_at: daysAgo(3),
  },
  // Pagamento vencido
  {
    id: 'A003', title: 'Fatura vencida há 34 dias — Pedro Gomes',
    message: 'Fatura V003 no valor de R$ 1.850,00 vencida em 23/03/2026. Pagamento não registrado.',
    severity: 'CRITICAL', status: 'OPEN', category: 'financeiro',
    rationale: ['Fatura emitida em 23/03/2026', 'Vencimento: 23/03/2026', '34 dias em atraso', 'Paciente classificado como INADIMPLENTE'],
    suggested_actions: [{ key: 'contact', label: 'Cobrar' }, { key: 'negotiate', label: 'Negociar' }],
    patient: { id: 'P004', full_name: 'Pedro Gomes' },
    created_at: daysAgo(2),
  },
  {
    id: 'A004', title: 'Fatura vencida há 5 dias — Marina Costa',
    message: 'Fatura V007 no valor de R$ 720,00 vencida em 21/04/2026.',
    severity: 'HIGH', status: 'ACKNOWLEDGED', category: 'financeiro',
    rationale: ['5 dias em atraso', 'Paciente ativo com protocolo em andamento'],
    suggested_actions: [{ key: 'contact', label: 'Contatar' }],
    patient: { id: 'P003', full_name: 'Marina Costa' },
    created_at: daysAgo(5),
  },
  // Caixa aberto
  {
    id: 'A005', title: 'Caixa aberto há 4 dias — Filial 2',
    message: 'Caixa CX002 da Filial 2 está aberto desde 23/04/2026. Responsável: Dra. Ana Lima.',
    severity: 'HIGH', status: 'OPEN', category: 'caixa',
    rationale: ['Abertura: 23/04/2026 08:00', '4 dias sem fechamento', 'Receitas registradas: R$ 1.200,00', '1 pendência não resolvida'],
    suggested_actions: [{ key: 'close', label: 'Fechar caixa' }, { key: 'review', label: 'Ver pendências' }],
    created_at: daysAgo(1),
  },
  {
    id: 'A006', title: 'Caixa aberto há 2 dias — Principal',
    message: 'Caixa CX001 da Unidade Principal aberto desde 24/04/2026. Responsável: Dr. Marcos Oliveira.',
    severity: 'MEDIUM', status: 'SNOOZED', category: 'caixa',
    rationale: ['Abertura: 24/04/2026 07:30', '2 dias sem fechamento', '3 pendências'],
    suggested_actions: [{ key: 'close', label: 'Fechar caixa' }],
    created_at: daysAgo(2),
    snoozed_until: daysFromNow(1),
  },
  // Exame crítico
  {
    id: 'A007', title: 'Resultado crítico de exame — Ana Lima',
    message: 'HbA1c de Ana Lima resultou em 8,7% (referência: < 7%). Requer avaliação médica urgente.',
    severity: 'CRITICAL', status: 'OPEN', category: 'exame',
    rationale: ['HbA1c = 8,7% (alto — referência < 7%)', 'Colesterol LDL = 162 mg/dL (alto)', 'Exame importado em 25/04/2026'],
    suggested_actions: [{ key: 'contact', label: 'Contatar paciente' }, { key: 'schedule', label: 'Agendar urgência' }],
    patient: { id: 'P001', full_name: 'Ana Lima' },
    created_at: daysAgo(1),
  },
  {
    id: 'A008', title: 'Exame crítico — TSH elevado — Beatriz Fernandes',
    message: 'TSH de Beatriz Fernandes resultou em 8,2 mUI/L (referência: 0,4–4,0). Hipotireoidismo não controlado.',
    severity: 'HIGH', status: 'ACKNOWLEDGED', category: 'exame',
    rationale: ['TSH = 8,2 mUI/L (acima do limite superior)', 'Paciente em reposição de levotiroxina', 'Última avaliação: 60 dias'],
    suggested_actions: [{ key: 'review', label: 'Revisar prescrição' }],
    patient: { id: 'P003', full_name: 'Beatriz Fernandes' },
    created_at: daysAgo(4),
  },
  // Estoque baixo
  {
    id: 'A009', title: 'Estoque crítico — Mounjaro 10mg',
    message: 'Mounjaro 10mg com apenas 8 unidades em estoque. Estoque mínimo: 5. Lead time: 7 dias. Risco de ruptura.',
    severity: 'HIGH', status: 'OPEN', category: 'estoque',
    rationale: ['Estoque atual: 8 UN', 'Mínimo: 5 UN', '3 sessões agendadas para esta semana', 'Lead time: 7 dias (pedido urgente recomendado)'],
    suggested_actions: [{ key: 'order', label: 'Criar pedido' }, { key: 'contact_supplier', label: 'Contatar fornecedor' }],
    created_at: daysAgo(2),
  },
  {
    id: 'A010', title: 'Estoque zerado — Ozempic 0.5mg',
    message: 'Ozempic 0.5mg com estoque zerado. Status: BLOQUEADO. Pacientes com protocolo ativo afetados.',
    severity: 'CRITICAL', status: 'OPEN', category: 'estoque',
    rationale: ['Estoque: 0 UN', 'Status: BLOQUEADO por lote próximo ao vencimento', '2 protocolos dependem deste item'],
    suggested_actions: [{ key: 'order', label: 'Pedido urgente' }, { key: 'substitute', label: 'Verificar substituto' }],
    created_at: daysAgo(1),
  },
  {
    id: 'A011', title: 'Estoque baixo — Testosterona 250mg',
    message: 'Testosterona Enantato 250mg com 3 unidades (mínimo: 4). Controlado ANVISA — pedido requer antecedência.',
    severity: 'MEDIUM', status: 'OPEN', category: 'estoque',
    rationale: ['Estoque: 3 UN (abaixo do mínimo 4)', 'Item controlado — lead time: 10 dias', '1 protocolo ativo'],
    suggested_actions: [{ key: 'order', label: 'Iniciar pedido' }],
    created_at: daysAgo(3),
  },
  // Protocolo vencendo
  {
    id: 'A012', title: 'Protocolo vencendo em 15 dias — Ana Lima',
    message: 'Protocolo Mounjaro de Ana Lima expira em 11/05/2026. Renovação ou alta necessária.',
    severity: 'MEDIUM', status: 'OPEN', category: 'protocolo',
    rationale: ['Validade: 11/05/2026 (15 dias)', '6/10 sessões realizadas', 'Paciente com boa adesão'],
    suggested_actions: [{ key: 'renew', label: 'Renovar protocolo' }, { key: 'schedule', label: 'Agendar consulta' }],
    patient: { id: 'P001', full_name: 'Ana Lima' },
    created_at: daysAgo(2),
  },
  {
    id: 'A013', title: 'Protocolo vencendo em 7 dias — Marina Costa',
    message: 'Protocolo HCG de Marina Costa expira em 03/05/2026. 9/10 sessões realizadas.',
    severity: 'HIGH', status: 'RESOLVED', category: 'protocolo',
    rationale: ['7 dias para vencimento', '9/10 sessões — quase finalizado', 'Paciente aguarda retorno'],
    suggested_actions: [{ key: 'renew', label: 'Renovar' }],
    patient: { id: 'P003', full_name: 'Marina Costa' },
    created_at: daysAgo(5),
  },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_BORDER: Record<AlertSeverity, string> = {
  CRITICAL: 'border-l-red-500',
  HIGH: 'border-l-orange-400',
  MEDIUM: 'border-l-yellow-400',
  LOW: 'border-l-blue-400',
  INFO: 'border-l-gray-300',
};

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  LOW: 'bg-blue-100 text-blue-800',
  INFO: 'bg-gray-100 text-gray-700',
};

const CATEGORY_ICON: Record<string, any> = {
  retorno: Calendar,
  financeiro: DollarSign,
  caixa: Inbox,
  exame: FileText,
  estoque: Package,
  protocolo: Activity,
};

const CATEGORY_LABEL: Record<string, string> = {
  retorno: 'Retorno',
  financeiro: 'Financeiro',
  caixa: 'Caixa',
  exame: 'Exame',
  estoque: 'Estoque',
  protocolo: 'Protocolo',
};

const STATUS_TABS: { value: AlertStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'OPEN', label: 'Abertos' },
  { value: 'ACKNOWLEDGED', label: 'Reconhecidos' },
  { value: 'SNOOZED', label: 'Adiados' },
  { value: 'RESOLVED', label: 'Resolvidos' },
  { value: 'DISMISSED', label: 'Dispensados' },
];

// ── NovoAlertaModal ───────────────────────────────────────────────────────────

function NovoAlertaModal({ onClose, onSave }: { onClose: () => void; onSave: (a: AlertItem) => void }) {
  const [form, setForm] = useState({
    title: '', message: '', severity: 'MEDIUM' as AlertSeverity, category: 'retorno', patient_name: '',
  });
  const handleSave = () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error('Título e mensagem obrigatórios'); return; }
    onSave({
      id: `A${Date.now()}`,
      title: form.title,
      message: form.message,
      severity: form.severity,
      status: 'OPEN',
      category: form.category,
      rationale: ['Criado manualmente'],
      suggested_actions: [],
      patient: form.patient_name ? { id: '', full_name: form.patient_name } : undefined,
      created_at: new Date().toISOString(),
    });
    toast.success('Alerta criado');
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Novo Alerta Manual</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Título *</label>
            <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descrição *</label>
            <textarea rows={3} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Severidade</label>
              <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-white outline-none"
                value={form.severity} onChange={e => setForm(p => ({ ...p, severity: e.target.value as AlertSeverity }))}>
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as AlertSeverity[]).map(s =>
                  <option key={s} value={s}>{s}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-white outline-none"
                value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) =>
                  <option key={k} value={k}>{v}</option>
                )}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Paciente (opcional)</label>
            <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Nome do paciente..." value={form.patient_name} onChange={e => setForm(p => ({ ...p, patient_name: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Criar Alerta</Button>
        </div>
      </div>
    </div>
  );
}

// ── AlertCard ─────────────────────────────────────────────────────────────────

function AlertCard({ alert, onUpdate }: {
  alert: AlertItem;
  onUpdate: (id: string, changes: Partial<AlertItem>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActionable = alert.status === 'OPEN' || alert.status === 'SNOOZED';
  const CategoryIcon = CATEGORY_ICON[alert.category] ?? Bell;

  const ack = () => {
    onUpdate(alert.id, { status: 'ACKNOWLEDGED' });
    toast.success('Alerta reconhecido');
  };
  const snooze = (days: number) => {
    const until = new Date(Date.now() + days * 86400000).toISOString();
    onUpdate(alert.id, { status: 'SNOOZED', snoozed_until: until });
    toast.success(`Adiado por ${days} dia${days > 1 ? 's' : ''}`);
  };
  const resolve = () => {
    onUpdate(alert.id, { status: 'RESOLVED' });
    toast.success('Alerta resolvido ✓');
  };
  const dismiss = () => {
    onUpdate(alert.id, { status: 'DISMISSED' });
    toast.info('Alerta dispensado');
  };

  return (
    <div className={cn('rounded-xl border border-border bg-white border-l-4 px-4 py-3 space-y-2', SEVERITY_BORDER[alert.severity])}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', SEVERITY_BADGE[alert.severity])}>{alert.severity}</span>
          <span className="text-sm font-semibold truncate">{alert.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{alert.status}</span>
          <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground ml-1">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{alert.message}</p>
      {alert.patient && (
        <p className="text-xs text-muted-foreground">Paciente: <strong>{alert.patient.full_name}</strong></p>
      )}

      {expanded && alert.rationale.length > 0 && (
        <div className="pt-2 border-t border-border space-y-1.5">
          <p className="text-xs font-semibold">Raciocínio:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {alert.rationale.map((r, i) => (
              <li key={i} className="text-xs text-muted-foreground">{r}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Criado: {new Date(alert.created_at).toLocaleString('pt-BR')}</p>
          {alert.snoozed_until && (
            <p className="text-xs text-amber-600">Adiado até: {new Date(alert.snoozed_until).toLocaleString('pt-BR')}</p>
          )}
        </div>
      )}

      {isActionable && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {alert.status === 'OPEN' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={ack}>
              <CheckCheck className="h-3 w-3" />Reconhecer
            </Button>
          )}
          {[1, 3, 7].map(d => (
            <Button key={d} size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => snooze(d)}>
              <Clock className="h-3 w-3" />{d}d
            </Button>
          ))}
          <Button size="sm" className="h-7 text-xs gap-1" onClick={resolve}>
            <CheckCircle className="h-3 w-3" />Resolver
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={dismiss}>
            <X className="h-3 w-3" />Dispensar
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const { data: alertsData = INITIAL_ALERTS } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts().catch(() => INITIAL_ALERTS),
    staleTime: 30_000,
  });
  const [localAlerts, setLocalAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    setLocalAlerts(alertsData as AlertItem[]);
  }, [alertsData]);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | ''>('OPEN');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showNovoAlerta, setShowNovoAlerta] = useState(false);
  const [running, setRunning] = useState(false);

  const handleUpdate = (id: string, changes: Partial<AlertItem>) => {
    setLocalAlerts(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
  };

  const handleSaveAlerta = (a: AlertItem) => {
    setLocalAlerts(prev => [a, ...prev]);
  };

  const runEngine = () => {
    setRunning(true);
    setTimeout(() => {
      // Simulate engine generating new alerts
      const newAlert: AlertItem = {
        id: `AE${Date.now()}`,
        title: 'Retorno atrasado — Beatriz Fernandes',
        message: 'Beatriz Fernandes está há 45 dias sem retorno. Protocolo finalizado sem consulta de acompanhamento.',
        severity: 'MEDIUM', status: 'OPEN', category: 'retorno',
        rationale: ['45 dias sem consulta', 'Protocolo finalizado (10/10 sessões)', 'Sem nova solicitação de agendamento'],
        suggested_actions: [{ key: 'contact', label: 'Contatar' }],
        patient: { id: 'P003', full_name: 'Beatriz Fernandes' },
        created_at: new Date().toISOString(),
      };
      setLocalAlerts(prev => [newAlert, ...prev.filter(a => a.id !== newAlert.id)]);
      toast.success('Motor de alertas executado — 1 novo alerta gerado');
      setRunning(false);
    }, 1200);
  };

  const filtered = localAlerts.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (severityFilter && a.severity !== severityFilter) return false;
    if (categoryFilter && a.category !== categoryFilter) return false;
    return true;
  });

  const openCount = localAlerts.filter(a => a.status === 'OPEN').length;
  const criticalCount = localAlerts.filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN').length;

  return (
    <div>
      <Topbar title="Central de Alertas" />
      <div className="p-6 space-y-5">

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Abertos', value: openCount, color: 'bg-red-50 border-red-200 text-red-700' },
            { label: 'Críticos', value: criticalCount, color: 'bg-orange-50 border-orange-200 text-orange-700' },
            { label: 'Total', value: localAlerts.length, color: 'bg-white border-border text-foreground' },
            { label: 'Resolvidos', value: localAlerts.filter(a => a.status === 'RESOLVED').length, color: 'bg-green-50 border-green-200 text-green-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn('rounded-xl border p-3 text-center', color)}>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs">{label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            {/* Status filter */}
            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map(tab => (
                <button key={tab.value}
                  onClick={() => setStatusFilter(tab.value as AlertStatus | '')}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    statusFilter === tab.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={runEngine} disabled={running} className="gap-1">
              <RefreshCw className={cn('h-3.5 w-3.5', running && 'animate-spin')} />
              {running ? 'Executando...' : 'Executar Regras'}
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setShowNovoAlerta(true)}>
              <Plus className="h-3.5 w-3.5" />Criar Alerta
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex gap-1 flex-wrap">
            {(['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map(sev => (
              <button key={sev}
                onClick={() => setSeverityFilter(sev as AlertSeverity | '')}
                className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
                  severityFilter === sev ? 'bg-secondary text-white' : 'border border-border text-muted-foreground hover:bg-muted')}>
                {sev === '' ? 'Todas severidades' : sev}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex gap-1 flex-wrap">
            {[['', 'Todas categorias'], ...Object.entries(CATEGORY_LABEL)].map(([k, v]) => (
              <button key={k}
                onClick={() => setCategoryFilter(k)}
                className={cn('px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors',
                  categoryFilter === k ? 'bg-primary/20 text-primary' : 'border border-border text-muted-foreground hover:bg-muted')}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} alerta{filtered.length !== 1 ? 's' : ''}</p>

        {/* Alert list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mb-3" />
            <p className="text-base font-semibold">Nenhum alerta encontrado</p>
            <p className="text-sm text-muted-foreground mt-1">Tudo em dia para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(alert => (
              <AlertCard key={alert.id} alert={alert} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>

      {showNovoAlerta && (
        <NovoAlertaModal onClose={() => setShowNovoAlerta(false)} onSave={handleSaveAlerta} />
      )}
    </div>
  );
}
