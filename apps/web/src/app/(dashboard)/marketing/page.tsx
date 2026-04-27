'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Megaphone, Users, MessageSquare, Star, TrendingUp, Brain, Send,
  Plus, Calendar, Clock, Target, BarChart3, Repeat2, Sparkles,
  Mail, Smartphone, Filter, Play, Pause, CheckCircle, AlertTriangle,
  ChevronRight, Edit2, Copy, Eye, RefreshCw, ThumbsUp, Heart, Globe, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── Tabs ───────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'campanhas', label: 'Campanhas', icon: Megaphone },
  { key: 'qualidade', label: 'Qualidade & NPS', icon: Star },
  { key: 'segmentacao', label: 'Segmentação', icon: Filter },
  { key: 'conteudo_ia', label: 'Conteúdo IA', icon: Brain },
  { key: 'portal', label: 'Portal do Paciente', icon: Globe },
  { key: 'r1_ia', label: 'AYRON Marketing IA', icon: Brain },
] as const;
type TabKey = typeof TABS[number]['key'];

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_CAMPAIGNS = [
  {
    id: '1', name: 'Retorno Mounjaro — Ativos em risco',
    type: 'RETORNO', channel: 'WhatsApp', status: 'ATIVO',
    segment: 'Pacientes Mounjaro com 60+ dias sem retorno',
    sent: 182, opened: 134, replied: 47, converted: 28,
    scheduled: '2026-04-23 08:00', repeat: 'Semanal',
  },
  {
    id: '2', name: 'Aniversariantes de Maio',
    type: 'ANIVERSARIO', channel: 'WhatsApp', status: 'AGENDADO',
    segment: 'Pacientes com aniversário em Maio',
    sent: 0, opened: 0, replied: 0, converted: 0,
    scheduled: '2026-05-01 09:00', repeat: 'Único',
  },
  {
    id: '3', name: 'Protocolo Hormonal — Lembrete Semestral',
    type: 'PROTOCOLO', channel: 'E-mail + WhatsApp', status: 'ATIVO',
    segment: 'Pacientes Implante Testosterona > 180 dias sem retorno',
    sent: 93, opened: 71, replied: 22, converted: 18,
    scheduled: '2026-04-15 10:00', repeat: 'Mensal',
  },
  {
    id: '4', name: 'Pesquisa de Satisfação Pós-Consulta',
    type: 'NPS', channel: 'WhatsApp', status: 'ATIVO',
    segment: 'Todos os pacientes — 24h após consulta',
    sent: 1840, opened: 1620, replied: 892, converted: null,
    scheduled: 'Automático', repeat: 'A cada consulta',
  },
  {
    id: '5', name: 'Reativação Tier Silver (inativos)',
    type: 'REATIVACAO', channel: 'E-mail', status: 'PAUSADO',
    segment: 'Tier Silver — 90-180 dias sem retorno',
    sent: 340, opened: 198, replied: 41, converted: 12,
    scheduled: '2026-04-01 11:00', repeat: 'Quinzenal',
  },
];

const MOCK_NPS_DATA = [
  { month: 'Nov/25', nps: 62, promotores: 68, neutros: 18, detratores: 14 },
  { month: 'Dez/25', nps: 65, promotores: 70, neutros: 17, detratores: 13 },
  { month: 'Jan/26', nps: 68, promotores: 73, neutros: 15, detratores: 12 },
  { month: 'Fev/26', nps: 71, promotores: 76, neutros: 13, detratores: 11 },
  { month: 'Mar/26', nps: 74, promotores: 78, neutros: 14, detratores: 8 },
  { month: 'Abr/26', nps: 77, promotores: 81, neutros: 12, detratores: 7 },
];

const MOCK_SATISFACTION = [
  { category: 'Atendimento médico', score: 4.8, responses: 312 },
  { category: 'Recepção e agendamento', score: 4.6, responses: 298 },
  { category: 'Limpeza e estrutura', score: 4.7, responses: 290 },
  { category: 'Tempo de espera', score: 4.1, responses: 301 },
  { category: 'Resultado do tratamento', score: 4.9, responses: 278 },
  { category: 'Custo-benefício', score: 4.4, responses: 265 },
];

const MOCK_SEGMENTS = [
  { name: 'Diamante', count: 9, tier: 'DIAMANTE', desc: '> R$ 200k gastos', color: '#06b6d4' },
  { name: 'Platina', count: 27, tier: 'PLATINA', desc: 'R$ 100k–200k', color: '#8b5cf6' },
  { name: 'VIP', count: 90, tier: 'VIP', desc: 'R$ 50k–100k', color: '#f59e0b' },
  { name: 'Gold', count: 231, tier: 'GOLD', desc: 'R$ 20k–50k', color: '#eab308' },
  { name: 'Silver', count: 593, tier: 'SILVER', desc: 'R$ 5k–20k', color: '#6b7280' },
  { name: 'Bronze', count: 1612, tier: 'BRONZE', desc: '< R$ 5k', color: '#cd7f32' },
  { name: 'Mounjaro Coorte', count: 748, tier: 'COORTE', desc: 'Pacientes Mounjaro', color: '#22c55e' },
  { name: 'Implante Hormonal', count: 191, tier: 'COORTE', desc: 'Testosterona / Gestrinona', color: '#3b82f6' },
  { name: 'Em Risco de Perda', count: 482, tier: 'RISCO', desc: '60–90 dias sem retorno', color: '#ef4444' },
  { name: 'Perdidos', count: 1243, tier: 'PERDIDO', desc: '> 180 dias sem retorno', color: '#9ca3af' },
  { name: 'Aniversariantes (Maio)', count: 87, tier: 'DATA', desc: 'Nascidos em Maio', color: '#f43f5e' },
  { name: 'Mala Direta', count: 4218, tier: 'TODOS', desc: 'Aceitaram comunicação', color: '#64748b' },
  { name: 'Sem Protocolo Ativo', count: 834, tier: 'SEM_PROTOCOLO', desc: 'Nunca tiveram protocolo', color: '#f97316' },
  { name: 'Inadimplentes', count: 127, tier: 'INADIMPLENTE', desc: 'Débito em aberto > 30 dias', color: '#dc2626' },
  { name: 'Retorno Pendente', count: 391, tier: 'RETORNO', desc: '30–60 dias sem retorno', color: '#f59e0b' },
  { name: 'Inativos', count: 1243, tier: 'INATIVO', desc: '> 180 dias sem retorno', color: '#9ca3af' },
];

const MOCK_AI_CONTENT = [
  {
    id: '1', type: 'Post Instagram', title: 'Mounjaro: entenda como funciona',
    preview: '🔬 A ciência por trás da revolução no emagrecimento. O tirzepatide age em dois receptores simultaneamente...',
    platform: 'Instagram', status: 'pronto', created: '2026-04-22',
  },
  {
    id: '2', type: 'E-mail campanha', title: 'Protocolo hormonal personalizado — sua saúde em foco',
    preview: 'Olá [Nome], há algum tempo não nos vemos por aqui e gostaríamos de te lembrar da importância...',
    platform: 'E-mail', status: 'pronto', created: '2026-04-22',
  },
  {
    id: '3', type: 'Roteiro Reels', title: 'Por que o implante dura 6 meses?',
    preview: 'Gancho: "Você sabia que existe um tratamento hormonal que você faz UMA VEZ e funciona por 6 meses?"...',
    platform: 'Instagram Reels', status: 'rascunho', created: '2026-04-23',
  },
  {
    id: '4', type: 'WhatsApp template', title: 'Lembrete de retorno personalizado',
    preview: 'Olá [Nome] 👋 Saudades de você na Clínica Luminar! Faz [X] dias desde nossa última consulta...',
    platform: 'WhatsApp', status: 'pronto', created: '2026-04-21',
  },
];

const STATUS_STYLES: Record<string, string> = {
  ATIVO: 'bg-green-100 text-green-700',
  AGENDADO: 'bg-blue-100 text-blue-700',
  PAUSADO: 'bg-amber-100 text-amber-700',
  RASCUNHO: 'bg-gray-100 text-gray-600',
};

const TYPE_STYLES: Record<string, string> = {
  RETORNO: 'bg-orange-100 text-orange-700',
  ANIVERSARIO: 'bg-pink-100 text-pink-700',
  PROTOCOLO: 'bg-purple-100 text-purple-700',
  NPS: 'bg-cyan-100 text-cyan-700',
  REATIVACAO: 'bg-red-100 text-red-700',
};

const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

const SEGMENT_NAMES = MOCK_SEGMENTS.map(s => s.name);

// ── Nova Campanha Modal ────────────────────────────────────────────────────────

function NovaCampanhaModal({ open, onClose, onSave }: {
  open: boolean; onClose: () => void;
  onSave: (c: any) => void;
}) {
  const [form, setForm] = useState({
    name: '', type: 'RETORNO', channel: 'WhatsApp', segment: '',
    scheduled: '', repeat: 'Único', message: '',
  });
  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (!form.segment) { toast.error('Selecione um segmento'); return; }
    onSave({
      id: String(Date.now()),
      ...form,
      status: form.scheduled ? 'AGENDADO' : 'RASCUNHO',
      sent: 0, opened: 0, replied: 0, converted: 0,
    });
    toast.success(`Campanha "${form.name}" criada`);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" />Nova Campanha</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Nome da campanha *</label>
            <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Ex: Retorno Mounjaro — Abril" value={form.name} onChange={e => f('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.type} onChange={e => f('type', e.target.value)}>
                {['RETORNO', 'ANIVERSARIO', 'PROTOCOLO', 'NPS', 'REATIVACAO'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Canal</label>
              <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.channel} onChange={e => f('channel', e.target.value)}>
                {['WhatsApp', 'E-mail', 'WhatsApp + E-mail'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Segmento de pacientes *</label>
            <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={form.segment} onChange={e => f('segment', e.target.value)}>
              <option value="">Selecione...</option>
              {SEGMENT_NAMES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Agendamento</label>
              <input type="datetime-local" className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.scheduled} onChange={e => f('scheduled', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Repetição</label>
              <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                value={form.repeat} onChange={e => f('repeat', e.target.value)}>
                {['Único', 'Diário', 'Semanal', 'Quinzenal', 'Mensal'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Mensagem / Template</label>
            <textarea rows={4} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Olá [Nome]! Sentimos sua falta..." value={form.message} onChange={e => f('message', e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-1">Use [Nome], [Data], [Protocolo] para personalização</p>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t">
          <Button variant="ghost" onClick={onClose} size="sm">Cancelar</Button>
          <Button onClick={handleSave} size="sm" className="flex-1">Criar Campanha</Button>
        </div>
      </div>
    </div>
  );
}

// ── Tab panels ─────────────────────────────────────────────────────────────────

function CampanhasTab({ onNovaCampanha }: { onNovaCampanha: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = MOCK_CAMPAIGNS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSent = MOCK_CAMPAIGNS.reduce((s, c) => s + c.sent, 0);
  const totalConverted = MOCK_CAMPAIGNS.filter(c => c.converted).reduce((s, c) => s + (c.converted ?? 0), 0);
  const activeCount = MOCK_CAMPAIGNS.filter(c => c.status === 'ATIVO').length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Campanhas Ativas', value: activeCount, icon: Play, color: 'text-green-600' },
          { label: 'Mensagens Enviadas (30d)', value: totalSent.toLocaleString(), icon: Send, color: 'text-blue-600' },
          { label: 'Taxa de Resposta Média', value: '31%', icon: MessageSquare, color: 'text-purple-600' },
          { label: 'Conversões (30d)', value: totalConverted, icon: CheckCircle, color: 'text-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <Icon className={cn('h-4 w-4', color)} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Input placeholder="Buscar campanha..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => toast.info('Em desenvolvimento')}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Importar Segmento</Button>
          <Button size="sm" onClick={onNovaCampanha}><Plus className="h-3.5 w-3.5 mr-1.5" />Nova Campanha</Button>
        </div>
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {filtered.map(c => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-border bg-white hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', STATUS_STYLES[c.status])}>
                    {c.status}
                  </span>
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', TYPE_STYLES[c.type] ?? 'bg-gray-100 text-gray-600')}>
                    {c.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{c.channel}</span>
                </div>
                <p className="font-semibold text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.segment}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{c.scheduled} · {c.repeat}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-4">
                {c.status === 'ATIVO'
                  ? <Button variant="ghost" className="h-7 w-7" onClick={() => toast.info('Pausar campanha em desenvolvimento')}><Pause className="h-3.5 w-3.5" /></Button>
                  : <Button variant="ghost" className="h-7 w-7" onClick={() => toast.info('Ativar campanha em desenvolvimento')}><Play className="h-3.5 w-3.5" /></Button>}
                <Button variant="ghost" className="h-7 w-7" onClick={() => toast.info('Em desenvolvimento')}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" className="h-7 w-7" onClick={() => toast.info('Em desenvolvimento')}><Copy className="h-3.5 w-3.5" /></Button>
              </div>
            </div>

            {c.sent > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-border">
                {[
                  { label: 'Enviadas', value: c.sent },
                  { label: 'Abertas', value: c.opened, pct: pct(c.opened, c.sent) },
                  { label: 'Respondidas', value: c.replied, pct: pct(c.replied, c.sent) },
                  { label: 'Convertidas', value: c.converted ?? '—', pct: c.converted ? pct(c.converted, c.sent) : null },
                ].map(({ label, value, pct: p }) => (
                  <div key={label} className="text-center">
                    <p className="text-base font-bold">{value}</p>
                    {p != null && <p className="text-xs text-muted-foreground">{p}%</p>}
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function QualidadeTab() {
  const currentNPS = MOCK_NPS_DATA[MOCK_NPS_DATA.length - 1].nps;
  const prevNPS = MOCK_NPS_DATA[MOCK_NPS_DATA.length - 2].nps;
  const diff = currentNPS - prevNPS;

  return (
    <div className="space-y-6">
      {/* NPS Hero */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 p-6 rounded-xl border-2 border-primary bg-primary/5 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">NPS Score</p>
          <p className="text-6xl font-black text-primary">{currentNPS}</p>
          <p className={cn('text-sm font-semibold mt-1', diff > 0 ? 'text-green-600' : 'text-red-600')}>
            {diff > 0 ? '+' : ''}{diff} vs. mês anterior
          </p>
          <div className="mt-3 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">EXCELENTE</div>
        </div>
        <div className="col-span-3 p-4 rounded-xl border border-border bg-white">
          <p className="text-sm font-semibold mb-3">Evolução NPS (6 meses)</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={MOCK_NPS_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="nps" stroke="#ff8c00" strokeWidth={2.5} dot={{ r: 4, fill: '#ff8c00' }} name="NPS" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Promoters / Detractors */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Promotores', pct: MOCK_NPS_DATA[MOCK_NPS_DATA.length - 1].promotores, color: 'bg-green-500', icon: ThumbsUp },
          { label: 'Neutros', pct: MOCK_NPS_DATA[MOCK_NPS_DATA.length - 1].neutros, color: 'bg-amber-400', icon: Heart },
          { label: 'Detratores', pct: MOCK_NPS_DATA[MOCK_NPS_DATA.length - 1].detratores, color: 'bg-red-500', icon: AlertTriangle },
        ].map(({ label, pct: p, color, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl border border-border bg-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{label}</p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{p}%</p>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full', color)} style={{ width: `${p}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Satisfaction by category */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <p className="text-sm font-semibold mb-4">Satisfação por Categoria</p>
        <div className="space-y-3">
          {MOCK_SATISFACTION.map(({ category, score, responses }) => (
            <div key={category} className="flex items-center gap-3">
              <p className="text-sm w-52 flex-shrink-0">{category}</p>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full', score >= 4.7 ? 'bg-green-500' : score >= 4.3 ? 'bg-amber-400' : 'bg-red-500')}
                  style={{ width: `${(score / 5) * 100}%` }}
                />
              </div>
              <p className="text-sm font-bold w-8">{score}</p>
              <p className="text-xs text-muted-foreground w-20 text-right">{responses} respostas</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent feedback */}
      <div className="p-4 rounded-xl border border-border bg-white">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Comentários Recentes</p>
          <Button variant="secondary" size="sm"><Eye className="h-3.5 w-3.5 mr-1.5" />Ver todos</Button>
        </div>
        <div className="space-y-3">
          {[
            { patient: 'Ana L.', score: 10, comment: 'Atendimento excepcional! Dr. Murilo é incrível e os resultados do protocolo superaram minhas expectativas.', date: '2026-04-22' },
            { patient: 'Carlos M.', score: 9, comment: 'Equipe muito atenciosa. Só melhoraria o tempo de espera na recepção.', date: '2026-04-21' },
            { patient: 'Beatriz F.', score: 10, comment: 'Clínica top! Já indiquei para vários amigos. O Mounjaro mudou minha vida.', date: '2026-04-20' },
          ].map(({ patient, score, comment, date }) => (
            <div key={patient} className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{patient}</span>
                  <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', score >= 9 ? 'bg-green-100 text-green-700' : score >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                    {score}/10
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{date}</span>
              </div>
              <p className="text-xs text-muted-foreground italic">"{comment}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SegmentacaoTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Segmentos de Pacientes</h2>
          <p className="text-sm text-muted-foreground">6.036 pacientes segmentados por tier, procedimento e comportamento</p>
        </div>
        <Button size="sm" onClick={() => toast.info('Em desenvolvimento')}><Brain className="h-3.5 w-3.5 mr-1.5" />Criar Segmento IA</Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MOCK_SEGMENTS.map(seg => (
          <div key={seg.name} className="p-4 rounded-xl border border-border bg-white hover:border-primary/30 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                  style={{ backgroundColor: seg.color }}>
                  {seg.count > 999 ? `${Math.round(seg.count / 1000)}k` : seg.count}
                </div>
                <div>
                  <p className="text-sm font-semibold">{seg.name}</p>
                  <p className="text-xs text-muted-foreground">{seg.desc}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" className="h-7 w-7" onClick={() => toast.info('Envio de campanha em desenvolvimento')}>
                  <Send className="h-3 w-3" />
                </Button>
                <Button variant="ghost" className="h-7 w-7">
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AYRON AI segmentation */}
      <div className="p-5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">Segmentação Inteligente AYRON</p>
            <p className="text-xs text-muted-foreground mt-1">
              Descreva em linguagem natural o segmento que você quer criar e a AYRON irá identificar os pacientes automaticamente.
            </p>
            <div className="flex gap-2 mt-3">
              <Input placeholder="Ex: Pacientes Mounjaro que fizeram procedimento nos últimos 90 dias e não retornaram" className="flex-1 text-xs" />
              <Button size="sm"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Criar</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConteudoIATab() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1800));
    setGenerating(false);
    toast.info('Geração de conteúdo IA em integração — disponível em breve');
    setPrompt('');
  };

  const PLATFORM_COLORS: Record<string, string> = {
    'Instagram': 'bg-pink-100 text-pink-700',
    'E-mail': 'bg-blue-100 text-blue-700',
    'Instagram Reels': 'bg-purple-100 text-purple-700',
    'WhatsApp': 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="p-5 rounded-xl border border-border bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Gerar Conteúdo com AYRON</p>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '📸 Post Instagram', prompt: 'Post Instagram educativo sobre protocolo hormonal masculino, tom científico mas acessível' },
              { label: '🎬 Roteiro Reels', prompt: 'Roteiro de Reels de 60 segundos sobre Mounjaro: resultados reais, tom motivacional' },
              { label: '📧 E-mail campanha', prompt: 'E-mail de reativação para paciente inativo há 90 dias, tom acolhedor e personalizado' },
              { label: '💬 Template WhatsApp', prompt: 'Mensagem WhatsApp de lembrete de retorno pós-implante hormonal, objetiva e calorosa' },
              { label: '📝 Blog post', prompt: 'Artigo de blog sobre os benefícios da soroterapia IV para longevidade, 400 palavras' },
              { label: '🎯 Campanha NPS', prompt: 'Mensagem de pesquisa de satisfação pós-consulta, curta, que incentiva resposta' },
            ].map(({ label, prompt: p }) => (
              <button
                key={label}
                onClick={() => setPrompt(p)}
                className="p-2.5 rounded-lg border border-border text-xs text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Ou descreva o conteúdo que você precisa..."
            className="w-full h-20 rounded-lg border border-border px-3 py-2 text-sm resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          <Button onClick={generate} disabled={generating || !prompt.trim()} className="w-full">
            {generating ? (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />Gerando com AYRON...</>
            ) : (
              <><Brain className="h-3.5 w-3.5 mr-1.5" />Gerar Conteúdo</>
            )}
          </Button>
        </div>
      </div>

      {/* Content library */}
      <div>
        <p className="text-sm font-semibold mb-3">Biblioteca de Conteúdo</p>
        <div className="grid grid-cols-2 gap-4">
          {MOCK_AI_CONTENT.map(c => (
            <div key={c.id} className="p-4 rounded-xl border border-border bg-white hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', PLATFORM_COLORS[c.platform] ?? 'bg-gray-100 text-gray-600')}>
                  {c.platform}
                </span>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  c.status === 'pronto' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                  {c.status === 'pronto' ? '✓ Pronto' : '✏ Rascunho'}
                </span>
              </div>
              <p className="text-sm font-semibold mb-1">{c.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{c.preview}</p>
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => toast.info('Em desenvolvimento')}><Eye className="h-3 w-3 mr-1" />Ver</Button>
                <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => toast.info('Em desenvolvimento')}><Copy className="h-3 w-3 mr-1" />Copiar</Button>
                <Button size="sm" className="flex-1 text-xs" onClick={() => toast.info('Em desenvolvimento')}><Send className="h-3 w-3 mr-1" />Usar</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PortalTab() {
  const [portalSaudacao, setPortalSaudacao] = useState('');
  const [portalContato, setPortalContato] = useState('');
  return (
    <div className="space-y-6">
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {['Textos do portal','Links e redes sociais','Logotipo e imagens'].map(t=>(
          <button key={t} className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white transition-colors">{t}</button>
        ))}
      </div>
      <div className="grid gap-4">
        <div><label className="text-sm font-medium">Texto de Saudação</label><textarea rows={3} className="w-full mt-2 rounded-lg border px-3 py-2 text-sm resize-none" placeholder="Bem-vindo ao portal do paciente..." value={portalSaudacao} onChange={e => setPortalSaudacao(e.target.value)} /></div>
        <div><label className="text-sm font-medium">Locais de Atendimento e Contato</label><textarea rows={3} className="w-full mt-2 rounded-lg border px-3 py-2 text-sm resize-none" placeholder="Rua exemplo, 123 — São Paulo, SP..." value={portalContato} onChange={e => setPortalContato(e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => toast.info('Em desenvolvimento')}>Voltar</Button>
        <Button onClick={() => toast.info('Salvamento de portal em desenvolvimento')}>Salvar</Button>
      </div>
    </div>
  );
}

function R1IATab() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Ferramentas de geração de conteúdo com Inteligência Artificial:</p>
      <div className="grid grid-cols-1 gap-3">
        {[
          'Gerar texto para post no Instagram/Facebook',
          'Gerar texto para post no Instagram/Facebook baseado em conteúdo',
          'Gerar roteiro para reels do Instagram ou shorts do YouTube',
          'Gerar roteiro para reels baseado em conteúdo existente',
          'Gerar texto para campanha de email marketing',
          'Gerar uma imagem',
        ].map(tool => (
          <button key={tool} onClick={() => toast.info(`Gerando: ${tool}...`)}
            className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-left hover:bg-muted/40 transition-colors group">
            <Brain className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm">{tool}</span>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary" />
          </button>
        ))}
      </div>
      <Button variant="ghost">Voltar</Button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [tab, setTab] = useState<TabKey>('campanhas');
  const [showNovaCampanha, setShowNovaCampanha] = useState(false);
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);

  return (
    <div>
      <Topbar title="Marketing & Qualidade" />
      <div className="p-6 space-y-6">

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                tab === key ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'campanhas' && <CampanhasTab onNovaCampanha={() => setShowNovaCampanha(true)} />}
        {tab === 'qualidade' && <QualidadeTab />}
        {tab === 'segmentacao' && <SegmentacaoTab />}
        {tab === 'conteudo_ia' && <ConteudoIATab />}
        {tab === 'portal' && <PortalTab />}
        {tab === 'r1_ia' && <R1IATab />}
      </div>

      <NovaCampanhaModal
        open={showNovaCampanha}
        onClose={() => setShowNovaCampanha(false)}
        onSave={c => { setCampaigns(prev => [c, ...prev]); setShowNovaCampanha(false); }}
      />
    </div>
  );
}
