'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus, X, CheckCircle, Package } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = { SUGGESTED: 'Sugerido', PENDING_APPROVAL: 'Aguard. Aprovação', APPROVED: 'Aprovado', SENT: 'Enviado', PARTIALLY_RECEIVED: 'Rec. Parcial', RECEIVED: 'Recebido', CANCELLED: 'Cancelado', DIVERGENT: 'Divergente' };
const STATUS_COLOR: Record<string, any> = { SUGGESTED: 'secondary', PENDING_APPROVAL: 'warning', APPROVED: 'success', SENT: 'default', PARTIALLY_RECEIVED: 'warning', RECEIVED: 'success', CANCELLED: 'danger', DIVERGENT: 'danger' };
const URGENCY_COLOR: Record<string, any> = { LOW: 'secondary', MEDIUM: 'secondary', HIGH: 'warning', CRITICAL: 'danger' };

function ReceiveModal({ order, onClose }: { order: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [items, setItems] = useState(order.items.map((i: any) => ({ ...i, receive_qty: i.quantity_requested, unit_cost_actual: i.unit_cost_estimated ?? '' })));
  const mutation = useMutation({
    mutationFn: () => api.patch(`/inventory/purchase-orders/${order.id}/receive`, {
      items: items.map((i: any) => ({ id: i.id, item_id: i.item_id, quantity_received: Number(i.receive_qty), unit_cost_actual: i.unit_cost_actual ? Number(i.unit_cost_actual) : undefined })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-orders'] }); toast.success('Recebimento registrado'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao receber'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Registrar Recebimento</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2">
          {items.map((item: any, idx: number) => (
            <div key={item.id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium mb-2">{item.item?.name}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Qtd. Recebida (pedido: {item.quantity_requested})</label>
                  <input type="number" min={0} className="w-full mt-1 rounded border px-2 py-1 text-sm" value={item.receive_qty}
                    onChange={e => setItems((prev: any[]) => prev.map((p: any, i: number) => i === idx ? { ...p, receive_qty: e.target.value } : p))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Custo Real (R$)</label>
                  <input type="number" min={0} step="0.01" className="w-full mt-1 rounded border px-2 py-1 text-sm" value={item.unit_cost_actual}
                    onChange={e => setItems((prev: any[]) => prev.map((p: any, i: number) => i === idx ? { ...p, unit_cost_actual: e.target.value } : p))} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Confirmar Recebimento</Button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [receiveOrder, setReceiveOrder] = useState<any>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['inventory-orders', statusFilter],
    queryFn: () => api.get('/inventory/purchase-orders', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/inventory/purchase-orders/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-orders'] }); toast.success('Pedido aprovado'); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/inventory/purchase-orders/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-orders'] }); toast.success('Pedido cancelado'); },
  });

  return (
    <div>
      <Topbar title="Pedidos de Compra" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <select className="rounded-lg border px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o: any) => (
              <div key={o.id} className="rounded-xl border border-border bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_COLOR[o.status] ?? 'secondary'}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                      <Badge variant={URGENCY_COLOR[o.urgency] ?? 'secondary'}>Urgência: {o.urgency}</Badge>
                      <span className="text-xs text-muted-foreground">{o.supplier?.name ?? 'Sem fornecedor'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{o.items?.length ?? 0} item(ns) · R$ {Number(o.total_amount).toFixed(2)}</p>
                    {o.justification && <p className="text-xs text-muted-foreground">{o.justification}</p>}
                  </div>
                  <div className="flex gap-1 ml-4">
                    {['SUGGESTED', 'PENDING_APPROVAL'].includes(o.status) && (
                      <Button size="sm" variant="ghost" onClick={() => approveMutation.mutate(o.id)}><CheckCircle className="h-3.5 w-3.5 mr-1" />Aprovar</Button>
                    )}
                    {o.status === 'APPROVED' && (
                      <Button size="sm" variant="ghost" onClick={() => setReceiveOrder(o)}><Package className="h-3.5 w-3.5 mr-1" />Receber</Button>
                    )}
                    {!['RECEIVED', 'CANCELLED'].includes(o.status) && (
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => cancelMutation.mutate(o.id)}>Cancelar</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {receiveOrder && <ReceiveModal order={receiveOrder} onClose={() => setReceiveOrder(null)} />}
      </div>
    </div>
  );
}
