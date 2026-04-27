'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, subDays, differenceInDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter, useSearchParams } from 'next/navigation';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NewAppointmentModal } from '@/components/agenda/new-appointment-modal';
import { AgendaSlots } from '@/components/agenda/agenda-slots';
import { KanbanView } from '@/components/agenda/kanban-view';
import { FinalizeModal } from '@/components/agenda/finalize-modal';
import { ChevronLeft, ChevronRight, Plus, UserCheck, LogOut, Calendar, Filter, FileText, Grid, List, DollarSign, Columns, CheckSquare, Users, Timer, ChevronDown, X, Search, Printer, MessageCircle, LayoutGrid, MoreHorizontal } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const MOCK_PROFESSIONALS = [
  { id: 'all', label: 'Todos', color: '#1B3A4B' },
  { id: 'prof1', label: 'Dr. Murilo', color: '#FF6B00' },
  { id: 'prof2', label: 'Amanda G.', color: '#8B5CF6' },
  { id: 'prof3', label: 'Dr. Andre', color: '#0EA5E9' },
  { id: 'prof4', label: 'Lorrana', color: '#10B981' },
  { id: 'prof5', label: 'Dra. Julia', color: '#F59E0B' },
];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'info', CONFIRMED: 'primary', CHECKED_IN: 'warning',
  IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger', MISSED: 'danger',
};
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', CHECKED_IN: 'Check-in',
  IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', MISSED: 'Faltou',
};
const TYPE_LABELS: Record<string, string> = {
  CONSULTATION: 'Consulta', RETURN: 'Retorno', PROCEDURE: 'Procedimento',
  EVALUATION: 'Avaliação', TELECONSULTATION: 'Teleconsulta', EXAM_REVIEW: 'Revisão de Exames',
};

function ProcurarModal({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (d: Date) => void }) {
  const [procTab, setProcTab] = useState<'agendamentos' | 'horarios'>('agendamentos');
  const [search, setSearch] = useState('');
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const [dateRange, setDateRange] = useState({ from: today, to: format(addDays(new Date(), 30), 'yyyy-MM-dd') });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateRange.from) params.date_from = dateRange.from;
      if (dateRange.to) params.date_to = dateRange.to;
      if (search.trim()) params.patient_name = search.trim();
      const r = await api.get('/agenda', { params });
      const list: any[] = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      setResults(list);
      if (!list.length) toast.info('Nenhum resultado encontrado');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro na busca');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm font-semibold">Procurar na Agenda</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg flex-shrink-0">
          {(['agendamentos','horarios'] as const).map(t => (
            <button key={t} onClick={() => { setProcTab(t); setResults([]); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${procTab===t?'bg-white shadow-sm':'text-muted-foreground'}`}>
              {t==='agendamentos'?'Agendamentos':'Horários Livres'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
          <div><label className="text-xs text-muted-foreground">De</label><input type="date" className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={dateRange.from} onChange={e=>setDateRange(r=>({...r,from:e.target.value}))} /></div>
          <div><label className="text-xs text-muted-foreground">Até</label><input type="date" className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={dateRange.to} onChange={e=>setDateRange(r=>({...r,to:e.target.value}))} /></div>
        </div>
        <div className="flex-shrink-0">
          <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Buscar paciente, médico..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        </div>
        {results.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            <p className="text-[11px] text-muted-foreground font-medium">{results.length} resultado(s)</p>
            {results.map((a: any) => (
              <button key={a.id} className="w-full text-left rounded-lg border border-border px-3 py-2.5 hover:bg-muted/50 transition-colors"
                onClick={() => { onNavigate(new Date(a.start_time)); onClose(); }}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{a.patient?.full_name ?? 'Paciente'}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(a.start_time), "dd/MM/yyyy 'às' HH:mm")} · {a.service?.name ?? TYPE_LABELS[a.type] ?? a.type}
                      {a.professional?.name ? ` · ${a.professional.name}` : ''}
                    </p>
                  </div>
                  <Badge variant={STATUS_COLORS[a.status] as any}>{STATUS_LABELS[a.status] ?? a.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 justify-end flex-shrink-0">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button onClick={handleSearch} loading={loading}><Search className="h-3.5 w-3.5 mr-1" />Buscar</Button>
        </div>
      </div>
    </div>
  );
}

function ImprimirAgendaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ paciente: '', de: '', ate: '', status: '', desmarcados: 'NAO', excel: 'NAO', noshow: 'NAO' });
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Imprimir Agenda</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Nome do paciente" value={form.paciente} onChange={e=>setForm(f=>({...f,paciente:e.target.value}))} />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-muted-foreground">De</label><input type="date" className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.de} onChange={e=>setForm(f=>({...f,de:e.target.value}))} /></div>
          <div><label className="text-xs text-muted-foreground">Até</label><input type="date" className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.ate} onChange={e=>setForm(f=>({...f,ate:e.target.value}))} /></div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span>Incluir desmarcados:</span>
          {['SIM','NAO'].map(v=><button key={v} onClick={()=>setForm(f=>({...f,desmarcados:v}))} className={`px-2 py-1 rounded border text-xs ${form.desmarcados===v?'bg-primary text-white border-primary':'border-border'}`}>{v}</button>)}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span>Exportar para Excel:</span>
          {['SIM','NAO'].map(v=><button key={v} onClick={()=>setForm(f=>({...f,excel:v}))} className={`px-2 py-1 rounded border text-xs ${form.excel===v?'bg-primary text-white border-primary':'border-border'}`}>{v}</button>)}
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Relatório No Show</p>
          <div className="flex items-center gap-4 text-xs">
            <span>Agendamentos No Show:</span>
            {['SIM','NAO'].map(v=><button key={v} onClick={()=>setForm(f=>({...f,noshow:v}))} className={`px-2 py-1 rounded border text-xs ${form.noshow===v?'bg-primary text-white border-primary':'border-border'}`}>{v}</button>)}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { window.print(); onClose(); }}>Gerar Arquivo</Button>
        </div>
      </div>
    </div>
  ) : null;
}

function ConfirmacaoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tipo, setTipo] = useState<'oficial'|'nao-oficial'>('oficial');
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Confirmação de Consulta</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Selecione o tipo de WhatsApp para envio das confirmações:</p>
        <div className="flex gap-3">
          {([['oficial','WhatsApp Oficial'],['nao-oficial','WhatsApp Não Oficial']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>setTipo(v)} className={`flex-1 py-2 rounded-lg border text-xs font-medium ${tipo===v?'bg-green-600 text-white border-green-600':'border-border text-muted-foreground'}`}>{l}</button>
          ))}
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
          Até 300 envios de confirmações de consultas por SMS disponíveis no plano.
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { toast.info('Envio de confirmações em integração — disponível em breve'); onClose(); }}>Enviar Confirmações</Button>
        </div>
      </div>
    </div>
  ) : null;
}

function AppointmentResumoModal({ appt, onClose }: { appt: any; onClose: () => void }) {
  if (!appt) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Resumo do Agendamento</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ['Paciente', appt.patient?.full_name],
            ['Serviço', appt.service?.name ?? TYPE_LABELS[appt.type] ?? appt.type],
            ['Profissional', appt.professional?.name ?? '—'],
            ['Data/Hora', format(new Date(appt.start_time), "dd/MM/yyyy 'às' HH:mm")],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-muted-foreground w-24 flex-shrink-0">{label}:</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <span className="text-muted-foreground w-24 flex-shrink-0">Status:</span>
            <Badge variant={STATUS_COLORS[appt.status] as any}>{STATUS_LABELS[appt.status] ?? appt.status}</Badge>
          </div>
          {appt.notes && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-24 flex-shrink-0">Obs.:</span>
              <span className="text-muted-foreground text-xs">{appt.notes}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Fechar</Button></div>
      </div>
    </div>
  );
}

function DoctorTimer({ appointment }: { appointment: any }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const scheduled = new Date(appointment.start_time);
  const now = new Date();
  const diffMin = Math.round((now.getTime() - scheduled.getTime()) / 60000);
  const late = diffMin > 0;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-2.5">
      <Timer className="h-4 w-4 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{appointment.patient?.full_name}</p>
        <p className="text-sm font-mono font-bold">{mm}:{ss} em atendimento</p>
      </div>
      {late ? (
        <span className="ml-auto text-xs font-medium text-red-500">{diffMin}min atrasado</span>
      ) : diffMin < 0 ? (
        <span className="ml-auto text-xs font-medium text-green-600">{Math.abs(diffMin)}min adiantado</span>
      ) : (
        <span className="ml-auto text-xs font-medium text-muted-foreground">no horário</span>
      )}
    </div>
  );
}

function UnscheduledPanel({ onSchedule }: { onSchedule: (patientId: string) => void }) {
  const [open, setOpen] = useState(false);
  const { data: patients = [] } = useQuery<any[]>({
    queryKey: ['unscheduled-patients'],
    queryFn: () => api.get('/patients', { params: { no_upcoming_appointment: 'true', limit: 20 } })
      .then(r => {
        const list: any[] = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
        return list.sort((a, b) => {
          const da = a.last_appointment_date ? new Date(a.last_appointment_date).getTime() : 0;
          const db = b.last_appointment_date ? new Date(b.last_appointment_date).getTime() : 0;
          return da - db;
        });
      }),
    staleTime: 30_000,
  });

  if (!patients.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-amber-800">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Pacientes sem consulta agendada ({patients.length})
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-2">
              {patients.map((p: any) => {
                const days = p.last_appointment_date
                  ? differenceInDays(new Date(), new Date(p.last_appointment_date))
                  : null;
                return (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {days != null
                          ? `Última consulta há ${days} dia(s)`
                          : 'Nunca consultou'}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onSchedule(p.id)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Agendar
                    </Button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Semana por Profissional View ───────────────────────────────────────────────

const WEEK_HOURS = Array.from({ length: 11 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`); // 08:00–18:00

const SEMANA_MOCK: Record<string, Record<string, { time: string; patient: string; type: string; status: string; color: string }[]>> = {
  'Dr. Murilo': {
    'Seg': [
      { time: '08:00', patient: 'Ana Lima', type: 'Retorno', status: 'CONFIRMADO', color: '#22c55e' },
      { time: '09:00', patient: 'Carlos Souza', type: 'Consulta Inicial', status: 'AGENDADO', color: '#6366f1' },
      { time: '10:30', patient: 'Marina Costa', type: 'Retorno', status: 'CONFIRMADO', color: '#22c55e' },
      { time: '14:00', patient: 'Pedro Gomes', type: 'Retorno', status: 'AGENDADO', color: '#6366f1' },
    ],
    'Ter': [
      { time: '09:00', patient: 'Juliana Rocha', type: 'Consulta Inicial', status: 'CONFIRMADO', color: '#22c55e' },
      { time: '11:00', patient: 'Roberto Alves', type: 'Retorno', status: 'AGENDADO', color: '#6366f1' },
    ],
    'Qua': [
      { time: '08:30', patient: 'Ana Lima', type: 'Aplicação', status: 'AGENDADO', color: '#FF6B00' },
      { time: '10:00', patient: 'Lucas Prado', type: 'Retorno', status: 'CONFIRMADO', color: '#22c55e' },
      { time: '15:00', patient: 'Fernanda Lima', type: 'Consulta Inicial', status: 'AGENDADO', color: '#6366f1' },
    ],
    'Qui': [],
    'Sex': [
      { time: '09:00', patient: 'Camila Dias', type: 'Retorno', status: 'CONFIRMADO', color: '#22c55e' },
    ],
  },
  'Amanda G.': {
    'Seg': [
      { time: '09:00', patient: 'Beatriz Fernandes', type: 'Soroterapia', status: 'CONFIRMADO', color: '#22c55e' },
      { time: '11:00', patient: 'Ana Lima', type: 'Soroterapia', status: 'AGENDADO', color: '#6366f1' },
    ],
    'Ter': [
      { time: '10:00', patient: 'Marina Costa', type: 'Aplicação HCG', status: 'CONFIRMADO', color: '#22c55e' },
      { time: '13:00', patient: 'Camila Dias', type: 'Gestrinona', status: 'AGENDADO', color: '#8b5cf6' },
    ],
    'Qua': [],
    'Qui': [
      { time: '09:00', patient: 'Fernanda Lima', type: 'Soroterapia', status: 'CONFIRMADO', color: '#22c55e' },
    ],
    'Sex': [
      { time: '14:00', patient: 'Juliana Rocha', type: 'Aplicação', status: 'AGENDADO', color: '#6366f1' },
    ],
  },
  'Dr. Andre': {
    'Seg': [],
    'Ter': [
      { time: '10:00', patient: 'Roberto Alves', type: 'Retorno', status: 'CONFIRMADO', color: '#22c55e' },
    ],
    'Qua': [
      { time: '09:00', patient: 'Pedro Gomes', type: 'Consulta Inicial', status: 'AGENDADO', color: '#6366f1' },
    ],
    'Qui': [
      { time: '11:00', patient: 'Carlos Souza', type: 'Retorno', status: 'CONFIRMADO', color: '#22c55e' },
      { time: '14:00', patient: 'Lucas Prado', type: 'Retorno', status: 'AGENDADO', color: '#6366f1' },
    ],
    'Sex': [],
  },
};

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

function SemanaProfView({ selectedProfessional, date, onNewAppointment }: {
  selectedProfessional: string;
  date: Date;
  onNewAppointment: (dateStr: string) => void;
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const allProfs = Object.keys(SEMANA_MOCK);
  const selectedLabel = MOCK_PROFESSIONALS.find(p => p.id === selectedProfessional)?.label;
  const profs = selectedProfessional === 'all'
    ? allProfs
    : allProfs.filter(name => name === selectedLabel);

  const [hoveredAppt, setHoveredAppt] = useState<string | null>(null);

  const totalSemana = profs.reduce((sum, p) =>
    sum + DIAS_SEMANA.reduce((s2, d) => s2 + (SEMANA_MOCK[p]?.[d]?.length ?? 0), 0), 0);

  if (profs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Calendar className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm font-medium">Nenhuma agenda encontrada para este profissional</p>
        <Button size="sm" className="mt-4" onClick={() => onNewAppointment(format(date, 'yyyy-MM-dd'))}>
          <Plus className="h-4 w-4" /> Agendar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 px-1">
        <p className="text-sm font-semibold">{totalSemana} consultas esta semana</p>
        <div className="flex gap-2 flex-wrap">
          {profs.map(p => {
            const count = DIAS_SEMANA.reduce((s, d) => s + (SEMANA_MOCK[p]?.[d]?.length ?? 0), 0);
            return (
              <span key={p} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {p}: {count}
              </span>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-white">
        {/* Header row with real dates */}
        <div className="grid border-b border-border bg-muted/40" style={{ gridTemplateColumns: `80px repeat(${DIAS_SEMANA.length}, 1fr)` }}>
          <div className="px-3 py-2 border-r border-border" />
          {weekDates.map((d, i) => (
            <div key={i} className="px-3 py-2 text-center border-r border-border last:border-r-0">
              <p className="text-xs font-semibold text-muted-foreground">{DIAS_SEMANA[i]}</p>
              <p className="text-[10px] text-muted-foreground/60">{format(d, 'dd/MM')}</p>
            </div>
          ))}
        </div>

        {profs.map((prof, pi) => (
          <div key={prof} className={cn('border-b border-border last:border-b-0', pi % 2 === 0 ? 'bg-white' : 'bg-muted/10')}>
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${DIAS_SEMANA.length}, 1fr)` }}>
              <div className="flex items-center px-3 py-3 border-r border-border">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                  {prof.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
              </div>
              {DIAS_SEMANA.map((dia, di) => {
                const appts = SEMANA_MOCK[prof]?.[dia] ?? [];
                const dateStr = format(weekDates[di], 'yyyy-MM-dd');
                return (
                  <div key={dia} className="p-2 border-r border-border last:border-r-0 min-h-[80px] space-y-1.5">
                    {appts.length === 0 ? (
                      <div className="flex items-center justify-center h-full min-h-[60px]">
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      </div>
                    ) : (
                      appts.map((appt, ai) => {
                        const key = `${prof}-${dia}-${ai}`;
                        return (
                          <div
                            key={key}
                            onMouseEnter={() => setHoveredAppt(key)}
                            onMouseLeave={() => setHoveredAppt(null)}
                            className="relative rounded-lg px-2 py-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: appt.color + '20', borderLeft: `3px solid ${appt.color}` }}
                          >
                            <p className="text-[10px] font-bold leading-tight" style={{ color: appt.color }}>{appt.time}</p>
                            <p className="text-[10px] font-semibold text-foreground leading-tight truncate">{appt.patient}</p>
                            <p className="text-[9px] text-muted-foreground leading-tight truncate">{appt.type}</p>
                            {hoveredAppt === key && (
                              <div className="absolute bottom-full left-0 mb-1 z-20 w-44 rounded-lg bg-gray-900 text-white text-[10px] p-2.5 shadow-xl leading-relaxed pointer-events-none">
                                <p className="font-bold">{appt.patient}</p>
                                <p>{appt.type} · {appt.time}</p>
                                <p className="mt-0.5 opacity-70">{appt.status}</p>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    <button
                      className="w-full text-[9px] text-muted-foreground/40 hover:text-primary hover:bg-primary/5 rounded py-0.5 transition-colors"
                      onClick={() => onNewAppointment(dateStr)}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="grid border-t border-border/30" style={{ gridTemplateColumns: `80px repeat(${DIAS_SEMANA.length}, 1fr)` }}>
              <div className="px-2 py-1 border-r border-border">
                <p className="text-[10px] font-semibold text-muted-foreground truncate">{prof}</p>
              </div>
              {DIAS_SEMANA.map(dia => <div key={dia} className="border-r border-border last:border-r-0" />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const [date, setDate] = useState(new Date());
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [preselectedTime, setPreselectedTime] = useState<Date | undefined>();
  const [preselectedPatient, setPreselectedPatient] = useState<string | undefined>();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'list' | 'slots' | 'kanban' | 'semana_prof'>('list');
  const [finalizeAppt, setFinalizeAppt] = useState<any>(null);
  const [slotInterval, setSlotInterval] = useState(30);
  const [activeTimerAppt, setActiveTimerAppt] = useState<any>(null);
  const [verDesmarcados, setVerDesmarcados] = useState(false);
  const [showProcurar, setShowProcurar] = useState(false);
  const [showImprimir, setShowImprimir] = useState(false);
  const [showConfirmacao, setShowConfirmacao] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [resumoAppt, setResumoAppt] = useState<any>(null);
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const patientNameFromUrl = searchParams.get('patientName');

  useEffect(() => {
    if (patientIdFromUrl) setPreselectedPatient(patientIdFromUrl);
  }, [patientIdFromUrl]);

  const handleScheduleUnscheduled = (patientId: string) => {
    setPreselectedPatient(patientId);
    setNewApptOpen(true);
  };
  const dateStr = format(date, 'yyyy-MM-dd');

  const handleSlotClick = (slotTime: Date) => {
    setPreselectedTime(slotTime);
    setNewApptOpen(true);
  };

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['agenda', dateStr],
    queryFn: () => api.get('/agenda', { params: { date: dateStr } }).then(r => r.data),
    staleTime: 30_000,
  });

  const { data: closingStatus } = useQuery({
    queryKey: ['closing', dateStr],
    queryFn: () => api.get(`/agenda/daily-closing/${dateStr}`).then(r => r.data),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openMenuId]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/agenda/${id}`, { status }).then(r => r.data),
    onSuccess: () => { toast.success('Status atualizado'); qc.invalidateQueries({ queryKey: ['agenda'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao atualizar status'),
  });

  const checkInMutation = useMutation({
    mutationFn: (appt: any) => api.post(`/agenda/${appt.id}/checkin`).then(r => ({ ...r, appt })),
    onSuccess: (r) => { toast.success('Check-in realizado'); setActiveTimerAppt(r.appt); qc.invalidateQueries({ queryKey: ['agenda'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro no check-in'),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => api.post(`/agenda/${id}/checkout`),
    onSuccess: () => { toast.success('Atendimento encerrado'); setActiveTimerAppt(null); qc.invalidateQueries({ queryKey: ['agenda'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro no check-out'),
  });

  const closingMutation = useMutation({
    mutationFn: () => api.post(`/agenda/daily-closing/${dateStr}`),
    onSuccess: () => { toast.success('Fechamento diário realizado!'); qc.invalidateQueries({ queryKey: ['closing', dateStr] }); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro no fechamento'),
  });

  // Compute unique types from today's appointments
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    appointments.forEach((a: any) => {
      const cat = a.service?.category ?? a.type;
      if (cat) types.add(cat);
    });
    return Array.from(types);
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const list: any[] = appointments ?? [];
    if (selectedProfessional === 'all') return list;
    return list.filter((a: any) =>
      a.professional_id === selectedProfessional ||
      (a.professional?.name ?? '').toLowerCase().includes(
        (MOCK_PROFESSIONALS.find((p: any) => p.id === selectedProfessional)?.label ?? '').toLowerCase()
      )
    );
  }, [appointments, selectedProfessional]);

  // Filter appointments
  const filtered = useMemo(() => {
    return filteredAppointments.filter((a: any) => {
      const typeMatch = filterType === 'ALL' || (a.service?.category ?? a.type) === filterType;
      const statusMatch = filterStatus === 'ALL' || a.status === filterStatus;
      const desmarcadoMatch = verDesmarcados || !['CANCELLED', 'MISSED'].includes(a.status);
      return typeMatch && statusMatch && desmarcadoMatch;
    });
  }, [filteredAppointments, filterType, filterStatus, verDesmarcados]);

  const completed = filteredAppointments.filter((a: any) => a.status === 'COMPLETED').length;
  const total = filteredAppointments.length;

  return (
    <div>
      <Topbar title="Agenda" />
      {patientNameFromUrl && preselectedPatient && (
        <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          <span className="flex-1">Filtrando por paciente: <strong>{decodeURIComponent(patientNameFromUrl)}</strong></span>
          <button
            onClick={() => setPreselectedPatient(undefined)}
            className="rounded p-0.5 hover:bg-blue-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="p-6 space-y-4">

        {/* Date Nav + Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(d => subDays(d, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold min-w-[200px] text-center capitalize">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </span>
            <button onClick={() => setDate(d => addDays(d, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setDate(new Date())} className="text-xs text-primary hover:underline ml-2">Hoje</button>
          </div>
          <div className="flex items-center gap-2">
            {total > 0 && <span className="text-xs text-muted-foreground">{completed}/{total} concluídos</span>}
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border p-0.5">
              <button onClick={() => setViewMode('list')} title="Lista"
                className={`flex items-center rounded p-1.5 transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                <List className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode('slots')} title="Horários"
                className={`flex items-center rounded p-1.5 transition-colors ${viewMode === 'slots' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                <Grid className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setViewMode('kanban')} title="Kanban"
                className={`flex items-center rounded p-1.5 transition-colors ${viewMode === 'kanban' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>
                <Columns className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('semana_prof')}
                title="Semana por Profissional"
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border', viewMode === 'semana_prof' ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />Semana
              </button>
            </div>
            {closingStatus && !closingStatus.already_closed && (
              <Button
                variant="secondary" size="sm"
                disabled={!closingStatus.can_close}
                onClick={() => closingMutation.mutate()}
                loading={closingMutation.isPending}
                title={!closingStatus.can_close ? `Bloqueado: ${closingStatus.checkin_pending} check-in(s) aberto(s)` : 'Fechar o dia'}
              >
                Fechar Dia
              </Button>
            )}
            {closingStatus?.already_closed && <Badge variant="success">Dia Fechado</Badge>}
            <Button size="sm" variant="secondary" onClick={() => setShowProcurar(true)}>
              <Search className="h-3.5 w-3.5 mr-1" /> Procurar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowImprimir(true)}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setShowConfirmacao(true)}>
              <MessageCircle className="h-3.5 w-3.5 mr-1" /> Confirmação
            </Button>
            <Button size="sm" onClick={() => setNewApptOpen(true)}>
              <Plus className="h-4 w-4" /> Agendar
            </Button>
          </div>
        </div>

        {/* Filters */}
        {total > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

            {/* Type filter */}
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setFilterType('ALL')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterType === 'ALL' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                Todos ({total})
              </button>
              {uniqueTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterType === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {TYPE_LABELS[t] ?? t} ({appointments.filter((a: any) => (a.service?.category ?? a.type) === t).length})
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div className="flex gap-1 ml-auto items-center">
              {['ALL', 'SCHEDULED', 'CHECKED_IN', 'COMPLETED'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors border ${
                    filterStatus === s
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {s === 'ALL' ? 'Todos' : STATUS_LABELS[s]}
                </button>
              ))}
              <label className="flex items-center gap-1.5 ml-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={verDesmarcados}
                  onChange={e => setVerDesmarcados(e.target.checked)}
                  className="rounded border-border accent-primary"
                />
                <span className="text-[11px] text-muted-foreground">Ver Desmarcados</span>
              </label>
            </div>
          </div>
        )}

        {/* Professional tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {MOCK_PROFESSIONALS.map(prof => (
            <button
              key={prof.id}
              onClick={() => setSelectedProfessional(prof.id)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border',
                selectedProfessional === prof.id
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              )}
              style={selectedProfessional === prof.id ? { backgroundColor: prof.color, borderColor: prof.color } : {}}
            >
              {prof.id !== 'all' && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ backgroundColor: selectedProfessional === prof.id ? 'rgba(255,255,255,0.3)' : prof.color + '20', color: selectedProfessional === prof.id ? 'white' : prof.color }}>
                  {prof.label.charAt(prof.label.indexOf(' ') + 1) || prof.label.charAt(0)}
                </span>
              )}
              {prof.label}
            </button>
          ))}
        </div>

        {/* Status legend — 13 MedX statuses */}
        <div className="rounded-xl border border-border bg-white p-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Legenda de Status</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {[
              { color: 'bg-indigo-400', label: 'Agendado' },
              { color: 'bg-emerald-400', label: 'Confirmado' },
              { color: 'bg-amber-500 animate-pulse', label: 'Na Espera' },
              { color: 'bg-blue-500 animate-pulse', label: 'Em Consulta' },
              { color: 'bg-purple-500 animate-pulse', label: 'Em Procedimento' },
              { color: 'bg-green-600', label: 'Concluído' },
              { color: 'bg-red-400', label: 'Cancelado' },
              { color: 'bg-red-600', label: 'Faltou / No-Show' },
              { color: 'bg-orange-400', label: 'Desmarcado' },
              { color: 'bg-amber-400', label: 'Reagendado' },
              { color: 'bg-yellow-400', label: 'Lista de Espera' },
              { color: 'bg-gray-400', label: 'Bloqueado' },
              { color: 'bg-slate-400', label: 'Pré-Agendado' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full flex-shrink-0', color)} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Doctor timer for in-progress appointments */}
        {activeTimerAppt && <DoctorTimer appointment={activeTimerAppt} />}

        {/* Unscheduled patients panel */}
        <UnscheduledPanel onSchedule={handleScheduleUnscheduled} />

        {/* Blocking alert */}
        {closingStatus && !closingStatus.can_close && !closingStatus.already_closed && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
            Fechamento bloqueado — {closingStatus.checkin_pending > 0 && `${closingStatus.checkin_pending} check-in(s) sem encerramento`}
            {closingStatus.checkin_pending > 0 && closingStatus.billing_pending > 0 && ' · '}
            {closingStatus.billing_pending > 0 && `${closingStatus.billing_pending} cobrança(s) pendente(s)`}
          </div>
        )}

        {/* Slot interval selector (only in slots view) */}
        {viewMode === 'slots' && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Intervalo:</span>
            {[15, 30, 50].map(m => (
              <button key={m} onClick={() => setSlotInterval(m)}
                className={`rounded-full px-2.5 py-1 font-medium border transition-colors ${slotInterval === m ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'}`}>
                {m}min
              </button>
            ))}
          </div>
        )}

        {/* Appointment content */}
        {viewMode === 'semana_prof' ? (
          <SemanaProfView
            selectedProfessional={selectedProfessional}
            date={date}
            onNewAppointment={(dateStr) => {
              const d = new Date(dateStr + 'T12:00:00');
              setPreselectedTime(d);
              setNewApptOpen(true);
            }}
          />
        ) : viewMode === 'kanban' ? (
          <KanbanView
            appointments={appointments}
            date={date}
            onFinalizeRequest={setFinalizeAppt}
          />
        ) : viewMode === 'slots' ? (
          <div className="rounded-xl border border-border bg-white p-4">
            <AgendaSlots
              date={date}
              appointments={appointments}
              slotMinutes={slotInterval}
              onSlotClick={handleSlotClick}
            />
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">
              {total === 0 ? 'Nenhuma consulta para este dia' : 'Nenhum resultado para os filtros aplicados'}
            </p>
            {total === 0 && (
              <>
                <p className="text-xs mt-1 mb-4">Clique em "Agendar" para adicionar o primeiro atendimento</p>
                <Button size="sm" onClick={() => setNewApptOpen(true)}>
                  <Plus className="h-4 w-4" /> Agendar Consulta
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((a: any) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between rounded-xl border border-border bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[52px]">
                    <p className="text-sm font-bold tabular-nums">{format(new Date(a.start_time), 'HH:mm')}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{format(new Date(a.end_time), 'HH:mm')}</p>
                  </div>
                  <div>
                    <button
                      className="text-sm font-semibold text-left hover:text-primary transition-colors"
                      onClick={() => router.push(`/patients/${a.patient_id}`)}
                    >
                      {a.patient?.full_name}
                    </button>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {a.service?.name ?? TYPE_LABELS[a.type] ?? a.type}
                        {a.professional?.name ? ` · Dr(a). ${a.professional.name}` : ''}
                      </p>
                      {a.service?.category && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{a.service.category}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_COLORS[a.status] as any}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </Badge>
                  {a.transactions?.some((t: any) => t.status === 'PENDING') && (
                    <span title="Cobrança pendente" className="flex items-center gap-0.5 text-[10px] font-medium text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                      <DollarSign className="h-2.5 w-2.5" />Pendente
                    </span>
                  )}
                  {['SCHEDULED', 'CONFIRMED'].includes(a.status) && (
                    <Button size="sm" variant="ghost" title="Registrar check-in"
                      onClick={() => checkInMutation.mutate(a)} loading={checkInMutation.isPending}>
                      <UserCheck className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {['CHECKED_IN', 'IN_PROGRESS'].includes(a.status) && (
                    <Button size="sm" variant="ghost" title="Finalizar consulta"
                      onClick={() => setFinalizeAppt(a)} className="text-green-600 hover:text-green-700">
                      <CheckSquare className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {['CHECKED_IN', 'IN_PROGRESS'].includes(a.status) && (
                    <Button size="sm" variant="ghost" title="Encerrar atendimento"
                      onClick={() => checkOutMutation.mutate(a.id)} loading={checkOutMutation.isPending}>
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {/* More actions dropdown */}
                  <div className="relative">
                    <Button size="sm" variant="ghost" title="Mais ações"
                      onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === a.id ? null : a.id); }}>
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                    {openMenuId === a.id && (
                      <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border border-border bg-white shadow-xl py-1" onClick={e => e.stopPropagation()}>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                          onClick={() => { setResumoAppt(a); setOpenMenuId(null); }}>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Resumo
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                          onClick={() => { router.push(`/clinical?patientId=${a.patient_id}&patientName=${encodeURIComponent(a.patient?.full_name ?? '')}`); setOpenMenuId(null); }}>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Prontuário
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                          onClick={() => { router.push(`/financial?patientId=${a.patient_id}&patientName=${encodeURIComponent(a.patient?.full_name ?? '')}`); setOpenMenuId(null); }}>
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" /> Financeiro
                        </button>
                        {!['COMPLETED', 'CANCELLED', 'MISSED'].includes(a.status) && (
                          <>
                            <div className="border-t border-border my-1" />
                            {a.status !== 'CONFIRMED' && (
                              <button className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                                onClick={() => { statusMutation.mutate({ id: a.id, status: 'CONFIRMED' }); setOpenMenuId(null); }}>
                                <CheckSquare className="h-3.5 w-3.5 text-green-600" /> Confirmar
                              </button>
                            )}
                            <button className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                              onClick={() => { statusMutation.mutate({ id: a.id, status: 'MISSED' }); setOpenMenuId(null); }}>
                              <X className="h-3.5 w-3.5 text-amber-500" /> Faltou
                            </button>
                            <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                              onClick={() => { statusMutation.mutate({ id: a.id, status: 'CANCELLED' }); setOpenMenuId(null); }}>
                              <X className="h-3.5 w-3.5" /> Cancelar
                            </button>
                          </>
                        )}
                        <div className="border-t border-border my-1" />
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors"
                          onClick={() => { setPreselectedPatient(a.patient_id); setNewApptOpen(true); setOpenMenuId(null); }}>
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Remarcar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <NewAppointmentModal
        open={newApptOpen}
        onClose={() => { setNewApptOpen(false); setPreselectedTime(undefined); setPreselectedPatient(undefined); }}
        preselectedTime={preselectedTime}
        preselectedPatientId={preselectedPatient}
      />

      <FinalizeModal
        appointment={finalizeAppt}
        open={!!finalizeAppt}
        onClose={() => setFinalizeAppt(null)}
      />

      <ProcurarModal open={showProcurar} onClose={() => setShowProcurar(false)} onNavigate={(d) => { setDate(d); setViewMode('list'); }} />
      <ImprimirAgendaModal open={showImprimir} onClose={() => setShowImprimir(false)} />
      <ConfirmacaoModal open={showConfirmacao} onClose={() => setShowConfirmacao(false)} />
      <AppointmentResumoModal appt={resumoAppt} onClose={() => setResumoAppt(null)} />
    </div>
  );
}
