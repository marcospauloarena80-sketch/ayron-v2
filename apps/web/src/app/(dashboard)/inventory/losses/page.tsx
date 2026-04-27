'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const LOSS_TYPES: Record<string, string> = { EXPIRY: 'Vencimento', ERROR: 'Erro', DAMAGE: 'Avaria', THEFT: 'Furto', DISCARD: 'Descarte', OTHER: 'Outro' };
const LOSS_COLORS: Record<string, any> = { EXPIRY: 'danger', ERROR: 'warning', DAMAGE: 'warning', THEFT: 'danger', DISCARD: 'secondary', OTHER: 'secondary' };

function LossModal({ items, onClose }: { items: any[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ item_id: '', quantity: 1, loss_type: 'EXPIRY', reason: '', estimated_cost: '' });
  const mutation = useMutation({
    mutationFn: () => api.post('/inventory/losses', { ...form, quantity: Number(form.quantity), estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-losses'] }); qc.invalidateQueries({ queryKey: ['inventory-items'] }); toast.success('Perda registrada'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao registrar'),
  });
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Registrar Perda</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Item *</label>
            <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.item_id} onChange={e => f('item_id', e.target.value)}>
              <option value="">Selecionar</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Tipo *</label>
              <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.loss_type} onChange={e => f('loss_type', e.target.value)}>
                {Object.entries(LOSS_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quantidade *</label>
              <input type="number" min={1} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.quantity} onChange={e => f('quantity', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Custo Estimado (R$)</label>
            <input type="number" min={0} step="0.01" className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.estimated_cost} onChange={e => f('estimated_cost', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Motivo * (obrigatório)</label>
            <textarea rows={2} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={form.reason} onChange={e => f('reason', e.target.value)} placeholder="Descreva o motivo da perda..." />
          </div>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.item_id || !form.reason.trim() || mutation.isPending}>Registrar</Button>
        </div>
      </div>
    </div>
  );
}

export default function LossesPage() {
  const [showModal, setShowModal] = useState(false);
  const [lossType, setLossType] = useState('');
  const { data: losses = [], isLoading } = useQuery({
    queryKey: ['inventory-losses', lossType],
    queryFn: () => api.get('/inventory/losses', { params: lossType ? { loss_type: lossType } : {} }).then(r => r.data),
  });
  const { data: items = [] } = useQuery({ queryKey: ['inventory-items-all'], queryFn: () => api.get('/inventory').then(r => r.data) });
  const totalCost = losses.reduce((acc: number, l: any) => acc + Number(l.estimated_cost ?? 0), 0);

  return (
    <div>
      <Topbar title="Centro de Perdas" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <select className="rounded-lg border px-3 py-2 text-sm" value={lossType} onChange={e => setLossType(e.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.entries(LOSS_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {losses.length > 0 && (
              <span className="text-sm text-muted-foreground">Total: <span className="font-semibold text-red-600">R$ {totalCost.toFixed(2)}</span></span>
            )}
          </div>
          <Button size="sm" onClick={() => setShowModal(true)}><Plus className="h-4 w-4" /> Registrar Perda</Button>
        </div>
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)
        ) : losses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Trash2 className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Nenhuma perda registrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {losses.map((l: any) => (
              <div key={l.id} className="rounded-xl border border-border bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{l.item?.name ?? 'Item'}</p>
                      <Badge variant={LOSS_COLORS[l.loss_type] ?? 'secondary'}>{LOSS_TYPES[l.loss_type] ?? l.loss_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{l.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">-{l.quantity} un</p>
                    <p className="text-xs text-muted-foreground">R$ {Number(l.estimated_cost).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {showModal && <LossModal items={items} onClose={() => setShowModal(false)} />}
      </div>
    </div>
  );
}
