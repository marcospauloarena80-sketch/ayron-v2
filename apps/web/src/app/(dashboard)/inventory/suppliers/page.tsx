'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Building2, Plus, X, Edit, Trash2, Phone, Mail, Globe, MapPin, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Supplier {
  id: string; name: string; document: string; email: string; phone: string;
  contact_name: string; address: string; website: string;
  payment_terms: string; lead_time_days: number; notes: string;
  active: boolean;
}

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP001', name: 'Farma Distribuidora Ltda', document: '12.345.678/0001-90',
    email: 'contato@farmadist.com.br', phone: '(11) 3456-7890', contact_name: 'Maria Silva',
    address: 'Rua das Flores, 123 — São Paulo, SP', website: 'www.farmadist.com.br',
    payment_terms: '30 dias boleto', lead_time_days: 5,
    notes: 'Fornecedor principal de medicamentos e hormonais', active: true,
  },
  {
    id: 'SUP002', name: 'MedBio Insumos', document: '98.765.432/0001-11',
    email: 'vendas@medbio.com', phone: '(21) 2987-6543', contact_name: 'João Pereira',
    address: 'Av. Brasil, 456 — Rio de Janeiro, RJ', website: '',
    payment_terms: 'À vista', lead_time_days: 3,
    notes: 'Hormonais, injetáveis e controlados', active: true,
  },
  {
    id: 'SUP003', name: 'Descartáveis Médicos SA', document: '55.123.456/0001-77',
    email: 'pedidos@descartaveis.com', phone: '(11) 4567-8901', contact_name: 'Ana Costa',
    address: 'Rua Industrial, 789 — São Paulo, SP', website: '',
    payment_terms: '15 dias', lead_time_days: 2,
    notes: 'EPIs, seringas e descartáveis em geral', active: true,
  },
];

const EMPTY_FORM = {
  name: '', document: '', email: '', phone: '', contact_name: '',
  address: '', website: '', payment_terms: '', lead_time_days: 7, notes: '',
};

function SupplierModal({
  supplier, onClose, onSave,
}: {
  supplier?: Supplier | null;
  onClose: () => void;
  onSave: (data: Omit<Supplier, 'id' | 'active'>) => void;
}) {
  const [form, setForm] = useState<typeof EMPTY_FORM>(
    supplier ? {
      name: supplier.name, document: supplier.document, email: supplier.email,
      phone: supplier.phone, contact_name: supplier.contact_name, address: supplier.address,
      website: supplier.website, payment_terms: supplier.payment_terms,
      lead_time_days: supplier.lead_time_days, notes: supplier.notes,
    } : { ...EMPTY_FORM }
  );

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    onSave(form);
  };

  const fields: [keyof typeof EMPTY_FORM, string, string, number][] = [
    ['name', 'Nome *', 'text', 2],
    ['document', 'CNPJ/CPF', 'text', 1],
    ['email', 'Email', 'email', 1],
    ['phone', 'Telefone', 'text', 1],
    ['contact_name', 'Contato', 'text', 1],
    ['website', 'Website', 'text', 1],
    ['payment_terms', 'Condições de Pagamento', 'text', 1],
    ['address', 'Endereço', 'text', 2],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">{supplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {fields.map(([k, l, t, cols]) => (
            <div key={k} className={cols === 2 ? 'col-span-2' : ''}>
              <label className="text-xs text-muted-foreground">{l}</label>
              <input
                type={t}
                className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={String(form[k])}
                onChange={e => f(k, e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground">Lead Time (dias)</label>
            <input
              type="number" min={1}
              className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={form.lead_time_days}
              onChange={e => f('lead_time_days', Number(e.target.value))}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground">Observações</label>
            <textarea
              rows={2}
              className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={form.notes}
              onChange={e => f('notes', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>
            {supplier ? 'Salvar Alterações' : 'Criar Fornecedor'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteSupplierModal({
  supplier, onClose, onConfirm,
}: {
  supplier: Supplier;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-sm font-semibold mb-2">Remover Fornecedor</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Deseja remover <strong>{supplier.name}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm}>Remover</Button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<Supplier | null>(null);
  const [search, setSearch] = useState('');

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.document.includes(search) ||
    s.contact_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (data: Omit<Supplier, 'id' | 'active'>) => {
    if (editSupplier) {
      setSuppliers(prev => prev.map(s => s.id === editSupplier.id ? { ...s, ...data } : s));
      toast.success('Fornecedor atualizado');
    } else {
      const newId = `SUP${String(Date.now()).slice(-6)}`;
      setSuppliers(prev => [...prev, { id: newId, active: true, ...data }]);
      toast.success('Fornecedor cadastrado');
    }
    setShowForm(false);
    setEditSupplier(null);
  };

  const handleDelete = () => {
    if (!deleteSupplier) return;
    setSuppliers(prev => prev.filter(s => s.id !== deleteSupplier.id));
    toast.success('Fornecedor removido');
    setDeleteSupplier(null);
  };

  return (
    <div>
      <Topbar title="Fornecedores" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/inventory">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />Estoque
            </Button>
          </Link>
          <div className="flex-1" />
          <input
            className="rounded-lg border px-3 py-2 text-sm w-60 outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Buscar fornecedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button size="sm" onClick={() => { setEditSupplier(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" />Novo Fornecedor
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} fornecedor{filtered.length !== 1 ? 'es' : ''} cadastrado{filtered.length !== 1 ? 's' : ''}</p>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Nenhum fornecedor encontrado</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(s => (
              <div key={s.id} className="rounded-xl border border-border bg-white p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">{s.name}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{s.document}</span>
                    <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Lead {s.lead_time_days}d</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {s.contact_name && (
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{s.contact_name}</span>
                    )}
                    {s.phone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>
                    )}
                    {s.email && (
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>
                    )}
                    {s.website && (
                      <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{s.website}</span>
                    )}
                    {s.address && (
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.address}</span>
                    )}
                  </div>
                  {s.payment_terms && (
                    <p className="mt-1 text-xs text-muted-foreground">Pagamento: {s.payment_terms}</p>
                  )}
                  {s.notes && (
                    <p className="mt-1 text-xs text-muted-foreground italic">{s.notes}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => { setEditSupplier(s); setShowForm(true); }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteSupplier(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <SupplierModal
          supplier={editSupplier}
          onClose={() => { setShowForm(false); setEditSupplier(null); }}
          onSave={handleSave}
        />
      )}
      {deleteSupplier && (
        <DeleteSupplierModal
          supplier={deleteSupplier}
          onClose={() => setDeleteSupplier(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
