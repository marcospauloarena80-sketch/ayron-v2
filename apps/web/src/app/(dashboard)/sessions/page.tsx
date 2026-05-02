'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { fetchProtocols } from '@/lib/supabase/queries';
import { toast } from 'sonner';
import {
  Repeat2, Check, Clock, AlertTriangle, Search, Plus, ChevronRight,
  Calendar, User, FlaskConical, BarChart3, CheckCircle, XCircle,
  Pill, Syringe, RefreshCw, Play, Pause, ChevronDown, Scan,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Protocol {
  id: string;
  patient_name: string;
  patient_id: string;
  protocol_name: string;
  category: string;
  total_sessions: number;
  completed_sessions: number;
  next_session_date: string | null;
  last_session_date: string | null;
  start_date: string;
  status: 'ATIVO' | 'CONCLUIDO' | 'PAUSADO' | 'ATRASADO';
  professional: string;
  interval_days: number;
  notes?: string;
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_PROTOCOLS: Protocol[] = [
  {
    id: '1', patient_name: 'Ana Lima', patient_id: 'P4821',
    protocol_name: 'Mounjaro — Série 12 aplicações', category: 'Emagrecimento',
    total_sessions: 12, completed_sessions: 7, next_session_date: '2026-04-25',
    last_session_date: '2026-04-11', start_date: '2026-01-10',
    status: 'ATIVO', professional: 'Lorrana', interval_days: 14,
  },
  {
    id: '2', patient_name: 'Carlos Souza', patient_id: 'P3102',
    protocol_name: 'Implante Testosterona — Protocolo 6m', category: 'Hormonal',
    total_sessions: 2, completed_sessions: 1, next_session_date: '2026-07-22',
    last_session_date: '2026-01-22', start_date: '2026-01-22',
    status: 'ATIVO', professional: 'Dr. Murilo', interval_days: 180,
  },
  {
    id: '3', patient_name: 'Beatriz Fernandes', patient_id: 'P1089',
    protocol_name: 'Soroterapia IV — Série 10', category: 'Nutrição',
    total_sessions: 10, completed_sessions: 10, next_session_date: null,
    last_session_date: '2026-04-10', start_date: '2026-02-01',
    status: 'CONCLUIDO', professional: 'Amanda Gomes', interval_days: 7,
  },
  {
    id: '4', patient_name: 'Pedro Gomes', patient_id: 'P2205',
    protocol_name: 'Mounjaro — Série 12 aplicações', category: 'Emagrecimento',
    total_sessions: 12, completed_sessions: 4, next_session_date: '2026-04-10',
    last_session_date: '2026-03-27', start_date: '2026-02-13',
    status: 'ATRASADO', professional: 'Lorrana', interval_days: 14,
    notes: 'Paciente relatou viagem — reagendar',
  },
  {
    id: '5', patient_name: 'Marina Costa', patient_id: 'P5542',
    protocol_name: 'HCG + Testosterona Enantato — Ciclo 8 semanas', category: 'Hormonal',
    total_sessions: 8, completed_sessions: 3, next_session_date: '2026-04-24',
    last_session_date: '2026-04-10', start_date: '2026-03-13',
    status: 'ATIVO', professional: 'Dr. Murilo', interval_days: 14,
  },
  {
    id: '6', patient_name: 'Roberto Alves', patient_id: 'P0932',
    protocol_name: 'NADH Implante — Série 3', category: 'Longevidade',
    total_sessions: 3, completed_sessions: 1, next_session_date: '2026-06-15',
    last_session_date: '2026-02-15', start_date: '2026-02-15',
    status: 'ATIVO', professional: 'Dr. André', interval_days: 120,
  },
  {
    id: '7', patient_name: 'Camila Dias', patient_id: 'P7731',
    protocol_name: 'Implante Gestrinona — Protocolo 4m', category: 'Hormonal',
    total_sessions: 3, completed_sessions: 2, next_session_date: '2026-04-22',
    last_session_date: '2026-12-22', start_date: '2026-08-22',
    status: 'ATRASADO', professional: 'Amanda Gomes', interval_days: 120,
    notes: 'Aguardando exames pré-implante',
  },
  {
    id: '8', patient_name: 'José Martins', patient_id: 'P4455',
    protocol_name: 'Mounjaro — Série 12 aplicações', category: 'Emagrecimento',
    total_sessions: 12, completed_sessions: 0, next_session_date: '2026-04-26',
    last_session_date: null, start_date: '2026-04-26',
    status: 'ATIVO', professional: 'Lorrana', interval_days: 14,
    notes: 'Primeira aplicação — aguardando início',
  },
  {
    id: '9', patient_name: 'Fernanda Lima', patient_id: 'P6621',
    protocol_name: 'Soroterapia IV — Série 10', category: 'Nutrição',
    total_sessions: 10, completed_sessions: 5, next_session_date: null,
    last_session_date: '2026-03-01', start_date: '2026-01-25',
    status: 'PAUSADO', professional: 'Amanda Gomes', interval_days: 7,
    notes: 'Pausado a pedido da paciente — retoma maio',
  },
  {
    id: '10', patient_name: 'Lucas Prado Jr.', patient_id: 'P3390',
    protocol_name: 'Oxandrolona + Enantato — Ciclo 12 semanas', category: 'Performance',
    total_sessions: 6, completed_sessions: 6, next_session_date: null,
    last_session_date: '2026-04-15', start_date: '2026-01-15',
    status: 'CONCLUIDO', professional: 'Dr. Lucas', interval_days: 14,
  },
];

// ── Utils ──────────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, any> = {
  Emagrecimento: Pill, Hormonal: Syringe, Nutrição: FlaskConical,
  Longevidade: RefreshCw, Performance: BarChart3,
};

const STATUS_STYLES: Record<string, { label: string; badge: string; row: string }> = {
  ATIVO: { label: 'Ativo', badge: 'bg-blue-100 text-blue-700', row: '' },
  CONCLUIDO: { label: 'Concluído', badge: 'bg-green-100 text-green-700', row: '' },
  PAUSADO: { label: 'Pausado', badge: 'bg-amber-100 text-amber-700', row: 'bg-amber-50/50' },
  ATRASADO: { label: 'Atrasado', badge: 'bg-red-100 text-red-700', row: 'bg-red-50/50' },
};

function ProgressBar({ completed, total, status }: { completed: number; total: number; status: string }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const color = status === 'CONCLUIDO' ? 'bg-green-500'
    : status === 'ATRASADO' ? 'bg-red-400'
    : status === 'PAUSADO' ? 'bg-amber-400'
    : 'bg-primary';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{completed}/{total}</span>
    </div>
  );
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function NextSessionBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-muted-foreground">—</span>;
  const days = daysUntil(date);
  if (days === null) return null;
  const color = days < 0 ? 'text-red-600 font-semibold' : days === 0 ? 'text-orange-600 font-semibold' : days <= 3 ? 'text-amber-600 font-medium' : 'text-muted-foreground';
  const label = days < 0 ? `Atrasado ${Math.abs(days)}d` : days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : `Em ${days}d (${date})`;
  return <span className={cn('text-xs', color)}>{label}</span>;
}

// ── Session check-in modal ─────────────────────────────────────────────────────

function CheckInModal({ protocol, onClose }: { protocol: Protocol; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await new Promise(r => setTimeout(r, 800));
    toast.success(`Sessão ${protocol.completed_sessions + 1}/${protocol.total_sessions} registrada para ${protocol.patient_name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold mb-1">Registrar Sessão</h3>
        <p className="text-sm text-muted-foreground mb-4">{protocol.patient_name} — {protocol.protocol_name}</p>

        <div className="p-3 rounded-xl bg-muted/50 mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Progresso do protocolo</span>
            <span className="font-semibold">{protocol.completed_sessions + 1}/{protocol.total_sessions} (após check-in)</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((protocol.completed_sessions + 1) / protocol.total_sessions) * 100}%` }} />
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Data da sessão</label>
            <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Profissional</label>
            <Input defaultValue={protocol.professional} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Observações (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Intercorrências, reações, ajustes de dose..."
              className="w-full h-20 rounded-lg border border-border px-3 py-2 text-sm resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" disabled={confirming} onClick={handleConfirm}>
            {confirming ? <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando...</> : <><Check className="h-3.5 w-3.5 mr-1.5" />Confirmar Check-in</>}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [checkIn, setCheckIn] = useState<Protocol | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: protocolsData = MOCK_PROTOCOLS, isLoading: loadingProtocols } = useQuery({
    queryKey: ['protocols'],
    queryFn: () => fetchProtocols().catch(() => MOCK_PROTOCOLS),
    staleTime: 30_000,
  });

  const protocols: Protocol[] = protocolsData as Protocol[];

  const filtered = protocols.filter(p => {
    const matchSearch = search === '' || p.patient_name.toLowerCase().includes(search.toLowerCase()) || p.protocol_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const sorted = [...filtered].sort((a, b) => {
    // Atrasado first, then by next session date
    if (a.status === 'ATRASADO' && b.status !== 'ATRASADO') return -1;
    if (b.status === 'ATRASADO' && a.status !== 'ATRASADO') return 1;
    const da = daysUntil(a.next_session_date) ?? 9999;
    const db = daysUntil(b.next_session_date) ?? 9999;
    return da - db;
  });

  // KPIs
  const ativos = protocols.filter(p => p.status === 'ATIVO').length;
  const atrasados = protocols.filter(p => p.status === 'ATRASADO').length;
  const concluidos = protocols.filter(p => p.status === 'CONCLUIDO').length;
  const hojeCount = protocols.filter(p => daysUntil(p.next_session_date) === 0).length;
  const semanaCount = protocols.filter(p => { const d = daysUntil(p.next_session_date); return d !== null && d >= 0 && d <= 7; }).length;

  const categories = [...new Set(protocols.map(p => p.category))];

  return (
    <div>
      <Topbar title="Sessões & Protocolos" />
      {checkIn && <CheckInModal protocol={checkIn} onClose={() => setCheckIn(null)} />}

      <div className="p-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Protocolos Ativos', value: ativos, icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Atrasados', value: atrasados, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Sessões Hoje', value: hojeCount, icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Esta Semana', value: semanaCount, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Concluídos', value: concluidos, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="p-4 rounded-xl border border-border bg-white">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', bg)}>
                  <Icon className={cn('h-3.5 w-3.5', color)} />
                </div>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Paciente ou protocolo..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Status filter */}
          <div className="flex gap-1">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'ATIVO', label: 'Ativos' },
              { key: 'ATRASADO', label: 'Atrasados' },
              { key: 'PAUSADO', label: 'Pausados' },
              { key: 'CONCLUIDO', label: 'Concluídos' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  statusFilter === key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border text-xs bg-white outline-none focus:border-primary"
          >
            <option value="all">Todas categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <Button size="sm" variant="secondary" onClick={() => toast.info('Abrindo módulo de biometria facial...')}>
            <Scan className="h-3.5 w-3.5 mr-1.5" />Cadastrar Biometria Facial
          </Button>
          <Button size="sm" variant="secondary" onClick={() => toast.info('Escaneando biometria...')}>
            <Scan className="h-3.5 w-3.5 mr-1.5" />Dar Baixa com Biometria
          </Button>
          <Button size="sm" className="ml-auto"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Protocolo</Button>
        </div>

        {/* Protocol list */}
        {atrasados > 0 && statusFilter === 'all' && (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{atrasados} protocolo{atrasados > 1 ? 's' : ''} com sessão atrasada — entre em contato com o{atrasados > 1 ? 's' : ''} paciente{atrasados > 1 ? 's' : ''}</p>
          </div>
        )}

        <div className="space-y-2">
          {sorted.map(p => {
            const isExpanded = expanded === p.id;
            const days = daysUntil(p.next_session_date);
            const urgentToday = days !== null && days <= 1 && p.status !== 'CONCLUIDO';
            const CatIcon = CATEGORY_ICONS[p.category] ?? FlaskConical;
            const statusStyle = STATUS_STYLES[p.status];

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-xl border transition-all',
                  urgentToday ? 'border-amber-300 bg-amber-50/30' : 'border-border bg-white',
                  p.status === 'ATRASADO' ? 'border-red-200 bg-red-50/30' : '',
                  p.status === 'CONCLUIDO' ? 'opacity-60' : '',
                )}
              >
                {/* Main row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Icon */}
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    p.status === 'ATRASADO' ? 'bg-red-100' : p.status === 'CONCLUIDO' ? 'bg-green-100' : 'bg-primary/10')}>
                    <CatIcon className={cn('h-4 w-4', p.status === 'ATRASADO' ? 'text-red-600' : p.status === 'CONCLUIDO' ? 'text-green-600' : 'text-primary')} />
                  </div>

                  {/* Patient + Protocol */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{p.patient_name}</p>
                      <span className="text-xs text-muted-foreground">{p.patient_id}</span>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', statusStyle.badge)}>
                        {statusStyle.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{p.protocol_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{p.professional}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="w-36 flex-shrink-0">
                    <p className="text-xs text-muted-foreground mb-1">Progresso</p>
                    <ProgressBar completed={p.completed_sessions} total={p.total_sessions} status={p.status} />
                  </div>

                  {/* Next session */}
                  <div className="w-32 flex-shrink-0 text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Próxima sessão</p>
                    <NextSessionBadge date={p.next_session_date} />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.status !== 'CONCLUIDO' && p.status !== 'PAUSADO' && (
                      <Button
                        size="sm"
                        variant={p.status === 'ATRASADO' ? 'primary' : 'secondary'}
                        className={cn('text-xs h-8', p.status === 'ATRASADO' ? 'bg-red-600 hover:bg-red-700 text-white border-0' : '')}
                        onClick={() => setCheckIn(p)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Check-in
                      </Button>
                    )}
                    {p.status === 'PAUSADO' && (
                      <Button size="sm" variant="secondary" className="text-xs h-8" onClick={() => toast.success('Protocolo reativado')}>
                        <Play className="h-3.5 w-3.5 mr-1" />Reativar
                      </Button>
                    )}
                    {p.status === 'CONCLUIDO' && (
                      <Button size="sm" variant="secondary" className="text-xs h-8" onClick={() => toast.success('Novo protocolo criado a partir do anterior')}>
                        <Repeat2 className="h-3.5 w-3.5 mr-1" />Renovar
                      </Button>
                    )}
                    <button onClick={() => setExpanded(isExpanded ? null : p.id)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded ? 'rotate-180' : '')} />
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Início do protocolo</p>
                        <p className="font-medium">{p.start_date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Última sessão</p>
                        <p className="font-medium">{p.last_session_date ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Intervalo padrão</p>
                        <p className="font-medium">{p.interval_days} dias</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sessões restantes</p>
                        <p className="font-medium">{p.total_sessions - p.completed_sessions}</p>
                      </div>
                    </div>
                    {p.notes && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-xs font-semibold text-amber-800">Observação</p>
                        <p className="text-xs text-amber-700 mt-0.5">{p.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button variant="secondary" size="sm" className="text-xs">Ver Prontuário</Button>
                      <Button variant="secondary" size="sm" className="text-xs">Histórico de Sessões</Button>
                      {p.status === 'ATIVO' && (
                        <Button variant="secondary" size="sm" className="text-xs" onClick={() => toast.success('Protocolo pausado')}>
                          <Pause className="h-3 w-3 mr-1" />Pausar Protocolo
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Repeat2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">Nenhum protocolo encontrado</p>
              <p className="text-xs text-muted-foreground">Tente ajustar os filtros de busca</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
