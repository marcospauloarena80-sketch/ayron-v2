'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/topbar';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  CheckCircle2, Clock, AlertTriangle, XCircle,
  Calendar, Phone, DollarSign, FileText, Activity, User, ChevronDown,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  due_at: string;
  status: string;
  owner_role_target: string;
  source?: string;
  resolution_note?: string;
  snoozed_until?: string;
  patient?: { id: string; full_name: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  HIGH:     'bg-orange-100 text-orange-700 border-orange-300',
  MEDIUM:   'bg-yellow-100 text-yellow-700 border-yellow-300',
  LOW:      'bg-blue-100 text-blue-700 border-blue-300',
};

const TYPE_ICONS: Record<string, any> = {
  SCHEDULE_VISIT: Calendar,
  CONTACT_PATIENT: Phone,
  COLLECT_PAYMENT: DollarSign,
  REQUEST_DOCUMENT: FileText,
  FOLLOWUP_IMPLANT: Activity,
  FOLLOWUP_PROTOCOL: Activity,
  OTHER: User,
};

const TYPE_LABELS: Record<string, string> = {
  SCHEDULE_VISIT: 'Agendar',
  CONTACT_PATIENT: 'Contatar',
  COLLECT_PAYMENT: 'Cobrar',
  REQUEST_DOCUMENT: 'Documento',
  FOLLOWUP_IMPLANT: 'Implante',
  FOLLOWUP_PROTOCOL: 'Protocolo',
  OTHER: 'Outro',
};

function isOverdue(dueAt: string) {
  return new Date(dueAt) < new Date();
}

function fmtDue(dueAt: string) {
  const d = new Date(dueAt);
  const today = new Date();
  const diff = Math.round((d.getTime() - today.setHours(0,0,0,0)) / 86400000);
  if (diff < 0) return `Atrasada ${Math.abs(diff)}d`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return d.toLocaleDateString('pt-BR');
}

// ── Task Card ──────────────────────────────────────────────────────────────────

function TaskCard({ task, onAction }: { task: Task; onAction: (id: string, action: string, extra?: any) => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICONS[task.type] ?? User;
  const overdue = isOverdue(task.due_at) && task.status !== 'DONE' && task.status !== 'CANCELLED';

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-3 ${overdue ? 'border-red-300' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-gray-100 shrink-0">
            <Icon className="h-4 w-4 text-gray-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
            {task.patient && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => router.push(`/patients/${task.patient!.id}`)}
              >
                {task.patient.full_name}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            title={expanded ? 'Recolher' : 'Ver detalhes'}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{task.message}</p>

      {expanded && (
        <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 space-y-1.5 text-xs">
          <p className="font-medium text-foreground">Detalhes da pendência</p>
          {task.source && <p className="text-muted-foreground">Origem: <span className="font-medium">{task.source}</span></p>}
          {task.resolution_note && <p className="text-muted-foreground">Nota: {task.resolution_note}</p>}
          <div className="flex gap-2 flex-wrap pt-1">
            {task.patient && (
              <button
                className="flex items-center gap-1 text-xs text-primary border border-primary/30 hover:bg-primary/5 px-2 py-0.5 rounded transition-colors"
                onClick={() => router.push(`/patients/${task.patient!.id}`)}
              >
                Ver paciente
              </button>
            )}
            {task.type === 'SCHEDULE_VISIT' && task.patient && (
              <button
                className="flex items-center gap-1 text-xs text-primary border border-primary/30 hover:bg-primary/5 px-2 py-0.5 rounded transition-colors"
                onClick={() => router.push(`/agenda`)}
              >
                Abrir agenda
              </button>
            )}
            {task.type === 'COLLECT_PAYMENT' && task.patient && (
              <button
                className="flex items-center gap-1 text-xs text-primary border border-primary/30 hover:bg-primary/5 px-2 py-0.5 rounded transition-colors"
                onClick={() => router.push(`/patients/${task.patient!.id}?tab=financeiro`)}
              >
                Ver financeiro
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-muted-foreground'}`}>
          {overdue ? <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{fmtDue(task.due_at)}</span> : fmtDue(task.due_at)}
        </span>
        <span className="text-xs text-muted-foreground">{TYPE_LABELS[task.type] ?? task.type}</span>
      </div>

      {task.status === 'OPEN' || task.status === 'IN_PROGRESS' ? (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onAction(task.id, 'complete')}
            className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" /> Concluir
          </button>
          <button
            onClick={() => onAction(task.id, 'start')}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg transition-colors"
          >
            Iniciar
          </button>
          <button
            onClick={() => onAction(task.id, 'snooze', { days: 1 })}
            className="flex items-center gap-1 text-xs border border-border hover:bg-muted px-2 py-1 rounded-lg transition-colors"
          >
            <Clock className="h-3 w-3" /> +1d
          </button>
          <button
            onClick={() => onAction(task.id, 'snooze', { days: 3 })}
            className="text-xs border border-border hover:bg-muted px-2 py-1 rounded-lg transition-colors"
          >
            +3d
          </button>
          <button
            onClick={() => onAction(task.id, 'snooze', { days: 7 })}
            className="text-xs border border-border hover:bg-muted px-2 py-1 rounded-lg transition-colors"
          >
            +7d
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {task.status === 'DONE' ? (
            <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" /> Concluída</span>
          ) : task.status === 'SNOOZED' ? (
            <span className="flex items-center gap-1 text-xs text-yellow-600"><Clock className="h-3 w-3" /> Adiada</span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500"><XCircle className="h-3 w-3" /> Cancelada</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type DueFilter = 'all' | 'overdue' | 'today' | 'week';
type StatusFilter = 'open' | 'done' | 'snoozed';

export default function TasksPage() {
  const qc = useQueryClient();
  const [due, setDue] = useState<DueFilter>('today');
  const [priority, setPriority] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', due, priority],
    queryFn: () => {
      const params = new URLSearchParams();
      if (due !== 'all') params.set('due', due);
      if (priority) params.set('priority', priority);
      params.set('limit', '50');
      return api.get(`/tasks?${params}`).then((r) => r.data);
    },
    refetchInterval: 60_000,
  });

  const tasks: Task[] = Array.isArray(data) ? data : (data?.data ?? []);

  const mutation = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: string; body?: any }) =>
      api.post(`/tasks/${id}/${action}`, body ?? {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks-count'] });
      toast.success('Tarefa atualizada');
    },
    onError: () => toast.error('Erro ao atualizar tarefa'),
  });

  const handleAction = (id: string, action: string, extra?: any) => {
    mutation.mutate({ id, action, body: extra });
  };

  const openCount = tasks.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const overdueCount = tasks.filter((t) => isOverdue(t.due_at) && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Topbar title="Inbox Operacional" />
      <div className="flex-1 p-6 space-y-6">

        {/* Summary */}
        <div className="flex flex-wrap gap-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-xs text-orange-600">Atrasadas</p>
              <p className="text-xl font-bold text-orange-700">{overdueCount}</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Activity className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-blue-600">Em aberto</p>
              <p className="text-xl font-bold text-blue-700">{openCount}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'overdue', 'today', 'week'] as DueFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setDue(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                due === f ? 'bg-primary text-white border-primary' : 'border-border hover:bg-muted'
              }`}
            >
              {{ all: 'Todas', overdue: 'Atrasadas', today: 'Hoje', week: 'Semana' }[f]}
            </button>
          ))}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-1.5 text-xs border border-border rounded-lg bg-background"
          >
            <option value="">Prioridade: todas</option>
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Task List */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="font-medium">Nenhuma tarefa para este filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onAction={handleAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
