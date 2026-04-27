'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Brain, Send, RefreshCw, Trash2, Sparkles, MessageSquare,
  TrendingUp, Users, DollarSign, Package, CheckCircle,
  AlertTriangle, Clock, BarChart3, Zap, ChevronRight,
  ThumbsUp, ThumbsDown, Copy, Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  module?: string;
  timestamp: Date;
}

// ── Module badge colors ────────────────────────────────────────────────────────

const MODULE_COLORS: Record<string, string> = {
  FINANCAS: 'bg-green-100 text-green-700',
  PRONTUARIO: 'bg-blue-100 text-blue-700',
  ESTOQUE: 'bg-amber-100 text-amber-700',
  CONTATOS: 'bg-purple-100 text-purple-700',
  AGENDA: 'bg-indigo-100 text-indigo-700',
  RECEITA: 'bg-pink-100 text-pink-700',
  INSIGHTS: 'bg-orange-100 text-orange-700',
  MARKETING: 'bg-rose-100 text-rose-700',
  CONFIGURACOES: 'bg-gray-100 text-gray-600',
  GERAL: 'bg-muted text-muted-foreground',
};

const MODULE_LABELS: Record<string, string> = {
  FINANCAS: '💰 Finanças', PRONTUARIO: '📋 Prontuário', ESTOQUE: '📦 Estoque',
  CONTATOS: '👥 Contatos', AGENDA: '📅 Agenda', RECEITA: '💊 Receita',
  INSIGHTS: '📊 Insights', MARKETING: '📣 Marketing', CONFIGURACOES: '⚙️ Config', GERAL: '🤖 Geral',
};

// ── Suggestions ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: Users, text: 'Quantos pacientes estão em risco de não retornar?', module: 'CONTATOS' },
  { icon: DollarSign, text: 'Qual o faturamento total da clínica este mês?', module: 'FINANCAS' },
  { icon: Brain, text: 'Quais pacientes Mounjaro não retornaram em 90 dias?', module: 'PRONTUARIO' },
  { icon: TrendingUp, text: 'Quem são os 10 pacientes que mais gastaram?', module: 'INSIGHTS' },
  { icon: Package, text: 'Algum item do estoque em nível crítico?', module: 'ESTOQUE' },
  { icon: BarChart3, text: 'Gera um relatório dos procedimentos mais realizados', module: 'INSIGHTS' },
];

// ── Mock decision proposals ────────────────────────────────────────────────────

const MOCK_PROPOSALS = [
  {
    id: '1', priority: 'P0_CRITICAL',
    context: '9 pacientes Diamante sem retorno há > 30 dias',
    analysis: 'Risco financeiro: ~R$ 127k em receita potencial. Ação imediata recomendada.',
    action: 'Contatar pessoalmente — agendar consulta de acompanhamento premium',
    status: 'PENDING_APPROVAL',
  },
  {
    id: '2', priority: 'P1_HIGH',
    context: '48 pacientes Mounjaro com aplicação atrasada (> 14 dias)',
    analysis: 'Protocolo em risco de abandono. Taxa de conversão cai 40% após 21 dias sem contato.',
    action: 'Disparar campanha WhatsApp personalizada com oferta de reagendamento',
    status: 'PENDING_APPROVAL',
  },
  {
    id: '3', priority: 'P1_HIGH',
    context: 'Implante Testosterona: 23 pacientes com 150+ dias sem retorno',
    analysis: 'Janela de reimplante ideal: 150–180 dias. Agir antes do vencimento aumenta retenção em 78%.',
    action: 'Campanha de lembrança automática — Protocolo Hormonal Renewal',
    status: 'PENDING_APPROVAL',
  },
  {
    id: '4', priority: 'P2_OPTIMIZATION',
    context: 'Taxa de ocupação da agenda: 67% (meta: 85%)',
    analysis: 'Horários 08h–09h e 18h–19h com menor ocupação. Potencial de 12 consultas/semana adicionais.',
    action: 'Abrir horários nesses slots e priorizar lista de espera para preenchimento',
    status: 'PENDING_APPROVAL',
  },
  {
    id: '5', priority: 'P2_OPTIMIZATION',
    context: 'Estoque: Mounjaro 10mg com 8 unidades (cobertura: 12 dias)',
    analysis: 'Demanda crescente — 6 aplicações/semana. Pedido recomendado: 30 unidades.',
    action: 'Gerar pedido de reposição automático ao fornecedor cadastrado',
    status: 'INFORMATIVO',
  },
];

const PRIORITY_COLORS: Record<string, { badge: string; border: string; dot: string }> = {
  P0_CRITICAL: { badge: 'bg-red-100 text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  P1_HIGH: { badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  P2_OPTIMIZATION: { badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200', dot: 'bg-blue-400' },
  P3_INFORMATIONAL: { badge: 'bg-gray-100 text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400' },
};

const PRIORITY_LABELS: Record<string, string> = {
  P0_CRITICAL: '🔴 Crítico', P1_HIGH: '🟠 Alta', P2_OPTIMIZATION: '🔵 Otimização', P3_INFORMATIONAL: 'ℹ️ Info',
};

// ── Typing indicator ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 p-3 rounded-2xl rounded-tl-sm bg-white border border-border w-fit">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-primary/60"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">AYRON está processando...</span>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, onCopy }: { msg: Message; onCopy: (text: string) => void }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isUser && (
        <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <Brain className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={cn('max-w-[75%] space-y-1', isUser ? 'items-end' : 'items-start')}>
        {msg.module && !isUser && (
          <span className={cn('inline-block text-[10px] font-bold px-2 py-0.5 rounded-full', MODULE_COLORS[msg.module] ?? MODULE_COLORS.GERAL)}>
            {MODULE_LABELS[msg.module] ?? msg.module}
          </span>
        )}
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-white rounded-tr-sm'
            : 'bg-white border border-border text-foreground rounded-tl-sm shadow-sm'
        )}>
          {msg.content.split('\n').map((line, i) => (
            <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
          ))}
        </div>
        <div className={cn('flex items-center gap-2', isUser ? 'justify-end' : 'justify-start')}>
          <span className="text-[10px] text-muted-foreground">
            {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && (
            <button
              onClick={() => onCopy(msg.content)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-colors"
              title="Copiar resposta"
            >
              <Copy className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AyronPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'proposals'>('chat');
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('https://n8n-production-ef55.up.railway.app/webhook/ayron-teste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'web_medico', mensagem: msg }),
      });
      const json = await res.json();

      const reply = json.resposta ?? json.output ?? json.message ?? 'Sem resposta do servidor.';
      const module = json.modulo ?? 'GERAL';

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        module,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Não consegui conectar ao servidor AYRON. Verifique se o n8n está online e tente novamente.',
        module: 'GERAL',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado!'));
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Conversa reiniciada');
  };

  const approve = (id: string) => {
    setApprovedIds(s => new Set([...s, id]));
    toast.success('Decisão aprovada — AYRON irá executar a ação');
  };

  const pendingCount = MOCK_PROPOSALS.filter(p => p.status === 'PENDING_APPROVAL' && !approvedIds.has(p.id)).length;

  return (
    <div>
      <Topbar title="AYRON — Cognitive Engine" />
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">

        {/* Left: Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center border-b border-border px-6 bg-white gap-1 py-2">
            {[
              { key: 'chat', label: 'Chat', icon: MessageSquare },
              { key: 'proposals', label: `DecisionProposals${pendingCount > 0 ? ` (${pendingCount})` : ''}`, icon: Brain },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  activeTab === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {key === 'proposals' && pendingCount > 0 && (
                  <span className="h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Chat panel */}
          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20 group">
                {/* Welcome */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                      <Brain className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-xl font-bold mb-1">AYRON</h2>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                      Cognitive Clinical OS — pergunte sobre pacientes, finanças, estoque, agenda ou qualquer dado da clínica.
                    </p>
                    <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                      {SUGGESTIONS.map(({ icon: Icon, text, module }) => (
                        <button
                          key={text}
                          onClick={() => sendMessage(text)}
                          className="flex items-start gap-2 p-3 rounded-xl border border-border bg-white text-left hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                        >
                          <Icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                          <span className="text-xs text-muted-foreground leading-relaxed">{text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} onCopy={copyToClipboard} />
                ))}

                {loading && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <TypingIndicator />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-border bg-white p-4">
                {messages.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {SUGGESTIONS.slice(0, 3).map(({ text }) => (
                      <button
                        key={text}
                        onClick={() => sendMessage(text)}
                        className="px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                      >
                        {text.length > 45 ? text.slice(0, 45) + '…' : text}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pergunte qualquer coisa sobre a clínica... (Enter para enviar)"
                    autoFocus
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all min-h-[42px] max-h-32"
                    style={{ height: 'auto' }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                    }}
                  />
                  <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="h-10 px-4 flex-shrink-0">
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                  {messages.length > 0 && (
                    <Button variant="ghost" className="h-10 w-10 flex-shrink-0" onClick={clearChat} title="Nova conversa">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  AYRON tem acesso a 6.036 pacientes · R$ 27,9M em atendimentos · dados reais Clínica Luminar
                </p>
              </div>
            </>
          )}

          {/* Proposals panel */}
          {activeTab === 'proposals' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">DecisionProposals</h2>
                  <p className="text-sm text-muted-foreground">AYRON identificou {pendingCount} ações que requerem aprovação médica</p>
                </div>
                <Badge variant="warning">{pendingCount} pendentes</Badge>
              </div>

              {MOCK_PROPOSALS.map(p => {
                const style = PRIORITY_COLORS[p.priority] ?? PRIORITY_COLORS.P3_INFORMATIONAL;
                const isApproved = approvedIds.has(p.id);
                return (
                  <motion.div
                    key={p.id}
                    layout
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all',
                      isApproved ? 'border-green-200 bg-green-50/50 opacity-60' : style.border,
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1.5', style.dot)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', style.badge)}>
                              {PRIORITY_LABELS[p.priority]}
                            </span>
                            {isApproved && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">✓ Aprovado</span>}
                          </div>
                          <p className="text-sm font-semibold">{p.context}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.analysis}</p>
                          <div className="mt-2 p-2 rounded-lg bg-muted/50 flex items-start gap-2">
                            <Zap className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-medium">{p.action}</p>
                          </div>
                        </div>
                      </div>
                      {!isApproved && p.status === 'PENDING_APPROVAL' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button variant="ghost" className="h-8 w-8" title="Rejeitar">
                            <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button size="sm" className="h-8" onClick={() => approve(p.id)}>
                            <ThumbsUp className="h-3.5 w-3.5 mr-1.5" />Aprovar
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar: status panel */}
        <div className="w-64 border-l border-border bg-white overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold">AYRON v1.0</p>
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-muted-foreground">Online · Claude Sonnet</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Módulos Ativos</p>
              <div className="space-y-1">
                {Object.entries(MODULE_LABELS).filter(([k]) => k !== 'GERAL').map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs">{label}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Base de Conhecimento</p>
              <div className="space-y-2">
                {[
                  { label: 'Pacientes', value: '6.036' },
                  { label: 'Atendimentos', value: '8.985' },
                  { label: 'Notas Obsidian', value: '6.035' },
                  { label: 'Faturamento total', value: 'R$ 27,9M' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Feature Flags</p>
              <div className="space-y-1.5">
                {[
                  { label: 'V1 · Observação', active: true },
                  { label: 'V2 · Alertas', active: true },
                  { label: 'V3 · DecisionProposals', active: true },
                  { label: 'V4 · Prescrição IA', active: false },
                  { label: 'V5 · Predição', active: false },
                  { label: 'V6 · Autonomia', active: false },
                ].map(({ label, active }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className={cn('text-xs', active ? 'text-foreground' : 'text-muted-foreground/50')}>{label}</span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground/40')}>
                      {active ? 'ON' : 'OFF'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Tunnel Obsidian</p>
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-[10px] text-amber-700 font-medium">⚡ Manual</p>
                <p className="text-[10px] text-amber-600">Rodar start_tunnel.sh para ativar prontuário via Obsidian</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
