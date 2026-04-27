'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CheckCircle, X } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const URGENCY_COLOR: Record<string, any> = { CRITICAL: 'danger', HIGH: 'warning', MEDIUM: 'secondary', LOW: 'secondary' };
const URGENCY_LABEL: Record<string, string> = { CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo' };

export default function ReorderPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['inventory-reorder'],
    queryFn: () => api.get('/inventory/reorder-suggestions').then(r => r.data),
  });

  const createOrder = useMutation({
    mutationFn: (items: any[]) => api.post('/inventory/purchase-orders', {
      status: 'PENDING_APPROVAL',
      urgency: items.some(i => i.urgency === 'CRITICAL') ? 'CRITICAL' : items.some(i => i.urgency === 'HIGH') ? 'HIGH' : 'MEDIUM',
      justification: 'Pedido gerado a partir de sugestões automáticas de reposição',
      items: items.map(i => ({
        item_id: i.item.id,
        quantity_requested: i.suggested_quantity,
        unit_cost_estimated: Number(i.item.unit_cost ?? 0),
      })),
    }),
    onSuccess: () => { toast.success('Pedido criado para aprovação'); setSelected(new Set()); qc.invalidateQueries({ queryKey: ['inventory-orders'] }); },
    onError: () => toast.error('Erro ao criar pedido'),
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedItems = suggestions.filter((s: any) => selected.has(s.item.id));

  return (
    <div>
      <Topbar title="Reposição Automática" />
      <div className="p-6 space-y-4">
        {selected.size > 0 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{selected.size} item(ns) selecionado(s)</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => createOrder.mutate(selectedItems)} disabled={createOrder.isPending}>
                <ShoppingCart className="h-4 w-4 mr-1" />Gerar Pedido
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mb-3 opacity-20 text-green-500" />
            <p className="text-sm font-medium text-green-700">Nenhuma reposição necessária agora</p>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s: any) => (
              <div key={s.item.id} onClick={() => toggleSelect(s.item.id)}
                className={`rounded-xl border px-4 py-3 cursor-pointer transition-all ${selected.has(s.item.id) ? 'border-primary bg-primary/5' : 'border-border bg-white hover:bg-muted/30'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{s.item.name}</p>
                      <Badge variant={URGENCY_COLOR[s.urgency]}>Urgência: {URGENCY_LABEL[s.urgency]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{s.justification}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold">+{s.suggested_quantity} {s.item.unit}</p>
                    <p className="text-xs text-muted-foreground">~R$ {s.estimated_cost.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
