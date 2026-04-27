'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Building2, Users, Key, Shield, Bell, CreditCard, FileText, Calendar,
  Package, FlaskConical, Pill, Stethoscope, MapPin, Phone, Mail, Globe,
  DollarSign, BarChart3, Zap, Brain, Settings, ChevronRight, Check,
  Plus, Trash2, Edit2, Save, X, Upload, AlertTriangle, RefreshCw,
  Smartphone, Webhook, Database, Lock, Eye, EyeOff, ToggleLeft,
  ToggleRight, Hash, Palette, Clock, UserCog, ClipboardList, MessageSquare,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Sidebar navigation ─────────────────────────────────────────────────────────

const SECTIONS = [
  {
    group: 'Clínica',
    items: [
      { key: 'clinic', label: 'Dados da Clínica', icon: Building2 },
      { key: 'branches', label: 'Unidades', icon: MapPin },
      { key: 'users', label: 'Usuários & Permissões', icon: Users },
      { key: 'professionals', label: 'Profissionais', icon: Stethoscope },
    ],
  },
  {
    group: 'Agenda',
    items: [
      { key: 'agenda_types', label: 'Tipos de Agendamento', icon: Calendar },
      { key: 'agenda_sectors', label: 'Setores & Salas', icon: Hash },
      { key: 'agenda_colors', label: 'Status & Cores', icon: Palette },
      { key: 'agenda_rules', label: 'Regras de Agenda', icon: Clock },
    ],
  },
  {
    group: 'Clínico',
    items: [
      { key: 'procedures', label: 'Procedimentos', icon: FlaskConical },
      { key: 'medications', label: 'Medicamentos & Protocolos', icon: Pill },
      { key: 'anamnesis', label: 'Fichas de Anamnese', icon: ClipboardList },
      { key: 'doc_templates', label: 'Modelos de Documentos', icon: FileText },
      { key: 'exam_spreadsheet', label: 'Planilha de Exames', icon: BarChart3 },
    ],
  },
  {
    group: 'Financeiro',
    items: [
      { key: 'payment_methods', label: 'Formas de Pagamento', icon: CreditCard },
      { key: 'payment_gateways', label: 'Stone / Pagar.Me', icon: DollarSign },
      { key: 'omie', label: 'OMIE / NF-e', icon: FileText },
      { key: 'subscription', label: 'Plano AYRON', icon: Zap },
    ],
  },
  {
    group: 'Comunicação',
    items: [
      { key: 'notifications', label: 'Notificações', icon: Bell },
      { key: 'sms_credits', label: 'Extrato SMS/WhatsApp', icon: Smartphone },
      { key: 'integrations', label: 'Integrações', icon: Webhook },
    ],
  },
  {
    group: 'IA & Dados',
    items: [
      { key: 'ayron_config', label: 'AYRON IA', icon: Brain },
      { key: 'ai_credits', label: 'Extrato IA', icon: Database },
      { key: 'lgpd', label: 'LGPD & Consentimentos', icon: Shield },
      { key: 'audit', label: 'Auditoria', icon: Lock },
    ],
  },
  {
    group: 'Conta',
    items: [
      { key: 'security', label: 'Segurança', icon: Key },
      { key: 'profile', label: 'Meu Perfil', icon: UserCog },
    ],
  },
];

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_PROCEDURES = [
  { id: '1', name: 'Implante de Testosterona', category: 'Hormonal', duration: 30, price: 1200, active: true },
  { id: '2', name: 'Soroterapia IV', category: 'Nutrição', duration: 60, price: 450, active: true },
  { id: '3', name: 'Aplicação Mounjaro', category: 'Emagrecimento', duration: 15, price: 980, active: true },
  { id: '4', name: 'Implante Gestrinona', category: 'Hormonal', duration: 30, price: 1100, active: true },
  { id: '5', name: 'HCG Injetável', category: 'Hormonal', duration: 15, price: 350, active: true },
  { id: '6', name: 'Oxandrolona Oral', category: 'Anabolizante', duration: 10, price: 280, active: false },
  { id: '7', name: 'Enantato de Testosterona', category: 'Hormonal', duration: 20, price: 420, active: true },
  { id: '8', name: 'NADH Implante', category: 'Longevidade', duration: 30, price: 890, active: true },
];

const MOCK_PAYMENT_METHODS = [
  { id: '1', name: 'PIX', fee_pct: 0, active: true, color: '#22c55e' },
  { id: '2', name: 'Dinheiro', fee_pct: 0, active: true, color: '#84cc16' },
  { id: '3', name: 'Cartão Débito', fee_pct: 1.5, active: true, color: '#3b82f6' },
  { id: '4', name: 'Cartão Crédito 1x', fee_pct: 2.99, active: true, color: '#8b5cf6' },
  { id: '5', name: 'Cartão Crédito 2-6x', fee_pct: 4.5, active: true, color: '#a855f7' },
  { id: '6', name: 'Cartão Crédito 7-12x', fee_pct: 6.99, active: true, color: '#d946ef' },
  { id: '7', name: 'Convênio', fee_pct: 0, active: false, color: '#f59e0b' },
  { id: '8', name: 'Transferência', fee_pct: 0, active: true, color: '#06b6d4' },
];

const MOCK_BRANCHES = [
  { id: '1', name: 'Clínica Barra', city: 'Rio de Janeiro', state: 'RJ', phone: '(21) 99999-0001', active: true },
  { id: '2', name: 'Clínica Teresópolis', city: 'Teresópolis', state: 'RJ', phone: '(21) 99999-0002', active: true },
];

const MOCK_USERS = [
  { id: '1', name: 'Dr. Murilo Andrade', email: 'murilo@clinica.com', role: 'MEDICO', active: true, last_login: '2026-04-23' },
  { id: '2', name: 'Amanda Gomes', email: 'amanda@clinica.com', role: 'ENFERMEIRO', active: true, last_login: '2026-04-22' },
  { id: '3', name: 'Andreia Lima', email: 'andreia@clinica.com', role: 'RECEPCIONISTA', active: true, last_login: '2026-04-23' },
  { id: '4', name: 'Dr. André Costa', email: 'andre@clinica.com', role: 'MEDICO', active: true, last_login: '2026-04-20' },
  { id: '5', name: 'Lorrana Figueiredo', email: 'lorrana@clinica.com', role: 'ENFERMEIRO', active: false, last_login: '2026-03-15' },
  { id: '6', name: 'Dr. Lucas Prado', email: 'lucas@clinica.com', role: 'MEDICO', active: true, last_login: '2026-04-21' },
];

const MOCK_AGENDA_COLORS = [
  { key: 'AGENDADO', label: 'Agendado', color: '#6366f1' },
  { key: 'CONFIRMADO', label: 'Confirmado', color: '#22c55e' },
  { key: 'CONSULTA', label: 'Em Consulta', color: '#3b82f6' },
  { key: 'PROCEDIMENTO', label: 'Em Procedimento', color: '#8b5cf6' },
  { key: 'AGUARDANDO_ATENDIMENTO', label: 'Aguardando', color: '#f59e0b' },
  { key: 'FALTOU', label: 'Faltou', color: '#ef4444' },
  { key: 'CANCELADO', label: 'Cancelado', color: '#6b7280' },
  { key: 'LISTA_ESPERA', label: 'Lista de Espera', color: '#f97316' },
];

const MOCK_AI_CREDITS = [
  { date: '2026-04-23', action: 'Análise de retorno (482 pacientes)', tokens: 12400, cost: 0.74 },
  { date: '2026-04-22', action: 'Geração de campanha Mounjaro', tokens: 3200, cost: 0.19 },
  { date: '2026-04-22', action: 'AYRON Chat (8 sessões)', tokens: 18600, cost: 1.12 },
  { date: '2026-04-21', action: 'Prontuário inteligente (34 registros)', tokens: 9800, cost: 0.59 },
  { date: '2026-04-20', action: 'Insights semanais', tokens: 6400, cost: 0.38 },
];

const MOCK_SMS_CREDITS = [
  { date: '2026-04-23', type: 'WhatsApp', qty: 47, cost: 4.70, description: 'Confirmações de agenda' },
  { date: '2026-04-22', type: 'WhatsApp', qty: 12, cost: 1.20, description: 'Lembretes de protocolo' },
  { date: '2026-04-21', type: 'SMS', qty: 28, cost: 2.80, description: 'Campanhas retorno' },
  { date: '2026-04-20', type: 'WhatsApp', qty: 63, cost: 6.30, description: 'Confirmações de agenda' },
];

// ── Panel components ────────────────────────────────────────────────────────────

function ClinicPanel() {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: 'Clínica Luminar',
    cnpj: '12.345.678/0001-90',
    crm: 'CRM-RJ 123456',
    email: 'contato@clinicaluminar.com.br',
    phone: '(21) 3333-0000',
    website: 'clinicaluminar.com.br',
    address: 'Av. Armando Lombardi, 800 — Barra da Tijuca, RJ',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dados da Clínica</h2>
          <p className="text-sm text-muted-foreground">Informações cadastrais e de contato</p>
        </div>
        <Button variant={editing ? 'primary' : 'secondary'} size="sm" onClick={() => {
          if (editing) {
            try {
              localStorage.setItem('ayron_clinic_settings', JSON.stringify(form));
              toast.success('Configurações salvas');
              setEditing(false);
            } catch {
              toast.error('Erro ao salvar');
            }
          } else {
            setEditing(true);
          }
        }}>
          {editing ? <><Save className="h-3.5 w-3.5 mr-1.5" />Salvar</> : <><Edit2 className="h-3.5 w-3.5 mr-1.5" />Editar</>}
        </Button>
      </div>

      {/* Logo upload */}
      <div className="flex items-center gap-5 p-4 rounded-xl border border-dashed border-border bg-muted/30">
        <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center text-white font-black text-2xl">L</div>
        <div>
          <p className="text-sm font-medium">Logo da Clínica</p>
          <p className="text-xs text-muted-foreground mb-2">PNG ou SVG · Recomendado 200×200px</p>
          {editing && <Button variant="secondary" size="sm" onClick={() => toast.info('Em desenvolvimento')}><Upload className="h-3 w-3 mr-1.5" />Upload</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Nome da Clínica', field: 'name' },
          { label: 'CNPJ', field: 'cnpj' },
          { label: 'CRM Responsável', field: 'crm' },
          { label: 'E-mail', field: 'email' },
          { label: 'Telefone', field: 'phone' },
          { label: 'Website', field: 'website' },
        ].map(({ label, field }) => (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
            {editing
              ? <Input value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              : <p className="text-sm py-2 px-3 rounded-lg bg-muted/50">{(form as any)[field]}</p>
            }
          </div>
        ))}
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Endereço Principal</label>
          {editing
            ? <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            : <p className="text-sm py-2 px-3 rounded-lg bg-muted/50">{form.address}</p>
          }
        </div>
      </div>
    </div>
  );
}

function BranchesPanel() {
  const [branches] = useState(MOCK_BRANCHES);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Unidades</h2>
          <p className="text-sm text-muted-foreground">{branches.length} unidades cadastradas</p>
        </div>
        <Button size="sm" onClick={() => toast.info('Em desenvolvimento')}><Plus className="h-3.5 w-3.5 mr-1.5" />Nova Unidade</Button>
      </div>
      <div className="space-y-3">
        {branches.map(b => (
          <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-white hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.city} — {b.state} · {b.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={b.active ? 'success' : 'default'}>{b.active ? 'Ativa' : 'Inativa'}</Badge>
              <Button variant="ghost" className="h-7 w-7"><Edit2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type UserEntry = { id: string; name: string; email: string; role: string; active: boolean; last_login: string };

const ROLE_LABELS: Record<string, string> = {
  MASTER: 'Master', ADMIN: 'Admin', GERENTE: 'Gerente',
  MEDICO: 'Médico', ENFERMEIRO: 'Enfermeiro', RECEPCIONISTA: 'Recepcionista',
};
const ROLE_COLORS: Record<string, string> = {
  MASTER: 'bg-red-100 text-red-700', ADMIN: 'bg-orange-100 text-orange-700',
  GERENTE: 'bg-amber-100 text-amber-700', MEDICO: 'bg-blue-100 text-blue-700',
  ENFERMEIRO: 'bg-green-100 text-green-700', RECEPCIONISTA: 'bg-purple-100 text-purple-700',
};

function UserModal({ item, onSave, onClose }: {
  item: UserEntry | null;
  onSave: (u: Omit<UserEntry, 'id' | 'last_login'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(
    item ? { name: item.name, email: item.email, role: item.role, active: item.active }
    : { name: '', email: '', role: 'RECEPCIONISTA', active: true }
  );
  function handle() {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Nome e e-mail obrigatórios'); return; }
    onSave(form); onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">{item ? 'Editar Usuário' : 'Convidar Usuário'}</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Nome completo</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">E-mail</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Perfil</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {Object.keys(ROLE_LABELS).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-primary" />
            <span className="text-sm">Conta ativa</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handle}><Save className="h-3.5 w-3.5 mr-1.5" />{item ? 'Salvar' : 'Convidar'}</Button>
        </div>
      </div>
    </div>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState<UserEntry[]>(MOCK_USERS);
  const [editUser, setEditUser] = useState<UserEntry | null | undefined>(undefined);

  function handleSave(data: Omit<UserEntry, 'id' | 'last_login'>) {
    if (editUser === null) {
      setUsers(prev => [{ ...data, id: Date.now().toString(), last_login: '—' }, ...prev]);
      toast.success('Convite enviado');
    } else if (editUser) {
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, ...data } : u));
      toast.success('Usuário atualizado');
    }
  }

  function toggleActive(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, active: !u.active } : u));
    toast.info('Status atualizado — histórico preservado');
  }

  function removeUser(id: string) {
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.success('Usuário removido');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usuários & Permissões</h2>
          <p className="text-sm text-muted-foreground">{users.filter(u => u.active).length} usuários ativos de {users.length}</p>
        </div>
        <Button size="sm" onClick={() => setEditUser(null)}><Plus className="h-3.5 w-3.5 mr-1.5" />Convidar Usuário</Button>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Nome', 'E-mail', 'Perfil', 'Último acesso', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={cn('border-t border-border hover:bg-muted/20', !u.active && 'opacity-60')}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600')}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.last_login}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u.id)}>
                    {u.active ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-gray-300" />}
                  </button>
                </td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <Button variant="ghost" className="h-7 w-7" onClick={() => setEditUser(u)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeUser(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editUser !== undefined && (
        <UserModal item={editUser} onSave={handleSave} onClose={() => setEditUser(undefined)} />
      )}
    </div>
  );
}

type Procedure = { id: string; name: string; category: string; duration: number; price: number; active: boolean };

function ProcedureModal({ item, onSave, onClose }: {
  item: Procedure | null;
  onSave: (p: Omit<Procedure, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Procedure, 'id'>>(
    item ? { name: item.name, category: item.category, duration: item.duration, price: item.price, active: item.active }
    : { name: '', category: 'Hormonal', duration: 30, price: 0, active: true }
  );
  function handle() {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    onSave(form); onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">{item ? 'Editar Procedimento' : 'Novo Procedimento'}</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Nome</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Soroterapia IV" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['Hormonal','Emagrecimento','Nutrição','Longevidade','Anabolizante','Outros'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Duração (min)</label>
              <Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Valor (R$)</label>
            <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-primary" />
            <span className="text-sm">Ativo</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handle}><Save className="h-3.5 w-3.5 mr-1.5" />Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function ProceduresPanel() {
  const [items, setItems] = useState<Procedure[]>(MOCK_PROCEDURES);
  const [search, setSearch] = useState('');
  const [editItem, setEditItem] = useState<Procedure | null | undefined>(undefined); // undefined=closed, null=new
  const filtered = items.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function handleSave(data: Omit<Procedure, 'id'>) {
    if (editItem === null) {
      setItems(prev => [{ ...data, id: Date.now().toString() }, ...prev]);
      toast.success('Procedimento adicionado');
    } else if (editItem) {
      setItems(prev => prev.map(p => p.id === editItem.id ? { ...p, ...data } : p));
      toast.success('Procedimento atualizado');
    }
  }

  function toggleActive(id: string) {
    setItems(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
    toast.info('Status atualizado — histórico preservado');
  }

  function remove(id: string) {
    setItems(prev => prev.filter(p => p.id !== id));
    toast.success('Procedimento removido');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Procedimentos</h2>
          <p className="text-sm text-muted-foreground">{items.filter(p => p.active).length} ativos · {items.length} total</p>
        </div>
        <Button size="sm" onClick={() => setEditItem(null)}><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Procedimento</Button>
      </div>
      <Input placeholder="Buscar procedimento..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Procedimento', 'Categoria', 'Duração', 'Valor', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className={cn('border-t border-border hover:bg-muted/20', !p.active && 'opacity-60')}>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{p.category}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.duration} min</td>
                <td className="px-4 py-3 font-medium">{fmt(p.price)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(p.id)}>
                    {p.active ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-gray-300" />}
                  </button>
                </td>
                <td className="px-4 py-3 flex items-center gap-1">
                  <Button variant="ghost" className="h-7 w-7" onClick={() => setEditItem(p)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editItem !== undefined && (
        <ProcedureModal item={editItem} onSave={handleSave} onClose={() => setEditItem(undefined)} />
      )}
    </div>
  );
}

type PaymentMethod = { id: string; name: string; fee_pct: number; active: boolean; color: string };

function PaymentMethodsPanel() {
  const [methods, setMethods] = useState<PaymentMethod[]>(MOCK_PAYMENT_METHODS);
  const [editMethod, setEditMethod] = useState<PaymentMethod | null | undefined>(undefined);

  const toggle = (id: string) => {
    setMethods(m => m.map(x => x.id === id ? { ...x, active: !x.active } : x));
    toast.info('Status atualizado — histórico preservado');
  };

  function saveMethod(data: Omit<PaymentMethod, 'id'>) {
    if (editMethod === null) {
      setMethods(prev => [...prev, { ...data, id: Date.now().toString() }]);
      toast.success('Forma de pagamento adicionada');
    } else if (editMethod) {
      setMethods(prev => prev.map(m => m.id === editMethod.id ? { ...m, ...data } : m));
      toast.success('Forma de pagamento atualizada');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Formas de Pagamento</h2>
          <p className="text-sm text-muted-foreground">Configure as formas aceitas e taxas aplicadas</p>
        </div>
        <Button size="sm" onClick={() => setEditMethod(null)}><Plus className="h-3.5 w-3.5 mr-1.5" />Adicionar</Button>
      </div>
      <div className="space-y-3">
        {methods.map(m => (
          <div key={m.id} className={cn('flex items-center justify-between p-4 rounded-xl border border-border bg-white', !m.active && 'opacity-60')}>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: m.color + '22' }}>
                <CreditCard className="h-4 w-4" style={{ color: m.color }} />
              </div>
              <div>
                <p className="font-medium text-sm">{m.name}</p>
                <p className="text-xs text-muted-foreground">Taxa: {m.fee_pct === 0 ? 'Sem taxa' : `${m.fee_pct}%`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="h-7 w-7" onClick={() => setEditMethod(m)}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600"
                onClick={() => { setMethods(prev => prev.filter(x => x.id !== m.id)); toast.success('Removido'); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <button onClick={() => toggle(m.id)}>
                {m.active ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-gray-300" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      {editMethod !== undefined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl border bg-white shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold">{editMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</h2>
              <button onClick={() => setEditMethod(undefined)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <PaymentMethodForm initial={editMethod} onSave={data => { saveMethod(data); setEditMethod(undefined); }} onClose={() => setEditMethod(undefined)} />
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentMethodForm({ initial, onSave, onClose }: {
  initial: PaymentMethod | null;
  onSave: (d: Omit<PaymentMethod, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<PaymentMethod, 'id'>>(
    initial ? { name: initial.name, fee_pct: initial.fee_pct, active: initial.active, color: initial.color }
    : { name: '', fee_pct: 0, active: true, color: '#6366f1' }
  );
  return (
    <div className="p-5 space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Nome</label>
        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: PIX" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Taxa (%)</label>
        <Input type="number" step="0.01" value={form.fee_pct} onChange={e => setForm(f => ({ ...f, fee_pct: +e.target.value }))} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">Cor</label>
        <div className="flex items-center gap-2">
          <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-9 w-12 rounded cursor-pointer border" />
          <span className="text-xs font-mono text-muted-foreground">{form.color}</span>
        </div>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-primary" /><span className="text-sm">Ativo</span></label>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { if (!form.name.trim()) { toast.error('Nome obrigatório'); return; } onSave(form); }}><Save className="h-3.5 w-3.5 mr-1.5" />Salvar</Button>
      </div>
    </div>
  );
}

function AgendaColorsPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Status & Cores de Agenda</h2>
        <p className="text-sm text-muted-foreground">Personalize as cores de cada status no calendário</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MOCK_AGENDA_COLORS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-white">
            <div className="h-8 w-8 rounded-lg flex-shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground font-mono">{color}</p>
            </div>
            <Button variant="ghost" className="h-7 w-7 flex-shrink-0">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AICreditsPanel() {
  const total = MOCK_AI_CREDITS.reduce((s, r) => s + r.cost, 0);
  const tokens = MOCK_AI_CREDITS.reduce((s, r) => s + r.tokens, 0);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Extrato de Créditos IA</h2>
        <p className="text-sm text-muted-foreground">Consumo de tokens AYRON nos últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Custo Total (30d)', value: fmt(total), sub: 'Período atual' },
          { label: 'Tokens Consumidos', value: tokens.toLocaleString(), sub: 'Todos os módulos' },
          { label: 'Saldo Disponível', value: fmt(87.40), sub: 'Plano mensal R$ 97' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-white text-center">
            <p className="text-2xl font-bold text-primary">{value}</p>
            <p className="text-sm font-medium mt-1">{label}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Data', 'Ação', 'Tokens', 'Custo'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_AI_CREDITS.map((r, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3 text-muted-foreground text-xs">{r.date}</td>
                <td className="px-4 py-3">{r.action}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.tokens.toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{fmt(r.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SMSCreditsPanel() {
  const total = MOCK_SMS_CREDITS.reduce((s, r) => s + r.cost, 0);
  const qty = MOCK_SMS_CREDITS.reduce((s, r) => s + r.qty, 0);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Extrato SMS / WhatsApp</h2>
        <p className="text-sm text-muted-foreground">Mensagens enviadas nos últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Custo Total (30d)', value: fmt(total) },
          { label: 'Mensagens Enviadas', value: qty.toString() },
          { label: 'Saldo Créditos', value: fmt(45.80) },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-white text-center">
            <p className="text-2xl font-bold text-primary">{value}</p>
            <p className="text-sm font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Data', 'Canal', 'Qtd', 'Custo', 'Descrição'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_SMS_CREDITS.map((r, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3 text-muted-foreground text-xs">{r.date}</td>
                <td className="px-4 py-3">
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                    r.type === 'WhatsApp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')}>
                    {r.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.qty}</td>
                <td className="px-4 py-3 font-medium">{fmt(r.cost)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LGPDPanel() {
  const [consents] = useState([
    { id: '1', name: 'Termo de Uso e Política de Privacidade', version: 'v3.1', active: true, required: true },
    { id: '2', name: 'Consentimento para Coleta de Dados Biométricos', version: 'v2.0', active: true, required: true },
    { id: '3', name: 'Autorização para Comunicação por WhatsApp', version: 'v1.2', active: true, required: false },
    { id: '4', name: 'Consentimento para Uso de IA em Prontuários', version: 'v1.0', active: true, required: false },
    { id: '5', name: 'Autorização de Imagem e Vídeo', version: 'v1.0', active: false, required: false },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">LGPD & Consentimentos</h2>
          <p className="text-sm text-muted-foreground">Gestão de consentimentos e direitos dos titulares</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Termo</Button>
      </div>

      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 flex gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">Adequação LGPD</p>
          <p className="text-xs text-amber-700">Todos os consentimentos estão sendo coletados digitalmente. Última auditoria: 2026-04-01.</p>
        </div>
      </div>

      <div className="space-y-3">
        {consents.map(c => (
          <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-white">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{c.name}</p>
                {c.required && <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">OBRIGATÓRIO</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versão {c.version}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.active ? 'success' : 'default'}>{c.active ? 'Ativo' : 'Inativo'}</Badge>
              <Button variant="ghost" className="h-7 w-7"><Edit2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 pt-2">
        {[
          { label: 'Exportar meus dados', desc: 'Gera arquivo ZIP com todos os dados', icon: Database },
          { label: 'Solicitar exclusão', desc: 'Direito ao esquecimento — Art. 18 LGPD', icon: Trash2 },
          { label: 'Relatório DPO', desc: 'Relatório para o Encarregado de Dados', icon: FileText },
        ].map(({ label, desc, icon: Icon }) => (
          <button key={label} className="p-4 rounded-xl border border-border bg-white text-left hover:border-primary/30 transition-colors group">
            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function AuditPanel() {
  const MOCK_AUDIT = [
    { ts: '2026-04-23 09:14', user: 'Dr. Murilo', action: 'Prontuário editado', target: 'Paciente #4821 — Ana Lima', ip: '201.x.x.1' },
    { ts: '2026-04-23 08:55', user: 'Andreia Lima', action: 'Login realizado', target: '—', ip: '201.x.x.2' },
    { ts: '2026-04-22 18:30', user: 'AYRON IA', action: 'Análise de retorno executada', target: '482 pacientes', ip: 'Railway' },
    { ts: '2026-04-22 16:20', user: 'Dr. André', action: 'Receituário gerado', target: 'Paciente #3102 — Carlos Souza', ip: '201.x.x.3' },
    { ts: '2026-04-22 14:10', user: 'Lorrana', action: 'Tentativa de login falhou', target: '—', ip: '189.x.x.9' },
    { ts: '2026-04-22 11:05', user: 'Andreia Lima', action: 'Paciente cadastrado', target: 'Beatriz Fernandes', ip: '201.x.x.2' },
    { ts: '2026-04-21 09:30', user: 'Dr. Lucas', action: 'Baixa de protocolo', target: 'Sessão Mounjaro #12 — Pedro Gomes', ip: '201.x.x.4' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Auditoria do Sistema</h2>
        <p className="text-sm text-muted-foreground">Todas as ações registradas com usuário, IP e timestamp</p>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Timestamp', 'Usuário', 'Ação', 'Objeto', 'IP'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_AUDIT.map((r, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.ts}</td>
                <td className="px-4 py-3 font-medium text-xs">{r.user}</td>
                <td className="px-4 py-3 text-xs">{r.action}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.target}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecurityPanel() {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Segurança da Conta</h2>
        <p className="text-sm text-muted-foreground">Senha, autenticação e sessões ativas</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-border bg-white">
          <p className="text-sm font-semibold mb-3">Alterar Senha</p>
          <div className="grid grid-cols-1 gap-3 max-w-sm">
            <div className="relative">
              <Input type={show ? 'text' : 'password'} placeholder="Senha atual" />
              <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShow(s => !s)}>
                {show ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </button>
            </div>
            <Input type="password" placeholder="Nova senha" />
            <Input type="password" placeholder="Confirmar nova senha" />
            <Button size="sm" className="self-start" onClick={() => toast.info('Alteração de senha em desenvolvimento')}>Salvar nova senha</Button>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-white flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Autenticação em 2 Fatores</p>
            <p className="text-xs text-muted-foreground">Proteja sua conta com TOTP ou SMS</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => toast.info('Em desenvolvimento')}>Configurar 2FA</Button>
        </div>

        <div className="p-4 rounded-xl border border-border bg-white">
          <p className="text-sm font-semibold mb-3">Sessões Ativas</p>
          {[
            { device: 'Chrome · macOS', location: 'Rio de Janeiro, BR', active: true, ts: 'Agora' },
            { device: 'Safari · iPhone 15', location: 'Rio de Janeiro, BR', active: false, ts: 'Há 2 horas' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{s.device}</p>
                <p className="text-xs text-muted-foreground">{s.location} · {s.ts}</p>
              </div>
              {s.active
                ? <span className="text-xs text-green-600 font-medium">Sessão atual</span>
                : <Button variant="ghost" size="sm" className="text-red-500 text-xs h-7" onClick={() => toast.info('Em desenvolvimento')}>Encerrar</Button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationsPanel() {
  const integrations = [
    { name: 'OMIE ERP', desc: 'Emissão de NF-e e contabilidade', status: 'pendente', icon: '🏢' },
    { name: 'Stone / Pagar.Me', desc: 'Maquininha e link de pagamento', status: 'pendente', icon: '💳' },
    { name: 'Memed', desc: 'Prescrição digital integrada', status: 'pendente', icon: '💊' },
    { name: 'Evolution API', desc: 'WhatsApp Business automações', status: 'pendente', icon: '📱' },
    { name: 'Digisac', desc: 'Plataforma de atendimento omnichannel', status: 'ativo', icon: '💬' },
    { name: 'Google Agenda', desc: 'Sincronização bidirecional', status: 'pendente', icon: '📅' },
    { name: 'n8n Workflows', desc: 'Automações AYRON-MP', status: 'ativo', icon: '⚡' },
    { name: 'Supabase', desc: 'Dados analíticos e AYRON-MP', status: 'ativo', icon: '🗄️' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Integrações</h2>
        <p className="text-sm text-muted-foreground">Conecte sistemas externos ao AYRON</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {integrations.map(i => (
          <div key={i.name} className="p-4 rounded-xl border border-border bg-white flex items-start gap-3">
            <span className="text-2xl">{i.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{i.name}</p>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  i.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                  {i.status === 'ativo' ? 'Ativo' : 'Pendente'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{i.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AyronConfigPanel() {
  const [configs, setConfigs] = useState([
    { key: 'prontuario_ia', label: 'Sugestões IA no prontuário', desc: 'AYRON sugere CID, medicamentos e alertas', enabled: true },
    { key: 'retorno_auto', label: 'Análise automática de retorno', desc: 'Analisa diariamente pacientes sem retorno', enabled: true },
    { key: 'campanha_auto', label: 'Campanhas automáticas', desc: 'Gera campanhas para pacientes em risco', enabled: false },
    { key: 'receita_ia', label: 'Receituário assistido por IA', desc: 'Autocomplete de medicamentos e dosagens', enabled: true },
    { key: 'insights_email', label: 'Insights semanais por e-mail', desc: 'Relatório executivo toda segunda-feira', enabled: true },
    { key: 'voz_ia', label: 'Transcrição de consulta por voz', desc: 'Grava e transcreve consultas automaticamente', enabled: false },
  ]);

  const toggle = (key: string) => {
    setConfigs(c => c.map(x => x.key === key ? { ...x, enabled: !x.enabled } : x));
    toast.info('Salvo localmente — sincronização em desenvolvimento');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">AYRON IA — Configurações</h2>
        <p className="text-sm text-muted-foreground">Ative ou desative recursos de inteligência artificial</p>
      </div>
      <div className="space-y-3">
        {configs.map(c => (
          <div key={c.key} className="flex items-center justify-between p-4 rounded-xl border border-border bg-white">
            <div>
              <p className="text-sm font-semibold">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.desc}</p>
            </div>
            <button onClick={() => toggle(c.key)}>
              {c.enabled
                ? <ToggleRight className="h-7 w-7 text-primary" />
                : <ToggleLeft className="h-7 w-7 text-gray-300" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscriptionPanel() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Plano AYRON</h2>
        <p className="text-sm text-muted-foreground">Seu plano atual e opções de upgrade</p>
      </div>

      <div className="p-6 rounded-xl border-2 border-primary bg-primary/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Plano Atual</p>
            <p className="text-2xl font-black text-secondary mt-1">AYRON PRO</p>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-primary text-white text-sm font-bold">Ativo</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Pacientes', value: '6.036 / ilimitado' },
            { label: 'Usuários', value: '10 / 20' },
            { label: 'IA Tokens', value: '50k / mês' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-lg bg-white/70">
              <p className="text-sm font-semibold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-right">Próxima cobrança: R$ 297,00 em 01/05/2026</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { name: 'STARTER', price: 'R$ 97', features: ['2 usuários', '1.000 pacientes', '10k tokens IA', 'Sem WhatsApp'] },
          { name: 'PRO', price: 'R$ 297', features: ['20 usuários', 'Ilimitado pacientes', '50k tokens IA', 'WhatsApp incluso'], current: true },
          { name: 'ENTERPRISE', price: 'R$ 797', features: ['Ilimitado tudo', '200k tokens IA', 'Suporte dedicado', 'SLA 99.9%'] },
        ].map(p => (
          <div key={p.name} className={cn('p-4 rounded-xl border-2', p.current ? 'border-primary bg-primary/5' : 'border-border bg-white')}>
            <p className="text-xs font-bold text-muted-foreground mb-1">{p.name}</p>
            <p className="text-xl font-black">{p.price}<span className="text-xs font-normal text-muted-foreground">/mês</span></p>
            <ul className="mt-3 space-y-1">
              {p.features.map(f => (
                <li key={f} className="flex items-center gap-1.5 text-xs">
                  <Check className="h-3 w-3 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            {!p.current && <Button variant="secondary" size="sm" className="w-full mt-3 text-xs">Fazer upgrade</Button>}
            {p.current && <p className="text-center text-xs font-semibold text-primary mt-3">Plano atual</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfessionalsPanel() {
  const [professionals, setProfessionals] = useState([
    { id: '1', name: 'Dr. Murilo Andrade', specialty: 'Medicina do Esporte', crm: 'CRM-RJ 123456', color: '#FF6B00', active: true, schedule: 'Seg-Sex 08:00–18:00' },
    { id: '2', name: 'Amanda Gomes', specialty: 'Enfermagem', crm: 'COREN-RJ 78901', color: '#8B5CF6', active: true, schedule: 'Seg-Sex 09:00–17:00' },
    { id: '3', name: 'Dr. André Costa', specialty: 'Medicina Estética', crm: 'CRM-RJ 234567', color: '#0EA5E9', active: true, schedule: 'Ter-Qui 10:00–16:00' },
    { id: '4', name: 'Lorrana Figueiredo', specialty: 'Enfermagem', crm: 'COREN-RJ 45678', color: '#10B981', active: true, schedule: 'Seg-Sex 08:00–17:00' },
    { id: '5', name: 'Dra. Julia Matos', specialty: 'Nutrologia', crm: 'CRM-RJ 345678', color: '#F59E0B', active: false, schedule: 'Seg, Qua, Sex 09:00–15:00' },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Profissionais</h2>
          <p className="text-sm text-muted-foreground">{professionals.filter(p => p.active).length} profissionais ativos</p>
        </div>
        <Button size="sm" onClick={() => toast.info('Em desenvolvimento')}><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Profissional</Button>
      </div>
      <div className="space-y-3">
        {professionals.map(prof => (
          <div key={prof.id} className={cn('flex items-center justify-between p-4 rounded-xl border bg-white transition-colors', prof.active ? 'border-border hover:border-primary/30' : 'border-gray-200 bg-gray-50 opacity-70')}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: prof.color }}>
                {prof.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="text-sm font-semibold">{prof.name}</p>
                <p className="text-xs text-muted-foreground">{prof.specialty} · {prof.crm}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">🕐 {prof.schedule}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-2">
                <span className="text-xs text-muted-foreground">Cor:</span>
                <div className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: prof.color }} />
              </div>
              <Badge variant={prof.active ? 'success' : 'default'}>{prof.active ? 'Ativo' : 'Inativo'}</Badge>
              <Button variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(prof.id); }}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" className="h-7 w-7" onClick={() => setProfessionals(p => p.map(x => x.id === prof.id ? { ...x, active: !x.active } : x))}>
                {prof.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-gray-300" />}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaTypesPanel() {
  const [types, setTypes] = useState([
    { id: '1', name: 'Consulta Inicial', duration: 60, color: '#6366f1', category: 'Consulta', active: true },
    { id: '2', name: 'Retorno', duration: 30, color: '#22c55e', category: 'Consulta', active: true },
    { id: '3', name: 'Aplicação Mounjaro', duration: 15, color: '#FF6B00', category: 'Procedimento', active: true },
    { id: '4', name: 'Implante Hormonal', duration: 45, color: '#8b5cf6', category: 'Procedimento', active: true },
    { id: '5', name: 'Soroterapia IV', duration: 60, color: '#0ea5e9', category: 'Procedimento', active: true },
    { id: '6', name: 'Teleconsulta', duration: 30, color: '#f59e0b', category: 'Teleconsulta', active: true },
    { id: '7', name: 'Avaliação Nutricional', duration: 50, color: '#10b981', category: 'Consulta', active: true },
    { id: '8', name: 'Bioimpedância', duration: 20, color: '#ec4899', category: 'Avaliação', active: false },
  ]);

  const categories = [...new Set(types.map(t => t.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tipos de Agendamento</h2>
          <p className="text-sm text-muted-foreground">{types.filter(t => t.active).length} tipos ativos</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Tipo</Button>
      </div>
      {categories.map(cat => (
        <div key={cat}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{cat}</p>
          <div className="space-y-2">
            {types.filter(t => t.category === cat).map(t => (
              <div key={t.id} className={cn('flex items-center justify-between px-4 py-3 rounded-xl border bg-white', t.active ? 'border-border' : 'border-gray-200 bg-gray-50 opacity-60')}>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.duration} minutos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="h-7 w-7"><Edit2 className="h-3.5 w-3.5" /></Button>
                  <button onClick={() => setTypes(prev => prev.map(x => x.id === t.id ? { ...x, active: !x.active } : x))}>
                    {t.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-gray-300" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationsPanel() {
  const [settings, setSettings] = useState([
    { key: 'confirm_24h', label: 'Confirmação 24h antes', desc: 'Envia lembrete 24h antes da consulta', whatsapp: true, sms: false, email: true },
    { key: 'confirm_1h', label: 'Confirmação 1h antes', desc: 'Envia lembrete 1h antes da consulta', whatsapp: true, sms: false, email: false },
    { key: 'noshow_alert', label: 'Alerta de No-Show', desc: 'Notifica quando paciente não comparece', whatsapp: false, sms: false, email: true },
    { key: 'birthday', label: 'Parabéns de aniversário', desc: 'Mensagem automática no aniversário', whatsapp: true, sms: false, email: false },
    { key: 'return_30d', label: 'Lembrete de retorno (30d)', desc: 'Avisa paciente que retorno está próximo', whatsapp: true, sms: false, email: true },
    { key: 'exam_ready', label: 'Resultado de exame disponível', desc: 'Notifica quando resultado é inserido no sistema', whatsapp: true, sms: false, email: true },
    { key: 'payment_due', label: 'Cobrança vencendo', desc: 'Alerta 3 dias antes do vencimento', whatsapp: false, sms: false, email: true },
    { key: 'inactivity', label: 'Paciente inativo (90d)', desc: 'Alerta quando paciente fica 90 dias sem consulta', whatsapp: true, sms: false, email: false },
  ]);

  const toggle = (key: string, channel: 'whatsapp' | 'sms' | 'email') =>
    setSettings(prev => prev.map(s => s.key === key ? { ...s, [channel]: !s[channel] } : s));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notificações</h2>
        <p className="text-sm text-muted-foreground">Configure quais eventos geram notificações e por qual canal</p>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] bg-muted/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground gap-4">
          <span>Evento</span>
          <span className="w-20 text-center">WhatsApp</span>
          <span className="w-12 text-center">SMS</span>
          <span className="w-12 text-center">E-mail</span>
        </div>
        {settings.map((s, i) => (
          <div key={s.key} className={cn('grid grid-cols-[1fr_auto_auto_auto] items-center px-4 py-3.5 gap-4', i % 2 === 0 ? 'bg-white' : 'bg-muted/20')}>
            <div>
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            {(['whatsapp', 'sms', 'email'] as const).map(ch => (
              <div key={ch} className="flex justify-center" style={{ width: ch === 'whatsapp' ? 80 : 48 }}>
                <button onClick={() => toggle(s.key, ch)}>
                  {(s as any)[ch]
                    ? <ToggleRight className="h-6 w-6 text-primary" />
                    : <ToggleLeft className="h-6 w-6 text-gray-300" />}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" onClick={() => toast.info('Configurações de notificação em desenvolvimento')}>
          <Save className="h-3.5 w-3.5 mr-1.5" />Salvar
        </Button>
      </div>
    </div>
  );
}

function ProfilePanel() {
  const user = useAuthStore(s => s.user);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? 'Administrador',
    email: user?.email ?? 'admin@clinica.com',
    phone: '(21) 99999-0000',
    crm: 'CRM-RJ 123456',
    specialty: 'Medicina do Esporte',
    bio: 'Médico especialista com 15 anos de experiência em medicina esportiva e nutrologia.',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Meu Perfil</h2>
          <p className="text-sm text-muted-foreground">Suas informações pessoais e profissionais</p>
        </div>
        <Button variant={editing ? 'primary' : 'secondary'} size="sm" onClick={() => { if (editing) toast.info('Perfil salvo localmente'); setEditing(!editing); }}>
          {editing ? <><Save className="h-3.5 w-3.5 mr-1.5" />Salvar</> : <><Edit2 className="h-3.5 w-3.5 mr-1.5" />Editar</>}
        </Button>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-5 p-5 rounded-xl border border-dashed border-border bg-muted/20">
        <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
          {form.name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold">{form.name}</p>
          <p className="text-xs text-muted-foreground">{user?.role ?? 'MASTER'}</p>
          {editing && <Button variant="secondary" size="sm" className="mt-2"><Upload className="h-3 w-3 mr-1.5" />Trocar foto</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Nome completo', field: 'name' },
          { label: 'E-mail', field: 'email' },
          { label: 'Telefone', field: 'phone' },
          { label: 'CRM / COREN', field: 'crm' },
          { label: 'Especialidade', field: 'specialty' },
        ].map(({ label, field }) => (
          <div key={field}>
            <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
            {editing
              ? <Input value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
              : <p className="text-sm py-2 px-3 rounded-lg bg-muted/50">{(form as any)[field]}</p>
            }
          </div>
        ))}
        <div className="col-span-2">
          <label className="text-xs font-medium text-muted-foreground block mb-1">Bio profissional</label>
          {editing
            ? <textarea rows={3} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            : <p className="text-sm py-2 px-3 rounded-lg bg-muted/50">{form.bio}</p>
          }
        </div>
      </div>
    </div>
  );
}

function DocTemplatesPanel() {
  const templates = [
    { id: '1', name: 'Receituário Simples', type: 'RECEITA', updated: '2026-04-10', active: true },
    { id: '2', name: 'Receituário Especial (Azul)', type: 'RECEITA', updated: '2026-04-10', active: true },
    { id: '3', name: 'Receituário Controlado (Amarelo)', type: 'RECEITA', updated: '2026-03-15', active: true },
    { id: '4', name: 'Declaração de Comparecimento', type: 'DECLARACAO', updated: '2026-03-01', active: true },
    { id: '5', name: 'Declaração de Atestado', type: 'DECLARACAO', updated: '2026-03-01', active: true },
    { id: '6', name: 'Termo de Consentimento — Implante', type: 'TERMO', updated: '2026-02-20', active: true },
    { id: '7', name: 'Termo de Consentimento — Procedimento', type: 'TERMO', updated: '2026-02-20', active: true },
    { id: '8', name: 'Laudo Médico', type: 'LAUDO', updated: '2026-01-15', active: false },
    { id: '9', name: 'Relatório de Evolução', type: 'RELATORIO', updated: '2026-01-15', active: true },
  ];

  const TYPE_LABELS: Record<string, { label: string; color: string }> = {
    RECEITA: { label: 'Receituário', color: 'bg-blue-100 text-blue-700' },
    DECLARACAO: { label: 'Declaração', color: 'bg-green-100 text-green-700' },
    TERMO: { label: 'Termo', color: 'bg-purple-100 text-purple-700' },
    LAUDO: { label: 'Laudo', color: 'bg-orange-100 text-orange-700' },
    RELATORIO: { label: 'Relatório', color: 'bg-cyan-100 text-cyan-700' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Modelos de Documentos</h2>
          <p className="text-sm text-muted-foreground">{templates.filter(t => t.active).length} modelos ativos</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Modelo</Button>
      </div>
      <div className="space-y-2">
        {templates.map(t => {
          const tc = TYPE_LABELS[t.type] ?? { label: t.type, color: 'bg-gray-100 text-gray-600' };
          return (
            <div key={t.id} className={cn('flex items-center justify-between px-4 py-3.5 rounded-xl border bg-white', t.active ? 'border-border hover:border-primary/30' : 'border-gray-200 bg-gray-50 opacity-60')}>
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">Atualizado em {new Date(t.updated).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', tc.color)}>{tc.label}</span>
                <Button variant="ghost" className="h-7 w-7" onClick={() => toast.info(`Editando: ${t.name}`)}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" className="h-7 w-7" onClick={() => toast.info(`Visualizando: ${t.name}`)}><Eye className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MedicationsPanel() {
  const [meds, setMeds] = useState([
    { id: '1', name: 'Tirzepatida (Mounjaro)', category: 'GLP-1/GIP', form: 'Caneta injetável', dose: '2.5mg, 5mg, 7.5mg, 10mg, 12.5mg, 15mg', active: true },
    { id: '2', name: 'Semaglutida (Ozempic)', category: 'GLP-1', form: 'Caneta injetável', dose: '0.25mg, 0.5mg, 1mg', active: true },
    { id: '3', name: 'Testosterona Cipionato', category: 'Hormonal', form: 'Ampola 200mg/mL', dose: '200mg/mL', active: true },
    { id: '4', name: 'Testosterona Undecanoato (Nebido)', category: 'Hormonal', form: 'Ampola 1000mg/4mL', dose: '1000mg/4mL', active: true },
    { id: '5', name: 'Gestrinona', category: 'Hormonal', form: 'Implante', dose: '5mg, 7.5mg, 10mg', active: true },
    { id: '6', name: 'HCG', category: 'Hormonal', form: 'Pó para injeção', dose: '5.000UI', active: true },
    { id: '7', name: 'NADH', category: 'Longevidade', form: 'Implante', dose: '250mg, 500mg', active: true },
    { id: '8', name: 'Ácido fólico', category: 'Suplemento', form: 'Comprimido', dose: '5mg', active: true },
    { id: '9', name: 'Vitamina D3', category: 'Suplemento', form: 'Cápsula', dose: '50.000UI', active: true },
    { id: '10', name: 'Vitamina B12', category: 'Suplemento', form: 'Ampola', dose: '5.000mcg', active: true },
    { id: '11', name: 'Oxandrolona', category: 'Anabolizante', form: 'Comprimido', dose: '2.5mg, 10mg', active: false },
    { id: '12', name: 'Enantato de Testosterona', category: 'Hormonal', form: 'Ampola 250mg/mL', dose: '250mg/mL', active: true },
  ]);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const cats = [...new Set(meds.map(m => m.category))];
  const filtered = meds.filter(m =>
    (!search || m.name.toLowerCase().includes(search.toLowerCase())) &&
    (!catFilter || m.category === catFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Medicamentos & Protocolos</h2>
          <p className="text-sm text-muted-foreground">{meds.filter(m => m.active).length} medicamentos ativos</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Medicamento</Button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar medicamento..." className="w-full rounded-lg border border-border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">Todas categorias</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{['Medicamento', 'Categoria', 'Forma', 'Dose', 'Status', ''].map(h => <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <tr key={m.id} className={i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.form}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{m.dose}</td>
                <td className="px-4 py-3">
                  <Badge variant={m.active ? 'success' : 'default'}>{m.active ? 'Ativo' : 'Inativo'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" className="h-7 w-7"><Edit2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnamnesisPanel() {
  const [forms, setForms] = useState([
    { id: '1', name: 'Anamnese Inicial — Obesidade', fields: 24, responses: 3418, active: true, updated: '2026-03-01' },
    { id: '2', name: 'Anamnese Hormonal Masculina', fields: 18, responses: 892, active: true, updated: '2026-02-15' },
    { id: '3', name: 'Anamnese Hormonal Feminina', fields: 22, responses: 1204, active: true, updated: '2026-02-15' },
    { id: '4', name: 'Questionário de Satisfação Pós-Consulta', fields: 8, responses: 2847, active: true, updated: '2026-01-20' },
    { id: '5', name: 'Avaliação Qualidade de Vida (SF-36)', fields: 36, responses: 612, active: true, updated: '2026-01-10' },
    { id: '6', name: 'Questionário Alimentar (24h)', fields: 15, responses: 487, active: false, updated: '2025-12-01' },
    { id: '7', name: 'Anamnese Dermatológica', fields: 12, responses: 0, active: false, updated: '2025-11-15' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fichas de Anamnese</h2>
          <p className="text-sm text-muted-foreground">{forms.filter(f => f.active).length} fichas ativas · {forms.reduce((s, f) => s + f.responses, 0).toLocaleString('pt-BR')} respostas totais</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Nova Ficha</Button>
      </div>
      <div className="space-y-3">
        {forms.map(f => (
          <div key={f.id} className={cn('flex items-center justify-between p-4 rounded-xl border bg-white', f.active ? 'border-border' : 'border-gray-200 bg-gray-50 opacity-60')}>
            <div className="flex items-center gap-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold', f.active ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400')}>
                {f.fields}
              </div>
              <div>
                <p className="text-sm font-semibold">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.fields} campos · {f.responses.toLocaleString('pt-BR')} respostas · Atualizado {new Date(f.updated).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={f.active ? 'success' : 'default'}>{f.active ? 'Ativa' : 'Inativa'}</Badge>
              <Button variant="ghost" className="h-7 w-7" onClick={() => toast.info('Editando ficha...')}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" className="h-7 w-7" onClick={() => toast.info('Visualizando respostas...')}><Eye className="h-3.5 w-3.5" /></Button>
              <button onClick={() => setForms(prev => prev.map(x => x.id === f.id ? { ...x, active: !x.active } : x))}>
                {f.active ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-gray-300" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaSectorsPanel() {
  const [sectors, setSectors] = useState([
    { id: '1', name: 'Consultório 1', type: 'Consultório', capacity: 1, active: true, color: '#6366f1' },
    { id: '2', name: 'Consultório 2', type: 'Consultório', capacity: 1, active: true, color: '#0ea5e9' },
    { id: '3', name: 'Sala de Procedimentos', type: 'Procedimento', capacity: 2, active: true, color: '#FF6B00' },
    { id: '4', name: 'Sala de Infusão', type: 'Procedimento', capacity: 4, active: true, color: '#10b981' },
    { id: '5', name: 'Sala de Espera', type: 'Recepção', capacity: 10, active: true, color: '#f59e0b' },
    { id: '6', name: 'Sala de Teleconferência', type: 'Telemedicina', capacity: 1, active: false, color: '#8b5cf6' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Setores & Salas</h2>
          <p className="text-sm text-muted-foreground">{sectors.filter(s => s.active).length} ambientes ativos</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Nova Sala</Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {sectors.map(s => (
          <div key={s.id} className={cn('p-4 rounded-xl border bg-white', s.active ? 'border-border' : 'border-gray-200 bg-gray-50 opacity-60')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <p className="text-sm font-semibold">{s.name}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" className="h-6 w-6 p-0"><Edit2 className="h-3 w-3" /></Button>
                <button onClick={() => setSectors(prev => prev.map(x => x.id === s.id ? { ...x, active: !x.active } : x))}>
                  {s.active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-gray-300" />}
                </button>
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>Tipo: <span className="text-foreground font-medium">{s.type}</span></p>
              <p>Capacidade: <span className="text-foreground font-medium">{s.capacity} {s.capacity === 1 ? 'pessoa' : 'pessoas'}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgendaRulesPanel() {
  const [rules, setRules] = useState({
    interval: 15,
    max_per_day: 20,
    advance_days: 90,
    confirm_hours_before: 24,
    cancel_hours_before: 4,
    allow_overlap: false,
    send_reminders: true,
    allow_online_booking: false,
    waitlist_enabled: true,
    max_waitlist: 10,
  });
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Regras de Agenda</h2>
          <p className="text-sm text-muted-foreground">Configurações gerais de funcionamento da agenda</p>
        </div>
        <Button variant={editing ? 'primary' : 'secondary'} size="sm" onClick={() => { if (editing) toast.info('Regras salvas localmente'); setEditing(!editing); }}>
          {editing ? <><Save className="h-3.5 w-3.5 mr-1.5" />Salvar</> : <><Edit2 className="h-3.5 w-3.5 mr-1.5" />Editar</>}
        </Button>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Horários</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Intervalo mínimo entre consultas (min)', field: 'interval' },
              { label: 'Máximo de consultas por dia', field: 'max_per_day' },
              { label: 'Agendar com antecedência máxima (dias)', field: 'advance_days' },
              { label: 'Confirmar consulta (horas antes)', field: 'confirm_hours_before' },
              { label: 'Cancelamento (horas mínimas antes)', field: 'cancel_hours_before' },
              { label: 'Máximo na lista de espera', field: 'max_waitlist' },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                {editing
                  ? <Input type="number" value={(rules as any)[field]} onChange={e => setRules(r => ({ ...r, [field]: Number(e.target.value) }))} />
                  : <p className="text-sm py-2 px-3 rounded-lg bg-muted/50">{(rules as any)[field]}</p>
                }
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comportamento</p>
          {[
            { key: 'allow_overlap', label: 'Permitir sobreposição de horários', desc: 'Permite dois agendamentos no mesmo horário (dupla agenda)' },
            { key: 'send_reminders', label: 'Enviar lembretes automáticos', desc: 'Envia mensagem de confirmação conforme configurado em Notificações' },
            { key: 'allow_online_booking', label: 'Agendamento online (Portal)', desc: 'Pacientes podem agendar diretamente pelo portal' },
            { key: 'waitlist_enabled', label: 'Lista de espera', desc: 'Ativa lista de espera quando horário está indisponível' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button onClick={() => editing && setRules(r => ({ ...r, [key]: !(r as any)[key] }))}>
                {(rules as any)[key]
                  ? <ToggleRight className={cn('h-6 w-6', editing ? 'text-primary' : 'text-primary/50')} />
                  : <ToggleLeft className={cn('h-6 w-6', editing ? 'text-gray-300' : 'text-gray-200')} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExamSpreadsheetPanel() {
  const [groups, setGroups] = useState([
    { id: '1', name: 'Hemograma & Coagulação', exams: ['Hemograma completo', 'Plaquetas', 'VHS', 'TP/INR', 'TTPA'], active: true },
    { id: '2', name: 'Metabolismo Glicídico', exams: ['Glicemia de jejum', 'HbA1c', 'Insulina basal', 'HOMA-IR', 'Peptídeo C'], active: true },
    { id: '3', name: 'Perfil Lipídico', exams: ['Colesterol total', 'LDL', 'HDL', 'VLDL', 'Triglicerídeos'], active: true },
    { id: '4', name: 'Função Tireoidiana', exams: ['TSH', 'T4 livre', 'T3 livre', 'Anti-TPO', 'Tireoglobulina'], active: true },
    { id: '5', name: 'Hormônios Masculinos', exams: ['Testosterona total', 'Testosterona livre', 'DHT', 'LH', 'FSH', 'SHBG', 'Prolactina'], active: true },
    { id: '6', name: 'Hormônios Femininos', exams: ['Estradiol', 'Progesterona', 'LH', 'FSH', 'Prolactina', 'DHEA-S', 'Cortisol'], active: true },
    { id: '7', name: 'Função Hepática', exams: ['TGO', 'TGP', 'GGT', 'Fosfatase alcalina', 'Bilirrubinas', 'Albumina'], active: true },
    { id: '8', name: 'Vitaminas & Minerais', exams: ['Vitamina D 25(OH)', 'Vitamina B12', 'Ferritina', 'Ferro sérico', 'Zinco', 'Magnésio'], active: true },
  ]);
  const [expanded, setExpanded] = useState<string | null>('1');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Planilha de Exames</h2>
          <p className="text-sm text-muted-foreground">Grupos de exames para solicitação rápida no prontuário</p>
        </div>
        <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo Grupo</Button>
      </div>
      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.id} className="rounded-xl border border-border bg-white overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpanded(expanded === g.id ? null : g.id)}
            >
              <div className="flex items-center gap-2">
                <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', expanded === g.id && 'rotate-90')} />
                <p className="text-sm font-semibold">{g.name}</p>
                <span className="text-xs text-muted-foreground">({g.exams.length} exames)</span>
              </div>
              <Badge variant={g.active ? 'success' : 'default'}>{g.active ? 'Ativo' : 'Inativo'}</Badge>
            </button>
            {expanded === g.id && (
              <div className="px-4 pb-4 pt-0 border-t border-border/50">
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {g.exams.map(ex => (
                    <span key={ex} className="text-xs bg-muted px-2.5 py-1 rounded-full text-foreground">{ex}</span>
                  ))}
                  <button className="text-xs text-primary px-2 py-1 hover:underline">+ Adicionar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentGatewaysPanel() {
  const [stoneForm, setStoneForm] = useState({ client_id: '●●●●●●●●', client_secret: '●●●●●●●●●●●●', active: true });
  const [omieForm, setOmieForm] = useState({ app_key: '●●●●●●●●', app_secret: '●●●●●●●●●●●●', conta_id: '12345', active: false });
  const [showStone, setShowStone] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Stone / Pagar.Me</h2>
        <p className="text-sm text-muted-foreground">Integração com gateway de pagamento para cobranças via cartão</p>
      </div>
      {/* Stone */}
      <div className={cn('rounded-xl border p-5 space-y-4', stoneForm.active ? 'border-green-200 bg-green-50/30' : 'border-border bg-white')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center text-white text-xs font-black">S</div>
            <div>
              <p className="text-sm font-semibold">Stone Pagamentos</p>
              <p className="text-xs text-muted-foreground">Processamento de cartões em tempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={stoneForm.active ? 'success' : 'default'}>{stoneForm.active ? 'Conectado' : 'Desconectado'}</Badge>
            <button onClick={() => setStoneForm(f => ({ ...f, active: !f.active }))}>
              {stoneForm.active ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-gray-300" />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Client ID</label>
            <div className="relative">
              <input type={showStone ? 'text' : 'password'} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={stoneForm.client_id} onChange={e => setStoneForm(f => ({ ...f, client_id: e.target.value }))} />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowStone(!showStone)}>
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Client Secret</label>
            <input type="password" className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={stoneForm.client_secret} onChange={e => setStoneForm(f => ({ ...f, client_secret: e.target.value }))} />
          </div>
        </div>
        <Button size="sm" onClick={() => toast.info('Integração Stone em desenvolvimento')}><Save className="h-3.5 w-3.5 mr-1.5" />Salvar</Button>
      </div>
      {/* OMIE */}
      <div>
        <h2 className="text-lg font-semibold">OMIE / NF-e</h2>
        <p className="text-sm text-muted-foreground mb-4">Integração com sistema contábil e emissão de notas fiscais</p>
        <div className={cn('rounded-xl border p-5 space-y-4', omieForm.active ? 'border-blue-200 bg-blue-50/30' : 'border-border bg-white')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black">O</div>
              <div>
                <p className="text-sm font-semibold">OMIE ERP</p>
                <p className="text-xs text-muted-foreground">Sincronização financeira e emissão de NF-e</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={omieForm.active ? 'success' : 'default'}>{omieForm.active ? 'Conectado' : 'Desconectado'}</Badge>
              <button onClick={() => setOmieForm(f => ({ ...f, active: !f.active }))}>
                {omieForm.active ? <ToggleRight className="h-6 w-6 text-primary" /> : <ToggleLeft className="h-6 w-6 text-gray-300" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[{ label: 'App Key', field: 'app_key' }, { label: 'App Secret', field: 'app_secret' }, { label: 'ID da Conta OMIE', field: 'conta_id' }].map(({ label, field }) => (
              <div key={field}>
                <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
                <input type={field !== 'conta_id' ? 'password' : 'text'} className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={(omieForm as any)[field]} onChange={e => setOmieForm(f => ({ ...f, [field]: e.target.value }))} />
              </div>
            ))}
          </div>
          <Button size="sm" onClick={() => toast.info('Integração OMIE em desenvolvimento')}><Save className="h-3.5 w-3.5 mr-1.5" />Salvar</Button>
        </div>
      </div>
    </div>
  );
}

function ComingSoonPanel({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Brain className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold">{label}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">Este módulo estará disponível na próxima versão do AYRON. Em desenvolvimento.</p>
      <Badge variant="warning" className="mt-3">Em breve</Badge>
    </div>
  );
}

// ── Panel registry ─────────────────────────────────────────────────────────────

function RenderPanel({ section }: { section: string }) {
  switch (section) {
    case 'clinic': return <ClinicPanel />;
    case 'branches': return <BranchesPanel />;
    case 'users': return <UsersPanel />;
    case 'procedures': return <ProceduresPanel />;
    case 'payment_methods': return <PaymentMethodsPanel />;
    case 'agenda_colors': return <AgendaColorsPanel />;
    case 'ai_credits': return <AICreditsPanel />;
    case 'sms_credits': return <SMSCreditsPanel />;
    case 'lgpd': return <LGPDPanel />;
    case 'audit': return <AuditPanel />;
    case 'security': return <SecurityPanel />;
    case 'integrations': return <IntegrationsPanel />;
    case 'ayron_config': return <AyronConfigPanel />;
    case 'subscription': return <SubscriptionPanel />;
    case 'professionals': return <ProfessionalsPanel />;
    case 'agenda_types': return <AgendaTypesPanel />;
    case 'notifications': return <NotificationsPanel />;
    case 'profile': return <ProfilePanel />;
    case 'doc_templates': return <DocTemplatesPanel />;
    case 'medications': return <MedicationsPanel />;
    case 'anamnesis': return <AnamnesisPanel />;
    case 'agenda_sectors': return <AgendaSectorsPanel />;
    case 'agenda_rules': return <AgendaRulesPanel />;
    case 'exam_spreadsheet': return <ExamSpreadsheetPanel />;
    case 'payment_gateways': return <PaymentGatewaysPanel />;
    case 'omie': return <PaymentGatewaysPanel />;
    default: {
      const label = SECTIONS.flatMap(g => g.items).find(i => i.key === section)?.label ?? section;
      return <ComingSoonPanel label={label} />;
    }
  }
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const [active, setActive] = useState('clinic');

  return (
    <div>
      <Topbar title="Configurações" />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">

        {/* Sidebar */}
        <div className="w-56 border-r border-border bg-white overflow-y-auto flex-shrink-0">
          {/* User card */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                {user?.name?.[0] ?? 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{user?.name ?? 'Admin'}</p>
                <p className="text-[10px] text-muted-foreground">{user?.role ?? 'MASTER'}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-2 space-y-4">
            {SECTIONS.map(({ group, items }) => (
              <div key={group}>
                <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group}</p>
                {items.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActive(key)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs font-medium transition-colors',
                      active === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
          <div className="max-w-4xl">
            <RenderPanel section={active} />
          </div>
        </div>
      </div>
    </div>
  );
}
