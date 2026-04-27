'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Calendar, AlertTriangle, User } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';

interface Props {
  appointment: any;
  open: boolean;
  onClose: () => void;
}

export function FinalizeModal({ appointment, open, onClose }: Props) {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [returnDate, setReturnDate] = useState(() => format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [returnTime, setReturnTime] = useState('09:00');
  const [skipReturn, setSkipReturn] = useState(false);
  const [skipReturnReason, setSkipReturnReason] = useState('');
  const [createCharge, setCreateCharge] = useState(true);
  const [chargeAmount, setChargeAmount] = useState(
    appointment?.service?.price_default?.toString() ?? ''
  );
  const [confirmed, setConfirmed] = useState(false);

  const finalizeMutation = useMutation({
    mutationFn: (payload: any) => api.post(`/agenda/${appointment?.id}/finalize`, payload),
    onSuccess: () => {
      toast.success('Consulta finalizada!');
      qc.invalidateQueries({ queryKey: ['agenda'] });
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Erro ao finalizar'),
  });

  const handleFinalize = () => {
    if (!confirmed) { toast.error('Confirme sua identidade para finalizar'); return; }
    if (!skipReturn && !returnDate) { toast.error('Informe a data do retorno ou justifique a exceção'); return; }
    if (skipReturn && !skipReturnReason.trim()) { toast.error('Informe o motivo para não agendar retorno'); return; }

    finalizeMutation.mutate({
      return_date: skipReturn ? null : returnDate,
      return_time: skipReturn ? null : returnTime,
      skip_return_reason: skipReturn ? skipReturnReason : null,
      create_charge: createCharge,
      charge_amount: createCharge && chargeAmount ? parseFloat(chargeAmount) : null,
    });
  };

  if (!open || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-5">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <h2 className="font-semibold text-base">Finalizar Consulta</h2>
        </div>

        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <p className="font-medium">{appointment.patient?.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {appointment.service?.name ?? appointment.type} · {format(new Date(appointment.start_time), "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Retorno */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              Agendar Retorno
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={skipReturn}
                onChange={e => setSkipReturn(e.target.checked)}
              />
              Não agendar agora
            </label>
          </div>
          {!skipReturn ? (
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              />
              <input
                type="time"
                className="w-28 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={returnTime}
                onChange={e => setReturnTime(e.target.value)}
              />
            </div>
          ) : (
            <textarea
              className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              rows={2}
              placeholder="Motivo obrigatório para não agendar retorno..."
              value={skipReturnReason}
              onChange={e => setSkipReturnReason(e.target.value)}
            />
          )}
        </div>

        {/* Cobrança */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="checkbox"
              className="rounded"
              checked={createCharge}
              onChange={e => setCreateCharge(e.target.checked)}
            />
            Criar cobrança ao finalizar
          </label>
          {createCharge && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">R$</span>
              <input
                type="number"
                className="w-32 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={chargeAmount}
                onChange={e => setChargeAmount(e.target.value)}
                placeholder="0,00"
                min="0"
                step="0.01"
              />
            </div>
          )}
        </div>

        {/* Identity confirmation */}
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>Logado como: <strong>{user?.name ?? user?.email}</strong> ({user?.role})</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              className="rounded"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
            />
            <span className="text-xs">Confirmo que sou este usuário e autorizo a finalização</span>
          </label>
        </div>

        {!confirmed && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            Confirmação de identidade necessária
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleFinalize}
            loading={finalizeMutation.isPending}
            disabled={!confirmed}
          >
            Finalizar Consulta
          </Button>
        </div>
      </div>
    </div>
  );
}
