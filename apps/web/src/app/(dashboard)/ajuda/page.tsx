'use client';

import { useState, useMemo, useRef } from 'react';
import {
  Search, Upload, FileText, Video, BookOpen, HelpCircle,
  PlayCircle, Download, Trash2, X, Plus, Send, Bot,
  ChevronRight, File, Link2, MessageSquare, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type DocType = 'pdf' | 'video' | 'manual' | 'tutorial' | 'faq' | 'link';
type Module =
  | 'Pacientes' | 'Agenda' | 'Prontuário' | 'Financeiro'
  | 'Estoque' | 'Sessões' | 'Marketing' | 'Qualidade'
  | 'Configurações' | 'Geral';

interface HelpDoc {
  id: string;
  title: string;
  type: DocType;
  module: Module;
  size?: string;
  url?: string;
  addedAt: string;
  views: number;
  description?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MODULES: Module[] = [
  'Pacientes', 'Agenda', 'Prontuário', 'Financeiro',
  'Estoque', 'Sessões', 'Marketing', 'Qualidade',
  'Configurações', 'Geral',
];

const DOC_TYPE_CONFIG: Record<DocType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pdf:      { label: 'PDF',      icon: FileText,   color: 'text-red-600',    bg: 'bg-red-50' },
  video:    { label: 'Vídeo',    icon: Video,      color: 'text-blue-600',   bg: 'bg-blue-50' },
  manual:   { label: 'Manual',   icon: BookOpen,   color: 'text-emerald-600',bg: 'bg-emerald-50' },
  tutorial: { label: 'Tutorial', icon: PlayCircle, color: 'text-violet-600', bg: 'bg-violet-50' },
  faq:      { label: 'FAQ',      icon: HelpCircle, color: 'text-amber-600',  bg: 'bg-amber-50' },
  link:     { label: 'Link',     icon: Link2,      color: 'text-sky-600',    bg: 'bg-sky-50' },
};

const MOCK_DOCS: HelpDoc[] = [
  { id: 'd1', title: 'Manual do Sistema — Visão Geral', type: 'manual', module: 'Geral', size: '2.4 MB', addedAt: '2026-04-10', views: 87, description: 'Guia completo de início ao uso do AYRON MP' },
  { id: 'd2', title: 'Como Cadastrar Pacientes', type: 'tutorial', module: 'Pacientes', size: '1.1 MB', addedAt: '2026-04-12', views: 145 },
  { id: 'd3', title: 'Agendamento Rápido — Tutorial em Vídeo', type: 'video', module: 'Agenda', url: '#', addedAt: '2026-04-13', views: 203 },
  { id: 'd4', title: 'FAQ — Perguntas Frequentes de Financeiro', type: 'faq', module: 'Financeiro', size: '340 KB', addedAt: '2026-04-14', views: 62 },
  { id: 'd5', title: 'Prontuário Eletrônico — Guia Clínico', type: 'pdf', module: 'Prontuário', size: '5.8 MB', addedAt: '2026-04-15', views: 118, description: 'Registro de evoluções, prescrições e exames' },
  { id: 'd6', title: 'Gestão de Estoque Passo a Passo', type: 'tutorial', module: 'Estoque', size: '890 KB', addedAt: '2026-04-16', views: 44 },
  { id: 'd7', title: 'Marketing Digital — Boas Práticas', type: 'pdf', module: 'Marketing', size: '1.7 MB', addedAt: '2026-04-17', views: 29 },
  { id: 'd8', title: 'Pesquisa de Qualidade — Como Usar', type: 'video', module: 'Qualidade', url: '#', addedAt: '2026-04-18', views: 55 },
  { id: 'd9', title: 'Configurações de Notificações', type: 'faq', module: 'Configurações', size: '210 KB', addedAt: '2026-04-19', views: 38 },
  { id: 'd10', title: 'Controle de Sessões e Protocolos', type: 'manual', module: 'Sessões', size: '3.2 MB', addedAt: '2026-04-20', views: 71 },
  { id: 'd11', title: 'Integração Digisac — WhatsApp', type: 'link', module: 'Marketing', url: 'https://digisac.com/docs', addedAt: '2026-04-21', views: 96 },
  { id: 'd12', title: 'Relatório de Satisfação NPS — Guia', type: 'pdf', module: 'Qualidade', size: '1.4 MB', addedAt: '2026-04-22', views: 33 },
];

const AYRON_RESPONSES: Record<string, string> = {
  default: 'Com base nos materiais disponíveis, posso ajudar com dúvidas sobre Pacientes, Agenda, Prontuário, Financeiro, Estoque, Sessões, Marketing, Qualidade e Configurações. Como posso ajudar?',
  paciente: 'Para cadastrar um paciente: acesse Pacientes → Novo Paciente, preencha nome, CPF, data de nascimento e contato. Dados clínicos podem ser adicionados depois no prontuário. Consulte o tutorial "Como Cadastrar Pacientes" para passo a passo completo.',
  agenda: 'O agendamento rápido está disponível no botão "+ Novo Agendamento" na tela de Agenda. Selecione o profissional, tipo de consulta, data/horário e paciente. Confirme pelo WhatsApp diretamente pelo sistema.',
  prontuario: 'O prontuário eletrônico registra evoluções, prescrições e exames. Acesse pelo perfil do paciente → aba Prontuário. As evoluções ficam organizadas por data e responsável.',
  financeiro: 'Para lançamentos financeiros: Financeiro → Novo Lançamento. Informe tipo (entrada/saída), categoria, valor e forma de pagamento. Relatórios mensais ficam em Relatórios → Financeiro.',
  nps: 'O NPS é calculado automaticamente com as respostas das pesquisas de qualidade. Promotores (9-10) menos detratores (0-6) dividido pelo total, multiplicado por 100. Acesse Qualidade → Dashboard NPS para ver a evolução.',
  marketing: 'Para criar uma campanha: Marketing → Nova Campanha. Selecione o segmento (aniversariantes, inativos, etc.), canal (WhatsApp/e-mail) e mensagem. O AYRON Marketing IA pode sugerir mensagens personalizadas.',
};

function getAyronResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('paciente') || q.includes('cadastr')) return AYRON_RESPONSES.paciente;
  if (q.includes('agenda') || q.includes('agendamento') || q.includes('consulta')) return AYRON_RESPONSES.agenda;
  if (q.includes('prontuário') || q.includes('prontuario') || q.includes('evolução')) return AYRON_RESPONSES.prontuario;
  if (q.includes('financeiro') || q.includes('pagamento') || q.includes('fatura')) return AYRON_RESPONSES.financeiro;
  if (q.includes('nps') || q.includes('qualidade') || q.includes('satisfação')) return AYRON_RESPONSES.nps;
  if (q.includes('marketing') || q.includes('campanha') || q.includes('whatsapp')) return AYRON_RESPONSES.marketing;
  return AYRON_RESPONSES.default;
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (doc: HelpDoc) => void;
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocType>('pdf');
  const [module, setModule] = useState<Module>('Geral');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  function handleSave() {
    if (!title.trim()) { toast.error('Informe o título'); return; }
    if (type === 'link' && !url.trim()) { toast.error('Informe a URL'); return; }
    if (type !== 'link' && !fileName) { toast.error('Selecione um arquivo'); return; }
    const doc: HelpDoc = {
      id: `d${Date.now()}`,
      title,
      type,
      module,
      description: description || undefined,
      url: type === 'link' ? url : undefined,
      size: fileName ? `${(Math.random() * 3 + 0.2).toFixed(1)} MB` : undefined,
      addedAt: new Date().toLocaleDateString('pt-BR'),
      views: 0,
    };
    onAdd(doc);
    toast.success('Material adicionado à central de ajuda');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Adicionar Material</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Título</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do material..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as DocType)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {(Object.entries(DOC_TYPE_CONFIG) as [DocType, typeof DOC_TYPE_CONFIG[DocType]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Módulo</label>
              <select value={module} onChange={e => setModule(e.target.value as Module)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {type === 'link' ? (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Arquivo</label>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors">
                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                {fileName ? (
                  <p className="text-sm text-violet-700 font-medium">{fileName}</p>
                ) : (
                  <p className="text-sm text-gray-400">Clique para selecionar PDF, vídeo ou outro arquivo</p>
                )}
              </div>
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => setFileName(e.target.files?.[0]?.name || '')} />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Descrição (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Breve descrição do conteúdo..."
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white gap-2">
            <Upload className="h-4 w-4" /> Adicionar Material
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PageTab = 'biblioteca' | 'ayron';

export default function AjudaPage() {
  const [activeTab, setActiveTab] = useState<PageTab>('biblioteca');
  const [docs, setDocs] = useState<HelpDoc[]>(MOCK_DOCS);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState<Module | 'all'>('all');
  const [filterType, setFilterType] = useState<DocType | 'all'>('all');
  const [showUpload, setShowUpload] = useState(false);

  // AYRON chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: AYRON_RESPONSES.default, timestamp: 'agora' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Filtered docs ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => docs.filter(d => {
    if (filterModule !== 'all' && d.module !== filterModule) return false;
    if (filterType !== 'all' && d.type !== filterType) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) &&
      !d.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [docs, filterModule, filterType, search]);

  const byModule = useMemo(() => {
    const map: Partial<Record<Module, HelpDoc[]>> = {};
    for (const d of filtered) {
      if (!map[d.module]) map[d.module] = [];
      map[d.module]!.push(d);
    }
    return map;
  }, [filtered]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleAdd(doc: HelpDoc) {
    setDocs(prev => [doc, ...prev]);
  }

  function handleDelete(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id));
    toast.success('Material removido');
  }

  function handleView(doc: HelpDoc) {
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, views: d.views + 1 } : d));
    toast.info(`Abrindo "${doc.title}"`);
  }

  function handleSendChat() {
    if (!chatInput.trim()) return;
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: now };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);
    setTimeout(() => {
      const response = getAyronResponse(chatInput);
      const aiMsg: ChatMessage = { role: 'assistant', content: response, timestamp: now };
      setChatMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }, 1200);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Ajuda" subtitle="Central de documentação e suporte" actions={
        <Button onClick={() => setShowUpload(true)} className="bg-violet-600 hover:bg-violet-700 text-white gap-2" size="sm">
          <Plus className="h-4 w-4" /> Adicionar Material
        </Button>
      } />

      <div className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit shrink-0">
          {([
            { key: 'biblioteca', label: '📚 Biblioteca de Materiais' },
            { key: 'ayron', label: '🤖 AYRON Assistente' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Biblioteca ─────────────────────────────────────────────────────── */}
        {activeTab === 'biblioteca' && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Search + Filters */}
            <div className="flex gap-3 shrink-0 flex-wrap">
              <div className="flex-1 relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar materiais..."
                  className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <select value={filterModule} onChange={e => setFilterModule(e.target.value as Module | 'all')}
                className="border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="all">Todos os módulos</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value as DocType | 'all')}
                className="border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="all">Todos os tipos</option>
                {(Object.entries(DOC_TYPE_CONFIG) as [DocType, typeof DOC_TYPE_CONFIG[DocType]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <span className="text-xs text-gray-400 self-center">{filtered.length} materiais</span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 shrink-0">
              {(Object.entries(DOC_TYPE_CONFIG) as [DocType, typeof DOC_TYPE_CONFIG[DocType]][]).map(([k, v]) => {
                const count = docs.filter(d => d.type === k).length;
                const Icon = v.icon;
                return (
                  <button key={k} onClick={() => setFilterType(filterType === k ? 'all' : k)}
                    className={cn('rounded-xl border p-3 text-center transition-colors cursor-pointer',
                      filterType === k ? 'border-violet-400 bg-violet-50' : 'bg-white hover:border-gray-300')}>
                    <Icon className={cn('h-5 w-5 mx-auto mb-1', v.color)} />
                    <p className="text-xs font-semibold text-gray-700">{count}</p>
                    <p className="text-xs text-gray-400">{v.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Doc list grouped by module */}
            <div className="flex-1 overflow-y-auto space-y-5">
              {filterModule === 'all' ? (
                Object.entries(byModule).map(([mod, modDocs]) => (
                  <div key={mod}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ChevronRight className="h-3.5 w-3.5" />{mod}
                      <span className="bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 text-xs">{modDocs.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modDocs.map(doc => <DocCard key={doc.id} doc={doc} onView={handleView} onDelete={handleDelete} />)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filtered.map(doc => <DocCard key={doc.id} doc={doc} onView={handleView} onDelete={handleDelete} />)}
                </div>
              )}
              {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <File className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum material encontrado</p>
                  <p className="text-sm mt-1">Tente outros filtros ou adicione um novo material</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── AYRON Assistente ──────────────────────────────────────────────── */}
        {activeTab === 'ayron' && (
          <div className="flex-1 flex gap-6 overflow-hidden">
            {/* Chat */}
            <div className="flex-1 flex flex-col bg-white rounded-xl border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-gradient-to-r from-violet-600 to-violet-700">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">AYRON Assistente</p>
                  <p className="text-xs text-violet-200">Responde com base nos materiais da central de ajuda</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-violet-200">Online</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                      msg.role === 'assistant' ? 'bg-violet-100' : 'bg-gray-200')}>
                      {msg.role === 'assistant' ? <Bot className="h-4 w-4 text-violet-600" /> : <span className="text-xs font-bold text-gray-600">U</span>}
                    </div>
                    <div className={cn('max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed',
                      msg.role === 'assistant' ? 'bg-gray-50 text-gray-700 border' : 'bg-violet-600 text-white')}>
                      {msg.content}
                      <p className={cn('text-xs mt-1', msg.role === 'assistant' ? 'text-gray-400' : 'text-violet-200')}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="bg-gray-50 border rounded-xl px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-3 flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                  placeholder="Pergunte algo sobre o sistema..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                <Button onClick={handleSendChat} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white px-3">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Sidebar — Suggested Topics */}
            <div className="w-64 shrink-0 space-y-4">
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tópicos Sugeridos</h3>
                <div className="space-y-1.5">
                  {[
                    'Como cadastrar um paciente?',
                    'Como agendar uma consulta?',
                    'Como lançar um pagamento?',
                    'O que é NPS?',
                    'Como criar uma campanha de marketing?',
                    'Como registrar uma evolução no prontuário?',
                  ].map(q => (
                    <button key={q} onClick={() => { setChatInput(q); }}
                      className="w-full text-left text-xs text-gray-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg px-3 py-2 transition-colors border border-transparent hover:border-violet-100">
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Materiais Populares</h3>
                <div className="space-y-2">
                  {[...docs].sort((a, b) => b.views - a.views).slice(0, 4).map(doc => {
                    const cfg = DOC_TYPE_CONFIG[doc.type];
                    const Icon = cfg.icon;
                    return (
                      <button key={doc.id} onClick={() => handleView(doc)}
                        className="w-full text-left flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2 transition-colors">
                        <div className={cn('w-6 h-6 rounded flex items-center justify-center shrink-0', cfg.bg)}>
                          <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-700 truncate">{doc.title}</p>
                          <p className="text-xs text-gray-400">{doc.views} visualizações</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onAdd={handleAdd} />}
    </div>
  );
}

// ─── DocCard ──────────────────────────────────────────────────────────────────

function DocCard({ doc, onView, onDelete }: {
  doc: HelpDoc;
  onView: (d: HelpDoc) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = DOC_TYPE_CONFIG[doc.type];
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl border bg-white p-4 flex gap-3 hover:border-violet-200 hover:shadow-sm transition-all group">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.bg)}>
        <Icon className={cn('h-5 w-5', cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{doc.title}</p>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => onView(doc)} title="Visualizar"
              className="p-1 text-gray-400 hover:text-violet-600 rounded">
              <Download className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(doc.id)} title="Remover"
              className="p-1 text-gray-400 hover:text-red-500 rounded">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {doc.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{doc.description}</p>}
        <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
          <span className={cn('font-medium px-1.5 py-0.5 rounded', cfg.bg, cfg.color)}>{cfg.label}</span>
          {doc.size && <span>{doc.size}</span>}
          <span>{doc.views} views</span>
          <span>{doc.addedAt}</span>
        </div>
      </div>
    </div>
  );
}
