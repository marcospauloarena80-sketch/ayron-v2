'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertTriangle, Clock, User, GripVertical } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STAGES = [
  { key: 'AGENDADO', label: 'Agendado', color: 'bg-slate-100 border-slate-300' },
  { key: 'CHEGOU', label: 'Chegou', color: 'bg-blue-50 border-blue-300' },
  { key: 'BIOIMPEDANCIA', label: 'Bioimpedância', color: 'bg-purple-50 border-purple-300' },
  { key: 'CONSULTA', label: 'Consulta', color: 'bg-yellow-50 border-yellow-300' },
  { key: 'SOROTERAPIA', label: 'Soroterapia', color: 'bg-orange-50 border-orange-300' },
  { key: 'IMPLANTE', label: 'Implante', color: 'bg-pink-50 border-pink-300' },
  { key: 'FINALIZADO', label: 'Finalizado', color: 'bg-green-50 border-green-300' },
];

interface Props {
  appointments: any[];
  date: Date;
  onFinalizeRequest?: (appointment: any) => void;
}

export function KanbanView({ appointments, date, onFinalizeRequest }: Props) {
  const qc = useQueryClient();
  const [dragId, setDragId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [pendingMove, setPendingMove] = useState<{ id: string; fromStage: string; toStage: string } | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<any | null>(null);

  const stageMutation = useMutation({
    mutationFn: ({ id, stage, skipped_reason }: { id: string; stage: string; skipped_reason?: string }) =>
      api.post(`/agenda/${id}/kanban-stage`, { stage, skipped_reason }),
    onSuccess: () => {
      toast.success('Etapa atualizada');
      qc.invalidateQueries({ queryKey: ['agenda'] });
      setPendingMove(null);
      setSkipReason('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao atualizar etapa'),
  });

  const getStage = (appt: any) => appt.kanban_stage ?? 'AGENDADO';

  const stageIndex = (key: string) => STAGES.findIndex(s => s.key === key);

  const handleDrop = (targetStage: string) => {
    if (!dragId) return;
    const appt = appointments.find(a => a.id === dragId);
    if (!appt) return;
    const from = getStage(appt);
    if (from === targetStage) { setDragId(null); return; }

    if (targetStage === 'FINALIZADO') {
      setFinalizeTarget(appt);
      setDragId(null);
      return;
    }

    const fromIdx = stageIndex(from);
    const toIdx = stageIndex(targetStage);
    const isSkipping = toIdx > fromIdx + 1;

    if (isSkipping) {
      setPendingMove({ id: dragId, fromStage: from, toStage: targetStage });
      setSkipReason('');
      setDragId(null);
    } else {
      stageMutation.mutate({ id: dragId, stage: targetStage });
      setDragId(null);
    }
  };

  const confirmSkip = () => {
    if (!pendingMove) return;
    if (!skipReason.trim()) { toast.error('Informe o motivo para pular etapa'); return; }
    stageMutation.mutate({ id: pendingMove.id, stage: pendingMove.toStage, skipped_reason: skipReason });
  };

  const byStage = (stageKey: string) => appointments.filter(a => getStage(a) === stageKey);

  return (
    <div className="w-full">
      {/* Skip reason modal */}
      {pendingMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-semibold text-sm">Etapa pulada</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Você está pulando de <strong>{pendingMove.fromStage}</strong> para <strong>{pendingMove.toStage}</strong>.
              Informe o motivo:
            </p>
            <textarea
              className="w-full rounded-lg border border-border p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Motivo obrigatório..."
              value={skipReason}
              onChange={e => setSkipReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setPendingMove(null); setSkipReason(''); }}>Cancelar</Button>
              <Button size="sm" onClick={confirmSkip} loading={stageMutation.isPending}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}

      {finalizeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold mb-1">Finalizar atendimento</h3>
            <p className="text-sm text-muted-foreground mb-4">{finalizeTarget.patient?.full_name ?? finalizeTarget.patient_name}</p>

            {finalizeTarget.next_appointment_date ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                <span>✅</span>
                <span>Próximo retorno agendado — {new Date(finalizeTarget.next_appointment_date).toLocaleDateString('pt-BR')}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                <span className="mt-0.5">⚠️</span>
                <span>Paciente sem próximo agendamento. Recomendado agendar retorno antes de finalizar.</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {!finalizeTarget.next_appointment_date && (
                <Button
                  className="w-full"
                  onClick={() => {
                    onFinalizeRequest?.(finalizeTarget);
                    stageMutation.mutate({ id: finalizeTarget.id, stage: 'FINALIZADO' });
                    setFinalizeTarget(null);
                  }}
                >
                  📅 Agendar Retorno e Finalizar
                </Button>
              )}
              <Button
                variant={finalizeTarget.next_appointment_date ? 'primary' : 'secondary'}
                className="w-full"
                onClick={() => {
                  stageMutation.mutate({ id: finalizeTarget.id, stage: 'FINALIZADO' });
                  setFinalizeTarget(null);
                }}
              >
                {finalizeTarget.next_appointment_date ? 'Finalizar' : 'Finalizar mesmo assim'}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setFinalizeTarget(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const cards = byStage(stage.key);
          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-52 rounded-xl border-2 ${stage.color} flex flex-col`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(stage.key)}
            >
              <div className="px-3 py-2 border-b border-inherit">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stage.label}</span>
                {cards.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-white text-[10px] font-bold text-muted-foreground border">
                    {cards.length}
                  </span>
                )}
              </div>
              <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                {cards.map(appt => (
                  <div
                    key={appt.id}
                    draggable
                    onDragStart={() => setDragId(appt.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`bg-white rounded-lg border border-border p-2.5 shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${dragId === appt.id ? 'opacity-40' : 'opacity-100'}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{appt.patient?.full_name}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                          <span>{format(new Date(appt.start_time), 'HH:mm')}</span>
                        </div>
                        {appt.service?.name && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{appt.service.name}</p>
                        )}
                        {appt.transactions?.some((t: any) => t.status === 'PENDING') && (
                          <Badge variant="warning" className="mt-1 text-[9px] px-1 py-0">Cobrança pendente</Badge>
                        )}
                      </div>
                      <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 mt-0.5" />
                    </div>
                    {appt.kanban_skipped_reason && (
                      <p className="text-[9px] text-amber-600 mt-1.5 italic truncate" title={appt.kanban_skipped_reason}>
                        * {appt.kanban_skipped_reason}
                      </p>
                    )}
                  </div>
                ))}
                {cards.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-[10px] text-muted-foreground/50 border-2 border-dashed border-muted rounded-lg">
                    Arraste aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
