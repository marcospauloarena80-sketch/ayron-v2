'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns/format';
import { ptBR } from 'date-fns/locale';
import {
  Calendar, FileText, Activity, Zap, DollarSign, TestTube,
  CheckCircle, Clock, AlertCircle, Loader2, ChevronRight
} from 'lucide-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface TimelineEvent {
  id: string;
  type: 'appointment' | 'document' | 'metric' | 'implant' | 'exam' | 'payment';
  title: string;
  subtitle?: string;
  date: Date;
  status?: string;
  meta?: Record<string, any>;
}

const EVENT_CONFIG: Record<TimelineEvent['type'], { icon: any; color: string; bgCls: string }> = {
  appointment: { icon: Calendar, color: 'text-blue-600', bgCls: 'bg-blue-100' },
  document: { icon: FileText, color: 'text-green-600', bgCls: 'bg-green-100' },
  metric: { icon: Activity, color: 'text-purple-600', bgCls: 'bg-purple-100' },
  implant: { icon: Zap, color: 'text-amber-600', bgCls: 'bg-amber-100' },
  exam: { icon: TestTube, color: 'text-teal-600', bgCls: 'bg-teal-100' },
  payment: { icon: DollarSign, color: 'text-emerald-600', bgCls: 'bg-emerald-100' },
};

function StatusIcon({ status }: { status?: string }) {
  if (!status) return null;
  if (['COMPLETED', 'SIGNED', 'SIGNED_VALIDATED'].includes(status)) return <CheckCircle className="h-3 w-3 text-green-500" />;
  if (['PENDING', 'PENDING_CFM_VALIDATION', 'SCHEDULED'].includes(status)) return <Clock className="h-3 w-3 text-amber-500" />;
  if (['CANCELLED', 'MISSED'].includes(status)) return <AlertCircle className="h-3 w-3 text-red-400" />;
  return null;
}

interface Props {
  patientId: string;
}

export function PatientTimeline({ patientId }: Props) {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['patient-timeline', patientId],
    queryFn: async () => {
      const [appts, docs, txs] = await Promise.all([
        api.get(`/agenda/patients/${patientId}?limit=10`).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
        api.get(`/patients/${patientId}/documents?limit=10`).then(r => r.data?.data ?? []).catch(() => []),
        api.get(`/financial/patients/${patientId}?limit=10`).then(r => r.data?.data ?? []).catch(() => []),
      ]);

      const events: TimelineEvent[] = [
        ...appts.map((a: any) => ({
          id: `appt-${a.id}`, type: 'appointment' as const,
          title: a.service?.name ?? 'Consulta',
          subtitle: a.professional?.name,
          date: new Date(a.start_time),
          status: a.status,
        })),
        ...docs.map((d: any) => ({
          id: `doc-${d.id}`, type: 'document' as const,
          title: d.title,
          subtitle: d.type === 'PRESCRIPTION' ? 'Receita' : d.type === 'EXAM_REQUEST' ? 'Pedido de Exames' : d.type,
          date: new Date(d.created_at),
          status: d.status,
        })),
        ...txs.filter((t: any) => t.type === 'REVENUE').map((t: any) => ({
          id: `tx-${t.id}`, type: 'payment' as const,
          title: t.description ?? 'Cobrança',
          subtitle: `R$ ${Number(t.amount).toFixed(2)}`,
          date: new Date(t.created_at),
          status: t.status,
        })),
      ];

      return events.sort((a, b) => b.date.getTime() - a.date.getTime());
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">Carregando timeline...</span>
      </div>
    );
  }

  const events = data ?? [];

  if (!events.length) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-20" />
        <p className="text-sm">Nenhum evento registrado ainda</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-0">
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
      {events.map((ev, i) => {
        const cfg = EVENT_CONFIG[ev.type];
        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="relative flex gap-3 pb-5"
          >
            <div className={`absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full ${cfg.bgCls} shrink-0 mt-0.5`}>
              <cfg.icon className={`h-2.5 w-2.5 ${cfg.color}`} />
            </div>
            <div className="flex-1 min-w-0 bg-white rounded-lg border border-border px-3 py-2 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => {
                const rawId = ev.id.replace(/^(appt|doc|tx)-/, '');
                if (ev.type === 'appointment') router.push(`/patients/${patientId}/appointments/${rawId}`);
                else if (ev.type === 'document') router.push(`/patients/${patientId}?tab=documentos&docId=${rawId}`);
                else if (ev.type === 'payment') router.push(`/patients/${patientId}?tab=financeiro`);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold truncate">{ev.title}</p>
                <div className="flex items-center gap-1">
                  <StatusIcon status={ev.status} />
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              </div>
              {ev.subtitle && <p className="text-[10px] text-muted-foreground truncate">{ev.subtitle}</p>}
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {format(ev.date, "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
