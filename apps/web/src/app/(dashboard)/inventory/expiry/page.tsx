'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import api from '@/lib/api';

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function ExpiryPage() {
  const sp = useSearchParams();
  const [filter, setFilter] = useState(sp.get('filter') ?? 'expiring');
  const [days, setDays] = useState(45);

  const { data: expiring = [], isLoading: loadExp } = useQuery({
    queryKey: ['inventory-expiring', days],
    queryFn: () => api.get('/inventory/expiring', { params: { days } }).then(r => r.data),
    enabled: filter === 'expiring',
  });

  const { data: expired = [], isLoading: loadExpired } = useQuery({
    queryKey: ['inventory-expired'],
    queryFn: () => api.get('/inventory/expired').then(r => r.data),
    enabled: filter === 'expired',
  });

  const items = filter === 'expired' ? expired : expiring;
  const isLoading = filter === 'expired' ? loadExpired : loadExp;

  return (
    <div>
      <Topbar title="Controle de Vencimentos" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {[
              { id: 'expiring', label: 'Vencendo em breve' },
              { id: 'expired', label: 'Vencidos' },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filter === f.id ? 'bg-primary text-white border-primary' : 'border-border bg-white hover:bg-muted/40'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {filter === 'expiring' && (
            <select className="rounded-lg border px-3 py-1.5 text-sm" value={days} onChange={e => setDays(Number(e.target.value))}>
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias</option>
              <option value={45}>45 dias</option>
              <option value={90}>90 dias</option>
            </select>
          )}
        </div>

        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">{filter === 'expired' ? 'Nenhum item vencido' : 'Nenhum item vencendo no período'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item: any) => {
              const d = item.expiry_date ? daysUntil(item.expiry_date) : null;
              const isExpired = d != null && d <= 0;
              const isCritical = d != null && d <= 7 && d > 0;
              return (
                <div key={item.id} className={`rounded-xl border px-4 py-3 ${isExpired ? 'bg-red-50 border-red-200' : isCritical ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isExpired ? 'bg-red-100' : 'bg-orange-100'}`}>
                        {isExpired ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Clock className="h-4 w-4 text-orange-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category} · Lote: {item.batch_number ?? 'N/A'} · {item.quantity} {item.unit}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {d != null && (
                        <span className={`text-sm font-bold ${isExpired ? 'text-red-600' : isCritical ? 'text-red-500' : 'text-orange-600'}`}>
                          {isExpired ? `Vencido há ${Math.abs(d)}d` : `Vence em ${d}d`}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('pt-BR') : '—'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
