'use client';
import React, { useState } from 'react';

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch { return initial; }
  });
  const set = (v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [value, set] as const;
}
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { format, differenceInYears, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal';
import { PatientTimeline } from '@/components/patients/patient-timeline';
import { NewPatientModal } from '@/components/patients/new-patient-modal';
import { NewAppointmentModal } from '@/components/agenda/new-appointment-modal';
import { ClinicalHistory } from '@/components/clinical/clinical-history';
import { DocumentsList } from '@/components/documents/documents-list';
import { PatientCognitiveScoreCard } from '@/components/patients/patient-cognitive-score';
import { PatientBriefModal } from '@/components/patients/patient-brief-modal';
import { useAuthStore } from '@/store/auth.store';
import {
  ArrowLeft, Phone, Mail, Calendar, FileText, Tag, User,
  AlertCircle, DollarSign, Settings, Star, MapPin, Edit3,
  Plus, Activity, Layers, Zap, ClipboardList, FilePlus, Brain,
  ChevronDown, ChevronRight, X, CreditCard,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  NOVA_LEAD: 'info', AGUARDANDO_AGENDAMENTO: 'warning', AGENDADO: 'primary',
  CONFIRMADO: 'success', CONSULTA: 'primary', PROCEDIMENTO: 'primary',
  INATIVO: 'default', CANCELADO: 'danger', FALTOU: 'danger',
  REAGENDADO: 'warning', LISTA_ESPERA: 'warning', AGUARDANDO_ATENDIMENTO: 'warning',
};
const STATUS_LABELS: Record<string, string> = {
  NOVA_LEAD: 'Nova Lead', AGUARDANDO_AGENDAMENTO: 'Aguardando Agendamento',
  AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', CONSULTA: 'Em Consulta',
  PROCEDIMENTO: 'Procedimento', INATIVO: 'Inativo', CANCELADO: 'Cancelado',
  FALTOU: 'Faltou', REAGENDADO: 'Reagendado', LISTA_ESPERA: 'Lista de Espera',
  AGUARDANDO_ATENDIMENTO: 'Aguardando Atendimento',
};
const APPT_STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'info', CONFIRMED: 'primary', CHECKED_IN: 'warning',
  IN_PROGRESS: 'warning', COMPLETED: 'success', CANCELLED: 'danger', MISSED: 'danger',
};
const APPT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado', CONFIRMED: 'Confirmado', CHECKED_IN: 'Check-in feito',
  IN_PROGRESS: 'Em andamento', COMPLETED: 'Concluído', CANCELLED: 'Cancelado', MISSED: 'Faltou',
};
const TAG_LABELS: Record<string, string> = {
  GELADEIRA: 'Geladeira', FROZEN: 'Frozen', DIAMANTE: 'Diamante', APENAS_CONSULTA: 'Apenas Consulta',
};
const SEX_LABELS: Record<string, string> = { M: 'Masculino', F: 'Feminino', OUTRO: 'Outro' };
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SHIFT_LABELS: Record<string, string> = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' };

function fmtCpf(v?: string) {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
function fmtPhone(v?: string) {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

// ─── Tabs ─────────────────────────────────────────────────────
type TabId = 'geral' | 'agenda' | 'prontuario' | 'financeiro' | 'orcamentos' | 'documentos' | 'tarefas' | 'preferencias' | 'timeline' | 'telefonemas' | 'prepagamento';
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'geral', label: 'Visão Geral', icon: <User className="h-3.5 w-3.5" /> },
  { id: 'agenda', label: 'Agenda', icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: 'prontuario', label: 'Prontuário', icon: <FileText className="h-3.5 w-3.5" /> },
  { id: 'financeiro', label: 'Financeiro', icon: <DollarSign className="h-3.5 w-3.5" /> },
  { id: 'orcamentos', label: 'Orçamentos', icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: 'documentos', label: 'Documentos', icon: <FilePlus className="h-3.5 w-3.5" /> },
  { id: 'tarefas', label: 'Tarefas', icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: 'timeline', label: 'Timeline', icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: 'telefonemas', label: 'Telefonemas', icon: <Phone className="h-3.5 w-3.5" /> },
  { id: 'prepagamento', label: 'Pré-Pagamento', icon: <CreditCard className="h-3.5 w-3.5" /> },
  { id: 'preferencias', label: 'Preferências', icon: <Star className="h-3.5 w-3.5" /> },
];

// ─── Quick Actions Row ────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Editar dados', icon: <Edit3 className="h-3.5 w-3.5" />, action: 'edit' },
  { label: 'Métricas', icon: <Activity className="h-3.5 w-3.5" />, action: 'metrics' },
  { label: 'Protocolo', icon: <Layers className="h-3.5 w-3.5" />, action: 'protocol' },
  { label: 'Implante', icon: <Zap className="h-3.5 w-3.5" />, action: 'implant' },
  { label: 'Agendar', icon: <Plus className="h-3.5 w-3.5" />, action: 'schedule' },
];

// ─── InfoItem ─────────────────────────────────────────────────
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ─── Tab: Visão Geral ─────────────────────────────────────────
function TabGeral({ patient }: { patient: any }) {
  const [briefOpen, setBriefOpen] = useState(false);
  const age = patient.birth_date ? differenceInYears(new Date(), new Date(patient.birth_date)) : null;
  const addr = patient.address;
  return (
    <div className="space-y-4 p-5">
      <PatientCognitiveScoreCard patientId={patient.id} />
      <div className="mt-2">
        <Button size="sm" variant="secondary" className="gap-1.5 w-full h-8 text-xs"
          onClick={() => setBriefOpen(true)}>
          <Brain className="h-3.5 w-3.5" />Ver Brief Cognitivo
        </Button>
      </div>
      <PatientBriefModal
        patientId={patient.id}
        patientName={patient.full_name}
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
      />
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
        {patient.cpf && <InfoItem label="CPF" value={fmtCpf(patient.cpf)} />}
        {patient.rg && <InfoItem label="RG" value={patient.rg} />}
        {patient.birth_date && <InfoItem label="Nascimento" value={format(new Date(patient.birth_date), 'dd/MM/yyyy')} />}
        {age !== null && <InfoItem label="Idade" value={`${age} anos`} />}
        {patient.sex && <InfoItem label="Sexo" value={SEX_LABELS[patient.sex] ?? patient.sex} />}
        {patient.nationality && patient.nationality !== 'BR' && (
          <InfoItem label="Documento" value={`${patient.foreign_doc_type ?? 'Doc'}: ${patient.foreign_doc_number ?? ''}`} />
        )}
        {patient.phone && (
          <div>
            <p className="text-xs text-muted-foreground">Telefone</p>
            <a href={`tel:${patient.phone}`} className="text-sm font-medium flex items-center gap-1 text-primary hover:underline">
              <Phone className="h-3 w-3" />{fmtPhone(patient.phone)}
            </a>
          </div>
        )}
        {patient.email && (
          <div>
            <p className="text-xs text-muted-foreground">E-mail</p>
            <a href={`mailto:${patient.email}`} className="text-sm font-medium flex items-center gap-1 text-primary hover:underline">
              <Mail className="h-3 w-3" />{patient.email}
            </a>
          </div>
        )}
      </div>
      {addr && (addr.street || addr.city) && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" />Endereço</p>
          <p className="text-sm">{[addr.street, addr.number, addr.complement, addr.neighborhood, addr.city, addr.state].filter(Boolean).join(', ')}{addr.cep && ` · CEP ${addr.cep}`}</p>
        </div>
      )}
      {patient.tags?.length > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Tag className="h-3 w-3" />Tags</p>
          <div className="flex gap-2 flex-wrap">{patient.tags.map((t: string) => <Badge key={t} variant="warning">{TAG_LABELS[t] ?? t}</Badge>)}</div>
        </div>
      )}
      {patient.notes && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Observações</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{patient.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Agenda (grouped by date + type) ─────────────────────
function TabAgenda({ patientId, appointments, onNew }: { patientId: string; appointments: any[]; onNew: () => void }) {
  const router = useRouter();
  // Group by date
  const grouped = appointments.reduce((acc: Record<string, any[]>, a: any) => {
    const key = format(new Date(a.start_time), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">{appointments.length} consulta(s) registrada(s)</p>
        <Button size="sm" variant="ghost" onClick={onNew}><Calendar className="h-3.5 w-3.5" />Nova consulta</Button>
      </div>
      {!appointments.length ? (
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-sm">Nenhuma consulta registrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map(dateKey => {
            const dayAppts = grouped[dateKey];
            // Group by service category within day
            const byCategory = dayAppts.reduce((acc: Record<string, any[]>, a: any) => {
              const cat = a.service?.category ?? a.service?.name ?? a.type ?? 'Geral';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(a);
              return acc;
            }, {});

            return (
              <div key={dateKey}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {format(parseISO(dateKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                {Object.entries(byCategory).map(([cat, catAppts]) => (
                  <div key={cat} className="mb-2">
                    <p className="text-[10px] text-muted-foreground/70 font-medium mb-1 ml-1">{cat}</p>
                    {catAppts.map((appt: any) => (
                      <button
                        key={appt.id}
                        onClick={() => router.push(`/patients/${patientId}/appointments/${appt.id}`)}
                        className="w-full flex items-center justify-between rounded-lg border border-border px-4 py-2.5 hover:bg-muted/50 hover:border-primary/30 transition-all text-left mb-1"
                      >
                        <div>
                          <p className="text-sm font-medium">{format(new Date(appt.start_time), 'HH:mm')}</p>
                          <p className="text-xs text-muted-foreground">{appt.service?.name ?? appt.type}{appt.professional?.name ? ` · Dr(a). ${appt.professional.name}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={APPT_STATUS_COLORS[appt.status] as any}>{APPT_STATUS_LABELS[appt.status] ?? appt.status}</Badge>
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Prontuário ──────────────────────────────────────────
function TabProntuario({ patientId, appointments, onNew }: { patientId: string; appointments: any[]; onNew: () => void }) {
  const router = useRouter();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ consultas: true, protocolos: false, implantes: false, metricas: false });
  const toggle = (k: string) => setOpenSections(s => ({ ...s, [k]: !s[k] }));

  const completed = appointments.filter((a: any) => ['COMPLETED', 'CHECKED_IN', 'IN_PROGRESS'].includes(a.status));

  const { data: protocols = [] } = useQuery({ queryKey: ['patient-protocols', patientId], queryFn: () => api.get(`/clinical/protocols/patient/${patientId}`).then(r => r.data?.data ?? r.data ?? []).catch(() => []), staleTime: 60000 });
  const { data: implants = [] } = useQuery({ queryKey: ['patient-implants', patientId], queryFn: () => api.get(`/clinical/implants/patient/${patientId}`).then(r => r.data?.data ?? r.data ?? []).catch(() => []), staleTime: 60000 });
  const { data: metrics = [] } = useQuery({ queryKey: ['patient-metrics-list', patientId], queryFn: () => api.get(`/clinical/metrics/patient/${patientId}?limit=3`).then(r => r.data?.data ?? r.data ?? []).catch(() => []), staleTime: 60000 });

  const FREQ_LABELS: Record<string, string> = { DAILY: 'Diário', WEEKLY: 'Semanal', BIWEEKLY: 'Quinzenal', MONTHLY: 'Mensal', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual' };

  const Section = ({ id, title, count, children }: { id: string; title: string; count?: number; children: React.ReactNode }) => (
    <div className="border border-border rounded-xl overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/60 transition-colors" onClick={() => toggle(id)}>
        <span className="text-sm font-semibold">{title}{count != null ? ` (${count})` : ''}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openSections[id] ? 'rotate-180' : ''}`} />
      </button>
      {openSections[id] && <div className="p-3 space-y-2">{children}</div>}
    </div>
  );

  return (
    <div className="p-5 space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Histórico clínico completo do paciente</p>
        <Button size="sm" variant="ghost" onClick={onNew}><Calendar className="h-3.5 w-3.5" />Agendar</Button>
      </div>

      <ClinicalHistory patientId={patientId} />

      {/* Consultas */}
      <Section id="consultas" title="Consultas" count={completed.length}>
        {completed.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma consulta com registro</p>
        ) : (
          completed.slice(0, 10).map((appt: any) => (
            <button key={appt.id} onClick={() => router.push(`/patients/${patientId}/appointments/${appt.id}`)}
              className="w-full flex items-center justify-between rounded-lg border border-border px-4 py-2.5 hover:bg-muted/50 hover:border-primary/30 transition-all text-left">
              <div>
                <p className="text-sm font-medium">{format(new Date(appt.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                <p className="text-xs text-muted-foreground">{appt.service?.name ?? appt.type}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))
        )}
      </Section>

      {/* Protocolos */}
      <Section id="protocolos" title="Protocolos de Tratamento" count={(protocols as any[]).length}>
        {(protocols as any[]).length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">Nenhum protocolo registrado</p>
        ) : (
          (protocols as any[]).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {FREQ_LABELS[p.frequency] ?? p.frequency ?? '—'}
                  {p.total_sessions ? ` · ${p.sessions_done ?? 0}/${p.total_sessions} sessões` : ''}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : p.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {p.status === 'ACTIVE' ? 'Ativo' : p.status === 'COMPLETED' ? 'Concluído' : p.status ?? '—'}
              </span>
            </div>
          ))
        )}
      </Section>

      {/* Implantes */}
      <Section id="implantes" title="Implantes" count={(implants as any[]).length}>
        {(implants as any[]).length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">Nenhum implante registrado</p>
        ) : (
          (implants as any[]).map((imp: any) => (
            <div key={imp.id} className="rounded-lg border border-border px-3 py-2">
              <p className="text-sm font-medium">{imp.hormone ?? imp.type ?? 'Implante'}</p>
              <p className="text-xs text-muted-foreground">
                Inserido: {imp.insertion_date ? format(new Date(imp.insertion_date), 'dd/MM/yyyy') : '—'}
                {imp.next_exchange_at ? ` · Próxima troca: ${format(new Date(imp.next_exchange_at), 'dd/MM/yyyy')}` : ''}
              </p>
            </div>
          ))
        )}
      </Section>

      {/* Métricas recentes */}
      <Section id="metricas" title="Métricas Recentes" count={(metrics as any[]).length}>
        {(metrics as any[]).length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma métrica registrada</p>
        ) : (
          (metrics as any[]).map((m: any) => (
            <div key={m.id} className="rounded-lg border border-border px-3 py-2">
              <p className="text-xs text-muted-foreground mb-1">{m.created_at ? format(new Date(m.created_at), 'dd/MM/yyyy') : '—'}</p>
              <div className="flex gap-4 text-sm">
                {m.weight_kg && <span>Peso: <strong>{m.weight_kg} kg</strong></span>}
                {m.bmi && <span>IMC: <strong>{m.bmi}</strong></span>}
                {m.body_fat_pct != null && <span>Gordura: <strong>{m.body_fat_pct}%</strong></span>}
              </div>
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

// ─── Tab: Orçamentos ──────────────────────────────────────────
function TabOrcamentos({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [newOpen, setNewOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<any>(null);
  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [dueDate, setDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newItems, setNewItems] = useState([{ description: '', unit_price: '', quantity: '1' }]);
  const [newDiscount, setNewDiscount] = useState('');

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['patient-budgets', patientId],
    queryFn: () => api.get('/finance/budgets', { params: { patientId } }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
  });

  const createMut = useMutation({
    mutationFn: (payload: any) => api.post('/finance/budgets', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patient-budgets', patientId] }); setNewOpen(false); setNewNotes(''); setNewItems([{ description: '', unit_price: '', quantity: '1' }]); setNewDiscount(''); toast.success('Orçamento criado'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao criar'),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/finance/budgets/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patient-budgets', patientId] }); setApproveTarget(null); toast.success('Orçamento aprovado'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao aprovar'),
  });

  const convertMut = useMutation({
    mutationFn: ({ id, due_date }: { id: string; due_date: string }) => api.post(`/finance/budgets/${id}/convert`, { due_date }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patient-budgets', patientId] }); setConvertTarget(null); toast.success('Convertido em cobrança'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao converter'),
  });

  const STATUS_BADGE: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600', SENT: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-green-100 text-green-700', CONVERTED: 'bg-purple-100 text-purple-700', CANCELLED: 'bg-red-100 text-red-700',
  };
  const STATUS_LABEL: Record<string, string> = { DRAFT: 'Rascunho', SENT: 'Enviado', APPROVED: 'Aprovado', CONVERTED: 'Convertido', CANCELLED: 'Cancelado' };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{(budgets as any[]).length} orçamento(s)</p>
        <Button size="sm" onClick={() => setNewOpen(true)}><Plus className="h-3.5 w-3.5" />Novo Orçamento</Button>
      </div>

      {isLoading ? (
        <div className="h-20 rounded-lg bg-muted animate-pulse" />
      ) : (budgets as any[]).length === 0 ? (
        <div className="flex flex-col items-center py-10 text-muted-foreground">
          <DollarSign className="h-8 w-8 opacity-20 mb-2" />
          <p className="text-sm">Nenhum orçamento para este paciente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(budgets as any[]).map((b: any) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABEL[b.status] ?? b.status}</span>
                  <p className="text-sm font-semibold">{fmt(Number(b.total_amount ?? 0))}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{b.notes || '—'} · {b.created_at ? format(new Date(b.created_at), 'dd/MM/yyyy') : ''}</p>
              </div>
              <div className="flex gap-2">
                {b.status === 'DRAFT' && (
                  <Button size="sm" variant="secondary" onClick={() => setApproveTarget(b)}>Aprovar</Button>
                )}
                {b.status === 'APPROVED' && (
                  <Button size="sm" onClick={() => { setConvertTarget(b); setDueDate(''); }}>Converter</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New budget modal */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Novo Orçamento</h3>
              <button onClick={() => setNewOpen(false)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2">
              {newItems.map((item, i) => (
                <div key={`budget-item-${i}`} className="grid grid-cols-[1fr_80px_80px_24px] gap-2 items-end">
                  <div>
                    {i === 0 && <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>}
                    <input className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm" placeholder="Serviço / item" value={item.description} onChange={e => { const n = [...newItems]; n[i].description = e.target.value; setNewItems(n); }} />
                  </div>
                  <div>
                    {i === 0 && <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>}
                    <input type="number" className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm" placeholder="0,00" value={item.unit_price} onChange={e => { const n = [...newItems]; n[i].unit_price = e.target.value; setNewItems(n); }} />
                  </div>
                  <div>
                    {i === 0 && <label className="text-xs text-muted-foreground mb-1 block">Qtde</label>}
                    <input type="number" className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm" value={item.quantity} min="1" onChange={e => { const n = [...newItems]; n[i].quantity = e.target.value; setNewItems(n); }} />
                  </div>
                  <button onClick={() => setNewItems(newItems.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-500 pb-1.5"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <button className="text-xs text-primary hover:underline" onClick={() => setNewItems([...newItems, { description: '', unit_price: '', quantity: '1' }])}>+ Adicionar item</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Desconto (R$)</label>
                <input type="number" className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm" value={newDiscount} onChange={e => setNewDiscount(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
              <textarea rows={2} className="w-full rounded-lg border border-border px-2.5 py-1.5 text-sm resize-none" value={newNotes} onChange={e => setNewNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button size="sm" loading={createMut.isPending} onClick={() => createMut.mutate({ patient_id: patientId, notes: newNotes, discount_amount: parseFloat(newDiscount) || 0, items: newItems.filter(it => it.description).map(it => ({ description: it.description, unit_price: parseFloat(it.unit_price) || 0, quantity: parseInt(it.quantity) || 1 })) })}>Salvar Orçamento</Button>
            </div>
          </div>
        </div>
      )}

      {/* Approve confirm */}
      <ConfirmActionModal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => approveTarget && approveMut.mutate(approveTarget.id)}
        title="Aprovar Orçamento"
        description={approveTarget ? `Valor: ${fmt(Number(approveTarget.total_amount ?? 0))}` : ''}
        confirmLabel="Aprovar"
        isLoading={approveMut.isPending}
        userName={user?.name}
        userRole={user?.role}
      />

      {/* Convert modal */}
      {convertTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-sm">Converter em Cobrança</h3>
            <p className="text-sm text-muted-foreground">Valor: <strong>{fmt(Number(convertTarget.total_amount ?? 0))}</strong></p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data de vencimento</label>
              <input type="date" className="w-full rounded-lg border border-border px-3 py-2 text-sm" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setConvertTarget(null)}>Cancelar</Button>
              <Button size="sm" loading={convertMut.isPending} onClick={() => dueDate && convertMut.mutate({ id: convertTarget.id, due_date: dueDate })}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Financeiro ──────────────────────────────────────────
function TabFinanceiro({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['patient-balance', patientId],
    queryFn: () => api.get(`/financial/patients/${patientId}/balance`).then(r => r.data),
  });
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['patient-transactions', patientId],
    queryFn: () => api.get(`/financial/patients/${patientId}`).then(r => r.data),
  });
  const payMut = useMutation({
    mutationFn: (id: string) => api.patch(`/financial/${id}/pay`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient-transactions', patientId] });
      qc.invalidateQueries({ queryKey: ['patient-balance', patientId] });
      toast.success('Pagamento registrado');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao registrar pagamento'),
  });

  const txAll: any[] = txData?.data ?? [];
  const isLoading = balanceLoading || txLoading;

  const BALANCE_BADGE: Record<string, { label: string; cls: string }> = {
    EM_DIA: { label: 'Em dia', cls: 'bg-green-100 text-green-700' },
    DEVENDO: { label: 'Devendo', cls: 'bg-red-100 text-red-700' },
    CREDITO: { label: 'Crédito', cls: 'bg-blue-100 text-blue-700' },
  };

  if (isLoading) return <div className="p-5 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>;

  const bal = BALANCE_BADGE[balance?.status ?? 'EM_DIA'];

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold">Status financeiro</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bal.cls}`}>{bal.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total pago</p>
          <p className="text-lg font-bold text-green-600">R$ {(balance?.paid_amount ?? 0).toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
          <p className="text-xs text-orange-600">Em aberto</p>
          <p className="text-lg font-bold text-orange-600">R$ {(balance?.pending_amount ?? 0).toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-600">Crédito</p>
          <p className="text-lg font-bold text-blue-600">R$ {(balance?.credit_available ?? 0).toFixed(2)}</p>
        </div>
      </div>
      {!txAll.length ? (
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <DollarSign className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-sm">Nenhuma transação registrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {txAll.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
              <div>
                <p className="text-sm font-medium">{t.description ?? t.type}</p>
                <p className="text-xs text-muted-foreground">{t.created_at ? format(new Date(t.created_at), 'dd/MM/yyyy') : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${t.status === 'COMPLETED' ? 'text-green-600' : 'text-orange-500'}`}>R$ {Number(t.amount).toFixed(2)}</span>
                <Badge variant={t.status === 'COMPLETED' ? 'success' : 'warning'}>{t.status === 'COMPLETED' ? 'Pago' : 'Pendente'}</Badge>
                {t.status === 'PENDING' && (
                  <button
                    onClick={() => payMut.mutate(t.id)}
                    disabled={payMut.isPending}
                    className="text-xs font-medium text-primary hover:underline px-1.5"
                  >
                    Registrar pagamento
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Tarefas ─────────────────────────────────────────────
const TASK_PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-gray-100 text-gray-600',
};
const TASK_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta', IN_PROGRESS: 'Em andamento', DONE: 'Concluída',
  SNOOZED: 'Adiada', CANCELLED: 'Cancelada',
};
const TASK_TYPE_LABELS: Record<string, string> = {
  CONTACT_PATIENT: 'Contatar paciente', SCHEDULE_VISIT: 'Agendar consulta',
  REQUEST_DOCUMENT: 'Solicitar documento', COLLECT_PAYMENT: 'Cobrar pagamento',
  FOLLOWUP_IMPLANT: 'Acompanhar implante', FOLLOWUP_PROTOCOL: 'Acompanhar protocolo', OTHER: 'Outro',
};

function TabTarefas({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['patient-tasks', patientId],
    queryFn: () => api.get(`/tasks?patient_id=${patientId}&limit=5&status=OPEN,IN_PROGRESS`).then(r => r.data),
  });
  const tasks = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patient-tasks', patientId] }); toast.success('Tarefa concluída'); },
  });
  const snoozeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/snooze`, { days: 1 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['patient-tasks', patientId] }); toast.success('Tarefa adiada 1 dia'); },
  });

  if (isLoading) return <div className="p-5 text-sm text-muted-foreground">Carregando tarefas…</div>;

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Tarefas do Paciente</p>
        {data?.total != null && <span className="text-xs text-muted-foreground">{data.total} abertas</span>}
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma tarefa em aberto.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <div key={t.id} className="rounded-lg border border-border p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 flex-1">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{TASK_TYPE_LABELS[t.type] ?? t.type}</p>
                  {t.due_at && (
                    <p className="text-xs text-muted-foreground">
                      Até {format(parseISO(t.due_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_PRIORITY_COLORS[t.priority] ?? ''}`}>
                  {t.priority}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="h-7 text-xs"
                  onClick={() => completeMutation.mutate(t.id)} disabled={completeMutation.isPending}>
                  Concluir
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => snoozeMutation.mutate(t.id)} disabled={snoozeMutation.isPending}>
                  Adiar 1d
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Preferências (editável) ─────────────────────────────
function TabPreferencias({ patient, onEditPrefs }: { patient: any; onEditPrefs: () => void }) {
  const prefs = patient.preferences ?? {};
  const hasPrefs = prefs.preferred_days?.length || prefs.preferred_shift || prefs.dietary || prefs.personal || prefs.beverages;
  return (
    <div className="p-5 space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">Preferências do paciente</p>
        <Button size="sm" variant="ghost" onClick={onEditPrefs}><Edit3 className="h-3.5 w-3.5" />Editar preferências</Button>
      </div>
      {!hasPrefs ? (
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <Settings className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-sm">Nenhuma preferência registrada</p>
          <p className="text-xs mt-1">Clique em "Editar preferências" para adicionar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prefs.preferred_days?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Dias preferidos</p>
              <div className="flex gap-1.5 flex-wrap">
                {prefs.preferred_days.map((d: number) => (
                  <span key={d} className="inline-flex items-center justify-center h-7 w-12 rounded-md bg-primary/10 text-primary text-xs font-medium">{WEEK_DAYS[d]}</span>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            {prefs.preferred_shift && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Turno</p>
                <Badge variant="info">{SHIFT_LABELS[prefs.preferred_shift] ?? prefs.preferred_shift}</Badge>
              </div>
            )}
            {prefs.preferred_time_start && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Horário</p>
                <p className="text-sm font-medium">
                  <span>{prefs.preferred_time_start}{prefs.preferred_time_end ? ` — ${prefs.preferred_time_end}` : ''}</span>
                </p>
              </div>
            )}
          </div>
          {prefs.dietary && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Preferências alimentares e bebidas</p>
              <p className="text-sm">{prefs.dietary}</p>
            </div>
          )}
          {prefs.personal && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Observações pessoais</p>
              <p className="text-sm">{prefs.personal}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Telefonemas ────────────────────────────────────────
const MOCK_TELEFONEMAS = [
  { id: 'T1', data: '2026-04-22', hora: '09:15', tipo: 'ENTRADA', duracao: '4min 32s', assunto: 'Dúvida sobre medicação Mounjaro', responsavel: 'Amanda G.', status: 'ATENDIDO', obs: 'Paciente perguntou sobre efeitos colaterais. Orientada sobre náusea pós-aplicação.' },
  { id: 'T2', data: '2026-04-15', hora: '14:38', tipo: 'SAIDA', duracao: '2min 10s', assunto: 'Confirmação de consulta', responsavel: 'Lorrana', status: 'ATENDIDO', obs: 'Confirmou presença para 18/04.' },
  { id: 'T3', data: '2026-04-10', hora: '11:02', tipo: 'ENTRADA', duracao: '-', assunto: 'Reagendamento', responsavel: 'Lorrana', status: 'NAO_ATENDEU', obs: 'Não atendeu. Deixado recado via WhatsApp.' },
  { id: 'T4', data: '2026-03-28', hora: '16:45', tipo: 'SAIDA', duracao: '7min 18s', assunto: 'Resultado de exame', responsavel: 'Dr. Murilo', status: 'ATENDIDO', obs: 'Explicado resultado perfil lipídico. LDL levemente elevado, orientações nutricionais passadas.' },
];

function TabTelefonemas({ patientId }: { patientId: string }) {
  const [telefonemas, setTelefonemas] = useLocalStorage(`ayron_telefonemas_${patientId}`, MOCK_TELEFONEMAS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: 'ENTRADA', assunto: '', responsavel: '', duracao: '', status: 'ATENDIDO', obs: '' });

  const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: string }> = {
    ATENDIDO: { label: 'Atendido', cls: 'bg-green-100 text-green-700', icon: '✅' },
    NAO_ATENDEU: { label: 'Não atendeu', cls: 'bg-red-100 text-red-700', icon: '📵' },
    CALLBACK: { label: 'Retornar', cls: 'bg-amber-100 text-amber-700', icon: '🔁' },
  };

  const TIPO_CONFIG: Record<string, { label: string; cls: string }> = {
    ENTRADA: { label: '↙ Entrada', cls: 'text-blue-600' },
    SAIDA: { label: '↗ Saída', cls: 'text-orange-600' },
  };

  function handleSave() {
    if (!form.assunto.trim()) { toast.error('Informe o assunto'); return; }
    setTelefonemas(prev => [{
      id: `T${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tipo: form.tipo, duracao: form.duracao || '-', assunto: form.assunto,
      responsavel: form.responsavel || 'Usuário atual', status: form.status, obs: form.obs,
    }, ...prev]);
    setForm({ tipo: 'ENTRADA', assunto: '', responsavel: '', duracao: '', status: 'ATENDIDO', obs: '' });
    setShowForm(false);
    toast.success('Telefonema registrado');
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{telefonemas.length} registro(s) de telefonemas</p>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Registrar Telefonema
        </Button>
      </div>

      {/* New call form */}
      {showForm && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
          <p className="text-sm font-semibold text-primary">Novo Registro</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="ENTRADA">↙ Entrada (paciente ligou)</option>
                <option value="SAIDA">↗ Saída (ligamos para paciente)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="ATENDIDO">✅ Atendido</option>
                <option value="NAO_ATENDEU">📵 Não atendeu</option>
                <option value="CALLBACK">🔁 Retornar</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Assunto</label>
              <input className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.assunto} onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))} placeholder="Ex: Dúvida sobre medicação, Agendamento..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Responsável</label>
              <input className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do atendente" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Duração (opcional)</label>
              <input className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.duracao} onChange={e => setForm(f => ({ ...f, duracao: e.target.value }))} placeholder="Ex: 3min 20s" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea rows={2} className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} placeholder="Resumo do que foi tratado na ligação..." />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Salvar</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* List */}
      {telefonemas.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Phone className="h-8 w-8 mb-2 opacity-20" />
          <p className="text-sm">Nenhum telefonema registrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {telefonemas.map(t => {
            const sc = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.ATENDIDO;
            const tc = TIPO_CONFIG[t.tipo] ?? TIPO_CONFIG.ENTRADA;
            return (
              <div key={t.id} className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 hover:border-primary/20 transition-colors">
                <div className="flex flex-col items-center flex-shrink-0 text-center min-w-[52px]">
                  <span className="text-lg">{t.status === 'ATENDIDO' ? '📞' : t.status === 'NAO_ATENDEU' ? '📵' : '🔁'}</span>
                  <span className={`text-[10px] font-semibold mt-0.5 ${tc.cls}`}>{tc.label}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold">{t.assunto}</p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.data).toLocaleDateString('pt-BR')} às {t.hora} · {t.responsavel}
                    {t.duracao !== '-' && ` · ${t.duracao}`}
                  </p>
                  {t.obs && <p className="text-xs text-muted-foreground mt-1 italic">{t.obs}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Pré-Pagamento ───────────────────────────────────────
const MOCK_PREPAGAMENTOS = [
  { id: 'PP1', data: '2026-04-10', valor: 2500, saldo: 1520, usado: 980, forma: 'PIX', obs: 'Crédito para protocolo Mounjaro', status: 'ATIVO' },
  { id: 'PP2', data: '2026-02-01', valor: 1200, saldo: 0, usado: 1200, forma: 'Cartão Crédito 3x', obs: 'Soroterapia 6 sessões', status: 'ZERADO' },
];

const MOCK_MOVIMENTOS_PP = [
  { id: 'M1', data: '2026-04-22', descricao: 'Aplicação Mounjaro #7', valor: -320, saldo_pos: 1520 },
  { id: 'M2', data: '2026-04-08', descricao: 'Aplicação Mounjaro #6', valor: -320, saldo_pos: 1840 },
  { id: 'M3', data: '2026-04-10', descricao: 'Crédito inicial PIX', valor: 2500, saldo_pos: 2500 },
];

function TabPrePagamento({ patientId }: { patientId: string }) {
  const [showNovoCredito, setShowNovoCredito] = useState(false);
  const [prepagamentos, setPrepagamentos] = useLocalStorage(`ayron_prepagamentos_${patientId}`, MOCK_PREPAGAMENTOS);
  const [movimentos, setMovimentos] = useLocalStorage(`ayron_movimentos_pp_${patientId}`, MOCK_MOVIMENTOS_PP);
  const [form, setForm] = useState({ valor: '', forma: 'PIX', obs: '', vencimento: '' });

  const saldoTotal = prepagamentos.filter(p => p.status === 'ATIVO').reduce((s, p) => s + p.saldo, 0);

  function handleSalvar() {
    const v = Number(form.valor);
    if (!v || v <= 0) { toast.error('Informe um valor válido'); return; }
    setPrepagamentos(prev => [{
      id: `PP${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      valor: v, saldo: v, usado: 0,
      forma: form.forma, obs: form.obs, status: 'ATIVO',
    }, ...prev]);
    const novoMov = {
      id: `MOV${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      descricao: `Crédito — ${form.forma}`,
      valor: v,
      tipo: 'CREDITO' as const,
      saldo: v,
    };
    setMovimentos((m: any[]) => [novoMov, ...m]);
    setForm({ valor: '', forma: 'PIX', obs: '', vencimento: '' });
    setShowNovoCredito(false);
    toast.success('Crédito adicionado e salvo localmente');
  }

  return (
    <div className="p-5 space-y-5">
      {/* Saldo total */}
      <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Saldo Disponível</p>
          <p className="text-3xl font-black text-primary mt-1">
            R$ {saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{prepagamentos.filter(p => p.status === 'ATIVO').length} crédito(s) ativo(s)</p>
        </div>
        <Button size="sm" onClick={() => setShowNovoCredito(v => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />Adicionar Crédito
        </Button>
      </div>

      {/* Novo crédito form */}
      {showNovoCredito && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
          <p className="text-sm font-semibold text-primary">Novo Crédito / Pré-Pagamento</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Valor (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="0,00"
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Forma de Pagamento</label>
              <select
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 bg-white"
                value={form.forma}
                onChange={e => setForm(f => ({ ...f, forma: e.target.value }))}
              >
                {['PIX', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito 1x', 'Cartão Crédito 2x', 'Cartão Crédito 3x', 'Cartão Crédito 6x', 'Transferência'].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Validade (opcional)</label>
              <input
                type="date"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.vencimento}
                onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Observação</label>
              <input
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ex: Protocolo Mounjaro 12 sessões"
                value={form.obs}
                onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSalvar}>Confirmar Crédito</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowNovoCredito(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Lista de créditos */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Histórico de Créditos</p>
        {prepagamentos.map(pp => (
          <div key={pp.id} className={cn('rounded-xl border p-4 space-y-3', pp.status === 'ATIVO' ? 'border-border bg-white' : 'border-gray-200 bg-gray-50 opacity-60')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold',
                  pp.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {pp.status === 'ATIVO' ? '✓' : '0'}
                </div>
                <div>
                  <p className="text-sm font-semibold">R$ {pp.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">{new Date(pp.data).toLocaleDateString('pt-BR')} · {pp.forma}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn('text-sm font-bold', pp.status === 'ATIVO' ? 'text-green-600' : 'text-gray-400')}>
                  Saldo: R$ {pp.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Usado: R$ {pp.usado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            {pp.obs && <p className="text-xs text-muted-foreground italic px-1">{pp.obs}</p>}

            {/* Barra de uso */}
            {pp.valor > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', pp.status === 'ATIVO' ? 'bg-green-500' : 'bg-gray-400')}
                    style={{ width: `${Math.round((pp.usado / pp.valor) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-right">
                  {Math.round((pp.usado / pp.valor) * 100)}% utilizado
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Movimentos */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Movimentações Recentes</p>
        {movimentos.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-white">
            <div>
              <p className="text-sm font-medium">{m.descricao}</p>
              <p className="text-xs text-muted-foreground">{new Date(m.data).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="text-right">
              <p className={cn('text-sm font-bold', m.valor > 0 ? 'text-green-600' : 'text-red-600')}>
                {m.valor > 0 ? '+' : ''}R$ {Math.abs(m.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">Saldo: R$ {(m.saldo_pos ?? m.saldo ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('geral');

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get(`/patients/${id}`).then(r => r.data),
    enabled: !!id,
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div><Topbar title="Paciente" /><div className="p-6 space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div></div>;
  }

  if (error || !patient) {
    return (
      <div><Topbar title="Paciente" />
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mb-2 text-red-400" />
          <p className="text-sm">Paciente não encontrado</p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  const age = patient.birth_date ? differenceInYears(new Date(), new Date(patient.birth_date)) : null;

  const handleQuickAction = (action: string) => {
    if (action === 'edit') { setEditOpen(true); return; }
    if (action === 'schedule') { setNewApptOpen(true); return; }
    if (['metrics', 'protocol', 'implant'].includes(action)) {
      const lastAppt = patient.appointments?.find((a: any) => ['CHECKED_IN', 'IN_PROGRESS', 'SCHEDULED', 'CONFIRMED'].includes(a.status));
      if (lastAppt) {
        router.push(`/patients/${id}/appointments/${lastAppt.id}`);
      } else {
        toast.info('Abra ou inicie uma consulta para registrar ' + (action === 'metrics' ? 'métricas' : action === 'protocol' ? 'protocolos' : 'implantes'));
      }
    }
  };

  return (
    <div>
      <Topbar title="Paciente 360°" />
      <div className="p-6 space-y-4 max-w-4xl">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold">{patient.full_name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {age !== null && <span className="text-xs text-muted-foreground">{age} anos · {SEX_LABELS[patient.sex] ?? patient.sex}</span>}
                <Badge variant={STATUS_COLORS[patient.current_status] as any ?? 'default'}>{STATUS_LABELS[patient.current_status] ?? patient.current_status}</Badge>
                {patient.tags?.includes('DIAMANTE') && <Badge variant="warning">Diamante</Badge>}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions bar */}
        <div className="flex gap-2 flex-wrap">
          {QUICK_ACTIONS.map(qa => (
            <button key={qa.action} onClick={() => handleQuickAction(qa.action)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary">
              {qa.icon}{qa.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-muted p-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <Card className="min-h-[300px]">
          {activeTab === 'geral' && <TabGeral patient={patient} />}
          {activeTab === 'agenda' && <TabAgenda patientId={id} appointments={patient.appointments ?? []} onNew={() => setNewApptOpen(true)} />}
          {activeTab === 'prontuario' && <TabProntuario patientId={id} appointments={patient.appointments ?? []} onNew={() => setNewApptOpen(true)} />}
          {activeTab === 'financeiro' && <TabFinanceiro patientId={id} />}
          {activeTab === 'orcamentos' && <TabOrcamentos patientId={id} />}
          {activeTab === 'documentos' && (
            <div className="p-4">
              <DocumentsList patientId={id} />
            </div>
          )}
          {activeTab === 'tarefas' && <TabTarefas patientId={id} />}
          {activeTab === 'preferencias' && <TabPreferencias patient={patient} onEditPrefs={() => { setEditOpen(true); setActiveTab('preferencias'); }} />}
          {activeTab === 'timeline' && (
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-4">Timeline do Paciente</h3>
              <PatientTimeline patientId={id} />
            </div>
          )}
          {activeTab === 'telefonemas' && <TabTelefonemas patientId={id} />}
          {activeTab === 'prepagamento' && <TabPrePagamento patientId={id} />}
        </Card>
      </div>

      {/* Edit patient modal */}
      <NewPatientModal open={editOpen} onClose={() => setEditOpen(false)} patient={patient} />

      {/* New appointment modal */}
      <NewAppointmentModal open={newApptOpen} onClose={() => setNewApptOpen(false)} preselectedPatientId={id} />
    </div>
  );
}
