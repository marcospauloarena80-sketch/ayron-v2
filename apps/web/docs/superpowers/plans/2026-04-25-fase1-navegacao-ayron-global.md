# FASE 1 — Navegação e AYRON Global Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar AYRON mini-chat flutuante com contexto real, menu de navegação global no Dashboard, StatCards navegáveis, busca oculta no Dashboard, e sidebar colapsável com tooltip.

**Architecture:** 2 novos arquivos de suporte (`ayron-chat.ts`, `use-ayron-context.ts`) + 4 modificações isoladas. Sem refatoração estrutural. Cada task é independente e deployável sozinha.

**Tech Stack:** Next.js 15, React 18, TypeScript, Zustand, TanStack Query, Framer Motion, Tailwind, Lucide

---

## Task 1: Camada de API do Chat AYRON

**Files:**
- Create: `apps/web/src/lib/ayron-chat.ts`

- [ ] **Step 1:** Criar `apps/web/src/lib/ayron-chat.ts` com interface de contexto e função de envio:

```typescript
// apps/web/src/lib/ayron-chat.ts
export interface AyronContext {
  module: string;
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
  prontuarioId?: string;
  financialContext?: string;
  userId?: string;
  userRole?: string;
  clinicId?: string;
}

export interface AyronMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const MOCK_RESPONSES: Record<string, string[]> = {
  default: [
    'Entendido. Posso ajudar com informações do sistema AYRON.',
    'Analisando sua solicitação...',
    'Como posso te ajudar neste módulo?',
  ],
  patients: [
    'Posso ajudar com a busca de pacientes, histórico e protocolos.',
    'Para consultar prontuário, acesse o módulo Clínico.',
  ],
  agenda: [
    'Posso ajudar com agendamentos, disponibilidade e confirmações.',
    'Para agendar, clique em um horário vago na grade.',
  ],
  clinical: [
    'Posso ajudar com evoluções, receitas e exames.',
    'O prontuário atual está carregado no contexto.',
  ],
  financial: [
    'Posso ajudar com cobranças, pré-pagamentos e relatórios financeiros.',
  ],
};

function getMockResponse(context: AyronContext): string {
  const pool = MOCK_RESPONSES[context.module] ?? MOCK_RESPONSES.default;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function sendAyronMessage(
  message: string,
  history: AyronMessage[],
  context: AyronContext
): Promise<string> {
  try {
    const response = await fetch('/api/ayron/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, context }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.reply ?? getMockResponse(context);
  } catch {
    // Fallback mock — endpoint não disponível ainda
    await new Promise(r => setTimeout(r, 600));
    return getMockResponse(context);
  }
}
```

- [ ] **Step 2:** Verificar TS:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial
```
Esperado: zero erros.

---

## Task 2: Hook de Contexto AYRON

**Files:**
- Create: `apps/web/src/hooks/use-ayron-context.ts`

- [ ] **Step 1:** Criar `apps/web/src/hooks/use-ayron-context.ts`:

```typescript
// apps/web/src/hooks/use-ayron-context.ts
'use client';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import type { AyronContext } from '@/lib/ayron-chat';

function pathToModule(pathname: string): string {
  if (pathname.startsWith('/patients')) return 'patients';
  if (pathname.startsWith('/agenda')) return 'agenda';
  if (pathname.startsWith('/clinical')) return 'clinical';
  if (pathname.startsWith('/financial')) return 'financial';
  if (pathname.startsWith('/marketing')) return 'marketing';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/messages')) return 'messages';
  if (pathname.startsWith('/analytics')) return 'analytics';
  if (pathname.startsWith('/sessions')) return 'sessions';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/ayron')) return 'ayron';
  return 'dashboard';
}

function extractIdFromPath(pathname: string, prefix: string): string | undefined {
  const match = pathname.match(new RegExp(`${prefix}/([^/]+)`));
  return match?.[1];
}

export function useAyronContext(overrides?: Partial<AyronContext>): AyronContext {
  const pathname = usePathname();
  const user = useAuthStore(s => s.user);

  const module = pathToModule(pathname);
  const patientId = extractIdFromPath(pathname, '/patients');
  const prontuarioId = extractIdFromPath(pathname, '/clinical');

  return {
    module,
    patientId,
    prontuarioId,
    userId: user?.id,
    userRole: user?.role,
    clinicId: user?.clinic_id,
    ...overrides,
  };
}
```

- [ ] **Step 2:** Verificar TS:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial
```
Esperado: zero erros.

---

## Task 3: AYRON Widget — Mini Chat com Abas

**Files:**
- Modify: `apps/web/src/components/ayron/ayron-widget.tsx`

- [ ] **Step 1:** Substituir o conteúdo completo de `ayron-widget.tsx`:

```tsx
// apps/web/src/components/ayron/ayron-widget.tsx
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
```

- [ ] **Step 2:** Verificar TS:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial
```
Esperado: zero erros.

---

## Task 4: Dashboard — QuickAccessButton + StatCards Navegáveis

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1:** Adicionar `useRouter` à lista de imports do React (já existe no arquivo). Verificar que `useRef`, `useState`, `useEffect` estão importados. Adicionar imports de ícones que faltarem. No topo do arquivo, após os imports existentes, adicionar os ícones necessários para o menu:

Localizar a linha de import de lucide-react (linha ~10) e garantir que os seguintes ícones estão presentes:
`LayoutDashboard, Users, Calendar, FileText, DollarSign, Megaphone, Package, MessageSquare, BarChart3, Repeat2, Star, HelpCircle, Settings, Brain, ChevronRight, X`

Se algum faltar, adicionar na linha de import existente.

- [ ] **Step 2:** Substituir a função `QuickAccessButton` inteira (linhas 39-58) por:

```tsx
function QuickAccessButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const MODULES = [
    { href: '/patients',  label: 'Pacientes',     icon: Users },
    { href: '/agenda',    label: 'Agenda',         icon: Calendar },
    { href: '/clinical',  label: 'Prontuários',    icon: FileText },
    { href: '/financial', label: 'Financeiro',     icon: DollarSign },
    { href: '/marketing', label: 'Marketing',      icon: Megaphone },
    { href: '/inventory', label: 'Estoque',        icon: Package },
    { href: '/messages',  label: 'Mensagens',      icon: MessageSquare },
    { href: '/analytics', label: 'Insights',       icon: BarChart3 },
    { href: '/sessions',  label: 'Sessões',        icon: Repeat2 },
    { href: '/qualidade', label: 'Qualidade',      icon: Star },
    { href: '/ajuda',     label: 'Ajuda',          icon: HelpCircle },
    { href: '/settings',  label: 'Configurações',  icon: Settings },
    { href: '/ayron',     label: 'AYRON',          icon: Brain },
  ];

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="group flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 px-5 py-3 transition-all hover:shadow-md active:scale-95"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 shadow-sm group-hover:bg-orange-600 transition-colors">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-orange-700">Acesso Rápido Global</p>
          <p className="text-xs text-orange-500">Navegue para qualquer módulo</p>
        </div>
        <ChevronRight className={`h-4 w-4 text-orange-400 ml-auto transition-transform ${open ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-2 z-50 w-80 rounded-2xl border border-border bg-white shadow-2xl p-3"
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos</p>
              <button onClick={() => setOpen(false)} className="rounded-md p-0.5 hover:bg-muted text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {MODULES.map(({ href, label, icon: Icon }) => (
                <button
                  key={href}
                  onClick={() => { router.push(href); setOpen(false); }}
                  className="flex flex-col items-center gap-1 rounded-xl p-2.5 hover:bg-primary/5 hover:text-primary transition-colors text-muted-foreground group"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3:** Verificar que `AnimatePresence` e `motion` já estão importados no arquivo (vêm de framer-motion). Se não estiver, adicionar:
```tsx
import { motion, AnimatePresence } from 'framer-motion';
```

- [ ] **Step 4:** Substituir a função `StatCard` (linhas 239-252) por versão navegável:

```tsx
function StatCard({ title, value, sub, icon: Icon, href }: { title: string; value: any; sub?: string; icon: any; href?: string }) {
  const router = useRouter();
  return (
    <Card
      onClick={href ? () => router.push(href) : undefined}
      className={href ? 'cursor-pointer hover:shadow-md active:scale-[0.98] transition-all' : ''}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardValue>{value ?? '—'}</CardValue>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
```

- [ ] **Step 5:** Atualizar as 4 chamadas de `StatCard` (linhas ~777-780) adicionando `href`:

```tsx
<StatCard title="Consultas Hoje" value={overview?.today?.total ?? 0} sub={`${overview?.today?.completed ?? 0} concluídas · ${overview?.today?.checked_in ?? 0} em atendimento`} icon={Calendar} href="/agenda" />
<StatCard title="Pacientes Ativos" value={overview?.patients?.active ?? 0} sub={`+${overview?.patients?.new_this_month ?? 0} este mês`} icon={Users} href="/patients" />
<StatCard title="Receita do Mês" value={overview?.financial?.monthly_revenue != null ? `R$ ${Number(overview.financial.monthly_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'} sub={`${overview?.financial?.pending_count ?? 0} cobranças pendentes`} icon={DollarSign} href="/financial" />
<StatCard title="Taxa de Ocupação" value={`${overview?.today?.occupation_rate ?? 0}%`} sub="Hoje" icon={TrendingUp} href="/agenda" />
```

- [ ] **Step 6:** Verificar TS:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial
```
Esperado: zero erros.

---

## Task 5: Topbar — Ocultar Search no Dashboard

**Files:**
- Modify: `apps/web/src/components/layout/topbar.tsx`

- [ ] **Step 1:** Adicionar `usePathname` ao import de `next/navigation` na linha 4:

```tsx
import { useRouter, usePathname } from 'next/navigation';
```

- [ ] **Step 2:** Adicionar a variável `showSearch` dentro do componente `Topbar`, logo após as declarações de estado existentes (após linha ~26):

```tsx
const pathname = usePathname();
const showSearch = pathname !== '/dashboard';
```

- [ ] **Step 3:** Envolver o botão de search (linhas 121-128) com `{showSearch && (...)}`:

Localizar este bloco:
```tsx
<button
  onClick={() => setSearchOpen(v => !v)}
  className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
>
  <Search className="h-3.5 w-3.5" />
  <span className="hidden sm:inline">Buscar</span>
  <kbd className="hidden sm:inline rounded border border-border bg-white px-1 py-0.5 text-[10px] font-medium">⌘K</kbd>
</button>
```

Substituir por:
```tsx
{showSearch && (
  <button
    onClick={() => setSearchOpen(v => !v)}
    className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
  >
    <Search className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">Buscar</span>
    <kbd className="hidden sm:inline rounded border border-border bg-white px-1 py-0.5 text-[10px] font-medium">⌘K</kbd>
  </button>
)}
```

- [ ] **Step 4:** Verificar TS:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial
```
Esperado: zero erros.

---

## Task 6: Sidebar — Collapse com Tooltip

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1:** Adicionar import de `ChevronLeft` e `ChevronRight` à linha de imports do lucide-react (linha 8):

```tsx
import {
  LayoutDashboard, Users, Calendar, FileText, BarChart3,
  Package, MessageSquare, Brain, Settings, LogOut, DollarSign, Bell, ClipboardList,
  Megaphone, Repeat2, Star, HelpCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
```

- [ ] **Step 2:** Adicionar `useState` e `useEffect` ao import do React no topo:

```tsx
import { useState, useEffect } from 'react';
```

- [ ] **Step 3:** Dentro do componente `Sidebar`, após `const logout = useAuthStore(s => s.logout);` (linha ~36), adicionar o estado de collapse:

```tsx
const [collapsed, setCollapsed] = useState<boolean>(() => {
  try { return localStorage.getItem('ayron_sidebar_collapsed') === 'true'; }
  catch { return false; }
});

useEffect(() => {
  try { localStorage.setItem('ayron_sidebar_collapsed', String(collapsed)); }
  catch {}
}, [collapsed]);
```

- [ ] **Step 4:** Substituir a tag `<aside>` de abertura (linha 74) para incluir largura dinâmica:

```tsx
<aside className={cn(
  'flex h-screen flex-col border-r border-border bg-white transition-all duration-200',
  collapsed ? 'w-16' : 'w-64'
)}>
```

- [ ] **Step 5:** Substituir o header da sidebar (linhas 75-80) para ocultar label quando collapsed:

```tsx
<div className={cn('flex h-16 items-center border-b', collapsed ? 'justify-center px-0' : 'gap-2 px-6')}>
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
    <Brain className="h-4 w-4 text-white" />
  </div>
  {!collapsed && <span className="text-lg font-bold tracking-tight text-secondary">AYRON</span>}
</div>
```

- [ ] **Step 6:** Substituir cada item de nav (bloco dentro do `NAV.map`) para suportar tooltip quando collapsed:

```tsx
{NAV.map(({ href, label, icon: Icon, badgeKey }) => {
  const active = pathname === href || pathname.startsWith(href + '/');
  const count = getBadgeCount(badgeKey);
  return (
    <Link key={href} href={href}>
      <motion.div
        whileHover={{ x: collapsed ? 0 : 2 }}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors mb-0.5',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="flex-1">{label}</span>}
        {!collapsed && count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
        {collapsed && count > 0 && (
          <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </motion.div>
    </Link>
  );
})}
```

- [ ] **Step 7:** Substituir o rodapé da sidebar (linhas 110-127) para incluir botão toggle e suporte collapsed:

```tsx
<div className="border-t p-3 space-y-1">
  <Link href="/settings">
    <div
      title={collapsed ? 'Configurações' : undefined}
      className={cn(
        'flex items-center rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted cursor-pointer transition-colors',
        collapsed ? 'justify-center px-0' : 'gap-3 px-3'
      )}
    >
      <Settings className="h-4 w-4 flex-shrink-0" />
      {!collapsed && 'Configurações'}
    </div>
  </Link>
  <button
    onClick={handleLogout}
    title={collapsed ? 'Sair' : undefined}
    className={cn(
      'w-full flex items-center rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors',
      collapsed ? 'justify-center px-0' : 'gap-3 px-3'
    )}
  >
    <LogOut className="h-4 w-4 flex-shrink-0" />
    {!collapsed && 'Sair'}
  </button>
  <button
    onClick={() => setCollapsed(v => !v)}
    title={collapsed ? 'Expandir sidebar' : 'Minimizar sidebar'}
    className={cn(
      'w-full flex items-center rounded-lg py-2 text-xs text-muted-foreground hover:bg-muted transition-colors',
      collapsed ? 'justify-center px-0' : 'gap-2 px-3'
    )}
  >
    {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-3.5 w-3.5" /><span>Minimizar</span></>}
  </button>
</div>
```

- [ ] **Step 8:** Verificar TS:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial
```
Esperado: zero erros.

---

## Verificação Final

- [ ] `npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial` → zero erros
- [ ] Abrir `http://localhost:3001/dashboard` — QuickAccess abre grid de 13 módulos
- [ ] Clicar nos 4 StatCards — cada um navega para a rota correta
- [ ] Abrir Widget AYRON (botão Brain) → aparece aba Insights + aba Chat
- [ ] Digitar no chat → resposta aparece (mock ou API)
- [ ] Verificar que lupa NÃO aparece no `/dashboard`
- [ ] Verificar que lupa aparece em `/patients`, `/agenda`, `/clinical`
- [ ] Clicar no toggle da sidebar → colapsa para w-16 com só ícones
- [ ] Hover nos ícones da sidebar colapsada → tooltip com nome do módulo aparece
- [ ] Recarregar página com sidebar colapsada → permanece colapsada (localStorage)
