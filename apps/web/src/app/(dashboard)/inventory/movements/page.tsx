'use client';
import { useState, useMemo } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { BarChart3, Search, ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StockMovement {
  id: string; item_id: string; type: string; quantity: number;
  notes: string; created_at: string; created_by: string; saldo_after: number;
}

interface StockItem {
  id: string; name: string; category: string; unit: string;
  quantity: number; movements: StockMovement[];
}

// ── Mock data (same items as items/page.tsx) ──────────────────────────────────

const mkMove = (item_id: string, type: string, qty: number, notes: string, daysAgo: number, saldo_after: number): StockMovement => ({
  id: `${item_id}-${type}-${daysAgo}`, item_id, type, quantity: qty, notes,
  created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  created_by: 'Dr. Marcos Oliveira', saldo_after,
});

const MOCK_ITEMS: StockItem[] = [
  {
    id: 'IT001', name: 'Mounjaro 10mg', category: 'Medicamentos', unit: 'UN', quantity: 8,
    movements: [
      mkMove('IT001', 'ENTRY', 12, 'Compra NF-0821', 20, 20),
      mkMove('IT001', 'EXIT', 4, 'Sessão — Ana Lima (P001)', 10, 16),
      mkMove('IT001', 'EXIT', 3, 'Sessão — Marina Costa (P002)', 5, 13),
      mkMove('IT001', 'EXIT', 5, 'Sessões semana 17', 1, 8),
    ],
  },
  {
    id: 'IT002', name: 'Semaglutida 0.5mg', category: 'Hormonais', unit: 'UN', quantity: 12,
    movements: [
      mkMove('IT002', 'ENTRY', 24, 'Compra NF-0834', 30, 24),
      mkMove('IT002', 'EXIT', 12, 'Sessões março', 12, 12),
    ],
  },
  {
    id: 'IT003', name: 'HCG 5000UI', category: 'Hormonais', unit: 'UN', quantity: 6,
    movements: [
      mkMove('IT003', 'ENTRY', 16, 'Compra NF-0856', 45, 16),
      mkMove('IT003', 'EXIT', 10, 'Sessões Protocolo P002', 15, 6),
    ],
  },
  {
    id: 'IT004', name: 'Testosterona Enantato 250mg', category: 'Controlados', unit: 'UN', quantity: 3,
    movements: [
      mkMove('IT004', 'ENTRY', 12, 'Compra NF-0867', 60, 12),
      mkMove('IT004', 'LOSS', 1, 'Frasco quebrado durante manuseio', 25, 11),
      mkMove('IT004', 'EXIT', 8, 'Protocolos hormônio', 8, 3),
    ],
  },
  {
    id: 'IT005', name: 'Vitamina C 500mg IV', category: 'Soroterapia', unit: 'UN', quantity: 45,
    movements: [
      mkMove('IT005', 'ENTRY', 100, 'Compra NF-0802', 35, 100),
      mkMove('IT005', 'EXIT', 55, 'Sessões soroterapia — semana 14-17', 5, 45),
    ],
  },
  {
    id: 'IT006', name: 'Seringas 3mL', category: 'Descartáveis', unit: 'CX', quantity: 18,
    movements: [
      mkMove('IT006', 'ENTRY', 20, 'Compra NF-0811', 40, 20),
      mkMove('IT006', 'ENTRY', 10, 'Reposição emergencial', 20, 30),
      mkMove('IT006', 'EXIT', 12, 'Consumo procedimentos — semana 14-17', 3, 18),
    ],
  },
  {
    id: 'IT007', name: 'Ozempic 0.5mg', category: 'Medicamentos', unit: 'UN', quantity: 0,
    movements: [
      mkMove('IT007', 'ENTRY', 6, 'Compra NF-0799', 90, 6),
      mkMove('IT007', 'EXIT', 6, 'Consumo total protocolos', 40, 0),
      mkMove('IT007', 'EXPIRY', 0, 'Lote próximo ao vencimento — bloqueado', 3, 0),
    ],
  },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  ENTRY: 'Entrada', EXIT: 'Saída', ADJUSTMENT: 'Ajuste',
  LOSS: 'Perda', EXPIRY: 'Vencimento', TRANSFER: 'Transferência',
  RETURN: 'Devolução', CONSOLIDATION: 'Consolidação',
};

const TYPE_COLOR: Record<string, string> = {
  ENTRY: 'bg-green-100 text-green-800',
  RETURN: 'bg-green-100 text-green-800',
  EXIT: 'bg-red-100 text-red-800',
  LOSS: 'bg-red-100 text-red-800',
  EXPIRY: 'bg-orange-100 text-orange-800',
  ADJUSTMENT: 'bg-amber-100 text-amber-800',
  TRANSFER: 'bg-blue-100 text-blue-800',
  CONSOLIDATION: 'bg-purple-100 text-purple-800',
};

const POSITIVE_TYPES = new Set(['ENTRY', 'RETURN', 'ADJUSTMENT']);
const NEGATIVE_TYPES = new Set(['EXIT', 'LOSS', 'EXPIRY', 'TRANSFER']);

function typeSign(type: string) {
  if (POSITIVE_TYPES.has(type)) return '+';
  if (NEGATIVE_TYPES.has(type)) return '-';
  return '±';
}

function TypeIcon({ type }: { type: string }) {
  if (POSITIVE_TYPES.has(type)) return <TrendingUp className="h-3 w-3 text-green-600" />;
  if (NEGATIVE_TYPES.has(type)) return <TrendingDown className="h-3 w-3 text-red-600" />;
  return <Minus className="h-3 w-3 text-amber-600" />;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Component ─────────────────────────────────────────────────────────────────

export default function MovementsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // flatten all movements, attaching item info
  const allMovements = useMemo(() => {
    const rows: (StockMovement & { item_name: string; item_category: string; item_unit: string })[] = [];
    for (const item of MOCK_ITEMS) {
      for (const m of item.movements) {
        rows.push({ ...m, item_name: item.name, item_category: item.category, item_unit: item.unit });
      }
    }
    return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, []);

  const categories = useMemo(() => [...new Set(MOCK_ITEMS.map(i => i.category))].sort(), []);

  const filtered = useMemo(() => allMovements.filter(m =>
    (!search || m.item_name.toLowerCase().includes(search.toLowerCase()) || m.notes.toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || m.type === typeFilter) &&
    (!categoryFilter || m.item_category === categoryFilter)
  ), [allMovements, search, typeFilter, categoryFilter]);

  // summary stats
  const totalEntradas = filtered.filter(m => POSITIVE_TYPES.has(m.type)).reduce((a, m) => a + m.quantity, 0);
  const totalSaidas = filtered.filter(m => NEGATIVE_TYPES.has(m.type)).reduce((a, m) => a + m.quantity, 0);

  return (
    <div>
      <Topbar title="Movimentações" />
      <div className="p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />Estoque
            </Button>
          </Link>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-green-50 border-green-200 p-3 text-center">
            <p className="text-xs text-green-700">Entradas (filtro atual)</p>
            <p className="text-xl font-bold text-green-700">+{totalEntradas}</p>
          </div>
          <div className="rounded-xl border bg-red-50 border-red-200 p-3 text-center">
            <p className="text-xs text-red-700">Saídas (filtro atual)</p>
            <p className="text-xl font-bold text-red-700">-{totalSaidas}</p>
          </div>
          <div className="rounded-xl border bg-white border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Total de registros</p>
            <p className="text-xl font-bold">{filtered.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="rounded-lg border pl-9 pr-3 py-2 text-sm w-64 outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Buscar item ou nota..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || typeFilter || categoryFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter(''); setCategoryFilter(''); }}>
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5">Data / Hora</th>
                  <th className="text-left px-4 py-2.5">Item</th>
                  <th className="text-left px-4 py-2.5">Tipo</th>
                  <th className="text-left px-4 py-2.5">Nota</th>
                  <th className="text-right px-4 py-2.5">Qtd</th>
                  <th className="text-right px-4 py-2.5">Saldo Após</th>
                  <th className="text-left px-4 py-2.5">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(m.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-xs">{m.item_name}</p>
                      <p className="text-xs text-muted-foreground">{m.item_category}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', TYPE_COLOR[m.type] ?? 'bg-gray-100 text-gray-700')}>
                        <TypeIcon type={m.type} />
                        {TYPE_LABEL[m.type] ?? m.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{m.notes || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn('font-medium text-sm', POSITIVE_TYPES.has(m.type) ? 'text-green-600' : NEGATIVE_TYPES.has(m.type) ? 'text-red-600' : 'text-amber-600')}>
                        {typeSign(m.type)}{m.quantity} {m.item_unit}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-medium">{m.saldo_after} {m.item_unit}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
