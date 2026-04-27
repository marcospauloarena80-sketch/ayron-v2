'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, User, Sparkles, Loader2, RotateCcw,
  DollarSign, FileText, Package, Users, Calendar,
  Pill, BarChart3, Settings, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const N8N_WEBHOOK = 'https://n8n-production-ef55.up.railway.app/webhook/ayron-teste';
const SESSION_FROM = 'web_medico';

const MODULE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  FINANCAS:      { label: 'Financeiro',  icon: DollarSign, color: 'bg-emerald-100 text-emerald-700' },
  PRONTUARIO:    { label: 'Prontuário',  icon: FileText,   color: 'bg-blue-100 text-blue-700' },
  ESTOQUE:       { label: 'Estoque',     icon: Package,    color: 'bg-amber-100 text-amber-700' },
  CONTATOS:      { label: 'Contatos',    icon: Users,      color: 'bg-purple-100 text-purple-700' },
  AGENDA:        { label: 'Agenda',      icon: Calendar,   color: 'bg-cyan-100 text-cyan-700' },
  RECEITA:       { label: 'Receita',     icon: Pill,       color: 'bg-rose-100 text-rose-700' },
  INSIGHTS:      { label: 'Insights',    icon: BarChart3,  color: 'bg-indigo-100 text-indigo-700' },
  MARKETING:     { label: 'Marketing',   icon: Zap,        color: 'bg-orange-100 text-orange-700' },
  CONFIGURACOES: { label: 'Config',      icon: Settings,   color: 'bg-gray-100 text-gray-700' },
};

const SUGGESTIONS = [
  'Qual o faturamento de março?',
  'Prontuário do Walter Camelo',
  'Pacientes em risco de abandono',
  'Quais pacientes usam Mounjaro?',
  'Top 5 pacientes por gasto total',
];

interface Message {
  id: string;
  role: 'user' | 'ayron';
  text: string;
  modulo?: string;
  timestamp: Date;
  error?: boolean;
}

function ModuleBadge({ modulo }: { modulo: string }) {
  const cfg = MODULE_CONFIG[modulo];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.color)}>
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div className={cn(
        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl',
        isUser ? 'bg-[#1B3A4B]' : 'bg-[#FF6B00] shadow-sm',
      )}>
        {isUser ? <User className="h-4 w-4 text-white" /> : <Brain className="h-4 w-4 text-white" />}
      </div>

      <div className={cn('flex max-w-[72%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        {!isUser && msg.modulo && msg.modulo !== 'GERAL' && <ModuleBadge modulo={msg.modulo} />}

        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'rounded-tr-sm bg-[#1B3A4B] text-white'
            : msg.error
              ? 'rounded-tl-sm bg-red-50 text-red-700 border border-red-100'
              : 'rounded-tl-sm bg-white border border-gray-200 shadow-sm text-gray-900',
        )}>
          {msg.text}
        </div>

        <span className="text-[10px] text-gray-400 px-1">
          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex gap-3"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#FF6B00] shadow-sm">
        <Brain className="h-4 w-4 text-white" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white border border-gray-200 px-4 py-3 shadow-sm">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[#FF6B00]"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function AyronStandalonePage() {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'ayron',
    text: 'Olá! Sou o AYRON — assistente clínico inteligente da Clínica Luminar.\n\nConheço o prontuário, histórico financeiro e procedimentos de todos os pacientes. Como posso ajudar?',
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: SESSION_FROM, mensagem: trimmed }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ayron',
        text: data.resposta || data.output || data.message || JSON.stringify(data),
        modulo: data.modulo || 'GERAL',
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ayron',
        text: 'Erro ao conectar. Verifique se o tunnel está ativo (rode start_tunnel.sh) e tente novamente.',
        timestamp: new Date(),
        error: true,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6B00] shadow-sm">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#1B3A4B]">AYRON</h1>
            <p className="text-[10px] text-gray-400">Assistente Clínico · Clínica Luminar</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-gray-500">Claude Sonnet · 6.036 pacientes</span>
          </div>
          <button
            onClick={() => setMessages([{
              id: 'welcome-' + Date.now(),
              role: 'ayron',
              text: 'Conversa reiniciada. Como posso ajudar?',
              timestamp: new Date(),
            }])}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Nova conversa
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        <AnimatePresence>{loading && <TypingIndicator />}</AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && !loading && (
        <div className="border-t border-gray-200 bg-white px-6 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Sugestões</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-[#FF6B00]/10 hover:border-[#FF6B00]/30 hover:text-[#FF6B00] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="flex items-end gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-[#FF6B00]/50 focus-within:ring-2 focus-within:ring-[#FF6B00]/10 transition-all">
          <Sparkles className="mb-1 h-4 w-4 flex-shrink-0 text-[#FF6B00]" />
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte ao AYRON... (Enter para enviar)"
            rows={1}
            disabled={loading}
            autoFocus
            className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-gray-400 disabled:opacity-50 max-h-32"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all',
              input.trim() && !loading
                ? 'bg-[#FF6B00] text-white shadow-sm hover:bg-[#FF6B00]/90'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed',
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-gray-400">
          Enter para enviar · Shift+Enter nova linha · Powered by Claude Sonnet
        </p>
      </div>
    </div>
  );
}
