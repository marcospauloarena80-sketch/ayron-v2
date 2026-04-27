'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package, AlertTriangle, TrendingDown, ShoppingCart, Clock,
  DollarSign, Trash2, BarChart3, Calendar, Zap, X, ChevronRight,
  RefreshCw, Box
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface KPIs {
  expiring_soon: number;
  expired: number;
  below_half_ideal: number;
  high_consumption: number;
  suggested_orders: number;
  critical_items: number;
  total_stock_cost: number;
  loss_value_30d: number;
  avg_turnover: number;
  avg_days_remaining: number;
}

function CriticalAlertPopup({ kpis, onClose }: { kpis: KPIs; onClose: () => void }) {
  const criticals = [
    kpis.expired > 0 && { label: `${kpis.expired} item(ns) vencido(s)`, href: '/inventory/expiry?filter=expired', color: 'text-red-600' },
    kpis.critical_items > 0 && { label: `${kpis.critical_items} item(ns) crítico(s) (<7 dias)`, href: '/inventory/items?filter=critical', color: 'text-red-500' },
    kpis.expiring_soon > 0 && { label: `${kpis.expiring_soon} item(ns) vencendo em 45 dias`, href: '/inventory/expiry', color: 'text-orange-600' },
    kpis.suggested_orders > 0 && { label: `${kpis.suggested_orders} pedido(s) de reposição sugerido(s)`, href: '/inventory/reorder', color: 'text-blue-600' },
  ].filter(Boolean) as { label: string; href: string; color: string }[];

  if (criticals.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <h2 className="text-base font-semibold">Alertas Críticos de Estoque</h2>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-2">
          {criticals.map((c, i) => (
            <Link key={i} href={c.href} onClick={onClose} className={`flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-muted/50 ${c.color}`}>
              <span className="text-sm font-medium">{c.label}</span>
              <ChevronRight className="h-4 w-4 opacity-60" />
            </Link>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Fechar</Button>
          <Link href="/inventory/reorder" className="flex-1">
            <Button className="w-full" onClick={onClose}>Ver Reposições</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label, value, sublabel, color, icon: Icon, href
}: {
  label: string; value: string | number; sublabel?: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'gray';
  icon: any; href?: string;
}) {
  const colors = {
    red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100 text-red-600', border: 'border-red-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-100 text-orange-600', border: 'border-orange-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-200' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'bg-green-100 text-green-700', border: 'border-green-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-100 text-blue-600', border: 'border-blue-200' },
    gray: { bg: 'bg-muted/50', text: 'text-foreground', icon: 'bg-muted text-muted-foreground', border: 'border-border' },
  };
  const c = colors[color];

  const card = (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col gap-3 ${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
      </div>
      {href && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Ver detalhes</span><ChevronRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

const NAV_ITEMS = [
  { href: '/inventory/items', label: 'Itens', icon: Package },
  { href: '/inventory/movements', label: 'Movimentações', icon: BarChart3 },
  { href: '/inventory/expiry', label: 'Vencimentos', icon: Calendar },
  { href: '/inventory/reorder', label: 'Reposição', icon: ShoppingCart },
  { href: '/inventory/suppliers', label: 'Fornecedores', icon: Box },
  { href: '/inventory/reservations', label: 'Reservas', icon: Zap },
  { href: '/inventory/losses', label: 'Perdas', icon: Trash2 },
  { href: '/inventory/orders', label: 'Pedidos', icon: ShoppingCart },
  { href: '/inventory/reports', label: 'Relatórios', icon: BarChart3 },
  { href: '/inventory/audit', label: 'Auditoria', icon: Clock },
];

export default function InventoryDashboardPage() {
  const [showPopup, setShowPopup] = useState(false);
  const popupShown = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: kpis, isLoading, refetch } = useQuery<KPIs>({
    queryKey: ['inventory-dashboard'],
    queryFn: () => api.get('/inventory/dashboard').then(r => r.data),
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (kpis && !popupShown.current) {
      const hasCritical = kpis.expired > 0 || kpis.critical_items > 0 || kpis.expiring_soon > 0 || kpis.suggested_orders > 0;
      if (hasCritical) {
        setShowPopup(true);
        if (kpis.expired > 0 || kpis.critical_items > 0) {
          try {
            if (!audioRef.current) audioRef.current = new Audio('/sounds/alert-critical.mp3');
            audioRef.current.play().catch(() => {});
          } catch {}
        }
      }
      popupShown.current = true;
    }
  }, [kpis]);

  const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  return (
    <div>
      <Topbar title="Estoque Inteligente" />
      {showPopup && kpis && <CriticalAlertPopup kpis={kpis} onClose={() => setShowPopup(false)} />}

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Painel de Estoque</h1>
            <p className="text-sm text-muted-foreground">Visão geral e indicadores operacionais</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {isLoading ? (
            [...Array(10)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)
          ) : kpis ? (
            <>
              <KPICard label="Vencendo em 45 dias" value={kpis.expiring_soon} color={kpis.expiring_soon > 0 ? 'orange' : 'green'} icon={Calendar} href="/inventory/expiry" />
              <KPICard label="Itens vencidos" value={kpis.expired} color={kpis.expired > 0 ? 'red' : 'green'} icon={AlertTriangle} href="/inventory/expiry?filter=expired" />
              <KPICard label="Abaixo de 50% do ideal" value={kpis.below_half_ideal} color={kpis.below_half_ideal > 0 ? 'orange' : 'green'} icon={TrendingDown} href="/inventory/items?filter=low" />
              <KPICard label="Alto consumo (30d)" value={kpis.high_consumption} color={kpis.high_consumption > 0 ? 'yellow' : 'green'} icon={Zap} href="/inventory/reports" />
              <KPICard label="Pedidos sugeridos" value={kpis.suggested_orders} color={kpis.suggested_orders > 0 ? 'blue' : 'green'} icon={ShoppingCart} href="/inventory/reorder" />
              <KPICard label="Itens críticos (<7 dias)" value={kpis.critical_items} color={kpis.critical_items > 0 ? 'red' : 'green'} icon={AlertTriangle} href="/inventory/items?filter=critical" />
              <KPICard label="Custo total em estoque" value={fmt(kpis.total_stock_cost)} color="green" icon={DollarSign} href="/inventory/reports" />
              <KPICard label="Perdas (30 dias)" value={fmt(kpis.loss_value_30d)} color={kpis.loss_value_30d > 0 ? 'red' : 'green'} icon={Trash2} href="/inventory/losses" />
              <KPICard label="Giro médio anual" value={`${kpis.avg_turnover}x`} sublabel="vezes/ano" color="blue" icon={BarChart3} />
              <KPICard label="Dias restantes médios" value={kpis.avg_days_remaining} sublabel="dias de autonomia" color={kpis.avg_days_remaining < 14 ? 'orange' : 'green'} icon={Clock} />
            </>
          ) : null}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">Acesso rápido</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {NAV_ITEMS.map(item => (
              <Link key={item.href} href={item.href}>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 hover:bg-muted/40 hover:shadow-sm transition-all cursor-pointer">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
