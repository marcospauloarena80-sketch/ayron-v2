'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Card, CardHeader, CardTitle, CardValue } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PatientBriefModal } from '@/components/patients/patient-brief-modal';
import {
  Calendar, Users, DollarSign, TrendingUp, TrendingDown, Brain, AlertTriangle,
  ShieldAlert, ArrowUp, ArrowDown, Minus, UserPlus, Activity, BarChart2,
  Percent, UserX, CheckCircle2, Clock, ChevronRight, ChevronDown, Trash2,
  FileText, Megaphone, Package, MessageSquare, BarChart3, Repeat2, Star,
  HelpCircle, Settings, X,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function riskColor(score: number) {
  if (score >= 70) return 'text-red-600 bg-red-50 border-red-200';
  if (score >= 40) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-green-700 bg-green-50 border-green-200';
}

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === 'UP') return <ArrowUp className="h-3 w-3 text-red-500" />;
  if (trend === 'DOWN') return <ArrowDown className="h-3 w-3 text-green-500" />;
  return <Minus className="h-3 w-3 text-gray-400" />;
}

function ClinicalTrendIcon({ trend }: { trend?: string }) {
  if (trend === 'UP') return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (trend === 'DOWN') return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-gray-400" />;
}

// ── Quick Access Brain Button ─────────────────────────────────────────────────

function QuickAccessButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const MODULES = [
    { href: '/patients',  label: 'Pacientes',     icon: Users },
    { href: '/agenda',    label: 'Agenda',         icon: Calendar },
    { href: '/clinical',  label: 'Prontuários',    icon: FileText },
    { href: '/financial', label: 'Financeiro',     icon: DollarSign },
    { href: '/marketing', label: 'Marketing',      icon: Megaphone },
    { href: '/inventory', label: 'Estoque',        icon: Package },
    { href: '/messages',  label: 'Mensagens',      icon: MessageSquare },
    { href: '/analytics', label: 'Insights',       icon: BarChart3 },
    { href: '/sessions',  label: 'Sessões',        icon: Repeat2 },
    { href: '/qualidade', label: 'Qualidade',      icon: Star },
    { href: '/ajuda',     label: 'Ajuda',          icon: HelpCircle },
    { href: '/settings',  label: 'Configurações',  icon: Settings },
    { href: '/ayron',     label: 'AYRON',          icon: Brain },
  ];

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="group flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 px-5 py-3 transition-all hover:shadow-md active:scale-95"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 shadow-sm group-hover:bg-orange-600 transition-colors">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-orange-700">Acesso Rápido Global</p>
          <p className="text-xs text-orange-500">Navegue para qualquer módulo</p>
        </div>
        <ChevronRight className={`h-4 w-4 text-orange-400 ml-auto transition-transform ${open ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 z-50 w-80 rounded-2xl border border-border bg-white shadow-2xl p-3"
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos</p>
              <button onClick={() => setOpen(false)} className="rounded-md p-0.5 hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {MODULES.map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  onClick={() => { router.push(href); setOpen(false); }}
                  className="flex flex-col items-center gap-1 rounded-xl p-2.5 hover:bg-primary/5 hover:text-primary transition-colors text-muted-foreground group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Executive Block ───────────────────────────────────────────────────────────

function ExecutiveBlock({ data }: { data?: any }) {
  const router = useRouter();
  if (!data) return null;

  const retentionColor =
    data.retention_rate >= 70 ? 'text-green-700 bg-green-50 border-green-200'
    : data.retention_rate >= 40 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : 'text-red-700 bg-red-50 border-red-200';

  const nspColor =
    data.avg_nsp_this_week >= 70 ? 'text-red-600'
    : data.avg_nsp_this_week >= 40 ? 'text-yellow-600'
    : 'text-green-600';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      <Card className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Receita Projetada 30d</span>
        </div>
        <p className="text-xl font-bold text-foreground">
          R$ {Number(data.projected_revenue_30d).toLocaleString('pt-BR')}
        </p>
        <p className="text-xs text-muted-foreground">pendente + estimativa</p>
      </Card>

      <Card className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Percent className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Retention Rate</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold text-foreground">{data.retention_rate}%</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${retentionColor}`}>
            {data.retention_rate >= 70 ? 'Bom' : data.retention_rate >= 40 ? 'Alerta' : 'Crítico'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">pacientes c/ consulta 30d</p>
      </Card>

      <Card className="p-4 space-y-1 cursor-pointer hover:bg-muted/40 transition-colors"
        onClick={() => router.push('/alerts')}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <UserX className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Risco Dropout</span>
        </div>
        <p className={`text-xl font-bold ${data.high_dropout_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {data.high_dropout_count}
        </p>
        <p className="text-xs text-muted-foreground">pacientes DR30 &gt; 70%</p>
      </Card>

      <Card className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">NSP Médio (semana)</span>
        </div>
        <p className={`text-xl font-bold ${nspColor}`}>{data.avg_nsp_this_week}%</p>
        <p className="text-xs text-muted-foreground">prob. falta agenda</p>
      </Card>

      <Card className="p-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BarChart2 className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Ocupação 14 dias</span>
        </div>
        <p className={`text-xl font-bold ${data.occupation_14d >= 80 ? 'text-green-600' : data.occupation_14d >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
          {data.occupation_14d}%
        </p>
        <p className="text-xs text-muted-foreground">slots próximos 14d</p>
      </Card>
    </div>
  );
}

// ── TopRisk Block ─────────────────────────────────────────────────────────────

function TopRiskBlock() {
  const router = useRouter();
  const qc = useQueryClient();
  const [briefPatient, setBriefPatient] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ['cognitive-top-risk'],
    queryFn: () => api.get('/cognitive/top-risk?limit=10').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const addWaitlistMutation = useMutation({
    mutationFn: (patientId: string) =>
      api.post(`/cognitive/patients/${patientId}/actions/add-waitlist`, { priority: 'high', reason: 'RETURN' }),
    onSuccess: () => { toast.success('Adicionado à waitlist'); qc.invalidateQueries({ queryKey: ['cognitive-top-risk'] }); },
    onError: () => toast.error('Erro ao adicionar à waitlist'),
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
              <ShieldAlert className="h-4 w-4 text-red-500" />
            </div>
            <CardTitle>Pacientes em Risco Alto</CardTitle>
          </div>
        </CardHeader>
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum paciente em risco alto.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.map((entry: any) => (
                <div key={entry.patient_id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{entry.patient?.full_name ?? 'Paciente'}</p>
                      <p className="text-xs text-muted-foreground">CSS {entry.clinical_stability_score} · RRS {entry.retention_risk_score}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${riskColor(entry.composite_risk_score)}`}>
                        CRS {entry.composite_risk_score}
                      </span>
                      <TrendIcon trend={entry.score_trend} />
                      {entry.dropout_risk_30d > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${riskColor(entry.dropout_risk_30d)}`}>
                          DR30 {entry.dropout_risk_30d}%
                        </span>
                      )}
                      {entry.no_show_probability > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium">
                          NSP {entry.no_show_probability}%
                        </span>
                      )}
                      <ClinicalTrendIcon trend={entry.clinical_trend} />
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Button size="sm" variant="secondary" className="h-6 text-xs px-2 gap-1"
                      onClick={() => setBriefPatient({ id: entry.patient_id, name: entry.patient?.full_name })}>
                      <Brain className="h-3 w-3" />Brief
                    </Button>
                    <Button size="sm" variant="secondary" className="h-6 text-xs px-2 gap-1"
                      onClick={() => router.push(`/agenda?patientId=${entry.patient_id}`)}>
                      <Calendar className="h-3 w-3" />Agendar
                    </Button>
                    <Button size="sm" variant="secondary" className="h-6 text-xs px-2 gap-1"
                      onClick={() => addWaitlistMutation.mutate(entry.patient_id)}
                      disabled={addWaitlistMutation.isPending}>
                      <UserPlus className="h-3 w-3" />Waitlist
                    </Button>
                    <Button size="sm" variant="secondary" className="h-6 text-xs px-2 gap-1"
                      onClick={() => router.push(`/financial?patientId=${entry.patient_id}`)}>
                      <DollarSign className="h-3 w-3" />Financeiro
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {briefPatient && (
        <PatientBriefModal
          patientId={briefPatient.id}
          patientName={briefPatient.name}
          open={!!briefPatient}
          onClose={() => setBriefPatient(null)}
        />
      )}
    </>
  );
}

function StatCard({ title, value, sub, icon: Icon, href }: { title: string; value: any; sub?: string; icon: any; href?: string }) {
  const router = useRouter();
  return (
    <Card
      onClick={href ? () => router.push(href) : undefined}
      className={href ? 'cursor-pointer hover:shadow-md active:scale-[0.98] transition-all' : ''}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardValue>{value ?? '—'}</CardValue>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

// ── Task execution time by priority (minutes) ─────────────────────────────────
const TASK_TIME: Record<string, number> = {
  CRITICAL: 30,
  HIGH: 20,
  MEDIUM: 15,
  LOW: 10,
};

const TASK_PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-blue-100 text-blue-700 border-blue-200',
};

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function TopTasksBlock() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ['dashboard-top-tasks'],
    queryFn: () => api.get('/tasks?due=today&limit=50').then(r => {
      const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
      return list.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
    }),
    refetchInterval: 60_000,
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/complete`, {}).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-top-tasks'] });
      toast.success('Tarefa concluída');
    },
    onError: () => toast.error('Erro ao concluir tarefa'),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tarefas do Dia</CardTitle>
        </CardHeader>
        <div className="px-4 pb-4 space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </Card>
    );
  }

  const sorted = [...(data ?? [])].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  const top10 = sorted.slice(0, 10);
  const remaining = sorted.length - top10.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
              <CheckCircle2 className="h-4 w-4 text-orange-500" />
            </div>
            <CardTitle>Tarefas do Dia</CardTitle>
          </div>
          <button
            onClick={() => router.push('/tasks')}
            className="text-xs text-primary hover:underline"
          >
            Ver todas
          </button>
        </div>
      </CardHeader>
      <div className="px-4 pb-4">
        {top10.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma tarefa para hoje. 🎉</p>
        ) : (
          <div className="space-y-2">
            {top10.map((task: any, idx: number) => {
              const minutes = TASK_TIME[task.priority] ?? 15;
              const isOverdue = new Date(task.due_at) < new Date();
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/30 ${isOverdue ? 'border-red-200 bg-red-50/40' : 'border-border bg-white'}`}
                >
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{task.title}</p>
                    {task.patient && (
                      <p className="text-[10px] text-muted-foreground truncate">{task.patient.full_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${TASK_PRIORITY_COLORS[task.priority]}`}>
                      {task.priority === 'CRITICAL' ? '🔴' : task.priority === 'HIGH' ? '🟠' : task.priority === 'MEDIUM' ? '🟡' : '🔵'} {task.priority}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />{minutes}m
                    </span>
                    <button
                      onClick={() => completeMutation.mutate(task.id)}
                      disabled={completeMutation.isPending}
                      className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors"
                      title="Concluir"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {remaining > 0 && (
              <button
                onClick={() => router.push('/tasks')}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 rounded-lg border border-dashed border-border hover:border-primary/40 transition-colors"
              >
                + {remaining} tarefa{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Mock data for recent patients ─────────────────────────────────────────────
const MOCK_RECENT = [
  { id: '1', patient: { full_name: 'Ana Lima' }, start_time: new Date().toISOString(), type: 'CONSULTATION' },
  { id: '2', patient: { full_name: 'Carlos Mendes' }, start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), type: 'FOLLOW_UP' },
  { id: '3', patient: { full_name: 'Beatriz Souza' }, start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), type: 'CONSULTATION' },
  { id: '4', patient: { full_name: 'Ricardo Nunes' }, start_time: new Date(Date.now() - 90 * 60 * 1000).toISOString(), type: 'EVALUATION' },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── Recent Patients Block ─────────────────────────────────────────────────────
function RecentPatientsBlock() {
  const router = useRouter();

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ['recent-patients'],
    queryFn: () => api.get('/agenda?status=COMPLETED&limit=5&date=today').then(r => r.data).catch(() => MOCK_RECENT),
    staleTime: 2 * 60 * 1000,
  });

  const patients = data ?? MOCK_RECENT;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <CardTitle>👥 Pacientes Atendidos Recentemente</CardTitle>
        </div>
      </CardHeader>
      <div className="px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : patients.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum atendimento concluído hoje.</p>
        ) : (
          <div className="divide-y divide-border">
            {patients.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-3 py-3">
                {/* Avatar placeholder */}
                <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">
                    {appt.patient?.full_name?.[0] ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{appt.patient?.full_name ?? 'Paciente'}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(appt.start_time)} · {appt.type}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => router.push(`/patients/${appt.patient_id ?? appt.id}/contacts`)}
                    className="text-xs text-primary hover:underline"
                  >
                    Contatos
                  </button>
                  <span className="text-muted-foreground text-xs">|</span>
                  <button
                    onClick={() => router.push(`/patients/${appt.patient_id ?? appt.id}/records`)}
                    className="text-xs text-primary hover:underline"
                  >
                    Prontuário
                  </button>
                  <span className="text-muted-foreground text-xs">|</span>
                  <button
                    onClick={() => router.push(`/agenda?patientId=${appt.patient_id ?? appt.id}`)}
                    className="text-xs text-primary hover:underline"
                  >
                    Agenda
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Notes & Reminders Block ───────────────────────────────────────────────────
interface Note {
  id: string;
  text: string;
  date: string;
  usuario: string;
  lembrete: string;
  concluido: boolean;
}

function NotesBlock() {
  const [showNotes, setShowNotes] = useState(true);
  const [notes, setNotes] = useState<Note[]>([
    { id: '1', text: 'Verificar resultado exames Ana Lima', date: '2026-04-24', usuario: 'Fernanda', lembrete: '2026-04-25', concluido: false },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [newNote, setNewNote] = useState({ text: '', lembrete: '' });

  function handleSave() {
    if (!newNote.text.trim()) { toast.error('Escreva uma nota'); return; }
    const note: Note = {
      id: Date.now().toString(),
      text: newNote.text,
      date: new Date().toISOString().slice(0, 10),
      usuario: 'Você',
      lembrete: newNote.lembrete,
      concluido: false,
    };
    setNotes((prev) => [note, ...prev]);
    setNewNote({ text: '', lembrete: '' });
    setShowForm(false);
    toast.success('Nota salva');
  }

  function handleDelete(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success('Nota excluída');
  }

  function handleToggle(id: string) {
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, concluido: !n.concluido } : n));
  }

  return (
    <Card>
      {/* Section header */}
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="flex items-center gap-2 group"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-50">
                <span className="text-base">📝</span>
              </div>
              <CardTitle>Notas & Lembretes</CardTitle>
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                {notes.length}
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showNotes ? '' : '-rotate-90'}`} />
            </button>
          </div>
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : '+ Novo'}
          </Button>
        </div>
      </CardHeader>

      {showNotes && (
        <div className="px-4 pb-4 space-y-3">
          {/* Inline form */}
          {showForm && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nota</label>
                <textarea
                  rows={3}
                  value={newNote.text}
                  onChange={(e) => setNewNote((f) => ({ ...f, text: e.target.value }))}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none bg-white"
                  placeholder="Escreva sua nota..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Data lembrete</label>
                <input
                  type="date"
                  value={newNote.lembrete}
                  onChange={(e) => setNewNote((f) => ({ ...f, lembrete: e.target.value }))}
                  className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="h-7 text-xs">Salvar</Button>
                <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => { setShowForm(false); setNewNote({ text: '', lembrete: '' }); }}>Cancelar</Button>
              </div>
            </div>
          )}

          {/* Notes table */}
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma nota cadastrada.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Nota</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Data</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Usuário</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Lembrete</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Concluído</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">Excluir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {notes.map((note) => (
                    <tr key={note.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 max-w-[260px]">
                        <span className={`text-sm ${note.concluido ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {note.text}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{note.date}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{note.usuario}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{note.lembrete || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={note.concluido}
                          onChange={() => handleToggle(note.id)}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Welcome Modal ─────────────────────────────────────────────────────────────

const PROFILE_CONTENT: Record<string, { icon: string; title: string; items: { icon: string; label: string; desc: string }[] }> = {
  medico: {
    icon: '🩺',
    title: 'Bem-vindo, Médico!',
    items: [
      { icon: '📋', label: 'Prontuário Eletrônico', desc: 'Acesse evoluções, receitas e exames do paciente' },
      { icon: '🤖', label: 'AYRON IA', desc: 'Análise clínica inteligente e diagnósticos diferenciais' },
      { icon: '📅', label: 'Agenda', desc: 'Visualize sua agenda do dia e confirme consultas' },
      { icon: '💊', label: 'Receituário Digital', desc: 'Emita receitas com assinatura digital integrada' },
    ],
  },
  recepcao: {
    icon: '💼',
    title: 'Bem-vindo à Recepção!',
    items: [
      { icon: '📅', label: 'Agenda do Dia', desc: 'Confirme, cancele e remarque consultas rapidamente' },
      { icon: '👥', label: 'Cadastro de Pacientes', desc: 'Registre novos pacientes e atualize dados cadastrais' },
      { icon: '✅', label: 'Check-in', desc: 'Registre a chegada dos pacientes na agenda' },
      { icon: '📨', label: 'Confirmações', desc: 'Envie confirmações via WhatsApp ou SMS' },
    ],
  },
  financeiro: {
    icon: '💰',
    title: 'Bem-vindo ao Financeiro!',
    items: [
      { icon: '💵', label: 'Lançamentos', desc: 'Registre receitas, despesas e pagamentos' },
      { icon: '📊', label: 'Relatórios', desc: 'Visualize faturamento por período e profissional' },
      { icon: '🧾', label: 'OMIE / NF-e', desc: 'Integração com sistema contábil e emissão de notas' },
      { icon: '💳', label: 'Stone / Pagar.Me', desc: 'Acompanhe transações de cartão em tempo real' },
    ],
  },
  admin: {
    icon: '⚙️',
    title: 'Bem-vindo, Administrador!',
    items: [
      { icon: '📈', label: 'Insights', desc: 'Veja métricas completas da clínica em tempo real' },
      { icon: '👥', label: 'Usuários & Permissões', desc: 'Gerencie acessos e perfis da equipe' },
      { icon: '🔧', label: 'Configurações', desc: 'Configure todos os módulos do sistema' },
      { icon: '🤖', label: 'AYRON IA', desc: 'Configure alertas inteligentes e automações' },
    ],
  },
};

function WelcomeModal() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('ayron_welcomed') !== 'true'; } catch { return false; }
  });
  const [neverShow, setNeverShow] = useState(false);
  const [profile, setProfile] = useState('admin');

  const content = PROFILE_CONTENT[profile] ?? PROFILE_CONTENT.admin;

  function handleClose() {
    if (neverShow) {
      try { localStorage.setItem('ayron_welcomed', 'true'); } catch {}
    }
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-primary to-secondary px-6 py-6 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-xl">{content.icon}</div>
            <div>
              <h2 className="text-lg font-bold">{content.title}</h2>
              <p className="text-xs text-white/70">Sistema AYRON · Versão 2.0</p>
            </div>
          </div>
          {/* Profile switcher */}
          <div className="flex gap-1.5 mt-4">
            {Object.keys(PROFILE_CONTENT).map(k => (
              <button
                key={k}
                onClick={() => setProfile(k)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize transition-colors border',
                  profile === k ? 'bg-white text-primary border-white' : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
                )}
              >
                {k === 'recepcao' ? 'Recepção' : k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tutorial tiles */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Recursos principais do seu perfil:</p>
          <div className="grid grid-cols-2 gap-2.5">
            {content.items.map(({ icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5 rounded-xl border border-border p-3 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer">
                <span className="text-lg flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t bg-muted/30">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={neverShow}
              onChange={e => setNeverShow(e.target.checked)}
              className="accent-primary h-3.5 w-3.5"
            />
            <span className="text-xs text-muted-foreground">Não mostrar novamente</span>
          </label>
          <Button size="sm" onClick={handleClose}>Começar a usar →</Button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 30_000,
  });

  const { data: weekly } = useQuery({
    queryKey: ['dashboard-weekly'],
    queryFn: () => api.get('/dashboard/weekly').then(r => r.data),
  });

  return (
    <div>
      <WelcomeModal />
      <Topbar title="Dashboard" />
      <div className="p-6 space-y-6">

        {/* Quick Access Brain Button */}
        <QuickAccessButton />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Consultas Hoje" value={overview?.today?.total ?? 0} sub={`${overview?.today?.completed ?? 0} concluídas · ${overview?.today?.checked_in ?? 0} em atendimento`} icon={Calendar} href="/agenda" />
          <StatCard title="Pacientes Ativos" value={overview?.patients?.active ?? 0} sub={`+${overview?.patients?.new_this_month ?? 0} este mês`} icon={Users} href="/patients" />
          <StatCard title="Receita do Mês" value={overview?.financial?.monthly_revenue != null ? `R$ ${Number(overview.financial.monthly_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} sub={`${overview?.financial?.pending_count ?? 0} cobranças pendentes`} icon={DollarSign} href="/financial" />
          <StatCard title="Taxa de Ocupação" value={`${overview?.today?.occupation_rate ?? 0}%`} sub="Hoje" icon={TrendingUp} href="/agenda" />
        </div>

        {/* Alerts */}
        {(overview?.alerts?.pending_decisions > 0 || overview?.alerts?.low_stock > 0) && (
          <div className="flex flex-wrap gap-3">
            {overview.alerts.pending_decisions > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
                <Brain className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700 font-medium">{overview.alerts.pending_decisions} decisão(ões) AYRON aguardando aprovação</span>
              </div>
            )}
            {overview.alerts.low_stock > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700 font-medium">{overview.alerts.low_stock} item(ns) com estoque baixo</span>
              </div>
            )}
          </div>
        )}

        {/* Chart (full width) + Top Tasks */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Consultas e Receita — Últimos 7 dias</CardTitle>
              </CardHeader>
              {isLoading ? (
                <div className="h-[220px] animate-pulse rounded-lg bg-muted m-4" />
              ) : weekly ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weekly} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any, name: string) => [name === 'revenue' ? `R$ ${Number(v).toLocaleString('pt-BR')}` : v, name === 'revenue' ? 'Receita' : 'Consultas']} />
                    <Bar dataKey="appointments" fill="#1B3A4B" radius={[4, 4, 0, 0]} name="Consultas" />
                    <Bar dataKey="revenue" fill="#FF6B00" radius={[4, 4, 0, 0]} name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
              )}
            </Card>
          </div>

          {/* Top 10 Tasks */}
          <TopTasksBlock />
        </div>

        {/* Executive Intelligence Block */}
        {overview?.executive && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Inteligência Executiva</p>
            <ExecutiveBlock data={overview.executive} />
          </div>
        )}

        {/* Cognitive Risk Block */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <TopRiskBlock />
        </div>

        {/* Notas & Lembretes */}
        <NotesBlock />

        {/* Pacientes Atendidos Recentemente */}
        <RecentPatientsBlock />

      </div>
    </div>
  );
}
