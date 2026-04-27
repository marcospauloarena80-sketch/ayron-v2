'use client';
import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Topbar } from '@/components/layout/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package, AlertTriangle, Plus, X, Search, Filter,
  Edit, Trash2, History, Eye, BarChart3, LogIn, LogOut,
  Layers, Upload, FileText, GitMerge, EyeOff, Printer,
  Check, Shield, ChevronLeft, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Medicamentos', 'Hormonais', 'Soroterapia', 'Injetáveis', 'Materiais de Procedimento', 'Descartáveis', 'EPI', 'Laboratório', 'Limpeza', 'Administrativo', 'Suplementos', 'Manipulados', 'Dermatologia', 'Equipamentos', 'Refrigerados', 'Controlados'];
const TIPOS = ['Unidade', 'Pacote', 'Combo', 'Caixa', 'Ampola', 'Frasco', 'Bisnaga', 'Sachê'];
const MASTER_PW = 'Ayron@Master2025!';

const TYPE_LABEL: Record<string, string> = {
  ENTRY: 'Entrada', EXIT: 'Saída', ADJUSTMENT: 'Ajuste',
  LOSS: 'Perda', EXPIRY: 'Vencimento', TRANSFER: 'Transferência',
  RETURN: 'Devolução', CONSOLIDATION: 'Consolidação',
};
const TYPE_COLOR: Record<string, string> = {
  ENTRY: 'bg-green-100 text-green-800', EXIT: 'bg-red-100 text-red-800',
  ADJUSTMENT: 'bg-amber-100 text-amber-800', LOSS: 'bg-red-100 text-red-800',
  EXPIRY: 'bg-orange-100 text-orange-800', TRANSFER: 'bg-blue-100 text-blue-800',
  RETURN: 'bg-green-100 text-green-800', CONSOLIDATION: 'bg-purple-100 text-purple-800',
};

// ── Interfaces ────────────────────────────────────────────────────────────────

interface StockMovement {
  id: string; item_id: string; type: string;
  quantity: number; notes: string; created_at: string;
  created_by: string; saldo_after: number;
}

interface StockItem {
  id: string; name: string; technical_name: string; internal_code: string;
  barcode: string; category: string; manufacturer: string;
  unit: string; tipo: string; description: string;
  quantity: number; minimum_level: number; ideal_stock: number; max_stock: number;
  lead_time_days: number; unit_cost: number; sale_price: number;
  supplier_id: string; supplier_name: string;
  location: string; storage_sector: string;
  expiry_date: string; batch_number: string;
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'INACTIVE';
  abc_class?: 'A' | 'B' | 'C';
  obs: string; hidden: boolean;
  movements: StockMovement[];
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const mkMove = (item_id: string, type: string, qty: number, notes: string, daysAgo: number, saldo_after: number): StockMovement => ({
  id: `${item_id}-${type}-${daysAgo}`, item_id, type, quantity: qty, notes,
  created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  created_by: 'Dr. Marcos Oliveira', saldo_after,
});

const INITIAL_ITEMS: StockItem[] = [
  {
    id: 'IT001', name: 'Mounjaro 10mg', technical_name: 'Tirzepatida 10mg', internal_code: 'MJ-010',
    barcode: '7891234560001', category: 'Medicamentos', manufacturer: 'Eli Lilly',
    unit: 'UN', tipo: 'Frasco', description: 'Caneta pré-cheia injetável semanal',
    quantity: 8, minimum_level: 5, ideal_stock: 20, max_stock: 40,
    lead_time_days: 7, unit_cost: 420, sale_price: 580,
    supplier_id: 'SUP001', supplier_name: 'Farma Distribuidora Ltda',
    location: 'Prateleira A1', storage_sector: 'Refrigerados',
    expiry_date: '2026-09-30', batch_number: 'LT-2024-089',
    status: 'ACTIVE', abc_class: 'A', obs: 'Manter entre 2°C e 8°C', hidden: false,
    movements: [
      mkMove('IT001', 'ENTRY', 12, 'Compra NF-0821', 20, 20),
      mkMove('IT001', 'EXIT', 4, 'Sessão — Ana Lima (P001)', 10, 16),
      mkMove('IT001', 'EXIT', 3, 'Sessão — Marina Costa (P002)', 5, 13),
      mkMove('IT001', 'EXIT', 5, 'Sessões semana 17', 1, 8),
    ],
  },
  {
    id: 'IT002', name: 'Semaglutida 0.5mg', technical_name: 'Semaglutida 0.5mg/mL', internal_code: 'SG-005',
    barcode: '7891234560002', category: 'Hormonais', manufacturer: 'Novo Nordisk',
    unit: 'UN', tipo: 'Frasco', description: 'Injetável subcutâneo semanal',
    quantity: 12, minimum_level: 8, ideal_stock: 24, max_stock: 48,
    lead_time_days: 5, unit_cost: 280, sale_price: 390,
    supplier_id: 'SUP001', supplier_name: 'Farma Distribuidora Ltda',
    location: 'Prateleira A2', storage_sector: 'Refrigerados',
    expiry_date: '2026-11-15', batch_number: 'LT-2024-112',
    status: 'ACTIVE', abc_class: 'A', obs: 'Refrigerado 2-8°C', hidden: false,
    movements: [
      mkMove('IT002', 'ENTRY', 24, 'Compra NF-0834', 30, 24),
      mkMove('IT002', 'EXIT', 12, 'Sessões março', 12, 12),
    ],
  },
  {
    id: 'IT003', name: 'HCG 5000UI', technical_name: 'Gonadotropina Coriônica 5000UI', internal_code: 'HCG-5',
    barcode: '7891234560003', category: 'Hormonais', manufacturer: 'Meizler',
    unit: 'UN', tipo: 'Ampola', description: 'Injetável IM/SC',
    quantity: 6, minimum_level: 4, ideal_stock: 16, max_stock: 32,
    lead_time_days: 3, unit_cost: 85, sale_price: 140,
    supplier_id: 'SUP002', supplier_name: 'MedBio Insumos',
    location: 'Prateleira B1', storage_sector: 'Refrigerados',
    expiry_date: '2026-07-20', batch_number: 'LT-HCG-041',
    status: 'ACTIVE', abc_class: 'B', obs: '', hidden: false,
    movements: [
      mkMove('IT003', 'ENTRY', 16, 'Compra NF-0856', 45, 16),
      mkMove('IT003', 'EXIT', 10, 'Sessões Protocolo P002', 15, 6),
    ],
  },
  {
    id: 'IT004', name: 'Testosterona Enantato 250mg', technical_name: 'Testosterona Enantato 250mg/mL', internal_code: 'TEST-250',
    barcode: '7891234560004', category: 'Controlados', manufacturer: 'Hypofarma',
    unit: 'UN', tipo: 'Ampola', description: 'Injetável IM — Controlado ANVISA',
    quantity: 3, minimum_level: 4, ideal_stock: 12, max_stock: 24,
    lead_time_days: 10, unit_cost: 65, sale_price: 120,
    supplier_id: 'SUP002', supplier_name: 'MedBio Insumos',
    location: 'Armário Controlados C1', storage_sector: 'Controlados',
    expiry_date: '2027-01-10', batch_number: 'LT-TEST-022',
    status: 'ACTIVE', abc_class: 'B', obs: 'Requer receita C1', hidden: false,
    movements: [
      mkMove('IT004', 'ENTRY', 10, 'Compra NF-0812', 60, 10),
      mkMove('IT004', 'EXIT', 7, 'Sessões TRT', 25, 3),
    ],
  },
  {
    id: 'IT005', name: 'Vitamina C IV 10g', technical_name: 'Ácido Ascórbico 10g/50mL', internal_code: 'VIT-C10',
    barcode: '7891234560005', category: 'Soroterapia', manufacturer: 'Fresenius',
    unit: 'UN', tipo: 'Frasco', description: 'Vitamina C endovenosa para soroterapia',
    quantity: 24, minimum_level: 10, ideal_stock: 40, max_stock: 80,
    lead_time_days: 5, unit_cost: 45, sale_price: 85,
    supplier_id: 'SUP001', supplier_name: 'Farma Distribuidora Ltda',
    location: 'Prateleira C1', storage_sector: 'Soroterapia',
    expiry_date: '2026-10-30', batch_number: 'LT-VC-089',
    status: 'ACTIVE', abc_class: 'B', obs: '', hidden: false,
    movements: [
      mkMove('IT005', 'ENTRY', 40, 'Compra NF-0845', 14, 40),
      mkMove('IT005', 'EXIT', 16, 'Sessões Soroterapia', 7, 24),
    ],
  },
  {
    id: 'IT006', name: 'Seringa 3mL Agulha 25G', technical_name: 'Seringa Descartável 3mL', internal_code: 'SER-3ML',
    barcode: '7891234560006', category: 'Descartáveis', manufacturer: 'BD',
    unit: 'UN', tipo: 'Caixa', description: 'Caixa com 100 unidades',
    quantity: 5, minimum_level: 3, ideal_stock: 15, max_stock: 30,
    lead_time_days: 2, unit_cost: 28, sale_price: 0,
    supplier_id: 'SUP003', supplier_name: 'Descartáveis Médicos SA',
    location: 'Prateleira D1', storage_sector: 'Almoxarifado',
    expiry_date: '2028-06-01', batch_number: 'LT-BD-2024',
    status: 'ACTIVE', abc_class: 'C', obs: 'Caixa c/ 100un', hidden: false,
    movements: [
      mkMove('IT006', 'ENTRY', 20, 'Compra NF-0831', 30, 20),
      mkMove('IT006', 'EXIT', 15, 'Consumo mensal', 5, 5),
    ],
  },
  {
    id: 'IT007', name: 'Ozempic 0.5mg', technical_name: 'Semaglutida 0.5mg (Ozempic)', internal_code: 'OZM-05',
    barcode: '7891234560007', category: 'Medicamentos', manufacturer: 'Novo Nordisk',
    unit: 'UN', tipo: 'Caneta', description: 'Caneta injetável 1.5mL',
    quantity: 0, minimum_level: 3, ideal_stock: 12, max_stock: 24,
    lead_time_days: 7, unit_cost: 650, sale_price: 900,
    supplier_id: 'SUP001', supplier_name: 'Farma Distribuidora Ltda',
    location: 'Refrigerados A3', storage_sector: 'Refrigerados',
    expiry_date: '2026-05-10', batch_number: 'LT-OZM-007',
    status: 'BLOCKED', abc_class: 'A', obs: 'Aguardando reposição', hidden: false,
    movements: [
      mkMove('IT007', 'ENTRY', 6, 'Compra NF-0799', 90, 6),
      mkMove('IT007', 'EXIT', 6, 'Consumo total protocolos', 40, 0),
      mkMove('IT007', 'EXPIRY', 0, 'Lote próximo ao vencimento — bloqueado', 3, 0),
    ],
  },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'SUP001', name: 'Farma Distribuidora Ltda', document: '12.345.678/0001-90', email: 'contato@farmadist.com.br', phone: '(11) 3456-7890', contact_name: 'Maria Silva', address: 'Rua das Flores, 123 — SP', website: 'www.farmadist.com.br', payment_terms: '30 dias boleto', lead_time_days: 5, notes: 'Fornecedor principal de medicamentos' },
  { id: 'SUP002', name: 'MedBio Insumos', document: '98.765.432/0001-11', email: 'vendas@medbio.com', phone: '(21) 2987-6543', contact_name: 'João Pereira', address: 'Av. Brasil, 456 — RJ', website: '', payment_terms: 'À vista', lead_time_days: 3, notes: 'Hormonais e injetáveis' },
  { id: 'SUP003', name: 'Descartáveis Médicos SA', document: '55.123.456/0001-77', email: 'pedidos@descartaveis.com', phone: '(11) 4567-8901', contact_name: 'Ana Costa', address: 'Rua Industrial, 789 — SP', website: '', payment_terms: '15 dias', lead_time_days: 2, notes: 'EPIs e descartáveis' },
];

interface Supplier { id: string; name: string; document: string; email: string; phone: string; contact_name: string; address: string; website: string; payment_terms: string; lead_time_days: number; notes: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const todayISO = () => new Date().toISOString().split('T')[0];

function getStatusColor(item: StockItem) {
  if (item.status === 'EXPIRED') return 'bg-red-50 border-red-200';
  if (item.status === 'BLOCKED') return 'bg-yellow-50 border-yellow-200';
  if (item.status === 'INACTIVE') return 'bg-gray-50 border-gray-200';
  if (item.quantity <= item.minimum_level) return 'bg-orange-50 border-orange-200';
  return 'bg-white border-border';
}

// ── ItemDetailModal ───────────────────────────────────────────────────────────

function ItemDetailModal({ item, onClose }: { item: StockItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{item.name}</h3>
            <p className="text-xs text-muted-foreground">{item.technical_name} · {item.internal_code}</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Categoria', item.category], ['Tipo', item.tipo], ['Fabricante', item.manufacturer],
            ['Unidade', item.unit], ['Lote', item.batch_number], ['Barcode', item.barcode || '—'],
            ['Fornecedor', item.supplier_name || '—'], ['Lead time', `${item.lead_time_days} dias`],
            ['Local', item.location], ['Setor', item.storage_sector],
            ['Validade', fmtDate(item.expiry_date)], ['Status', item.status],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="text-sm font-medium">{v}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-muted/40 border border-border p-3 grid grid-cols-4 gap-3 text-center text-sm">
          {[
            ['Atual', item.quantity, item.quantity <= item.minimum_level ? 'text-red-600' : 'text-foreground'],
            ['Mínimo', item.minimum_level, 'text-muted-foreground'],
            ['Ideal', item.ideal_stock, 'text-primary'],
            ['Máximo', item.max_stock, 'text-muted-foreground'],
          ].map(([k, v, cls]) => (
            <div key={k as string}>
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className={`text-lg font-bold ${cls}`}>{v} {item.unit}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Custo unitário</p>
            <p className="font-bold text-amber-700">{fmt(item.unit_cost)}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Preço de venda</p>
            <p className="font-bold text-green-700">{item.sale_price > 0 ? fmt(item.sale_price) : '—'}</p>
          </div>
        </div>

        {item.obs && <p className="text-xs text-muted-foreground border-t border-border pt-3">{item.obs}</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => { window.print(); }}><Printer className="h-3.5 w-3.5 mr-1" />Imprimir</Button>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}

// ── ItemHistoryModal ──────────────────────────────────────────────────────────

function ItemHistoryModal({ item, onClose }: { item: StockItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Histórico — {item.name}</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="text-xs text-muted-foreground">Saldo atual: <strong className="text-foreground">{item.quantity} {item.unit}</strong></div>
        {item.movements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {['Tipo', 'Qtd', 'Saldo após', 'Notas', 'Data', 'Responsável'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...item.movements].reverse().map(m => (
                  <tr key={m.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLOR[m.type] ?? 'bg-gray-100 text-gray-700')}>{TYPE_LABEL[m.type] ?? m.type}</span>
                    </td>
                    <td className={cn('px-3 py-2 font-medium text-sm', ['ENTRY', 'RETURN'].includes(m.type) ? 'text-green-700' : 'text-red-600')}>
                      {['ENTRY', 'RETURN', 'CONSOLIDATION'].includes(m.type) ? '+' : '-'}{m.quantity}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{m.saldo_after} {item.unit}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs max-w-[120px] truncate">{m.notes || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(m.created_at)}</td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{m.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}

// ── ItemFormModal ─────────────────────────────────────────────────────────────

function ItemFormModal({ item, suppliers, onClose, onSave }: {
  item?: StockItem; suppliers: Supplier[]; onClose: () => void; onSave: (item: StockItem) => void;
}) {
  const [tab, setTab] = useState<'basic' | 'stock' | 'supply' | 'storage' | 'expiry'>('basic');
  const [form, setForm] = useState({
    name: item?.name ?? '', technical_name: item?.technical_name ?? '',
    internal_code: item?.internal_code ?? '', barcode: item?.barcode ?? '',
    category: item?.category ?? '', manufacturer: item?.manufacturer ?? '',
    unit: item?.unit ?? 'UN', tipo: item?.tipo ?? 'Unidade', description: item?.description ?? '',
    quantity: item?.quantity ?? 0, minimum_level: item?.minimum_level ?? 0,
    ideal_stock: item?.ideal_stock ?? 0, max_stock: item?.max_stock ?? 0,
    lead_time_days: item?.lead_time_days ?? 7,
    unit_cost: item?.unit_cost ?? 0, sale_price: item?.sale_price ?? 0,
    supplier_id: item?.supplier_id ?? '', location: item?.location ?? '',
    storage_sector: item?.storage_sector ?? '',
    expiry_date: item?.expiry_date ?? '', batch_number: item?.batch_number ?? '',
    status: item?.status ?? 'ACTIVE' as StockItem['status'], obs: item?.obs ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const TABS = [
    { id: 'basic', label: 'Básico' }, { id: 'stock', label: 'Estoque' },
    { id: 'supply', label: 'Fornecimento' }, { id: 'storage', label: 'Armazenamento' },
    { id: 'expiry', label: 'Validade/Lote' },
  ];

  const handleSave = () => {
    if (!form.name.trim()) { setError('Nome obrigatório'); return; }
    if (!form.category) { setError('Categoria obrigatória'); return; }
    setSaving(true);
    const supp = suppliers.find(s => s.id === form.supplier_id);
    const saved: StockItem = {
      id: item?.id ?? `IT${Date.now()}`, ...form,
      supplier_name: supp?.name ?? '',
      abc_class: item?.abc_class,
      hidden: item?.hidden ?? false,
      movements: item?.movements ?? [],
    };
    // If creating new and quantity > 0, add initial ENTRY movement
    if (!item && form.quantity > 0) {
      saved.movements = [{
        id: `${saved.id}-ENTRY-0`, item_id: saved.id, type: 'ENTRY',
        quantity: form.quantity, notes: 'Estoque inicial', created_at: new Date().toISOString(),
        created_by: 'Sistema', saldo_after: form.quantity,
      }];
    }
    setTimeout(() => {
      onSave(saved);
      setSaving(false);
      onClose();
      toast.success(item ? 'Item atualizado' : 'Item criado');
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">{item ? 'Editar Item' : 'Novo Item de Estoque'}</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-1 mb-4 bg-muted/40 p-1 rounded-lg">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={cn('flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors', tab === t.id ? 'bg-white shadow-sm' : 'text-muted-foreground')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {tab === 'basic' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Nome *</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.name} onChange={e => f('name', e.target.value)} placeholder="Nome do produto" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Nome Técnico</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.technical_name} onChange={e => f('technical_name', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Código Interno</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.internal_code} onChange={e => f('internal_code', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Categoria *</label>
                <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.category} onChange={e => f('category', e.target.value)}>
                  <option value="">Selecionar</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo de embalagem</label>
                <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.tipo} onChange={e => f('tipo', e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Fabricante</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.manufacturer} onChange={e => f('manufacturer', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Unidade de medida</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.unit} onChange={e => f('unit', e.target.value)} placeholder="UN, ML, MG, CX..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Código de Barras</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.barcode} onChange={e => f('barcode', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Descrição / Observação</label>
                <textarea rows={2} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" value={form.obs} onChange={e => f('obs', e.target.value)} />
              </div>
            </div>
          )}
          {tab === 'stock' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Quantidade {!item && '(inicial)'}</label>
                <input type="number" min={0} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.quantity} onChange={e => f('quantity', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Estoque Mínimo *</label>
                <input type="number" min={0} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.minimum_level} onChange={e => f('minimum_level', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Estoque Ideal</label>
                <input type="number" min={0} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.ideal_stock} onChange={e => f('ideal_stock', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Estoque Máximo</label>
                <input type="number" min={0} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.max_stock} onChange={e => f('max_stock', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Lead Time (dias)</label>
                <input type="number" min={1} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.lead_time_days} onChange={e => f('lead_time_days', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30" value={form.status} onChange={e => f('status', e.target.value)}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="BLOCKED">Bloqueado</option>
                  <option value="INACTIVE">Inativo</option>
                  <option value="EXPIRED">Vencido</option>
                </select>
              </div>
            </div>
          )}
          {tab === 'supply' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Custo Unitário (R$)</label>
                <input type="number" min={0} step="0.01" className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.unit_cost} onChange={e => f('unit_cost', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Preço de Venda (R$)</label>
                <input type="number" min={0} step="0.01" className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.sale_price} onChange={e => f('sale_price', Number(e.target.value))} placeholder="0 = não se aplica" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Fornecedor Principal</label>
                <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30" value={form.supplier_id} onChange={e => f('supplier_id', e.target.value)}>
                  <option value="">Nenhum</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          )}
          {tab === 'storage' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Localização</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.location} onChange={e => f('location', e.target.value)} placeholder="Prateleira A1, Armário 3..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Setor</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.storage_sector} onChange={e => f('storage_sector', e.target.value)} placeholder="Farmácia, Sala 1, Controlados..." />
              </div>
            </div>
          )}
          {tab === 'expiry' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Data de Validade</label>
                <input type="date" className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.expiry_date} onChange={e => f('expiry_date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Número do Lote</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={form.batch_number} onChange={e => f('batch_number', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : item ? 'Salvar' : 'Criar Item'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── MovementModal ─────────────────────────────────────────────────────────────

function MovementModal({ item, onClose, onMove }: {
  item: StockItem; onClose: () => void; onMove: (type: string, qty: number, notes: string, destUnit?: string) => void;
}) {
  const [type, setType] = useState((item as any)._preType ?? 'EXIT');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [destUnit, setDestUnit] = useState('Filial 2');
  const [saving, setSaving] = useState(false);

  const needsDestUnit = type === 'TRANSFER';
  const isRemoval = ['EXIT', 'LOSS', 'EXPIRY'].includes(type);
  const maxQty = isRemoval ? item.quantity : 9999;

  const handleConfirm = () => {
    if (qty <= 0) { toast.error('Quantidade deve ser maior que zero'); return; }
    if (isRemoval && qty > item.quantity) { toast.error(`Quantidade excede saldo: ${item.quantity} ${item.unit}`); return; }
    setSaving(true);
    setTimeout(() => { onMove(type, qty, notes, needsDestUnit ? destUnit : undefined); onClose(); setSaving(false); }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Movimentação</h3>
            <p className="text-xs text-muted-foreground">{item.name} · Saldo: <strong>{item.quantity} {item.unit}</strong></p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Tipo de movimentação</label>
          <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30" value={type} onChange={e => setType(e.target.value)}>
            <option value="ENTRY">Entrada</option>
            <option value="EXIT">Saída</option>
            <option value="ADJUSTMENT">Ajuste de inventário</option>
            <option value="LOSS">Perda</option>
            <option value="EXPIRY">Vencimento</option>
            <option value="TRANSFER">Transferência entre unidades</option>
            <option value="RETURN">Devolução</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Quantidade {isRemoval && `(máx. ${item.quantity} ${item.unit})`}</label>
          <input type="number" min={1} max={maxQty} value={qty} onChange={e => setQty(Number(e.target.value))}
            className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {needsDestUnit && (
          <div>
            <label className="text-xs text-muted-foreground">Unidade de destino</label>
            <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-white outline-none" value={destUnit} onChange={e => setDestUnit(e.target.value)}>
              <option>Filial 2</option><option>Principal</option><option>Almoxarifado Central</option>
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground">Observação {['LOSS', 'EXPIRY', 'ADJUSTMENT'].includes(type) && '*'}</label>
          <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            value={notes} onChange={e => setNotes(e.target.value)} placeholder="Motivo / NF / referência..." />
        </div>

        {isRemoval && qty > 0 && (
          <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-xs text-muted-foreground">
            Saldo após: <strong className="text-foreground">{Math.max(0, item.quantity - qty)} {item.unit}</strong>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={saving}>{saving ? 'Registrando...' : 'Confirmar'}</Button>
        </div>
      </div>
    </div>
  );
}

// ── ConsolidateModal ──────────────────────────────────────────────────────────

function ConsolidateModal({ items, onClose, onConfirm }: {
  items: StockItem[]; onClose: () => void; onConfirm: (adjustments: { id: string; diff: number; justif: string }[]) => void;
}) {
  const [physical, setPhysical] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, String(i.quantity)]))
  );
  const [justification, setJustification] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const divergences = items.map(item => {
    const phys = parseInt(physical[item.id] ?? String(item.quantity), 10);
    return { ...item, physical: isNaN(phys) ? item.quantity : phys, diff: (isNaN(phys) ? item.quantity : phys) - item.quantity };
  }).filter(d => d.diff !== 0);

  const hasDivergence = divergences.length > 0;

  const handleConfirm = () => {
    if (hasDivergence && !justification.trim()) { setError('Justificativa obrigatória para ajustes'); return; }
    onConfirm(divergences.map(d => ({ id: d.id, diff: d.diff, justif: justification })));
    onClose();
    toast.success(`Estoque consolidado${hasDivergence ? ` — ${divergences.length} divergência(s) ajustada(s)` : ' — sem divergências'}`);
    if (hasDivergence) toast.info('📋 Log de ajuste gerado na Auditoria', { duration: 2500 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Consolidar Estoque</h3>
            <p className="text-xs text-muted-foreground">Compare saldo físico vs sistema. Divergências geram ajuste com log.</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Item', 'Sistema', 'Físico (contagem)', 'Divergência'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.filter(i => i.status !== 'INACTIVE' && !i.hidden).map(item => {
                const phys = parseInt(physical[item.id] ?? String(item.quantity), 10);
                const diff = (isNaN(phys) ? item.quantity : phys) - item.quantity;
                return (
                  <tr key={item.id} className={cn('hover:bg-muted/20', diff !== 0 && 'bg-amber-50/40')}>
                    <td className="px-3 py-2.5">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.unit}</p>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-medium">{item.quantity}</td>
                    <td className="px-3 py-2.5">
                      <input type="number" min={0} value={physical[item.id] ?? item.quantity}
                        onChange={e => setPhysical(prev => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-20 rounded-lg border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/30 text-center" />
                    </td>
                    <td className={cn('px-3 py-2.5 font-bold', diff > 0 ? 'text-green-700' : diff < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                      {diff === 0 ? '—' : diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasDivergence && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-800">
              {divergences.length} divergência(s) encontrada(s) — justificativa obrigatória
            </p>
            <textarea value={justification} onChange={e => { setJustification(e.target.value); setError(''); }}
              rows={2} placeholder="Motivo dos ajustes (ex.: contagem física após inventário mensal)..."
              className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/30 resize-none bg-white" />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}

        {!hasDivergence && (
          <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs text-green-800">
            ✓ Nenhuma divergência encontrada. Estoque físico confere com o sistema.
          </div>
        )}

        <div className="rounded-xl bg-muted/40 border border-border p-2.5 text-xs text-muted-foreground">
          Ao confirmar: saldos serão atualizados, movimentos CONSOLIDATION gerados, log registrado na Auditoria.
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>
            <Check className="h-3.5 w-3.5 mr-1.5" />Confirmar Consolidação
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── DeleteModal ───────────────────────────────────────────────────────────────

function DeleteModal({ item, onClose, onConfirm }: {
  item: StockItem; onClose: () => void; onConfirm: (deactivate: boolean) => void;
}) {
  const [pw, setPw] = useState('');
  const [deactivate, setDeactivate] = useState(true);
  const [error, setError] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-600" />
          <h3 className="text-sm font-semibold">Remover — {item.name}</h3>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={deactivate} onChange={() => setDeactivate(true)} />
            <span className="text-sm">Desativar (recomendado)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={!deactivate} onChange={() => setDeactivate(false)} />
            <span className="text-sm text-red-600">Excluir permanente</span>
          </label>
        </div>
        <div>
          <label className="text-xs font-medium">Senha Master *</label>
          <input type="password" value={pw} onChange={e => { setPw(e.target.value); setError(''); }}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={() => {
            if (pw !== MASTER_PW) { setError('Senha incorreta'); return; }
            onConfirm(deactivate);
            onClose();
            toast.success(deactivate ? `${item.name} desativado` : `${item.name} excluído`);
          }}>
            {deactivate ? 'Desativar' : 'Excluir'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryItemsPage() {
  const sp = useSearchParams();
  const [items, setItems] = useState<StockItem[]>(INITIAL_ITEMS);
  const [suppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState(sp.get('filter') ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | undefined>(undefined);
  const [moveItem, setMoveItem] = useState<StockItem | null>(null);
  const [detailItem, setDetailItem] = useState<StockItem | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);
  const [showConsolidate, setShowConsolidate] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const filtered = items.filter(item => {
    if (!showHidden && item.hidden) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.internal_code.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && item.category !== category) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    if (quickFilter === 'low') return item.quantity <= item.minimum_level && item.status === 'ACTIVE';
    if (quickFilter === 'critical') return item.quantity === 0 || item.status === 'BLOCKED' || item.status === 'EXPIRED';
    if (quickFilter === 'expired') return item.status === 'EXPIRED';
    return true;
  });

  const selectedItem = items.find(i => i.id === selectedItemId);

  const handleSaveItem = (saved: StockItem) => {
    setItems(prev => prev.some(i => i.id === saved.id) ? prev.map(i => i.id === saved.id ? saved : i) : [saved, ...prev]);
  };

  const handleMove = (item: StockItem, type: string, qty: number, notes: string, destUnit?: string) => {
    const isAddition = ['ENTRY', 'RETURN'].includes(type);
    const newQty = isAddition ? item.quantity + qty : Math.max(0, item.quantity - qty);
    const move: StockMovement = {
      id: `${item.id}-${type}-${Date.now()}`, item_id: item.id,
      type, quantity: qty, notes: notes || TYPE_LABEL[type] || type,
      created_at: new Date().toISOString(), created_by: 'Dr. Marcos Oliveira',
      saldo_after: newQty,
    };
    const notesStr = destUnit ? `${notes} → ${destUnit}` : notes;
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, quantity: newQty, movements: [...i.movements, { ...move, notes: notesStr }] }
      : i));
    toast.success(`${TYPE_LABEL[type]} registrada — ${item.name}: ${item.quantity} → ${newQty} ${item.unit}`);
    if (destUnit) toast.info(`Transferência para ${destUnit} registrada`, { duration: 2000 });
  };

  const handleConsolidate = (adjustments: { id: string; diff: number; justif: string }[]) => {
    setItems(prev => prev.map(item => {
      const adj = adjustments.find(a => a.id === item.id);
      if (!adj) return item;
      const newQty = item.quantity + adj.diff;
      const move: StockMovement = {
        id: `${item.id}-CONSOLIDATION-${Date.now()}`, item_id: item.id,
        type: 'CONSOLIDATION', quantity: Math.abs(adj.diff),
        notes: `Consolidação: ${adj.diff > 0 ? '+' : ''}${adj.diff} (${adj.justif})`,
        created_at: new Date().toISOString(), created_by: 'Inventário AYRON',
        saldo_after: newQty,
      };
      return { ...item, quantity: newQty, movements: [...item.movements, move] };
    }));
  };

  const handleDelete = (item: StockItem, deactivate: boolean) => {
    if (deactivate) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'INACTIVE', hidden: true } : i));
    } else {
      setItems(prev => prev.filter(i => i.id !== item.id));
    }
    if (selectedItemId === item.id) setSelectedItemId(null);
  };

  const handleEntrada = () => {
    if (!selectedItem) { toast.error('Selecione um item na lista'); return; }
    setMoveItem({ ...selectedItem, _preType: 'ENTRY' } as any);
  };
  const handleSaida = () => {
    if (!selectedItem) { toast.error('Selecione um item na lista'); return; }
    setMoveItem({ ...selectedItem, _preType: 'EXIT' } as any);
  };

  const QUICK_FILTERS = [
    { id: '', label: 'Todos' },
    { id: 'low', label: 'Estoque Baixo' },
    { id: 'critical', label: 'Críticos' },
    { id: 'expired', label: 'Vencidos' },
  ];

  return (
    <div>
      <Topbar title="Itens de Estoque" />
      <div className="p-6 space-y-4">

        {/* Back + search row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/inventory">
              <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Estoque</Button>
            </Link>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="rounded-lg border border-border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 w-60"
                placeholder="Nome, código, barcode..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(v => !v)}>
              <Filter className="h-4 w-4 mr-1" />Filtros
            </Button>
          </div>
          <Button size="sm" onClick={() => { setEditItem(undefined); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" />Novo Item
          </Button>
        </div>

        {showFilters && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-white" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Todas</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm bg-white" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="ACTIVE">Ativo</option>
                <option value="BLOCKED">Bloqueado</option>
                <option value="EXPIRED">Vencido</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {QUICK_FILTERS.map(f => (
            <button key={f.id} onClick={() => setQuickFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${quickFilter === f.id ? 'bg-primary text-white border-primary' : 'border-border bg-white hover:bg-muted/40'}`}>
              {f.label}
            </button>
          ))}
          <button onClick={() => setShowHidden(v => !v)}
            className={`ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${showHidden ? 'bg-slate-700 text-white border-slate-700' : 'border-border bg-white hover:bg-muted/40'}`}>
            {showHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Ocultos: {showHidden ? 'SIM' : 'NÃO'}
          </button>
        </div>

        {/* Ações AYRON bar */}
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-border bg-muted/20 px-3 py-2">
          <span className="text-xs text-muted-foreground font-medium mr-1">Ações AYRON:</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleEntrada}>
            <LogIn className="h-3.5 w-3.5 text-green-600" />Dar Entrada
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleSaida}>
            <LogOut className="h-3.5 w-3.5 text-red-500" />Dar Saída
          </Button>
          <div className="w-px h-4 bg-border" />
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowConsolidate(true)}>
            <Layers className="h-3.5 w-3.5 text-blue-600" />Consolidar
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => importRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 text-purple-600" />Importar CSV
          </Button>
          <Link href="/inventory/reports">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <FileText className="h-3.5 w-3.5 text-orange-500" />Relatórios
            </Button>
          </Link>
          <Link href="/inventory/suppliers">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <FileText className="h-3.5 w-3.5 text-teal-600" />Fornecedores
            </Button>
          </Link>
          <input ref={importRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => {
            if (e.target.files?.[0]) { toast.success(`"${e.target.files[0].name}" importado`); e.target.value = ''; }
          }} />
          {selectedItemId && <span className="ml-auto text-xs text-muted-foreground">1 item selecionado</span>}
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} item(ns)</p>

        {/* Items list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum item encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const isLow = item.quantity <= item.minimum_level;
              const isExpiring = item.expiry_date && new Date(item.expiry_date) <= new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
              return (
                <div key={item.id} onClick={() => setSelectedItemId(id => id === item.id ? null : item.id)}
                  className={cn('rounded-xl border px-4 py-3 cursor-pointer transition-all', selectedItemId === item.id ? 'ring-2 ring-primary/50' : '', getStatusColor(item))}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', isLow || item.status === 'EXPIRED' ? 'bg-red-100' : 'bg-muted')}>
                        {isLow || item.status === 'EXPIRED' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Package className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.abc_class && <span className={cn('text-xs font-bold rounded px-1.5 py-0.5', item.abc_class === 'A' ? 'bg-red-100 text-red-700' : item.abc_class === 'B' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}>Curva {item.abc_class}</span>}
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                            item.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            item.status === 'BLOCKED' ? 'bg-amber-100 text-amber-800' :
                            item.status === 'EXPIRED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600')}>
                            {item.status === 'ACTIVE' ? 'Ativo' : item.status === 'BLOCKED' ? 'Bloqueado' : item.status === 'EXPIRED' ? 'Vencido' : 'Inativo'}
                          </span>
                          {isLow && item.status === 'ACTIVE' && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-800">Estoque Baixo</span>}
                          {isExpiring && item.status !== 'EXPIRED' && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">Vencimento Próximo</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.category} · {item.tipo} · Mín: {item.minimum_level} {item.unit}
                          {item.location && ` · ${item.location}`}
                          {item.supplier_name && ` · ${item.supplier_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                      <div className="text-right">
                        <span className={cn('text-sm font-bold', isLow ? 'text-red-500' : 'text-foreground')}>{item.quantity} {item.unit}</span>
                        {item.unit_cost > 0 && <p className="text-xs text-muted-foreground">{fmt(item.unit_cost)}/un</p>}
                      </div>
                      <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                        <button className="p-1.5 rounded-lg hover:bg-muted/60" title="Ver detalhes" onClick={() => setDetailItem(item)}><Eye className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-muted/60" title="Editar" onClick={() => { setEditItem(item); setShowForm(true); }}><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-muted/60" title="Movimentar" onClick={() => setMoveItem(item)}><BarChart3 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-muted/60" title="Histórico" onClick={() => setHistoryItem(item)}><History className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-muted/60" title="Imprimir" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50" title="Excluir/Desativar" onClick={() => setDeleteItem(item)}><Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <ItemFormModal item={editItem} suppliers={suppliers} onClose={() => { setShowForm(false); setEditItem(undefined); }} onSave={handleSaveItem} />
      )}
      {moveItem && (
        <MovementModal item={moveItem} onClose={() => setMoveItem(null)}
          onMove={(type, qty, notes, destUnit) => handleMove(moveItem, type, qty, notes, destUnit)} />
      )}
      {showConsolidate && (
        <ConsolidateModal items={items} onClose={() => setShowConsolidate(false)} onConfirm={handleConsolidate} />
      )}
      {detailItem && <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />}
      {historyItem && <ItemHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />}
      {deleteItem && <DeleteModal item={deleteItem} onClose={() => setDeleteItem(null)} onConfirm={deact => handleDelete(deleteItem, deact)} />}
    </div>
  );
}
