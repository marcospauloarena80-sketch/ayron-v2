'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Topbar } from '@/components/layout/topbar';
import { BarChart3 } from 'lucide-react';
import api from '@/lib/api';

export default function ReportsPage() {
  const [tab, setTab] = useState<'consumption' | 'losses' | 'turnover' | 'abc'>('consumption');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: consumption = [], isLoading: loadC } = useQuery({
    queryKey: ['inv-report-consumption', from, to],
    queryFn: () => api.get('/inventory/reports/consumption', { params: { from: from || undefined, to: to || undefined } }).then(r => r.data),
    enabled: tab === 'consumption',
  });
  const { data: losses = [], isLoading: loadL } = useQuery({
    queryKey: ['inv-report-losses', from, to],
    queryFn: () => api.get('/inventory/reports/losses', { params: { from: from || undefined, to: to || undefined } }).then(r => r.data),
    enabled: tab === 'losses',
  });
  const { data: turnover = [], isLoading: loadT } = useQuery({
    queryKey: ['inv-report-turnover'],
    queryFn: () => api.get('/inventory/reports/turnover').then(r => r.data),
    enabled: tab === 'turnover',
  });
  const { data: abc = [], isLoading: loadA } = useQuery({
    queryKey: ['inv-abc'],
    queryFn: () => api.get('/inventory/abc').then(r => r.data),
    enabled: tab === 'abc',
  });

  const TABS = [
    { id: 'consumption', label: 'Consumo' },
    { id: 'losses', label: 'Perdas' },
    { id: 'turnover', label: 'Giro' },
    { id: 'abc', label: 'Curva ABC' },
  ];

  const isLoading = { consumption: loadC, losses: loadL, turnover: loadT, abc: loadA }[tab];

  return (
    <div>
      <Topbar title="Relatórios de Estoque" />
      <div className="p-6 space-y-4">
        <div className="flex gap-1 bg-muted/40 p-1 rounded-lg w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === t.id ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {['consumption', 'losses'].includes(tab) && (
          <div className="flex gap-3">
            <div>
              <label className="text-xs text-muted-foreground">De</label>
              <input type="date" className="ml-2 rounded-lg border px-3 py-1.5 text-sm" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Até</label>
              <input type="date" className="ml-2 rounded-lg border px-3 py-1.5 text-sm" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
        )}

        {isLoading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {tab === 'consumption' && <><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Item</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Categoria</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Qtd. Consumida</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Custo Total</th></>}
                  {tab === 'losses' && <><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Item</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Tipo</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Qtd.</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Custo</th></>}
                  {tab === 'turnover' && <><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Item</th><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Categoria</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Giro (x/ano)</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Dias em Estoque</th></>}
                  {tab === 'abc' && <><th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Item</th><th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Curva</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Valor Anual</th><th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">% Acumulado</th></>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tab === 'consumption' && consumption.map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{r.item?.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.item?.category ?? '—'}</td>
                    <td className="px-4 py-2 text-right">{r.total_quantity}</td>
                    <td className="px-4 py-2 text-right">R$ {r.total_cost?.toFixed(2)}</td>
                  </tr>
                ))}
                {tab === 'losses' && losses.map((l: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{l.item?.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{l.loss_type}</td>
                    <td className="px-4 py-2 text-right">{l.quantity}</td>
                    <td className="px-4 py-2 text-right text-red-600">R$ {Number(l.estimated_cost).toFixed(2)}</td>
                  </tr>
                ))}
                {tab === 'turnover' && turnover.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{t.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{t.category ?? '—'}</td>
                    <td className="px-4 py-2 text-right font-semibold">{t.turnover_rate}x</td>
                    <td className="px-4 py-2 text-right">{t.days_on_hand ?? '—'}d</td>
                  </tr>
                ))}
                {tab === 'abc' && abc.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium">{item.name}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs font-bold rounded px-2 py-0.5 ${item.abc_class === 'A' ? 'bg-red-100 text-red-700' : item.abc_class === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        Curva {item.abc_class}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">R$ {Number(item.annual_value).toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">{(item.cumulative_pct * 100).toFixed(1)}%</td>
                  </tr>
                ))}
                {(tab === 'consumption' && consumption.length === 0 || tab === 'losses' && losses.length === 0 || tab === 'turnover' && turnover.length === 0 || tab === 'abc' && abc.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">Sem dados para exibir</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
