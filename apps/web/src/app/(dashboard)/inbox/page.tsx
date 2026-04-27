'use client';
import { useState, useMemo } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Inbox, MessageSquare, ClipboardList, Clock, Bell,
  CheckCircle, Plus, Search, X, ArrowRight, User,
  AlertTriangle, Package, DollarSign, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

type ItemType = 'message' | 'task' | 'pending' | 'alert';

interface InboxItem {
  id: string;
  type: ItemType;
  title: string;
  subtitle: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
  resolved: boolean;
  patient?: string;
}

// ── Mock data ──────────────────────────────────────────────────────────────────

const INITIAL_ITEMS: InboxItem[] = [
  // Messages
  { id: 'M1', type: 'message', title: 'Ana Lima', subtitle: 'Posso remarcar minha consulta de quinta?', time: '14:32', priority: 'high', resolved: false, patient: 'Ana Lima' },
  { id: 'M2', type: 'message', title: 'Beatriz Fernandes', subtitle: 'Segue em anexo meus exames mais recentes', time: 'Ontem', priority: 'medium', resolved: false, patient: 'Beatriz Fernandes' },
  { id: 'M3', type: 'message', title: 'Equipe Clínica', subtitle: 'Lorrana: Paciente #4821 chegou para sessão', time: '14:45', priority: 'high', resolved: false },

  // Tasks
  { id: 'T1', type: 'task', title: 'Ligar para Carlos Souza', subtitle: 'Confirmação de consulta — quinta-feira 15h', time: '10:00', priority: 'high', resolved: false, patient: 'Carlos Souza' },
  { id: 'T2', type: 'task', title: 'Enviar resultado de exame', subtitle: 'Beatriz Fernandes aguardando laudo hemograma', time: 'Ontem', priority: 'high', resolved: false, patient: 'Beatriz Fernandes' },
  { id: 'T3', type: 'task', title: 'Renovar receita Pedro Gomes', subtitle: 'Testosterona Enantato — protocolo vencendo em 5 dias', time: '09:00', priority: 'medium', resolved: false, patient: 'Pedro Gomes' },
  { id: 'T4', type: 'task', title: 'Atualizar prontuário Marina Costa', subtitle: 'Sessão de HCG de segunda-feira não registrada', time: '11:00', priority: 'low', resolved: false, patient: 'Marina Costa' },

  // Pending
  { id: 'P1', type: 'pending', title: 'Autorização TISS pendente', subtitle: 'Ozempic — plano Amil — aguardando há 3 dias', time: '3d', priority: 'high', resolved: false },
  { id: 'P2', type: 'pending', title: 'Pagamento em aberto', subtitle: 'Ana Lima — R$ 1.200 vencido há 15 dias', time: '15d', priority: 'high', resolved: false, patient: 'Ana Lima' },
  { id: 'P3', type: 'pending', title: 'Agendamento sem confirmação', subtitle: 'Pedro Gomes — consulta quinta — sem resposta', time: '2d', priority: 'medium', resolved: false, patient: 'Pedro Gomes' },
  { id: 'P4', type: 'pending', title: 'Exame sem laudo', subtitle: 'Beatriz Fernandes — TSH/T4 — Delboni — 5 dias', time: '5d', priority: 'medium', resolved: false, patient: 'Beatriz Fernandes' },

  // Alerts
  { id: 'A1', type: 'alert', title: 'Estoque crítico — Mounjaro 10mg', subtitle: '8 unidades restantes (mínimo: 10)', time: '1h', priority: 'high', resolved: false },
  { id: 'A2', type: 'alert', title: 'Caixa aberto há 2 dias', subtitle: 'Fechamento de caixa pendente desde 25/04', time: '2d', priority: 'high', resolved: false },
  { id: 'A3', type: 'alert', title: 'Retorno atrasado — Marina Costa', subtitle: '45 dias sem retorno — protocolo Semaglutida', time: '45d', priority: 'medium', resolved: false, patient: 'Marina Costa' },
  { id: 'A4', type: 'alert', title: 'Protocolo vencendo — Carlos Souza', subtitle: 'HCG — vence em 7 dias', time: '7d', priority: 'medium', resolved: false, patient: 'Carlos Souza' },
];

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS: { key: ItemType | 'todos'; label: string; icon: any }[] = [
  { key: 'todos', label: 'Todos', icon: Inbox },
  { key: 'message', label: 'Mensagens', icon: MessageSquare },
  { key: 'task', label: 'Tarefas', icon: ClipboardList },
  { key: 'pending', label: 'Pendências', icon: Clock },
  { key: 'alert', label: 'Alertas', icon: Bell },
];

const TYPE_ICON: Record<ItemType, any> = {
  message: MessageSquare,
  task: ClipboardList,
  pending: Clock,
  alert: AlertTriangle,
};

const TYPE_COLOR: Record<ItemType, string> = {
  message: 'bg-blue-100 text-blue-700',
  task: 'bg-purple-100 text-purple-700',
  pending: 'bg-amber-100 text-amber-700',
  alert: 'bg-red-100 text-red-700',
};

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-green-400',
};

const TYPE_LABEL: Record<ItemType, string> = {
  message: 'Mensagem',
  task: 'Tarefa',
  pending: 'Pendência',
  alert: 'Alerta',
};

// ── Convert to Task Modal ──────────────────────────────────────────────────────

function ConvertModal({ item, onClose, onConvert }: {
  item: InboxItem;
  onClose: () => void;
  onConvert: (title: string, due: string, notes: string) => void;
}) {
  const [title, setTitle] = useState(`Responder: ${item.title}`);
  const [due, setDue] = useState('');
  const [notes, setNotes] = useState(item.subtitle);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Converter em Tarefa
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Título da tarefa</label>
            <input
              className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={title} onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Prazo</label>
            <input
              type="datetime-local"
              className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              value={due} onChange={e => setDue(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Observações</label>
            <textarea
              rows={2}
              className="w-full mt-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={notes} onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="flex-1" onClick={() => onConvert(title, due, notes)}>
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />Criar Tarefa
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Item Card ──────────────────────────────────────────────────────────────────

function ItemCard({ item, onResolve, onConvert }: {
  item: InboxItem;
  onResolve: (id: string) => void;
  onConvert: (item: InboxItem) => void;
}) {
  const Icon = TYPE_ICON[item.type];
  return (
    <div className={cn(
      'rounded-xl border bg-white p-4 flex items-start gap-3 transition-all',
      item.resolved ? 'opacity-50 border-border/50' : 'border-border hover:border-primary/30'
    )}>
      {/* Priority dot */}
      <div className="pt-1 flex-shrink-0">
        <span className={cn('block h-2 w-2 rounded-full', item.resolved ? 'bg-gray-300' : PRIORITY_DOT[item.priority])} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full', TYPE_COLOR[item.type])}>
            <Icon className="h-2.5 w-2.5" />{TYPE_LABEL[item.type]}
          </span>
          {item.patient && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <User className="h-2.5 w-2.5" />{item.patient}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{item.time}</span>
        </div>
        <p className={cn('text-sm font-medium', item.resolved && 'line-through text-muted-foreground')}>{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
      </div>

      {/* Actions */}
      {!item.resolved && (
        <div className="flex gap-1 flex-shrink-0">
          {item.type === 'message' && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
              onClick={() => onConvert(item)}>
              <ArrowRight className="h-3 w-3 mr-1" />Tarefa
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
            onClick={() => onResolve(item.id)} title="Marcar como resolvido">
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState<ItemType | 'todos'>('todos');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<InboxItem[]>(INITIAL_ITEMS);
  const [convertItem, setConvertItem] = useState<InboxItem | null>(null);
  const [showResolved, setShowResolved] = useState(false);

  const filtered = useMemo(() => items.filter(i => {
    if (!showResolved && i.resolved) return false;
    if (activeTab !== 'todos' && i.type !== activeTab) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) &&
      !i.subtitle.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, activeTab, search, showResolved]);

  const counts = useMemo(() => {
    const unresolved = items.filter(i => !i.resolved);
    return {
      todos: unresolved.length,
      message: unresolved.filter(i => i.type === 'message').length,
      task: unresolved.filter(i => i.type === 'task').length,
      pending: unresolved.filter(i => i.type === 'pending').length,
      alert: unresolved.filter(i => i.type === 'alert').length,
    };
  }, [items]);

  const handleResolve = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, resolved: true } : i));
    toast.success('Marcado como resolvido');
  };

  const handleConvert = (title: string, _due: string, _notes: string) => {
    if (!convertItem) return;
    const newTask: InboxItem = {
      id: `T${Date.now()}`,
      type: 'task',
      title,
      subtitle: _notes,
      time: 'agora',
      priority: 'high',
      resolved: false,
      patient: convertItem.patient,
    };
    setItems(prev => [newTask, ...prev.map(i => i.id === convertItem.id ? { ...i, resolved: true } : i)]);
    toast.success(`Tarefa "${title}" criada`);
    setConvertItem(null);
  };

  const highCount = items.filter(i => !i.resolved && i.priority === 'high').length;

  return (
    <div>
      <Topbar title="Inbox" />
      <div className="p-6 space-y-4">

        {/* Summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Pendentes total', value: counts.todos, icon: Inbox, color: 'text-primary' },
            { label: 'Mensagens não lidas', value: counts.message, icon: MessageSquare, color: 'text-blue-600' },
            { label: 'Tarefas abertas', value: counts.task, icon: ClipboardList, color: 'text-purple-600' },
            { label: 'Alta prioridade', value: highCount, icon: AlertTriangle, color: 'text-red-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-border bg-white p-4 flex items-center gap-3">
              <Icon className={cn('h-5 w-5 flex-shrink-0', color)} />
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Buscar no inbox..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant={showResolved ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowResolved(v => !v)}
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />{showResolved ? 'Ocultar resolvidos' : 'Ver resolvidos'}
          </Button>
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5 mr-1" />Limpar
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = key === 'todos' ? counts.todos : counts[key as ItemType];
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  activeTab === key ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {count > 0 && (
                  <span className={cn(
                    'min-w-[16px] h-4 rounded-full text-[10px] font-bold flex items-center justify-center px-1',
                    activeTab === key ? 'bg-primary text-white' : 'bg-muted-foreground/20 text-muted-foreground'
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Items */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Inbox limpo 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onResolve={handleResolve}
                onConvert={setConvertItem}
              />
            ))}
          </div>
        )}
      </div>

      {convertItem && (
        <ConvertModal
          item={convertItem}
          onClose={() => setConvertItem(null)}
          onConvert={handleConvert}
        />
      )}
    </div>
  );
}
