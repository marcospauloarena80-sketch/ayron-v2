'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NewPatientModal } from '@/components/patients/new-patient-modal';
import {
  Plus, Search, Phone, Mail, UserCheck, ChevronLeft, ChevronRight,
  Tag, Filter, X, SlidersHorizontal, Calendar, Download, Brain,
  DollarSign, FileText, User, AlertTriangle,
  Clock, Zap, MessageSquare, CheckCircle2, Info, Printer, Smartphone,
  ClipboardList, MoreHorizontal, Cake,
} from 'lucide-react';
import { getPatientPendingFlags } from '@/lib/patient-pending-flags';
import { birthdayExportService, type PatientBirthdayRow } from '@/lib/birthday-export-service';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { fetchPatients, fetchAllPatients } from '@/lib/supabase/queries';
import { toast } from 'sonner';

// ── Mock patient data (fallback when API offline) ─────────────────────────────
const MOCK_PATIENTS_LIST = [
  { id: 'P4821', full_name: 'Ana Lima', birth_date: '1988-03-15', sex: 'F', phone: '(21) 99999-0001', email: 'ana@email.com', current_status: 'CONFIRMADO', tags: ['DIAMANTE'], tier: 'DIAMANTE', days_absent: 12, tipo_contato: 'WHATSAPP', mala_direta: true, next_appointment_date: new Date(Date.now() + 3 * 86400000).toISOString(), ltv: 12850, attendance_count: 28 },
  { id: 'P3102', full_name: 'Carlos Souza', birth_date: '1979-05-22', sex: 'M', phone: '(21) 99999-0002', email: 'carlos@email.com', current_status: 'AGENDADO', tags: [], tier: 'VIP', days_absent: 92, tipo_contato: 'WHATSAPP', mala_direta: true, next_appointment_date: new Date(Date.now() + 7 * 86400000).toISOString() },
  { id: 'P1089', full_name: 'Beatriz Fernandes', birth_date: '1991-05-08', sex: 'F', phone: '(21) 99999-0003', email: 'bia@email.com', current_status: 'CONFIRMADO', tags: [], tier: 'GOLD', days_absent: 13, tipo_contato: 'EMAIL', mala_direta: true },
  { id: 'P2205', full_name: 'Pedro Gomes', birth_date: '1972-09-14', sex: 'M', phone: '(21) 99999-0004', email: '', current_status: 'INATIVO', tags: [], tier: 'SILVER', days_absent: 180, tipo_contato: 'WHATSAPP', mala_direta: false },
  { id: 'P5542', full_name: 'Marina Costa', birth_date: '1997-11-30', sex: 'F', phone: '(21) 99999-0005', email: 'marina@email.com', current_status: 'AGENDADO', tags: [], tier: 'GOLD', days_absent: 13, tipo_contato: 'WHATSAPP', mala_direta: true, next_appointment_date: new Date(Date.now() + 14 * 86400000).toISOString() },
  { id: 'P0932', full_name: 'Roberto Alves', birth_date: '1963-04-19', sex: 'M', phone: '(21) 99999-0006', email: '', current_status: 'INATIVO', tags: [], tier: 'VIP', days_absent: 365, tipo_contato: 'SMS', mala_direta: false },
  { id: 'P7731', full_name: 'Camila Dias', birth_date: '1985-04-02', sex: 'F', phone: '(21) 99999-0007', email: 'camila@email.com', current_status: 'INATIVO', tags: ['APENAS_CONSULTA'], tier: 'SILVER', days_absent: 400, tipo_contato: 'WHATSAPP', mala_direta: true },
  { id: 'P6621', full_name: 'Fernanda Lima', birth_date: '1991-12-20', sex: 'F', phone: '(21) 99999-0008', email: '', current_status: 'AGUARDANDO_AGENDAMENTO', tags: [], tier: 'BRONZE', days_absent: 53, tipo_contato: 'WHATSAPP', mala_direta: false },
  { id: 'P3390', full_name: 'Lucas Prado', birth_date: '1990-07-04', sex: 'M', phone: '(21) 99999-0009', email: 'lucas@email.com', current_status: 'CONFIRMADO', tags: [], tier: 'GOLD', days_absent: 8, tipo_contato: 'EMAIL', mala_direta: true, next_appointment_date: new Date(Date.now() + 1 * 86400000).toISOString(), ltv: 8400, attendance_count: 22 },
  { id: 'P8812', full_name: 'Juliana Rocha', birth_date: '1984-02-14', sex: 'F', phone: '(21) 99999-0010', email: 'ju@email.com', current_status: 'NOVA_LEAD', tags: [], tier: 'BRONZE', days_absent: 0, tipo_contato: 'INSTAGRAM', mala_direta: false },
];

// ── Filter types ───────────────────────────────────────────────────────────────
interface Filters {
  sexo: string;
  tier: string;
  retorno: string;
  tag: string;
  tipo_contato: string;
  mala_direta: string;
  aniversariante: string;
  status: string;
  origem: string;
  indicado_por: string;
}

// ── Status configs ────────────────────────────────────────────────────────────
const STATUS_DOT_COLORS: Record<string, string> = {
  NOVA_LEAD: 'bg-blue-400', AGUARDANDO_AGENDAMENTO: 'bg-amber-400',
  AGENDADO: 'bg-indigo-400', CONFIRMADO: 'bg-emerald-400',
  CONSULTA: 'bg-indigo-500 animate-pulse', PROCEDIMENTO: 'bg-indigo-500 animate-pulse',
  AGUARDANDO_ATENDIMENTO: 'bg-amber-500 animate-pulse',
  INATIVO: 'bg-gray-300', CANCELADO: 'bg-red-400', FALTOU: 'bg-red-400',
  LISTA_ESPERA: 'bg-amber-400', REAGENDADO: 'bg-amber-400',
};
const STATUS_COLORS: Record<string, string> = {
  NOVA_LEAD: 'info', AGUARDANDO_AGENDAMENTO: 'warning', AGENDADO: 'primary',
  CONFIRMADO: 'success', CONSULTA: 'primary', INATIVO: 'default',
  CANCELADO: 'danger', FALTOU: 'danger', PROCEDIMENTO: 'primary',
  LISTA_ESPERA: 'warning', REAGENDADO: 'warning', AGUARDANDO_ATENDIMENTO: 'warning',
};
const STATUS_LABELS: Record<string, string> = {
  NOVA_LEAD: 'Nova Lead', AGUARDANDO_AGENDAMENTO: 'Aguardando', AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado', CONSULTA: 'Consulta', INATIVO: 'Inativo',
  CANCELADO: 'Cancelado', FALTOU: 'Faltou', PROCEDIMENTO: 'Procedimento',
  LISTA_ESPERA: 'Lista Espera', REAGENDADO: 'Reagendado', AGUARDANDO_ATENDIMENTO: 'Em Espera',
};
const TAG_LABELS: Record<string, string> = {
  GELADEIRA: '🧊 Geladeira', FROZEN: '❄️ Frozen', DIAMANTE: '💎 Diamante', APENAS_CONSULTA: '🩺 Só Consulta',
  EMBAIXADOR: '⭐ Embaixador', RESTRICAO: '🚫 Restrição', PACIENTE_DIFICIL: '⚠️ P. Difícil',
  VIP_PLUS: '👑 VIP+', RISCO_EVASAO: '📉 Risco Evasão',
  // Tags originadas de mensagens (Messages sidebar)
  RESPONDEU: '✅ Respondeu', NAO_RESPONDEU: '📵 Não Respondeu', AGUARDANDO_RETORNO: '⏳ Aguardando',
  INTERESSADO: '💡 Interessado', EM_NEGOCIACAO: '🤝 Em Negociação', LEAD_FRIO: '🧊 Lead Frio',
};

const ORIGEM_LABELS: Record<string, string> = {
  'Instagram': '📸 Instagram', 'WhatsApp': '💬 WhatsApp', 'Indicação': '🤝 Indicação',
  'Tráfego Pago': '💰 Tráfego Pago', 'Presencial': '🏢 Presencial',
  'Email': '📧 Email', 'Facebook': '📘 Facebook',
  'Internet': '🌐 Internet', 'Palestra': '🎤 Palestra', 'Propaganda': '📢 Propaganda',
  'Outros': '📋 Outros', 'Outro': '📋 Outro',
};

function getReturnRisk(p: any): { label: string; color: string } | null {
  const days = p.days_absent ?? 0;
  if (p.current_status === 'INATIVO') return null; // handled separately
  if (days >= 90) return { label: '🔴 Alto Risco', color: 'bg-red-100 text-red-700' };
  if (days >= 60) return { label: '🟡 Médio Risco', color: 'bg-amber-100 text-amber-700' };
  if (days >= 30) return { label: '🟢 Baixo Risco', color: 'bg-green-100 text-green-700' };
  return null;
}

const PAGE_SIZE = 30;

function hasIncompleteData(p: any): boolean {
  const missing = [];
  if (!p.email) missing.push('email');
  if (!p.birth_date) missing.push('nascimento');
  if (!p.cpf && p.nationality !== 'ESTRANGEIRO') missing.push('CPF');
  if (!p.address?.city) missing.push('endereço');
  return missing.length >= 2;
}

function incompleteFields(p: any): string[] {
  const missing = [];
  if (!p.email) missing.push('e-mail');
  if (!p.birth_date) missing.push('data de nascimento');
  if (!p.cpf && p.nationality !== 'ESTRANGEIRO') missing.push('CPF');
  if (!p.address?.city) missing.push('endereço');
  return missing;
}

// ── Reactivation Campaign Modal ───────────────────────────────────────────────

function ReactivationModal({ patient, open, onClose }: { patient: any; open: boolean; onClose: () => void }) {
  const router = useRouter();
  if (!patient) return null;

  const daysAbsent = patient.days_absent ?? 0;
  const tier = patient.tier ?? 'BRONZE';

  const campaigns = [
    {
      id: 'whatsapp',
      icon: MessageSquare,
      label: 'WhatsApp Personalizado',
      desc: `"Olá ${patient.full_name?.split(' ')[0]}, sentimos sua falta! Que tal agendar uma consulta de retorno?"`,
      color: 'text-green-600 bg-green-50 border-green-200',
    },
    {
      id: 'desconto',
      icon: Zap,
      label: 'Oferta de Retorno',
      desc: tier === 'DIAMANTE' || tier === 'VIP' ? 'Pacote VIP com desconto especial para retorno' : 'Consulta de retorno com condição especial',
      color: 'text-orange-600 bg-orange-50 border-orange-200',
    },
    {
      id: 'agenda',
      icon: Calendar,
      label: 'Agendar Diretamente',
      desc: 'Abre a agenda para marcar consulta de retorno agora',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md rounded-2xl border border-border bg-white shadow-2xl p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Paciente Inativo</p>
                <p className="text-sm text-muted-foreground">{patient.full_name} · {daysAbsent}d sem consulta</p>
              </div>
              <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Context */}
            <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 space-y-1.5 text-xs text-muted-foreground">
              <p>Tier: <span className="font-semibold text-foreground">{tier}</span></p>
              <p>Contato preferido: <span className="font-semibold text-foreground">{patient.tipo_contato ?? 'WhatsApp'}</span></p>
              {daysAbsent >= 365 && <p className="text-amber-600 font-medium">⚠️ Mais de 1 ano sem retorno</p>}
              {daysAbsent >= 1825 && <p className="text-red-600 font-medium">🚨 Mais de 5 anos — considere arquivar</p>}
            </div>

            {/* Campaign options */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Campanha de Reativação</p>
              {campaigns.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (c.id === 'agenda') {
                      router.push(`/agenda?patientId=${patient.id}`);
                      onClose();
                    } else {
                      toast.info(`Campanha "${c.label}" em integração — disponível em breve`);
                      onClose();
                    }
                  }}
                  className={cn('w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left hover:opacity-90 transition-opacity', c.color)}
                >
                  <c.icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold">{c.label}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* View patient */}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" size="sm" onClick={() => { router.push(`/patients/${patient.id}`); onClose(); }}>
                Ver Perfil Completo
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 -z-10 bg-black/30 backdrop-blur-sm" />
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Patient Card ──────────────────────────────────────────────────────────────

function PatientCard({
  patient,
  onClick,
  onInativoClick,
  onEmailClick,
  onSMSClick,
  onQuestionariosClick,
  onImprimirClick,
  onEditClick,
  onIndicadoPorFilter,
  hasManagerAccess,
}: {
  patient: any;
  onClick: () => void;
  onInativoClick: (p: any) => void;
  onEmailClick: (p: any) => void;
  onSMSClick: (p: any) => void;
  onQuestionariosClick: (p: any) => void;
  onImprimirClick: (p: any) => void;
  onEditClick: (p: any) => void;
  onIndicadoPorFilter: (nome: string) => void;
  hasManagerAccess: boolean;
}) {
  const router = useRouter();
  const moreActionsRef = useRef<HTMLDivElement>(null);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const isInativo = patient.current_status === 'INATIVO';
  const isAgendado = ['AGENDADO', 'CONFIRMADO'].includes(patient.current_status);
  const isNotScheduled = ['AGUARDANDO_AGENDAMENTO', 'NOVA_LEAD'].includes(patient.current_status);
  const isActiveWithoutNextAppointment = !isInativo && !isNotScheduled && !patient.next_appointment_date && isAgendado === false;
  const flags = getPatientPendingFlags(patient);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (moreActionsRef.current && !moreActionsRef.current.contains(e.target as Node)) {
        setMoreActionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const age = patient.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / 31557600000)
    : null;

  // Days to next appointment
  let daysToNext: number | null = null;
  if (patient.next_appointment_date) {
    const diff = Math.ceil((new Date(patient.next_appointment_date).getTime() - Date.now()) / 86400000);
    if (diff >= 0) daysToNext = diff;
  }

  function handleQuickAction(e: React.MouseEvent, path: string) {
    e.stopPropagation();
    router.push(path);
  }

  function PendingDot({ hasPending, color }: { hasPending: boolean; color: 'orange' | 'red' }) {
    if (!hasPending) return null;
    const cls = color === 'orange' ? 'bg-orange-500' : 'bg-red-500';
    return (
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cls} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${cls}`} />
      </span>
    );
  }

  const patientName = encodeURIComponent(patient.full_name ?? '');

  const handleCardClick = () => {
    if (isInativo) {
      onInativoClick(patient);
    } else {
      onClick();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleCardClick}
      className={cn(
        'rounded-xl border bg-white p-4 hover:shadow-md transition-all cursor-pointer relative',
        isInativo
          ? 'border-red-300 hover:border-red-400'
          : 'border-border hover:border-primary/30',
      )}
    >
      {/* INATIVO pulsing alert */}
      {isInativo && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
      )}

      {/* Pending flags computed from patient data — no extra API call */}

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pr-4">
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span className="relative group flex h-2.5 w-2.5 flex-shrink-0 mt-0.5">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[patient.current_status] ?? 'bg-gray-300'}`} />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex items-center whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg z-10">
              {STATUS_LABELS[patient.current_status] ?? patient.current_status}
            </span>
          </span>
          {/* Photo avatar or initials */}
          <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
            {patient.photo_url
              ? <img src={patient.photo_url} alt={patient.full_name} className="h-full w-full object-cover" />
              : <span className="text-[10px] font-bold text-primary">{(patient.full_name ?? '?').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}</span>
            }
          </div>
          <div>
            <p className="font-semibold text-sm">{patient.full_name}</p>
            {age !== null && (
              <p className="text-xs text-muted-foreground">
                {age} anos · {patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : patient.sex ?? '—'}
              </p>
            )}
          </div>
        </div>
        <Badge variant={STATUS_COLORS[patient.current_status] as any ?? 'default'} className="shrink-0">
          {STATUS_LABELS[patient.current_status] ?? patient.current_status}
        </Badge>
      </div>

      {/* Contact info */}
      <div className="space-y-1">
        {patient.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />{patient.phone}
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3" />{patient.email}
          </div>
        )}
      </div>

      {/* Status info: countdown or not-scheduled warning */}
      {daysToNext !== null && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600">
          <Clock className="h-3 w-3" />
          {daysToNext === 0 ? 'Consulta hoje!' : `Próxima consulta em ${daysToNext}d`}
        </div>
      )}
      {isNotScheduled && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          Sem consulta agendada
        </div>
      )}
      {isInativo && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          {patient.days_absent}d sem consulta · clique para reativar
        </div>
      )}

      {/* Tags + Risk + Meta */}
      <div className="mt-2 flex gap-1 flex-wrap">
        {patient.tier && (
          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            patient.tier === 'DIAMANTE' ? 'bg-cyan-100 text-cyan-700' :
            patient.tier === 'PLATINA' ? 'bg-purple-100 text-purple-700' :
            patient.tier === 'VIP' ? 'bg-amber-100 text-amber-700' :
            patient.tier === 'GOLD' ? 'bg-yellow-100 text-yellow-700' :
            patient.tier === 'SILVER' ? 'bg-gray-100 text-gray-500' :
            'bg-orange-50 text-orange-600')}>
            {patient.tier}
          </span>
        )}
        {(() => { const risk = getReturnRisk(patient); return risk ? <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${risk.color}`}>{risk.label}</span> : null; })()}
        {patient.tags?.map((t: string) => {
          const tagColor =
            t === 'EMBAIXADOR' ? 'bg-green-100 text-green-700 border-green-200' :
            t === 'RESTRICAO' ? 'bg-red-100 text-red-700 border-red-200' :
            t === 'PACIENTE_DIFICIL' ? 'bg-orange-100 text-orange-700 border-orange-200' :
            t === 'GELADEIRA' || t === 'FROZEN' ? 'bg-blue-100 text-blue-700 border-blue-200' :
            t === 'RISCO_EVASAO' ? 'bg-red-50 text-red-600 border-red-100' :
            'bg-amber-50 text-amber-700 border-amber-200';
          return (
            <span key={t} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${tagColor}`}>
              {TAG_LABELS[t] ?? t}
            </span>
          );
        })}
        {patient.mala_direta && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">📨</span>
        )}
        {patient.conheceu_por && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            {ORIGEM_LABELS[patient.conheceu_por] ?? patient.conheceu_por}
          </span>
        )}
      </div>
      {/* Indicado por + LTV */}
      {(patient.indicado_por || (hasManagerAccess && patient.ltv)) && (
        <div className="mt-1 flex gap-3 flex-wrap">
          {patient.indicado_por && (
            <button
              onClick={e => { e.stopPropagation(); onIndicadoPorFilter(patient.indicado_por); }}
              title={`Ver pacientes indicados por ${patient.indicado_por}`}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors text-left"
            >
              🤝 Indicado por: <span className="text-primary font-medium underline-offset-2 hover:underline">{patient.indicado_por}</span>
            </button>
          )}
          {hasManagerAccess && patient.ltv && (() => {
            const ltv = Number(patient.ltv);
            const attendances = (patient as any).attendance_count ?? Math.max(1, Math.round(ltv / 420));
            const ticket = Math.round(ltv / attendances);
            const clinicAvg = 380;
            const isAbove = ticket >= clinicAvg;
            return (
              <p className="text-[10px] text-muted-foreground">
                💰 LTV: <span className="text-foreground font-medium">R$ {ltv.toLocaleString('pt-BR')}</span>
                <span className="mx-1 text-border">·</span>
                Ticket: <span className="text-foreground font-medium">R$ {ticket}</span>
                <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isAbove ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isAbove ? '↑ acima' : '↓ abaixo'} da média
                </span>
              </p>
            );
          })()}
        </div>
      )}
      {/* Sem próxima consulta — active patients without next appointment */}
      {isActiveWithoutNextAppointment && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600">
          <Calendar className="h-3 w-3" />
          Sem próxima consulta
        </div>
      )}

      {/* Quick action buttons — 4 main + more-actions menu */}
      <div className="mt-3 pt-3 border-t border-border flex gap-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={e => handleQuickAction(e, `/financial?patientId=${patient.id}&patientName=${patientName}`)}
          title={flags.financeiro.hasPending ? flags.financeiro.reasons.join(', ') : 'Financeiro'}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
        >
          <PendingDot hasPending={flags.financeiro.hasPending} color="red" />
          <DollarSign className="h-3 w-3" />Financeiro
        </button>
        <button
          onClick={e => handleQuickAction(e, `/agenda?patientId=${patient.id}&patientName=${patientName}`)}
          title={flags.agenda.hasPending ? flags.agenda.reasons.join(', ') : 'Agenda'}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
        >
          <PendingDot hasPending={flags.agenda.hasPending} color="red" />
          <Calendar className="h-3 w-3" />Agenda
        </button>
        <button
          onClick={e => handleQuickAction(e, `/clinical?patientId=${patient.id}&patientName=${patientName}`)}
          title={flags.prontuario.hasPending ? flags.prontuario.reasons.join(', ') : 'Prontuário'}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
        >
          <PendingDot hasPending={flags.prontuario.hasPending} color="red" />
          <FileText className="h-3 w-3" />Prontuário
        </button>
        <button
          onClick={e => handleQuickAction(e, `/patients/${patient.id}`)}
          title={flags.dados.hasPending ? flags.dados.reasons.join(', ') : 'Dados cadastrais'}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all"
        >
          <PendingDot hasPending={flags.dados.hasPending} color="orange" />
          <User className="h-3 w-3" />Dados
        </button>

        {/* More actions menu */}
        <div className="relative ml-auto" ref={moreActionsRef}>
          <button
            onClick={e => { e.stopPropagation(); setMoreActionsOpen(v => !v); }}
            title="Mais ações"
            className="flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {moreActionsOpen && (
            <div className="absolute right-0 bottom-full mb-1 z-20 w-44 rounded-xl border border-border bg-white shadow-lg py-1">
              <button onClick={e => { e.stopPropagation(); onEditClick(patient); setMoreActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                <User className="h-3.5 w-3.5 text-muted-foreground" />Editar cadastro
              </button>
              <div className="my-1 border-t border-border/50" />
              <button onClick={e => { e.stopPropagation(); onEmailClick(patient); setMoreActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />Email
              </button>
              <button onClick={e => { e.stopPropagation(); onSMSClick(patient); setMoreActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />SMS
              </button>
              <button onClick={e => { e.stopPropagation(); onQuestionariosClick(patient); setMoreActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />Questionários
              </button>
              <button onClick={e => { e.stopPropagation(); onImprimirClick(patient); setMoreActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                <Printer className="h-3.5 w-3.5 text-muted-foreground" />Imprimir
              </button>
              <div className="my-1 border-t border-border/50" />
              <button onClick={e => { e.stopPropagation(); router.push(`/patients/${patient.id}`); setMoreActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />Ver timeline
              </button>
              {isInativo && hasManagerAccess && (
                <button onClick={e => { e.stopPropagation(); onInativoClick(patient); setMoreActionsOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5" />Reativar paciente
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const EMPTY_FILTERS: Filters = { sexo: '', tier: '', retorno: '', tag: '', tipo_contato: '', mala_direta: '', aniversariante: '', status: '', origem: '', indicado_por: '' };

// ── Email Modal ───────────────────────────────────────────────────────────────

function EmailModal({ patient, open, onClose }: { patient: any; open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ remetente: 'Clínica', emailRemetente: 'contato@clinica.com.br', assunto: '', mensagem: '' });
  if (!patient) return null;
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Enviar Email — {patient.full_name}</h2>
              <button onClick={onClose}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-muted-foreground">Remetente</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.remetente} onChange={e => setForm(f=>({...f,remetente:e.target.value}))} /></div>
              <div><label className="text-xs text-muted-foreground">Email Remetente</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.emailRemetente} onChange={e => setForm(f=>({...f,emailRemetente:e.target.value}))} /></div>
              <div><label className="text-xs text-muted-foreground">Destinatário</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={patient.full_name} readOnly /></div>
              <div><label className="text-xs text-muted-foreground">Email Destinatário</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={patient.email ?? ''} readOnly /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Assunto</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.assunto} onChange={e => setForm(f=>({...f,assunto:e.target.value}))} /></div>
            <div><label className="text-xs text-muted-foreground">Mensagem</label><textarea rows={4} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm resize-none" value={form.mensagem} onChange={e => setForm(f=>({...f,mensagem:e.target.value}))} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => { toast.info('Envio de e-mail em integração — disponível em breve'); onClose(); }}>Enviar Email</Button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Questionários Modal ───────────────────────────────────────────────────────

const MOCK_QUESTIONARIOS = [
  { id: 1, titulo: 'Anamnese Inicial', respondido: true, data: '2024-01-15', score: 87 },
  { id: 2, titulo: 'Satisfação do Atendimento', respondido: true, data: '2024-02-20', score: 94 },
  { id: 3, titulo: 'Qualidade de Vida (SF-36)', respondido: false, data: null, score: null },
  { id: 4, titulo: 'Questionário Alimentar', respondido: true, data: '2024-03-01', score: 72 },
  { id: 5, titulo: 'Avaliação Pós-Procedimento', respondido: false, data: null, score: null },
];

function QuestionariosModal({ patient, open, onClose }: { patient: any; open: boolean; onClose: () => void }) {
  const { data: questionarios = MOCK_QUESTIONARIOS } = useQuery({
    queryKey: ['patient-questionarios', patient?.id],
    queryFn: () => api.get(`/patients/${patient?.id}/questionarios`).then(r => r.data).catch(() => MOCK_QUESTIONARIOS),
    enabled: !!patient?.id && open,
  });
  if (!patient) return null;
  const respondidos = questionarios.filter((q: any) => q.respondido).length;
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">Questionários</h2>
                  <p className="text-xs text-muted-foreground">{patient.full_name} · {respondidos}/{questionarios.length} respondidos</p>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="h-4 w-4" /></button>
            </div>

            {/* List */}
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {questionarios.map((q: any) => (
                <div key={q.id} className={cn('flex items-center justify-between rounded-xl border px-4 py-3 transition-colors', q.respondido ? 'border-green-200 bg-green-50/50' : 'border-border bg-white')}>
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', q.respondido ? 'bg-green-100' : 'bg-muted')}>
                      <ClipboardList className={cn('h-3.5 w-3.5', q.respondido ? 'text-green-600' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <p className="text-xs font-medium">{q.titulo}</p>
                      {q.respondido && q.data && (
                        <p className="text-[10px] text-muted-foreground">Respondido em {new Date(q.data).toLocaleDateString('pt-BR')} · Score: {q.score}%</p>
                      )}
                      {!q.respondido && <p className="text-[10px] text-amber-600">Pendente</p>}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {q.respondido ? (
                      <button className="text-[10px] text-blue-600 hover:underline px-2 py-1 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
                        Ver
                      </button>
                    ) : (
                      <button
                        onClick={() => toast.info('Envio de questionário em integração — disponível em breve')}
                        className="text-[10px] text-primary hover:underline px-2 py-1 rounded border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        Enviar Link
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 px-6 py-4 border-t">
              <Button size="sm" className="gap-1.5" onClick={() => toast.info('Criação de questionário em desenvolvimento')}>
                <Plus className="h-3.5 w-3.5" />Criar Questionário
              </Button>
              <Button variant="secondary" size="sm" onClick={() => toast.info('Envio em massa em integração — disponível em breve')}>Enviar Todos</Button>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>Fechar</Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 -z-10 bg-black/30 backdrop-blur-sm" />
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Imprimir Ficha Modal ──────────────────────────────────────────────────────

function ImprimirFichaModal({ patient, open, onClose }: { patient: any; open: boolean; onClose: () => void }) {
  if (!patient) return null;
  const age = patient.birth_date
    ? Math.floor((Date.now() - new Date(patient.birth_date).getTime()) / 31557600000)
    : null;
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">Imprimir Ficha do Paciente</h2>
                  <p className="text-xs text-muted-foreground">{patient.full_name}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="h-4 w-4" /></button>
            </div>

            {/* Preview */}
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-border p-4 bg-gray-50 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">{patient.full_name}</h3>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                    patient.tier === 'DIAMANTE' ? 'bg-cyan-100 text-cyan-700' :
                    patient.tier === 'VIP' ? 'bg-amber-100 text-amber-700' :
                    patient.tier === 'GOLD' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  )}>{patient.tier ?? 'BRONZE'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div><span className="font-medium text-foreground">Código:</span> {patient.id}</div>
                  {age !== null && <div><span className="font-medium text-foreground">Idade:</span> {age} anos</div>}
                  <div><span className="font-medium text-foreground">Sexo:</span> {patient.sex === 'F' ? 'Feminino' : patient.sex === 'M' ? 'Masculino' : '-'}</div>
                  <div><span className="font-medium text-foreground">Status:</span> {STATUS_LABELS[patient.current_status] ?? patient.current_status}</div>
                  {patient.phone && <div><span className="font-medium text-foreground">Telefone:</span> {patient.phone}</div>}
                  {patient.email && <div><span className="font-medium text-foreground">Email:</span> {patient.email}</div>}
                  <div><span className="font-medium text-foreground">Contato:</span> {patient.tipo_contato ?? '-'}</div>
                  <div><span className="font-medium text-foreground">Mala Direta:</span> {patient.mala_direta ? 'Sim' : 'Não'}</div>
                </div>
                {patient.tags?.length > 0 && (
                  <div className="text-xs"><span className="font-medium text-foreground">Tags:</span> {patient.tags.map((t: string) => TAG_LABELS[t] ?? t).join(', ')}</div>
                )}
                <div className="border-t pt-2 text-[10px] text-muted-foreground">
                  Ficha gerada em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · AYRON Sistema
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Opções de impressão</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Dados Cadastrais', 'Histórico de Consultas', 'Financeiro', 'Prontuário Resumido'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-muted/50 text-xs">
                      <input type="checkbox" defaultChecked={opt === 'Dados Cadastrais'} className="accent-primary h-3.5 w-3.5" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-6 py-4 border-t">
              <Button size="sm" className="gap-1.5" onClick={() => { window.print(); onClose(); }}>
                <Printer className="h-3.5 w-3.5" />Imprimir
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { toast.info('Exportação PDF em desenvolvimento'); onClose(); }}>
                Exportar PDF
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>Cancelar</Button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 -z-10 bg-black/30 backdrop-blur-sm" />
        </div>
      )}
    </AnimatePresence>
  );
}

// ── SMS Modal ─────────────────────────────────────────────────────────────────

function SMSModal({ patient, open, onClose }: { patient: any; open: boolean; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  if (!patient) return null;
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Torpedo / SMS — {patient.full_name}</h2>
              <button onClick={onClose}><X className="h-4 w-4" /></button>
            </div>
            <div><label className="text-xs text-muted-foreground">Número do cliente</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={patient.phone ?? ''} readOnly /></div>
            <div>
              <label className="text-xs text-muted-foreground">Mensagem ({msg.length}/120 caracteres)</label>
              <textarea rows={3} maxLength={120} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm resize-none" value={msg} onChange={e => setMsg(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => { toast.info('Envio de SMS em integração — disponível em breve'); onClose(); }}>Enviar Torpedo</Button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function BirthdayModal({ patients, open, onClose }: { patients: any[]; open: boolean; onClose: () => void }) {
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [dateTo, setDateTo] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d; });
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null);

  const rows: PatientBirthdayRow[] = patients.map(p => ({
    full_name: p.full_name ?? p.name ?? '',
    birth_date: p.birth_date ?? p.birthdate ?? '',
    phone: p.phone,
    email: p.email,
    tags: p.tags,
    responsavel: p.responsavel,
    current_status: p.current_status,
    notes: p.notes ?? p.obs,
  }));

  const preview = rows.filter(r => r.birth_date && !isNaN(new Date(r.birth_date).getTime()));

  if (!open) return null;

  async function handleExport(fmt: 'excel' | 'pdf') {
    setLoading(fmt);
    try {
      if (fmt === 'excel') birthdayExportService.exportExcel(rows, dateFrom, dateTo);
      else birthdayExportService.exportPDF(rows, dateFrom, dateTo);
      toast.success('Download iniciado');
    } catch {
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold flex items-center gap-2"><Cake className="h-4 w-4" />Aniversariantes</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0 flex-wrap">
          <label className="text-sm text-muted-foreground">De</label>
          <input type="date" value={dateFrom.toISOString().slice(0, 10)}
            onChange={e => setDateFrom(new Date(e.target.value + 'T12:00:00'))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <label className="text-sm text-muted-foreground">até</label>
          <input type="date" value={dateTo.toISOString().slice(0, 10)}
            onChange={e => setDateTo(new Date(e.target.value + 'T12:00:00'))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {preview.length > 500 && (
          <div className="mx-6 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700 flex-shrink-0">
            {preview.length} pacientes encontrados — o relatório pode ser extenso.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 text-left font-medium">Nome</th>
                <th className="pb-2 text-left font-medium">Nascimento</th>
                <th className="pb-2 text-left font-medium">Idade</th>
                <th className="pb-2 text-left font-medium">Telefone</th>
                <th className="pb-2 text-left font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 100).map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5">{p.full_name}</td>
                  <td className="py-1.5">{new Date(p.birth_date).toLocaleDateString('pt-BR')}</td>
                  <td className="py-1.5">{Math.floor((Date.now() - new Date(p.birth_date).getTime()) / 31_557_600_000)}</td>
                  <td className="py-1.5">{p.phone ?? '—'}</td>
                  <td className="py-1.5">{(p.tags ?? []).join(', ') || '—'}</td>
                </tr>
              ))}
              {preview.length > 100 && (
                <tr><td colSpan={5} className="py-2 text-center text-muted-foreground text-xs">+{preview.length - 100} pacientes no export</td></tr>
              )}
              {preview.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-xs">Nenhum paciente com data de nascimento</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-4 flex-shrink-0">
          <button
            onClick={() => handleExport('excel')}
            disabled={loading !== null}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'excel' ? 'Gerando relatório...' : 'Exportar Excel'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={loading !== null}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'pdf' ? 'Gerando relatório...' : 'Exportar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [quickFilter, setQuickFilter] = useState<string>('');
  const [campaignPatient, setCampaignPatient] = useState<any>(null);
  const [emailPatient, setEmailPatient] = useState<any>(null);
  const [smsPatient, setSmsPatient] = useState<any>(null);
  const [questionariosPatient, setQuestionariosPatient] = useState<any>(null);
  const [imprimirPatient, setImprimirPatient] = useState<any>(null);
  const router = useRouter();
  const [editPatient, setEditPatient] = useState<any>(null);
  const user = useAuthStore(s => s.user);
  const hasManagerAccess = user?.role === 'MASTER' || user?.role === 'ADMIN' || user?.role === 'GERENTE';

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search, page],
    queryFn: () =>
      api.get('/patients', { params: { search: search || undefined, page, limit: PAGE_SIZE } })
        .then(r => r.data)
        .catch(() => ({ data: [], total: 0, totalPages: 1 })),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  // Stats query — busca todos os pacientes para contadores dos quick filters
  const { data: allPatientsData } = useQuery({
    queryKey: ['patients-all-stats'],
    queryFn: () => api.get('/patients', { params: { limit: 200 } }).then(r => r.data?.data ?? []).catch(() => []),
    staleTime: 60_000,
  });
  const allPatients: any[] = allPatientsData ?? [];

  const apiPatients: any[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  const handleSearch = (val: string) => { setSearch(val); setPage(1); };
  const setFilter = (key: keyof Filters, val: string) => setFilters(f => ({ ...f, [key]: f[key] === val ? '' : val }));
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setQuickFilter(''); };

  const currentMonth = new Date().getMonth() + 1;

  let patients = apiPatients.filter((p: any) => {
    const s = search.toLowerCase();
    if (s && !p.full_name?.toLowerCase().includes(s) && !p.phone?.includes(s) && !p.cpf?.replace(/\D/g,'').includes(s.replace(/\D/g,'')) && !p.email?.toLowerCase().includes(s)) return false;
    if (filters.sexo && p.sex !== filters.sexo) return false;
    if (filters.tier && p.tier !== filters.tier) return false;
    if (filters.tag && filters.tag !== 'INATIVO_5ANOS' && !p.tags?.includes(filters.tag)) return false;
    if (filters.tag === 'INATIVO_5ANOS' && (p.days_absent ?? 0) < 1825) return false;
    if (filters.tipo_contato && p.tipo_contato !== filters.tipo_contato) return false;
    if (filters.mala_direta === 'SIM' && !p.mala_direta) return false;
    if (filters.mala_direta === 'NAO' && p.mala_direta) return false;
    if (filters.aniversariante === 'MES' && p.birth_date && new Date(p.birth_date).getMonth() + 1 !== currentMonth) return false;
    if (filters.retorno === 'EM_RISCO' && p.days_absent < 60) return false;
    if (filters.retorno === 'PERDENDO' && (p.days_absent < 90 || p.days_absent >= 180)) return false;
    if (filters.retorno === 'SEM_RETORNO' && p.days_absent < 180) return false;
    if (filters.status && p.current_status !== filters.status) return false;
    if (filters.origem && p.conheceu_por !== filters.origem) return false;
    if (filters.indicado_por && !p.indicado_por?.toLowerCase().includes(filters.indicado_por.toLowerCase())) return false;
    if (quickFilter === 'ATIVO' && p.current_status === 'INATIVO') return false;
    if (quickFilter === 'VIP' && !['DIAMANTE','PLATINA','VIP'].includes(p.tier)) return false;
    if (quickFilter === 'EM_RISCO' && p.days_absent < 60) return false;
    if (quickFilter === 'INATIVO' && p.current_status !== 'INATIVO') return false;
    if (quickFilter === 'ANIVERSARIO' && p.birth_date && new Date(p.birth_date).getMonth() + 1 !== currentMonth) return false;
    if (quickFilter === 'MALA_DIRETA' && !p.mala_direta) return false;
    return true;
  });

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const aniversariantesCount = allPatients.filter(p => p.birth_date && new Date(p.birth_date).getMonth() + 1 === currentMonth).length;
  const inativoCount = allPatients.filter(p => p.current_status === 'INATIVO').length;

  return (
    <div>
      <Topbar title="Pacientes" />
      <div className="p-6 space-y-4">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por nome, CPF, telefone..."
              className="w-full rounded-lg border border-border pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button
            variant={showFilters ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(s => !s)}
            className="gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="h-4.5 min-w-4 rounded-full bg-white/30 text-xs font-bold px-1">{activeFilterCount}</span>
            )}
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Exportação em desenvolvimento')}><Download className="h-4 w-4" /></Button>
          <Button variant="secondary" onClick={() => setBirthdayModalOpen(true)}>
            <Cake className="h-4 w-4" /> Aniversariantes
          </Button>
          <Button onClick={() => setNewPatientOpen(true)}>
            <Plus className="h-4 w-4" /> Novo Paciente
          </Button>
        </div>

        {/* Quick filters */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: '', label: 'Todos', count: total },
            { key: 'ATIVO', label: '✅ Ativos', count: allPatients.filter(p => p.current_status !== 'INATIVO').length },
            { key: 'VIP', label: '💎 VIP+', count: allPatients.filter(p => ['DIAMANTE','PLATINA','VIP'].includes(p.tier)).length },
            { key: 'EM_RISCO', label: '⚠️ Em Risco', count: allPatients.filter(p => (p.days_absent ?? 0) >= 60 && p.current_status !== 'INATIVO').length },
            { key: 'INATIVO', label: '🔴 Inativos', count: inativoCount },
            { key: 'ANIVERSARIO', label: `🎂 Aniversário`, count: aniversariantesCount },
            { key: 'MALA_DIRETA', label: '📨 Mala Direta', count: allPatients.filter(p => p.mala_direta).length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setQuickFilter(k => k === key ? '' : key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                quickFilter === key ? 'bg-primary text-white border-primary' : 'bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              )}
            >
              {label}
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                quickFilter === key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
                {count}
              </span>
            </button>
          ))}
          {(activeFilterCount > 0 || quickFilter) && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
              <X className="h-3 w-3" />Limpar
            </button>
          )}
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl border border-border bg-white p-4 space-y-4"
          >
            <div className="grid grid-cols-4 gap-4">
              {/* Sexo */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Sexo</p>
                <div className="flex gap-2">
                  {[{ k: 'F', l: 'Feminino' }, { k: 'M', l: 'Masculino' }].map(({ k, l }) => (
                    <button key={k} onClick={() => setFilter('sexo', k)}
                      className={cn('flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors', filters.sexo === k ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Tier</p>
                <select value={filters.tier} onChange={e => setFilter('tier', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-white outline-none focus:border-primary">
                  <option value="">Todos</option>
                  {['DIAMANTE', 'PLATINA', 'VIP', 'GOLD', 'SILVER', 'BRONZE'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Status retorno */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Status de Retorno</p>
                <select value={filters.retorno} onChange={e => setFilter('retorno', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-white outline-none focus:border-primary">
                  <option value="">Todos</option>
                  <option value="EM_RISCO">Em Risco (60–90d)</option>
                  <option value="PERDENDO">Perdendo (90–180d)</option>
                  <option value="SEM_RETORNO">Sem Retorno (180d+)</option>
                </select>
              </div>

              {/* Tipo de contato */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Tipo de Contato</p>
                <select value={filters.tipo_contato} onChange={e => setFilter('tipo_contato', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-white outline-none focus:border-primary">
                  <option value="">Todos</option>
                  {['WHATSAPP', 'EMAIL', 'SMS', 'INSTAGRAM', 'INDICACAO'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Status agenda */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Status</p>
                <select value={filters.status} onChange={e => setFilter('status', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-white outline-none focus:border-primary">
                  <option value="">Todos</option>
                  {['NOVA_LEAD','AGENDADO','CONFIRMADO','CONSULTA','INATIVO','CANCELADO','LISTA_ESPERA'].map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">
                  Pacientes inativos há mais de 5 anos são candidatos a arquivamento.
                </p>
              </div>

              {/* Tag */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Tag</p>
                <select value={filters.tag} onChange={e => setFilter('tag', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-white outline-none focus:border-primary">
                  <option value="">Todas</option>
                  <option value="INATIVO_5ANOS">⚠️ Inativo há +5 anos</option>
                  {Object.entries(TAG_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Mala direta */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground">Mala Direta</p>
                  <span className="group relative cursor-help">
                    <Info className="h-3 w-3 text-muted-foreground/60" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-52 rounded-lg bg-gray-900 px-2.5 py-2 text-[11px] text-white shadow-lg z-20 leading-relaxed">
                      Pacientes que autorizaram recebimento de comunicações de marketing: promoções, campanhas, newsletters e lembretes comerciais.
                    </span>
                  </span>
                </div>
                <div className="flex gap-2">
                  {[{ k: 'SIM', l: 'Sim' }, { k: 'NAO', l: 'Não' }].map(({ k, l }) => (
                    <button key={k} onClick={() => setFilter('mala_direta', k)}
                      className={cn('flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors', filters.mala_direta === k ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aniversariante */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Aniversariante</p>
                <button
                  onClick={() => setFilter('aniversariante', 'MES')}
                  className={cn('w-full py-1.5 rounded-lg border text-xs font-medium transition-colors', filters.aniversariante === 'MES' ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                  🎂 Deste mês ({aniversariantesCount})
                </button>
              </div>

              {/* Origem */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Origem</p>
                <select value={filters.origem} onChange={e => setFilter('origem', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-white outline-none focus:border-primary">
                  <option value="">Todas</option>
                  {['Instagram','WhatsApp','Indicação','Tráfego Pago','Presencial','Email','Facebook','Internet','Palestra','Propaganda','Outros'].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              {/* Indicado por */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Indicado por</p>
                <input
                  value={filters.indicado_por}
                  onChange={e => setFilters(f => ({ ...f, indicado_por: e.target.value }))}
                  placeholder="Nome do indicador..."
                  className="w-full px-2 py-1.5 rounded-lg border border-border text-xs bg-white outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground"><Brain className="h-3.5 w-3.5 inline mr-1 text-primary" />{patients.length} pacientes correspondem a estes filtros</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={clearFilters}>Limpar filtros</Button>
                <Button size="sm"><Download className="h-3.5 w-3.5 mr-1.5" />Exportar lista</Button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCheck className="h-4 w-4" />
            <span>{patients.length} paciente(s) {activeFilterCount > 0 || quickFilter ? 'filtrados' : 'no total'}</span>
            {inativoCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {inativoCount} inativo(s)
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <UserCheck className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum paciente encontrado</p>
            <p className="text-xs mt-1">Comece criando o primeiro paciente da clínica</p>
            <Button className="mt-4" onClick={() => setNewPatientOpen(true)}>
              <Plus className="h-4 w-4" /> Criar Primeiro Paciente
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {patients.map((p: any) => (
              <PatientCard
                key={p.id}
                patient={p}
                onClick={() => router.push(`/patients/${p.id}`)}
                onInativoClick={setCampaignPatient}
                onEmailClick={setEmailPatient}
                onSMSClick={setSmsPatient}
                onQuestionariosClick={setQuestionariosPatient}
                onImprimirClick={setImprimirPatient}
                onEditClick={setEditPatient}
                onIndicadoPorFilter={nome => setFilters(f => ({ ...f, indicado_por: nome }))}
                hasManagerAccess={hasManagerAccess}
              />
            ))}
          </div>
        )}
      </div>

      <BirthdayModal
        patients={apiPatients}
        open={birthdayModalOpen}
        onClose={() => setBirthdayModalOpen(false)}
      />
      <NewPatientModal open={newPatientOpen} onClose={() => setNewPatientOpen(false)} />
      <NewPatientModal open={!!editPatient} onClose={() => setEditPatient(null)} patient={editPatient} />
      <ReactivationModal
        patient={campaignPatient}
        open={!!campaignPatient}
        onClose={() => setCampaignPatient(null)}
      />
      <EmailModal
        patient={emailPatient}
        open={!!emailPatient}
        onClose={() => setEmailPatient(null)}
      />
      <SMSModal
        patient={smsPatient}
        open={!!smsPatient}
        onClose={() => setSmsPatient(null)}
      />
      <QuestionariosModal
        patient={questionariosPatient}
        open={!!questionariosPatient}
        onClose={() => setQuestionariosPatient(null)}
      />
      <ImprimirFichaModal
        patient={imprimirPatient}
        open={!!imprimirPatient}
        onClose={() => setImprimirPatient(null)}
      />
    </div>
  );
}
