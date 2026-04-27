'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Search, Phone, Mail, Smartphone,
  Users, Plus, CheckCheck, Check, Clock, Zap,
  Bell, AlertTriangle, Filter, Bot, X, Tag,
  Info, User, FileText, Calendar, DollarSign, ChevronRight,
  Edit3, Save, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_CONTACTS = [
  { id: 'C1', name: 'Ana Lima', channel: 'whatsapp', phone: '(21) 99999-0001', lastMessage: 'Boa tarde! Posso remarcar minha consulta de quinta?', lastTime: '14:32', unread: 2, online: true, status: 'PACIENTE', tags: ['VIP'] },
  { id: 'C2', name: 'Carlos Souza', channel: 'whatsapp', phone: '(21) 99999-0002', lastMessage: 'Obrigado pelo atendimento!', lastTime: '12:15', unread: 0, online: false, status: 'PACIENTE', tags: [] },
  { id: 'C3', name: 'Beatriz Fernandes', channel: 'email', phone: 'beatriz@email.com', lastMessage: 'Segue em anexo meus exames mais recentes', lastTime: 'Ontem', unread: 1, online: false, status: 'PACIENTE', tags: [] },
  { id: 'C4', name: 'Pedro Gomes', channel: 'whatsapp', phone: '(21) 99999-0004', lastMessage: 'Quando posso fazer a próxima aplicação?', lastTime: '09:48', unread: 0, online: false, status: 'PACIENTE', tags: ['INATIVO'] },
  { id: 'C5', name: 'Equipe Clínica', channel: 'interno', phone: '', lastMessage: 'Lorrana: Paciente #4821 chegou para sessão', lastTime: '14:45', unread: 3, online: true, status: 'EQUIPE', tags: [] },
  { id: 'C6', name: 'Delboni Laboratórios', channel: 'email', phone: 'delboni@labs.com', lastMessage: 'Resultados de exames do dia 01/04 disponíveis', lastTime: 'Seg', unread: 0, online: false, status: 'PARCEIRO', tags: [] },
  { id: 'C7', name: 'Marina Costa', channel: 'whatsapp', phone: '(21) 99999-0007', lastMessage: 'Tudo bem! Vou estar lá na hora certa 😊', lastTime: '11:20', unread: 0, online: true, status: 'PACIENTE', tags: [] },
];

const MOCK_MESSAGES: Record<string, Array<{ id: string; from: 'me' | 'them'; text: string; time: string; read: boolean }>> = {
  C1: [
    { id: 'm1', from: 'them', text: 'Boa tarde! Posso remarcar minha consulta de quinta?', time: '14:30', read: true },
    { id: 'm2', from: 'them', text: 'Preciso sair mais cedo do trabalho nesse dia', time: '14:31', read: false },
  ],
  C2: [
    { id: 'm1', from: 'me', text: 'Dr. Murilo estará esperando na quinta às 15h, Carlos! Confirma?', time: '10:20', read: true },
    { id: 'm2', from: 'them', text: 'Confirmado! Estarei lá.', time: '10:35', read: true },
    { id: 'm3', from: 'them', text: 'Obrigado pelo atendimento!', time: '12:15', read: true },
  ],
  C3: [
    { id: 'm1', from: 'them', text: 'Olá, tudo bem? Fiz os exames que a Amanda pediu.', time: 'Ontem 16:00', read: true },
    { id: 'm2', from: 'them', text: 'Segue em anexo meus exames mais recentes', time: 'Ontem 16:01', read: false },
  ],
  C4: [
    { id: 'm1', from: 'them', text: 'Quando posso fazer a próxima aplicação?', time: '09:48', read: true },
  ],
  C5: [
    { id: 'm1', from: 'them', text: 'Andreia: Bom dia equipe! Agenda hoje com 12 consultas marcadas.', time: '08:00', read: true },
    { id: 'm2', from: 'them', text: 'Dr. Murilo: Alguém pode cobrir o horário das 16h? Tenho cirurgia emergencial', time: '09:30', read: true },
    { id: 'm3', from: 'me', text: 'Dr. André pode cobrir! Já confirmei com ele.', time: '09:32', read: true },
    { id: 'm4', from: 'them', text: 'Lorrana: Paciente #4821 chegou para sessão', time: '14:45', read: false },
  ],
  C6: [
    { id: 'm1', from: 'them', text: 'Resultados de exames do dia 01/04 disponíveis para download no portal.', time: 'Seg', read: true },
  ],
  C7: [
    { id: 'm1', from: 'me', text: 'Oi Marina! Lembrete: sua sessão HCG é amanhã às 10h 🗓️', time: '10:00', read: true },
    { id: 'm2', from: 'them', text: 'Tudo bem! Vou estar lá na hora certa 😊', time: '11:20', read: true },
  ],
};

const QUICK_TEMPLATES = [
  { label: 'Confirmação de consulta', text: 'Olá! Passando para confirmar sua consulta amanhã. Tudo certo para você?' },
  { label: 'Lembrete de sessão', text: 'Olá! Lembramos que sua sessão está agendada para {data} às {hora}. Qualquer dúvida, estamos aqui 😊' },
  { label: 'Reagendamento', text: 'Olá! Gostaríamos de verificar se você tem disponibilidade para reagendar sua consulta. Quando seria melhor para você?' },
  { label: 'Resultado de exame', text: 'Olá! Seus resultados de exame já estão disponíveis. Gostaria de agendar uma consulta para discuti-los?' },
  { label: 'Pós-aplicação', text: 'Oi! Como você está se sentindo após a aplicação de ontem? Algum desconforto ou dúvida?' },
  { label: 'Boas-vindas novo paciente', text: 'Olá! Seja bem-vindo(a) à nossa clínica! Estamos à disposição para qualquer dúvida. Seu próximo agendamento está confirmado.' },
];

const CHANNEL_ICON: Record<string, any> = {
  whatsapp: Smartphone, email: Mail, interno: Users,
};
const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: 'text-green-600', email: 'text-blue-600', interno: 'text-primary',
};
const STATUS_COLORS: Record<string, string> = {
  PACIENTE: 'bg-blue-100 text-blue-700',
  EQUIPE: 'bg-primary/10 text-primary',
  PARCEIRO: 'bg-purple-100 text-purple-700',
};

type FilterType = 'Todos' | 'WhatsApp' | 'E-mail' | 'Equipe';

const DEPARTMENTS = ['Recepção', 'Enfermagem', 'Médico', 'Financeiro', 'Marketing'];
const RESPONSIBLES = ['Dr. Murilo Andrade', 'Amanda Gomes', 'Andreia Lima', 'Lorrana Figueiredo', 'Dr. André Costa'];

// ── Nova Conversa Modal ───────────────────────────────────────────────────────

function NovaConversaModal({ open, onClose, onSave }: {
  open: boolean; onClose: () => void;
  onSave: (contact: any, firstMsg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof TODOS_CONTATOS[0] | null>(null);
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'interno'>('whatsapp');
  const [firstMsg, setFirstMsg] = useState('');

  const filtered = TODOS_CONTATOS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!selected) { toast.error('Selecione um contato'); return; }
    onSave({ ...selected, channel }, firstMsg);
    setSelected(null); setSearch(''); setFirstMsg(''); setChannel('whatsapp');
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />Nova Conversa
          </h2>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Channel */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Canal</label>
            <div className="flex gap-2">
              {([
                { key: 'whatsapp', label: '📱 WhatsApp' },
                { key: 'email', label: '📧 E-mail' },
                { key: 'interno', label: '💬 Interno' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setChannel(key)}
                  className={cn('flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                    channel === key ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                  {label}
                </button>
              ))}
            </div>
            {channel === 'whatsapp' && (
              <p className="text-[10px] text-amber-600 mt-1">Requer Evolution API / Digisac configurado</p>
            )}
          </div>

          {/* Contact search */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              {selected ? 'Contato selecionado' : 'Buscar paciente ou equipe'}
            </label>
            {selected ? (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {selected.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selected.name}</p>
                    <p className="text-xs text-muted-foreground">{selected.role}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    className="w-full rounded-lg border border-border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Nome do contato..."
                    value={search} onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {search && (
                  <div className="space-y-1 max-h-40 overflow-y-auto border border-border rounded-lg">
                    {filtered.map(c => (
                      <button key={c.id} onClick={() => setSelected(c)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.role}</p>
                        </div>
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Nenhum resultado</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* First message */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Primeira mensagem <span className="text-muted-foreground/60">(opcional)</span>
            </label>
            <textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Olá! Como posso ajudar?"
              value={firstMsg} onChange={e => setFirstMsg(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={!selected}>
            Iniciar Conversa
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Contact CRM Panel ─────────────────────────────────────────────────────────

interface ContactCRM {
  name: string; phone: string; email: string;
  status: string; department: string; responsible: string;
  tags: string[]; notes: string;
}

function ContactPanel({ contact, onClose, onUpdate }: {
  contact: typeof MOCK_CONTACTS[0];
  onClose: () => void;
  onUpdate: (id: string, changes: Partial<typeof MOCK_CONTACTS[0]>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ContactCRM>({
    name: contact.name,
    phone: contact.phone,
    email: '',
    status: contact.status,
    department: 'Recepção',
    responsible: 'Andreia Lima',
    tags: [...contact.tags],
    notes: '',
  });
  const [newTag, setNewTag] = useState('');

  const f = (k: keyof ContactCRM, v: any) => setForm(p => ({ ...p, [k]: v }));

  const addTag = () => {
    if (!newTag.trim()) return;
    f('tags', [...form.tags, newTag.trim().toUpperCase()]);
    setNewTag('');
  };

  const removeTag = (t: string) => f('tags', form.tags.filter(x => x !== t));

  const save = () => {
    onUpdate(contact.id, { name: form.name, phone: form.phone, tags: form.tags, status: form.status });
    toast.success('Contato atualizado');
    setEditing(false);
  };

  return (
    <div className="w-72 border-l border-border bg-white flex flex-col flex-shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CRM — Contato</p>
        <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
      </div>

      {/* Avatar + quick info */}
      <div className="px-4 py-4 border-b flex flex-col items-center text-center gap-2">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
          {form.name[0]}
        </div>
        {editing ? (
          <input className="w-full rounded-lg border px-2 py-1 text-sm text-center outline-none focus:ring-2 focus:ring-primary/30"
            value={form.name} onChange={e => f('name', e.target.value)} />
        ) : (
          <p className="text-sm font-semibold">{form.name}</p>
        )}
        <select
          className="text-xs rounded-full border px-2 py-0.5 outline-none"
          value={form.status}
          onChange={e => f('status', e.target.value)}
          disabled={!editing}
        >
          {['PACIENTE', 'LEAD', 'EQUIPE', 'PARCEIRO'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Fields */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {/* Contact info */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contato</p>
          {[
            { label: 'Telefone', key: 'phone' as const, icon: Phone },
            { label: 'E-mail', key: 'email' as const, icon: Mail },
          ].map(({ label, key, icon: Icon }) => (
            <div key={key} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              {editing ? (
                <input className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                  value={form[key]} onChange={e => f(key, e.target.value)}
                  placeholder={label} />
              ) : (
                <p className="text-xs text-muted-foreground">{form[key] || `—`}</p>
              )}
            </div>
          ))}
        </div>

        {/* Assignment */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Atribuição</p>
          <div>
            <label className="text-[10px] text-muted-foreground">Departamento</label>
            <select className="w-full mt-0.5 rounded border px-2 py-1 text-xs outline-none"
              value={form.department} onChange={e => f('department', e.target.value)} disabled={!editing}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground">Responsável</label>
            <select className="w-full mt-0.5 rounded border px-2 py-1 text-xs outline-none"
              value={form.responsible} onChange={e => f('responsible', e.target.value)} disabled={!editing}>
              {RESPONSIBLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {form.tags.map(t => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium px-2 py-0.5">
                {t}
                {editing && <button onClick={() => removeTag(t)}><X className="h-2.5 w-2.5" /></button>}
              </span>
            ))}
          </div>
          {editing && (
            <div className="flex gap-1">
              <input className="flex-1 rounded border px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Nova tag..." value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()} />
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={addTag}>+</Button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Observações</p>
          {editing ? (
            <textarea rows={3} className="w-full rounded border px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/30 resize-none"
              placeholder="Anotações sobre o paciente..."
              value={form.notes} onChange={e => f('notes', e.target.value)} />
          ) : (
            <p className="text-xs text-muted-foreground">{form.notes || 'Sem observações'}</p>
          )}
        </div>

        {/* Quick links */}
        {form.status === 'PACIENTE' && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Acesso rápido</p>
            {[
              { label: 'Prontuário', icon: FileText, href: '/clinical' },
              { label: 'Agenda', icon: Calendar, href: '/agenda' },
              { label: 'Financeiro', icon: DollarSign, href: '/financial' },
            ].map(({ label, icon: Icon, href }) => (
              <a key={label} href={href}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs hover:border-primary/40 hover:bg-primary/5 transition-colors group">
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />{label}
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t flex gap-2">
        {editing ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button size="sm" className="flex-1" onClick={save}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" className="w-full" onClick={() => setEditing(true)}>
            <Edit3 className="h-3.5 w-3.5 mr-1.5" />Editar Contato
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Novo Grupo Modal ──────────────────────────────────────────────────────────

const TODOS_CONTATOS = [
  { id: 'C1', name: 'Ana Lima', role: 'Paciente' },
  { id: 'C2', name: 'Carlos Souza', role: 'Paciente' },
  { id: 'C3', name: 'Beatriz Fernandes', role: 'Paciente' },
  { id: 'C4', name: 'Pedro Gomes', role: 'Paciente' },
  { id: 'C7', name: 'Marina Costa', role: 'Paciente' },
  { id: 'E1', name: 'Dr. Murilo Andrade', role: 'Médico' },
  { id: 'E2', name: 'Amanda Gomes', role: 'Enfermagem' },
  { id: 'E3', name: 'Andreia Lima', role: 'Recepção' },
  { id: 'E4', name: 'Lorrana Figueiredo', role: 'Enfermagem' },
  { id: 'E5', name: 'Dr. André Costa', role: 'Médico' },
];

function NovoGrupoModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (g: any) => void }) {
  const [nome, setNome] = useState('');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [tipo, setTipo] = useState<'EQUIPE' | 'PACIENTES' | 'GERAL'>('EQUIPE');

  const filtrados = TODOS_CONTATOS.filter(c =>
    c.name.toLowerCase().includes(busca.toLowerCase())
  );

  function toggle(id: string) {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleSave() {
    if (!nome.trim()) { toast.error('Informe o nome do grupo'); return; }
    if (selecionados.length < 2) { toast.error('Selecione ao menos 2 participantes'); return; }
    onSave({
      id: `G${Date.now()}`,
      name: nome,
      channel: 'interno',
      phone: '',
      lastMessage: 'Grupo criado',
      lastTime: 'agora',
      unread: 0,
      online: true,
      status: 'GRUPO',
      tags: [tipo],
      tipo,
      members: selecionados,
    });
    toast.success(`Grupo "${nome}" criado com ${selecionados.length} participantes`);
    onClose();
    setNome(''); setBusca(''); setSelecionados([]); setTipo('EQUIPE');
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Novo Grupo</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Nome e tipo */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Nome do grupo</label>
            <input
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Ex: Equipe de Enfermagem, Pacientes Mounjaro..."
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Tipo</label>
            <div className="flex gap-2">
              {([
                { key: 'EQUIPE', label: '👥 Equipe' },
                { key: 'PACIENTES', label: '🏥 Pacientes' },
                { key: 'GERAL', label: '💬 Geral' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTipo(key)}
                  className={cn('flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                    tipo === key ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Selecionados chips */}
          {selecionados.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selecionados.map(id => {
                const c = TODOS_CONTATOS.find(x => x.id === id);
                return c ? (
                  <span key={id} className="flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
                    {c.name.split(' ')[0]}
                    <button onClick={() => toggle(id)}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ) : null;
              })}
            </div>
          )}

          {/* Busca e lista */}
          <div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Buscar participantes..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filtrados.map(c => {
                const sel = selecionados.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={cn('w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      sel ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted border border-transparent')}
                  >
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0',
                      sel ? 'bg-primary text-white' : 'bg-muted text-muted-foreground')}>
                      {sel ? '✓' : c.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.role}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t">
          <Button size="sm" onClick={handleSave} className="flex-1">
            Criar Grupo ({selecionados.length} participantes)
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [selectedId, setSelectedId] = useState<string>('C1');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<FilterType>('Todos');
  const [localMessages, setLocalMessages] = useState(MOCK_MESSAGES);
  const [showTemplates, setShowTemplates] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [contacts, setContacts] = useState(MOCK_CONTACTS);
  const [showNovoGrupo, setShowNovoGrupo] = useState(false);
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = contacts.find(c => c.id === selectedId);
  const msgs = localMessages[selectedId] ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedId, msgs.length]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [draft]);

  const send = () => {
    if (!draft.trim() || !selectedId) return;
    const newMsg = {
      id: `m${Date.now()}`,
      from: 'me' as const,
      text: draft,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      read: true,
    };
    setLocalMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), newMsg] }));
    setDraft('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const applyTemplate = (text: string) => {
    setDraft(text);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const filteredContacts = contacts.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (channelFilter === 'WhatsApp' && c.channel !== 'whatsapp') return false;
    if (channelFilter === 'E-mail' && c.channel !== 'email') return false;
    if (channelFilter === 'Equipe' && c.status !== 'EQUIPE') return false;
    return true;
  });

  const totalUnread = contacts.reduce((s, c) => s + c.unread, 0);

  return (
    <div>
      <Topbar title="Mensagens" />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">

        {/* Contact list */}
        <div className="w-72 border-r border-border bg-white flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-8 h-8 text-xs" placeholder="Buscar conversa..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button
                onClick={() => setShowNovoGrupo(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                title="Criar Grupo"
              >
                <Plus className="h-3.5 w-3.5" />Grupo
              </button>
            </div>
          </div>

          {/* Filter pills — active state */}
          <div className="flex gap-1 px-3 py-2 border-b border-border overflow-x-auto">
            {(['Todos', 'WhatsApp', 'E-mail', 'Equipe'] as FilterType[]).map((label) => {
              const icons: Record<FilterType, any> = { Todos: MessageSquare, WhatsApp: Smartphone, 'E-mail': Mail, Equipe: Users };
              const Icon = icons[label];
              const active = channelFilter === label;
              return (
                <button
                  key={label}
                  onClick={() => setChannelFilter(label)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap',
                    active ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                  )}
                >
                  <Icon className="h-3 w-3" />{label}
                </button>
              );
            })}
          </div>

          {totalUnread > 0 && (
            <div className="px-3 py-1.5 bg-primary/5 border-b border-border">
              <p className="text-[10px] font-semibold text-primary">{totalUnread} mensagens não lidas</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa encontrada</p>
            ) : filteredContacts.map(c => {
              const Icon = CHANNEL_ICON[c.channel] ?? MessageSquare;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 border-b border-border/50 text-left hover:bg-muted/50 transition-colors',
                    selectedId === c.id ? 'bg-primary/5' : ''
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                      {c.name[0]}
                    </div>
                    {c.online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold truncate">{c.name}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">{c.lastTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon className={cn('h-3 w-3 flex-shrink-0', CHANNEL_COLOR[c.channel])} />
                      <p className="text-[11px] text-muted-foreground truncate">{c.lastMessage}</p>
                    </div>
                    {c.tags.length > 0 && (
                      <div className="flex gap-1 mt-0.5">
                        {c.tags.map(tag => (
                          <span key={tag} className="text-[9px] px-1 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {c.unread > 0 && (
                    <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                      {c.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-border">
            <Button size="sm" className="w-full text-xs" onClick={() => setShowNovaConversa(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Nova Conversa
          </Button>
          </div>
        </div>

        {/* Chat area + CRM panel */}
        {selected ? (
          <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-white">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{selected.name[0]}</div>
                  {selected.online && <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border-2 border-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{selected.name}</p>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', STATUS_COLORS[selected.status] ?? 'bg-muted text-muted-foreground')}>
                      {selected.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selected.online ? 'Online agora' : 'Offline'} · {selected.phone || selected.channel}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {selected.channel === 'whatsapp' && (
                  <Button variant="ghost" className="h-8 w-8" onClick={() => toast.info(`Ligando para ${selected.phone}`)}>
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant={notificationsOn ? 'secondary' : 'ghost'}
                  className="h-8 w-8"
                  title={notificationsOn ? 'Silenciar notificações' : 'Ativar notificações'}
                  onClick={() => {
                    setNotificationsOn(v => !v);
                    toast.success(notificationsOn ? 'Notificações silenciadas' : 'Notificações ativadas');
                  }}
                >
                  <Bell className={cn('h-4 w-4', notificationsOn ? 'text-primary' : 'text-muted-foreground')} />
                </Button>
                <Button
                  variant={showContactPanel ? 'secondary' : 'ghost'}
                  className="h-8 w-8"
                  title="Painel CRM do contato"
                  onClick={() => setShowContactPanel(v => !v)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* AYRON auto-reply suggestion */}
            {selected.channel === 'whatsapp' && selected.unread > 0 && (
              <div className="px-4 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <p className="text-xs text-primary flex-1">
                  AYRON sugere: <span className="font-medium">&quot;Olá {selected.name.split(' ')[0]}! Claro, vou verificar os horários disponíveis e te respondo em instantes.&quot;</span>
                </p>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-primary px-2" onClick={() =>
                  setDraft(`Olá ${selected.name.split(' ')[0]}! Claro, vou verificar os horários disponíveis e te respondo em instantes.`)
                }>
                  Usar
                </Button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-muted/20">
              {msgs.filter(m => m.text).map(m => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}
                >
                  <div className="max-w-xs lg:max-w-sm xl:max-w-md">
                    <div className={cn(
                      'rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap',
                      m.from === 'me'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-white border border-border rounded-tl-sm'
                    )}>
                      {m.text}
                    </div>
                    <div className={cn('flex items-center gap-1 mt-0.5', m.from === 'me' ? 'justify-end' : 'justify-start')}>
                      <span className="text-[10px] text-muted-foreground">{m.time}</span>
                      {m.from === 'me' && (
                        m.read
                          ? <CheckCheck className="h-3 w-3 text-primary" />
                          : <Check className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick templates popover */}
            <AnimatePresence>
              {showTemplates && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="border-t border-border bg-white px-4 py-3 space-y-1"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground">Templates rápidos</p>
                    <button onClick={() => setShowTemplates(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                    {QUICK_TEMPLATES.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => applyTemplate(t.text)}
                        className="text-left px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                      >
                        <p className="text-xs font-medium text-foreground">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.text}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input — textarea expansível */}
            <div className="border-t border-border bg-white p-3">
              <div className="flex gap-2 items-end">
                <Button
                  variant={showTemplates ? 'primary' : 'ghost'}
                  className="h-9 w-9 flex-shrink-0 self-end"
                  title="Templates rápidos"
                  onClick={() => setShowTemplates(v => !v)}
                >
                  <Zap className={cn('h-4 w-4', showTemplates ? 'text-white' : 'text-muted-foreground')} />
                </Button>
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                    rows={1}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none overflow-hidden min-h-[36px] max-h-[160px]"
                    autoFocus
                    style={{ lineHeight: '1.5' }}
                  />
                </div>
                <Button
                  onClick={send}
                  disabled={!draft.trim()}
                  className="h-9 px-3 flex-shrink-0 self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Via {selected.channel === 'whatsapp' ? 'Evolution API / WhatsApp' : selected.channel === 'email' ? 'SMTP' : 'canal interno'}
                {selected.channel === 'whatsapp' && <span className="text-amber-600 ml-1">· Requer Evolution API configurada</span>}
              </p>
            </div>
          </div>

          {/* CRM panel */}
          {showContactPanel && (
            <ContactPanel
              contact={selected}
              onClose={() => setShowContactPanel(false)}
              onUpdate={(id, changes) => setContacts(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))}
            />
          )}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>
      <NovoGrupoModal
        open={showNovoGrupo}
        onClose={() => setShowNovoGrupo(false)}
        onSave={g => {
          setContacts(prev => [g, ...prev]);
          setShowNovoGrupo(false);
        }}
      />
      <NovaConversaModal
        open={showNovaConversa}
        onClose={() => setShowNovaConversa(false)}
        onSave={(contactData, firstMsg) => {
          const newId = `N${Date.now()}`;
          const newContact = {
            id: newId,
            name: contactData.name,
            channel: contactData.channel,
            phone: '',
            lastMessage: firstMsg || 'Conversa iniciada',
            lastTime: 'agora',
            unread: 0,
            online: true,
            status: contactData.role === 'Paciente' ? 'PACIENTE' : 'EQUIPE',
            tags: [],
          };
          setContacts(prev => [newContact, ...prev]);
          if (firstMsg) {
            setLocalMessages(prev => ({
              ...prev,
              [newId]: [{ id: 'm1', from: 'me', text: firstMsg, time: 'agora', read: true }],
            }));
          }
          setSelectedId(newId);
          toast.success(`Conversa com ${contactData.name} iniciada`);
        }}
      />
    </div>
  );
}
