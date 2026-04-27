'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, X, Sparkles, TrendingUp, AlertTriangle, CheckCircle,
         DollarSign, Users, Send, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { format } from 'date-fns/format';
import { ptBR } from 'date-fns/locale';
import { sendAyronMessage, type AyronMessage, type AyronContext } from '@/lib/ayron-chat';
import { useAyronContext } from '@/hooks/use-ayron-context';

function buildInsights(overview: any) {
  if (!overview) return [];
  const items: { title: string; body: string; icon: any; cls: string; iconCls: string }[] = [];
  const today = overview?.today ?? {};
  const financial = overview?.financial ?? {};
  const alerts = overview?.alerts ?? {};
  if ((today.checked_in ?? 0) > 0) {
    items.push({ title: `${today.checked_in} paciente(s) em atendimento`, body: 'Check-ins ativos. Acesse o modo médico para retomar a consulta.', icon: Users, cls: 'bg-blue-50 border-blue-100', iconCls: 'text-blue-600' });
  }
  if ((today.total ?? 0) > 0) {
    const pct = Math.round(((today.completed ?? 0) / today.total) * 100);
    items.push({ title: `${pct}% da agenda concluída`, body: `${today.completed ?? 0} de ${today.total} consultas finalizadas hoje.`, icon: CheckCircle, cls: 'bg-green-50 border-green-100', iconCls: 'text-green-600' });
  }
  if ((financial.pending_count ?? 0) > 3) {
    items.push({ title: `${financial.pending_count} cobranças pendentes`, body: 'Volume acima do normal. Recomendo revisão de pagamentos em aberto.', icon: DollarSign, cls: 'bg-amber-50 border-amber-100', iconCls: 'text-amber-600' });
  }
  if ((alerts.low_stock ?? 0) > 0) {
    items.push({ title: `${alerts.low_stock} item(ns) com estoque crítico`, body: 'Verifique estoque para evitar interrupção de protocolos.', icon: AlertTriangle, cls: 'bg-red-50 border-red-100', iconCls: 'text-red-600' });
  }
  if ((alerts.pending_decisions ?? 0) > 0) {
    items.push({ title: `${alerts.pending_decisions} decisão(ões) aguardando MASTER`, body: 'O AYRON detectou padrões que requerem aprovação humana.', icon: Brain, cls: 'bg-primary/5 border-primary/15', iconCls: 'text-primary' });
  }
  if ((financial.monthly_revenue ?? 0) > 0) {
    items.push({ title: 'Receita do mês monitorada', body: `R$ ${Number(financial.monthly_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrados. Tendência sendo analisada.`, icon: TrendingUp, cls: 'bg-gray-50 border-gray-100', iconCls: 'text-gray-500' });
  }
  return items;
}

export function AyronWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'insights' | 'chat'>('insights');
  const [messages, setMessages] = useState<AyronMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const context: AyronContext = useAyronContext();

  const { data: overview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    enabled: open,
    staleTime: 30_000,
  });

  const insights = buildInsights(overview);
  const pendingDecisions = overview?.alerts?.pending_decisions ?? 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: AyronMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const reply = await sendAyronMessage(text, [...messages, userMsg], context);
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30"
        title="AYRON — Assistente Cognitivo"
      >
        <Brain className="h-6 w-6 text-white" />
        {pendingDecisions > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {pendingDecisions}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-24 right-6 z-50 w-96 rounded-2xl border border-border bg-white shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '520px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-gradient-to-r from-secondary/5 to-primary/5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/30">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">AYRON</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5 text-primary" />
                    Cognitive Engine · {format(new Date(), 'dd MMM, HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0">
              <button
                onClick={() => setTab('insights')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === 'insights' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Insights
              </button>
              <button
                onClick={() => setTab('chat')}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Chat
              </button>
            </div>

            {/* Insights Tab */}
            {tab === 'insights' && (
              <div className="flex-1 overflow-y-auto">
                {insights.length > 0 ? (
                  <div className="p-3 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-1">Análise em tempo real</p>
                    {insights.map((ins, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`flex items-start gap-2.5 rounded-xl p-3 border ${ins.cls}`}
                      >
                        <ins.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${ins.iconCls}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{ins.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{ins.body}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    <div className="rounded-xl bg-primary/5 p-3 border border-primary/10">
                      <p className="text-xs font-medium text-primary mb-1">Modo V1 — Observação Ativa</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">O AYRON está monitorando padrões clínicos e operacionais. Insights personalizados serão gerados conforme os dados acumulam.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {tab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="text-center py-6">
                      <Brain className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Como posso ajudar?</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Contexto: {context.module}</p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-white rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-border p-2 flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Pergunte ao AYRON... (Enter para enviar)"
                      rows={2}
                      className="flex-1 resize-none rounded-xl border border-border px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30 bg-muted/30"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || loading}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 transition-opacity flex-shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="border-t border-border px-4 py-2 bg-muted/30 flex-shrink-0">
              <p className="text-[10px] text-muted-foreground text-center">
                <kbd className="rounded border border-border bg-white px-1 py-0.5 text-[9px] font-medium">⌘K</kbd> comandos globais · Decisões requerem aprovação MASTER
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
