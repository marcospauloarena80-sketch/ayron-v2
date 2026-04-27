'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, CheckCircle, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const STATUS_COLOR: Record<string, any> = { ACTIVE: 'success', CONSUMED: 'secondary', CANCELLED: 'danger' };
const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Ativa', CONSUMED: 'Consumida', CANCELLED: 'Cancelada' };

export default function ReservationsPage() {
  const qc = useQueryClient();
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['inventory-reservations'],
    queryFn: () => api.get('/inventory/reservations').then(r => r.data),
  });

  const consumeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/inventory/reservations/${id}/consume`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-reservations'] }); toast.success('Reserva consumida'); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/inventory/reservations/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-reservations'] }); toast.success('Reserva cancelada'); },
  });

  return (
    <div>
      <Topbar title="Reservas Técnicas" />
      <div className="p-6 space-y-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)
        ) : reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Zap className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Nenhuma reserva ativa</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reservations.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-border bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{r.item?.name}</p>
                      <Badge variant={STATUS_COLOR[r.status] ?? 'secondary'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Qtd: {r.quantity_reserved} · {new Date(r.reserved_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  {r.status === 'ACTIVE' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => consumeMutation.mutate(r.id)}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />Consumir
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => cancelMutation.mutate(r.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
