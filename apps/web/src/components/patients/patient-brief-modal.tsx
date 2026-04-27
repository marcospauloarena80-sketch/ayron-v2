'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Minus, AlertTriangle, Calendar, DollarSign, UserPlus, Phone, TrendingUp, TrendingDown } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface PatientBriefModalProps {
  patientId: string;
  patientName?: string;
  open: boolean;
  onClose: () => void;
}

const BAND_COLORS: Record<string, string> = {
  RED: 'bg-red-100 text-red-700 border border-red-200',
  YELLOW: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  GREEN: 'bg-green-100 text-green-700 border border-green-200',
};

const BAND_LABELS: Record<string, string> = {
  RED: 'Risco Alto',
  YELLOW: 'Atenção',
  GREEN: 'Estável',
};

const FACTOR_LABELS: Record<string, string> = {
  no_return_active_protocol: 'Sem retorno c/ protocolo ativo',
  implant_due_soon: 'Implante próximo da troca',
  weight_drop_no_adjustment: 'Perda de peso sem ajuste',
  missing_bioimpedance: 'Bioimpedância ausente',
  active_high_critical_alerts: 'Alertas críticos ativos',
  pending_charge_7d: 'Cobrança pendente >7d',
  multiple_misses_90d: 'Múltiplas faltas/cancelamentos',
  interval_above_average: 'Intervalo entre consultas elevado',
  many_dismissed_alerts: 'Alertas ignorados repetidamente',
  no_future_appt_active_protocol: 'Sem agendamento c/ protocolo ativo',
};

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === 'UP') return <ArrowUp className="h-3.5 w-3.5 text-red-500 inline" />;
  if (trend === 'DOWN') return <ArrowDown className="h-3.5 w-3.5 text-green-500 inline" />;
  return <Minus className="h-3.5 w-3.5 text-gray-400 inline" />;
}

export function PatientBriefModal({ patientId, patientName, open, onClose }: PatientBriefModalProps) {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: brief, isLoading } = useQuery({
    queryKey: ['patient-brief', patientId],
    queryFn: () => api.get(`/cognitive/patients/${patientId}/brief`).then((r) => r.data),
    enabled: open && !!patientId,
    staleTime: 60_000,
  });

  const addWaitlistMutation = useMutation({
    mutationFn: () =>
      api.post(`/cognitive/patients/${patientId}/actions/add-waitlist`, { priority: 'high', reason: 'RETURN' }),
    onSuccess: () => { toast.success('Adicionado à waitlist'); qc.invalidateQueries({ queryKey: ['cognitive-top-risk'] }); },
    onError: () => toast.error('Erro ao adicionar à waitlist'),
  });

  const markContactedMutation = useMutation({
    mutationFn: () => api.post(`/cognitive/patients/${patientId}/actions/mark-contacted`),
    onSuccess: () => toast.success('Marcado como contatado'),
    onError: () => toast.error('Erro ao registrar contato'),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={patientName ? `${patientName} — Brief Cognitivo` : 'Brief Cognitivo'}
      size="md"
    >
      {isLoading ? (
        <div className="space-y-3 py-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
          ))}
        </div>
      ) : brief ? (
        <div className="space-y-4">
          {/* Score cards — sem números brutos, só urgência */}
          <div className="grid grid-cols-3 gap-2">
            {([
              { label: 'Risco Clínico',    band: brief.scores.band, trend: null },
              { label: 'Risco de Abandono', band: brief.scores.band, trend: null },
              { label: 'Prioridade Geral',  band: brief.scores.band, trend: brief.scores.trend },
            ] as Array<{ label: string; band: string; trend: string | null }>).map((s) => (
              <div key={s.label} className="rounded-lg border p-3 text-center space-y-1">
                <p className="text-xs text-gray-500 leading-tight">{s.label}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold ${BAND_COLORS[s.band] ?? 'bg-gray-100 text-gray-600'}`}>
                  {BAND_LABELS[s.band] ?? s.band ?? '—'}
                </span>
                {s.trend && (
                  <div className="flex items-center justify-center">
                    <TrendIcon trend={s.trend} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Indicadores preditivos — sem percentuais, só urgência */}
          {(brief.scores.nsp != null || brief.scores.dr30 != null || brief.scores.clinical_trend) && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border p-2 text-center bg-gray-50">
                <p className="text-xs text-gray-500">Prob. de Falta</p>
                <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${(brief.scores.nsp ?? 0) >= 70 ? 'bg-red-100 text-red-700' : (brief.scores.nsp ?? 0) >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {(brief.scores.nsp ?? 0) >= 70 ? 'Alta' : (brief.scores.nsp ?? 0) >= 40 ? 'Média' : 'Baixa'}
                </span>
              </div>
              <div className="rounded-lg border p-2 text-center bg-gray-50">
                <p className="text-xs text-gray-500">Abandono 30d</p>
                <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${(brief.scores.dr30 ?? 0) >= 70 ? 'bg-red-100 text-red-700' : (brief.scores.dr30 ?? 0) >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {(brief.scores.dr30 ?? 0) >= 70 ? 'Alto' : (brief.scores.dr30 ?? 0) >= 40 ? 'Médio' : 'Baixo'}
                </span>
              </div>
              <div className="rounded-lg border p-2 text-center bg-gray-50">
                <p className="text-xs text-gray-500">Tendência Clínica</p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {brief.scores.clinical_trend === 'UP'
                    ? <TrendingUp className="h-4 w-4 text-green-500" />
                    : brief.scores.clinical_trend === 'DOWN'
                    ? <TrendingDown className="h-4 w-4 text-red-500" />
                    : <Minus className="h-4 w-4 text-gray-400" />}
                  <span className="text-sm font-medium">
                    {brief.scores.clinical_trend === 'UP' ? 'Melhora' : brief.scores.clinical_trend === 'DOWN' ? 'Piora' : 'Estável'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Top 3 factors */}
          {Array.isArray(brief.top_3_factors) && brief.top_3_factors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Top 3 Fatores</p>
              <ul className="space-y-1">
                {brief.top_3_factors.map((f: { key: string; weight: number }) => (
                  <li key={f.key} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                    <span>{FACTOR_LABELS[f.key] ?? f.key}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary row */}
          <div className="rounded-lg bg-gray-50 p-3 text-xs space-y-1 border">
            <div className="flex justify-between">
              <span className="text-gray-500">Última consulta</span>
              <span className="font-medium">
                {brief.last_appointment
                  ? format(new Date(brief.last_appointment.start_time), 'dd/MM/yyyy', { locale: ptBR })
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Próxima consulta</span>
              <span className="font-medium">
                {brief.next_appointment
                  ? format(new Date(brief.next_appointment.start_time), 'dd/MM/yyyy', { locale: ptBR })
                  : '—'}
              </span>
            </div>
            {Array.isArray(brief.active_protocols) && brief.active_protocols.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Protocolo ativo</span>
                <span className="font-medium">{brief.active_protocols[0].name}</span>
              </div>
            )}
            {brief.implant_next_change && (
              <div className="flex justify-between">
                <span className="text-gray-500">Implante — troca</span>
                <span className="font-medium text-orange-600">
                  {format(new Date(brief.implant_next_change.next_change_date), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            )}
            {brief.pending_charges > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Pendência financeira</span>
                <span className="font-medium text-red-600">
                  R$ {Number(brief.pending_charges).toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs"
              onClick={() => { router.push(`/agenda?patientId=${patientId}`); onClose(); }}>
              <Calendar className="h-3.5 w-3.5" />Agendar
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs"
              onClick={() => addWaitlistMutation.mutate()}
              disabled={addWaitlistMutation.isPending}>
              <UserPlus className="h-3.5 w-3.5" />Waitlist
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs"
              onClick={() => markContactedMutation.mutate()}
              disabled={markContactedMutation.isPending}>
              <Phone className="h-3.5 w-3.5" />Contatado
            </Button>
            <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs"
              onClick={() => { router.push(`/financial?patientId=${patientId}`); onClose(); }}>
              <DollarSign className="h-3.5 w-3.5" />Financeiro
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 py-4 text-center">Dados não disponíveis.</p>
      )}
    </Dialog>
  );
}
