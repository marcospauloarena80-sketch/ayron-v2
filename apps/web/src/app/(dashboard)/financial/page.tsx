'use client';
export const dynamic = 'force-dynamic';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { AdvancedFilter } from '@/components/ui/advanced-filter';
import { ConfirmActionModal } from '@/components/ui/confirm-action-modal';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import { fetchFinancialTransactions } from '@/lib/supabase/queries';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingUp, AlertCircle, Plus, Download, Calendar,
  CheckCircle, XCircle, RefreshCw, BarChart3, Globe, CreditCard,
  FileText, Receipt, Package, Activity, Cpu, Shield, Brain,
  ArrowLeftRight, Upload, Printer, Send, Search, Filter,
  Edit2, ChevronLeft, Bot, Sparkles, Building2, FilePlus,
  ClipboardList, TrendingDown, Wallet, PieChart, X, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const parseCurrency = (v: string): number => {
  const cleaned = v.replace(/[R$\s.]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const maskCurrency = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const todayISO = () => new Date().toISOString().split('T')[0];

// ── CurrencyInput ─────────────────────────────────────────────────────────────

function CurrencyInput({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium mb-1">{label}{required && ' *'}</label>}
      <input
        value={value}
        onChange={e => onChange(maskCurrency(e.target.value))}
        placeholder="R$ 0,00"
        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}

// ── PatientSearch ─────────────────────────────────────────────────────────────

function PatientSearch({ label, onSelect }: { label?: string; onSelect: (p: any) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.get('/patients', { params: { search: query, limit: 8 } });
        const list = Array.isArray(r.data) ? r.data : r.data?.data ?? [];
        setResults(list);
        setOpen(true);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  return (
    <div className="relative">
      {label && <label className="block text-xs font-medium mb-1">{label} *</label>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Digite nome ou CPF do paciente..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">…</span>}
      </div>
      {open && (results.length > 0 ? (
        <div className="absolute z-30 top-full mt-1 w-full rounded-xl border border-border bg-white shadow-lg py-1 max-h-48 overflow-y-auto">
          {results.map((p: any) => (
            <button key={p.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm"
              onMouseDown={() => { setQuery(p.full_name || p.name || ''); setOpen(false); onSelect(p); }}>
              <span className="font-medium">{p.full_name || p.name}</span>
              {p.cpf && <span className="text-xs text-muted-foreground ml-2">{p.cpf}</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className="absolute z-30 top-full mt-1 w-full rounded-xl border border-border bg-white shadow-lg py-2 px-3 text-sm text-muted-foreground">
          Nenhum paciente encontrado para "{query}"
        </div>
      ))}
    </div>
  );
}

// ── MasterPasswordModal ───────────────────────────────────────────────────────

const MASTER_PW_CHECK = 'Ayron@Master2025!';

function MasterPasswordModal({ open, onClose, title, onConfirm }: {
  open: boolean; onClose: () => void; title: string; onConfirm: (justification: string) => void;
}) {
  const [pw, setPw] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');
  if (!open) return null;

  const handleConfirm = () => {
    if (pw !== MASTER_PW_CHECK) { setError('Senha incorreta'); return; }
    if (!justification.trim()) { setError('Justificativa obrigatória'); return; }
    onConfirm(justification);
    setPw(''); setJustification(''); setError('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">Ação protegida. Requer senha Master e justificativa.</p>
        <div>
          <label className="text-xs font-medium">Senha Master *</label>
          <input type="password" value={pw} onChange={e => { setPw(e.target.value); setError(''); }}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium">Justificativa *</label>
          <textarea value={justification} onChange={e => { setJustification(e.target.value); setError(''); }} rows={3}
            placeholder="Descreva o motivo da alteração..."
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { onClose(); setPw(''); setJustification(''); setError(''); }}>Cancelar</Button>
          <Button onClick={handleConfirm}><Shield className="h-3.5 w-3.5 mr-1.5" />Confirmar</Button>
        </div>
      </div>
    </div>
  );
}

// ── EditVendaModal ────────────────────────────────────────────────────────────

function EditVendaModal({ venda, onClose, onSave }: { venda: any; onClose: () => void; onSave: (v: any) => void }) {
  const isPaid = venda?.status === 'PAID';
  const [masterUnlocked, setMasterUnlocked] = useState(false);
  const [showMasterPw, setShowMasterPw] = useState(false);
  const [obs, setObs] = useState(venda?.obs ?? '');
  const [date, setDate] = useState(venda?.date ?? '');
  const [valueStr, setValueStr] = useState(fmt(venda?.value ?? 0));
  const [status, setStatus] = useState(venda?.status ?? 'OPEN');
  const [tabela, setTabela] = useState(venda?.tabela ?? 'Particular');
  const [filial, setFilial] = useState(venda?.filial ?? 'Principal');

  if (!venda) return null;
  const locked = isPaid && !masterUnlocked;

  const handleSave = () => {
    onSave({ ...venda, date, value: parseCurrency(valueStr), status: locked ? venda.status : status, tabela, filial, obs });
    onClose();
    toast.success('Registro atualizado');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Editar — {venda.id} · {venda.client}</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        {isPaid && !masterUnlocked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
            <Shield className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Fatura paga — campos bloqueados</p>
              <p className="text-xs text-amber-700 mt-0.5">Apenas observações podem ser adicionadas. Para editar dados, use a senha Master.</p>
              <button onClick={() => setShowMasterPw(true)} className="text-xs text-amber-800 underline mt-1">Usar senha Master →</button>
            </div>
          </div>
        )}

        <div className={cn('space-y-3', locked && 'opacity-40 pointer-events-none select-none')}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <CurrencyInput label="Valor" value={valueStr} onChange={setValueStr} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
                <option value="OPEN">Em aberto</option>
                <option value="PARTIALLY_PAID">Parcial</option>
                <option value="PAID">Pago</option>
                <option value="OVERDUE">Vencido</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Tabela/Convênio</label>
              <select value={tabela} onChange={e => setTabela(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
                <option>Particular</option><option>Unimed</option><option>Bradesco</option><option>Amil</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Filial</label>
            <select value={filial} onChange={e => setFilial(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
              <option>Principal</option><option>Filial 2</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium">Observações {isPaid && !masterUnlocked && '(único campo editável)'}</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar alterações</Button>
        </div>

        <MasterPasswordModal open={showMasterPw} onClose={() => setShowMasterPw(false)}
          title="Editar fatura paga"
          onConfirm={justification => {
            setMasterUnlocked(true);
            toast.info(`Acesso concedido. Justificativa: "${justification}"`);
          }} />
      </div>
    </div>
  );
}

// ── PagamentoParcialModal ─────────────────────────────────────────────────────

interface Parcela { valor: string; data: string; forma: string; }

function PagamentoParcialModal({ open, totalStr, onClose, onConfirm }: {
  open: boolean; totalStr: string; onClose: () => void;
  onConfirm: (parcelas: Parcela[]) => void;
}) {
  const total = parseCurrency(totalStr);
  const [parcelas, setParcelas] = useState<Parcela[]>([
    { valor: '', data: todayISO(), forma: 'PIX' },
  ]);

  if (!open) return null;

  const pago = parcelas.reduce((s, p) => s + parseCurrency(p.valor), 0);
  const restante = total - pago;

  const update = (i: number, field: keyof Parcela, val: string) =>
    setParcelas(prev => prev.map((p, j) => j === i ? { ...p, [field]: field === 'valor' ? maskCurrency(val) : val } : p));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Pagamento parcial — Total: {fmt(total)}</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-2">
          {parcelas.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
              <CurrencyInput label={i === 0 ? 'Valor' : ''} value={p.valor} onChange={v => update(i, 'valor', v)} />
              <div>
                {i === 0 && <label className="block text-xs font-medium mb-1">Data</label>}
                <input type="date" value={p.data} onChange={e => update(i, 'data', e.target.value)}
                  className="rounded-lg border border-border px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                {i === 0 && <label className="block text-xs font-medium mb-1">Forma</label>}
                <select value={p.forma} onChange={e => update(i, 'forma', e.target.value)}
                  className="rounded-lg border border-border px-2 py-2 text-sm bg-white outline-none">
                  <option>PIX</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option>
                </select>
              </div>
              {parcelas.length > 1 && (
                <button onClick={() => setParcelas(prev => prev.filter((_, j) => j !== i))} className="pb-1">
                  <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button onClick={() => setParcelas(prev => [...prev, { valor: '', data: todayISO(), forma: 'PIX' }])}
          className="text-xs text-primary hover:underline flex items-center gap-1">
          <Plus className="h-3.5 w-3.5" />Adicionar pagamento
        </button>

        <div className={cn('rounded-lg p-3 text-sm space-y-1', restante < 0 ? 'bg-red-50 border border-red-200' : restante === 0 ? 'bg-green-50 border border-green-200' : 'bg-muted/50')}>
          <div className="flex justify-between"><span className="text-muted-foreground">Total:</span><span className="font-medium">{fmt(total)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Pago:</span><span className="text-green-700 font-medium">{fmt(pago)}</span></div>
          <div className="flex justify-between font-bold border-t pt-1 mt-1">
            <span>Restante:</span>
            <span className={restante < 0 ? 'text-red-600' : restante === 0 ? 'text-green-700' : 'text-amber-700'}>{fmt(restante)}</span>
          </div>
          {restante < 0 && <p className="text-xs text-red-600">Valor pago excede o total.</p>}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={restante < 0 || pago === 0} onClick={() => { onConfirm(parcelas); onClose(); }}>
            <Check className="h-3.5 w-3.5 mr-1.5" />Registrar pagamentos
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── TissViewModal ─────────────────────────────────────────────────────────────

function TissViewModal({ guia, onClose }: { guia: any; onClose: () => void }) {
  if (!guia) return null;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>SOLICITACAO_AUTORIZACAO_PROCEDIMENTO</ans:tipoTransacao>
      <ans:sequencialTransacao>000001</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${guia.data_consulta}</ans:dataRegistroTransacao>
    </ans:identificacaoTransacao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:solicitacaoAutorizacao>
      <ans:dadosBeneficiario>
        <ans:nomeBeneficiario>${guia.patient}</ans:nomeBeneficiario>
      </ans:dadosBeneficiario>
      <ans:dadosSolicitacao>
        <ans:dataSolicitacao>${guia.data_consulta}</ans:dataSolicitacao>
        <ans:caraterAtendimento>1</ans:caraterAtendimento>
      </ans:dadosSolicitacao>
    </ans:solicitacaoAutorizacao>
  </ans:prestadorParaOperadora>
  <!-- Guia: ${guia.id} | Convênio: ${guia.convenio} | Status: ${guia.status} -->
</ans:mensagemTISS>`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Guia TISS — {guia.id} · {guia.patient}</h3>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-muted">{guia.convenio}</span>
          <span className="px-2 py-0.5 rounded-full bg-muted">{fmtDate(guia.data_consulta)}</span>
          <span className={cn('px-2 py-0.5 rounded-full font-medium',
            guia.status === 'APROVADA' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>
            {guia.status}
          </span>
        </div>
        <pre className="rounded-xl border border-border bg-muted/30 p-4 text-xs font-mono overflow-x-auto max-h-64 whitespace-pre-wrap">
          {xml}
        </pre>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(xml); toast.success('XML copiado!'); }}>
            Copiar XML
          </Button>
          <Button size="sm" onClick={() => { window.print(); }}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir
          </Button>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800', PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800', OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500', PENDING: 'bg-amber-100 text-amber-800',
  EMITIDA: 'bg-green-100 text-green-800', CANCELADA: 'bg-red-100 text-red-800',
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Em aberto', PARTIALLY_PAID: 'Parcial', PAID: 'Pago',
  OVERDUE: 'Vencido', CANCELLED: 'Cancelado', PENDING: 'Pendente',
  EMITIDA: 'Emitida', CANCELADA: 'Cancelada',
};

type ModuleKey =
  | 'hub' | 'vendas' | 'lancamentos' | 'dashboard'
  | 'relatorios' | 'sessoes' | 'stone' | 'tiss'
  | 'ia' | 'nfe' | 'fechamento' | 'auditoria';

// ── Hub ───────────────────────────────────────────────────────────────────────

const MODULES: { key: ModuleKey; label: string; icon: any; desc: string; color: string }[] = [
  { key: 'vendas', label: 'Vendas & Faturamento', icon: Receipt, desc: 'Faturas, orçamentos e cobranças', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'lancamentos', label: 'Lançamentos Financeiros', icon: ArrowLeftRight, desc: 'Receitas, despesas e transferências', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'dashboard', label: 'Dashboard de Gestão', icon: PieChart, desc: 'KPIs e resultado financeiro', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'relatorios', label: 'Relatórios Financeiros', icon: BarChart3, desc: 'Faturamento, receitas e despesas', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'sessoes', label: 'Controle de Sessões', icon: Activity, desc: 'Sessões realizadas e protocolos', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'stone', label: 'Pagamentos Stone', icon: CreditCard, desc: 'Web Pagamentos — cartão e PIX', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'tiss', label: 'Guia TISS', icon: Shield, desc: 'Planos de saúde e convênios', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'ia', label: 'AYRON Financeiro IA', icon: Brain, desc: 'Análise financeira com IA', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'nfe', label: 'Emissão de Nota Fiscal', icon: FileText, desc: 'NFS-e e configurações fiscais', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'fechamento', label: 'Fechamento de Caixa', icon: Wallet, desc: 'Fechamento diário e reconciliação', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  { key: 'auditoria', label: 'Auditoria', icon: ClipboardList, desc: 'Log de operações financeiras', color: 'bg-gray-50 text-gray-700 border-gray-200' },
];

function FinancialHub({ onSelect }: { onSelect: (k: ModuleKey) => void }) {
  const { data: health } = useQuery({
    queryKey: ['finance-health-hub'],
    queryFn: () => api.get('/finance/reports/health').then(r => r.data).catch(() => null),
  });

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Receita (30d)</p>
          <p className="text-2xl font-bold text-green-700">{fmt(health?.revenue_30d ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Taxa de Cobrança</p>
          <p className={`text-2xl font-bold ${(health?.collection_rate_30d ?? 0) >= 80 ? 'text-green-700' : 'text-amber-600'}`}>
            {health?.collection_rate_30d ?? '—'}%
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Inadimplentes</p>
          <p className={`text-2xl font-bold ${(health?.overdue_count ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {health?.overdue_count ?? 0}
          </p>
        </Card>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {MODULES.map(m => (
          <motion.button
            key={m.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(m.key)}
            className={cn('flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-shadow hover:shadow-md', m.color)}
          >
            <m.icon className="h-5 w-5" />
            <div>
              <p className="text-sm font-semibold leading-tight">{m.label}</p>
              <p className="text-[11px] opacity-70 mt-0.5">{m.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── Vendas & Faturamento ──────────────────────────────────────────────────────

const INITIAL_VENDAS = [
  { id: 'V001', date: '2026-04-24', client: 'Ana Lima', guia: 'G-4821', recibo: 'R-001', value: 850, filial: 'Principal', tabela: 'Particular', fechado: true, status: 'PAID', obs: '', payments: [{ valor: 850, data: '2026-04-24', forma: 'PIX' }] },
  { id: 'V002', date: '2026-04-23', client: 'Carlos Souza', guia: 'G-3102', recibo: '', value: 1200, filial: 'Principal', tabela: 'Unimed', fechado: false, status: 'OPEN', obs: 'Aguardando autorização', payments: [] },
  { id: 'V003', date: '2026-04-22', client: 'Beatriz Fernandes', guia: 'G-1089', recibo: 'R-002', value: 650, filial: 'Principal', tabela: 'Particular', fechado: true, status: 'PAID', obs: '', payments: [{ valor: 650, data: '2026-04-22', forma: 'Cartão' }] },
  { id: 'V004', date: '2026-03-20', client: 'Pedro Gomes', guia: '', recibo: '', value: 450, filial: 'Principal', tabela: 'Particular', fechado: false, status: 'OVERDUE', obs: 'Vencido', payments: [] },
  { id: 'V005', date: '2026-04-18', client: 'Marina Costa', guia: 'G-5542', recibo: 'R-003', value: 3000, filial: 'Principal', tabela: 'Bradesco', fechado: true, status: 'PARTIALLY_PAID', obs: '', payments: [{ valor: 1000, data: '2026-04-18', forma: 'PIX' }, { valor: 1000, data: '2026-05-01', forma: 'PIX' }] },
];

function VendasTab({ initialSearch }: { initialSearch?: string }) {
  const [vendas, setVendas] = useState(INITIAL_VENDAS);
  const [search, setSearch] = useState(initialSearch ?? '');
  const [quickFilter, setQuickFilter] = useState('todos');
  const [selected, setSelected] = useState<any>(null);
  const [showOrcamento, setShowOrcamento] = useState(false);
  const [showFatura, setShowFatura] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showParcial, setShowParcial] = useState(false);
  const [masterForRetro, setMasterForRetro] = useState(false);
  const [pendingFatura, setPendingFatura] = useState<any>(null);

  // Orçamento form state
  const [orcPatient, setOrcPatient] = useState<any>(null);
  const [orcDesc, setOrcDesc] = useState('');
  const [orcValue, setOrcValue] = useState('');
  const [orcValidade, setOrcValidade] = useState('');
  const [orcTabela, setOrcTabela] = useState('Particular');
  const [orcObs, setOrcObs] = useState('');

  // Fatura form state
  const [fatPatient, setFatPatient] = useState<any>(null);
  const [fatDesc, setFatDesc] = useState('');
  const [fatValue, setFatValue] = useState('');
  const [fatVenc, setFatVenc] = useState('');
  const [fatForma, setFatForma] = useState('PIX');
  const [fatTabela, setFatTabela] = useState('Particular');
  const [fatGuia, setFatGuia] = useState('');
  const [fatObs, setFatObs] = useState('');

  const today = todayISO();

  // Inadimplência alert: OVERDUE > 30 days
  const inadimplentes = vendas.filter(v => {
    if (v.status !== 'OVERDUE') return false;
    const diffDays = (Date.now() - new Date(v.date).getTime()) / 86400000;
    return diffDays > 30;
  });

  const filtered = vendas.filter(v => {
    if (search && !v.client.toLowerCase().includes(search.toLowerCase()) && !v.guia.includes(search)) return false;
    if (quickFilter === 'ultimos7') return new Date(v.date) >= new Date(Date.now() - 7 * 86400000);
    if (quickFilter === 'pendencias') return v.status === 'OPEN' || v.status === 'OVERDUE';
    if (quickFilter === 'canceladas') return v.status === 'CANCELLED';
    if (quickFilter === 'orcamentos') return !v.fechado;
    if (quickFilter === 'inadimplentes') return inadimplentes.some(i => i.id === v.id);
    return true;
  });

  const resetOrcamento = () => { setOrcPatient(null); setOrcDesc(''); setOrcValue(''); setOrcValidade(''); setOrcTabela('Particular'); setOrcObs(''); };
  const resetFatura = () => { setFatPatient(null); setFatDesc(''); setFatValue(''); setFatVenc(''); setFatForma('PIX'); setFatTabela('Particular'); setFatGuia(''); setFatObs(''); };

  const handleCriarOrcamento = () => {
    if (!orcPatient) { toast.error('Selecione um paciente cadastrado'); return; }
    if (!orcDesc.trim()) { toast.error('Descrição obrigatória'); return; }
    if (!orcValue) { toast.error('Valor obrigatório'); return; }
    const newV = {
      id: `V${Date.now()}`, date: today,
      client: orcPatient.full_name || orcPatient.name,
      guia: `G-ORC-${Date.now().toString(36).toUpperCase()}`,
      recibo: '', value: parseCurrency(orcValue),
      filial: 'Principal', tabela: orcTabela,
      fechado: false, status: 'OPEN',
      obs: orcObs, payments: [],
    };
    setVendas(prev => [newV, ...prev]);
    toast.success('Orçamento criado e adicionado à lista');
    resetOrcamento();
    setShowOrcamento(false);
  };

  const handleEmitirFatura = (justification?: string) => {
    if (!fatPatient) { toast.error('Selecione um paciente cadastrado'); return; }
    if (!fatDesc.trim()) { toast.error('Descrição obrigatória'); return; }
    if (!fatValue) { toast.error('Valor obrigatório'); return; }
    if (!fatVenc) { toast.error('Vencimento obrigatório'); return; }
    if (fatVenc < today && !justification) {
      setPendingFatura({ desc: fatDesc });
      setMasterForRetro(true);
      return;
    }
    const newV = {
      id: `V${Date.now()}`, date: today,
      client: fatPatient.full_name || fatPatient.name,
      guia: fatGuia || `G-FAT-${Date.now().toString(36).toUpperCase()}`,
      recibo: `R-${Date.now().toString(36).toUpperCase()}`,
      value: parseCurrency(fatValue),
      filial: 'Principal', tabela: fatTabela,
      fechado: true, status: 'OPEN',
      obs: fatObs + (justification ? ` [Retroativo autorizado: ${justification}]` : ''),
      payments: [],
    };
    setVendas(prev => [newV, ...prev]);
    toast.success('Fatura emitida com sucesso');
    resetFatura();
    setShowFatura(false);
    setMasterForRetro(false);
    setPendingFatura(null);
  };

  return (
    <div className="space-y-4">

      {/* Inadimplência alert */}
      {inadimplentes.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {inadimplentes.length} paciente{inadimplentes.length > 1 ? 's' : ''} inadimplente{inadimplentes.length > 1 ? 's' : ''} há mais de 30 dias:
            {' '}{inadimplentes.map(i => i.client).join(', ')}
          </p>
          <button onClick={() => setQuickFilter('inadimplentes')} className="ml-auto text-xs text-red-700 underline whitespace-nowrap">Ver</button>
        </div>
      )}

      {/* Search + quick filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, guia..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {initialSearch && search === initialSearch && (
          <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
            <span>Filtrando por: <strong>{decodeURIComponent(initialSearch)}</strong></span>
            <button onClick={() => setSearch('')} className="ml-1 rounded-full hover:bg-blue-200 p-0.5"><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex gap-1 flex-wrap">
          {[
            { k: 'todos', l: 'Todos' },
            { k: 'ultimos7', l: 'Últimos 7 dias' },
            { k: 'pendencias', l: 'Pendências' },
            { k: 'canceladas', l: 'Canceladas' },
            { k: 'orcamentos', l: 'Orçamentos' },
            ...(inadimplentes.length > 0 ? [{ k: 'inadimplentes', l: `Inadimplentes (${inadimplentes.length})` }] : []),
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setQuickFilter(k)}
              className={cn('px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                quickFilter === k
                  ? k === 'inadimplentes' ? 'bg-red-600 text-white border-red-600' : 'bg-primary text-white border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="secondary" disabled={!selected} onClick={() => selected && setShowEdit(true)}>
          <Edit2 className="h-3.5 w-3.5 mr-1" />Editar
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowOrcamento(true)}>
          <FilePlus className="h-3.5 w-3.5 mr-1" />Orçamento
        </Button>
        <Button size="sm" onClick={() => setShowFatura(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Fatura
        </Button>
        <Button size="sm" variant="secondary"
          disabled={!selected || selected?.status === 'PAID' || selected?.status === 'CANCELLED'}
          onClick={() => selected && setShowParcial(true)}>
          <CreditCard className="h-3.5 w-3.5 mr-1" />Pagamento Parcial
        </Button>
        <Button size="sm" variant="secondary" onClick={() => {
          const csv = filtered.map(v => `${v.date},${v.client},${v.guia},${v.recibo},${v.value},${v.status}`).join('\n');
          const b = new Blob([csv], { type: 'text/csv' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'vendas.csv'; a.click();
        }}><Download className="h-3.5 w-3.5 mr-1" />Exportar</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['', 'Data', 'Cliente', 'Guia Nr.', 'Recibo', 'Valor', 'Pago', 'Filial', 'Tabela', 'Status', 'Observações'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">Nenhum registro.</td></tr>
            ) : filtered.map(v => {
              const pago = v.payments.reduce((s: number, p: any) => s + (typeof p.valor === 'number' ? p.valor : parseCurrency(String(p.valor))), 0);
              return (
                <tr key={v.id} onClick={() => setSelected((s: any) => s?.id === v.id ? null : v)}
                  className={cn('cursor-pointer hover:bg-muted/30 transition-colors', selected?.id === v.id ? 'bg-primary/5' : '')}>
                  <td className="px-3 py-2.5">
                    <input type="radio" checked={selected?.id === v.id} onChange={() => setSelected(v)} className="accent-primary" />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(v.date)}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{v.client}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{v.guia || '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{v.recibo || '—'}</td>
                  <td className="px-3 py-2.5 font-medium">{fmt(v.value)}</td>
                  <td className="px-3 py-2.5 text-green-700">{pago > 0 ? fmt(pago) : '—'}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{v.filial}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{v.tabela}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[v.status] ?? 'bg-gray-100')}>
                      {STATUS_LABELS[v.status] ?? v.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[150px] truncate">{v.obs || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {showEdit && selected && (
        <EditVendaModal
          venda={selected}
          onClose={() => setShowEdit(false)}
          onSave={updated => {
            setVendas(prev => prev.map(v => v.id === updated.id ? updated : v));
            setSelected(updated);
          }}
        />
      )}

      {/* Pagamento parcial modal */}
      {showParcial && selected && (
        <PagamentoParcialModal
          open={showParcial}
          totalStr={fmt(selected.value)}
          onClose={() => setShowParcial(false)}
          onConfirm={parcelas => {
            const totalPago = parcelas.reduce((s, p) => s + parseCurrency(p.valor), 0);
            const newStatus = totalPago >= selected.value ? 'PAID' : totalPago > 0 ? 'PARTIALLY_PAID' : selected.status;
            const updated = { ...selected, payments: [...selected.payments, ...parcelas.map(p => ({ ...p, valor: parseCurrency(p.valor) }))], status: newStatus };
            setVendas(prev => prev.map(v => v.id === updated.id ? updated : v));
            setSelected(updated);
            toast.success(`${parcelas.length} pagamento(s) registrado(s)`);
          }}
        />
      )}

      {/* Orçamento modal */}
      <Dialog open={showOrcamento} onClose={() => { resetOrcamento(); setShowOrcamento(false); }} title="Novo Orçamento" size="md">
        <div className="space-y-3">
          <PatientSearch label="Paciente" onSelect={p => setOrcPatient(p)} />
          {orcPatient && (
            <p className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
              ✓ {orcPatient.full_name || orcPatient.name}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">Descrição do serviço *</label>
            <input value={orcDesc} onChange={e => setOrcDesc(e.target.value)} placeholder="Ex.: Consulta + Protocolo Mounjaro"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Valor" required value={orcValue} onChange={setOrcValue} />
            <div>
              <label className="block text-xs font-medium mb-1">Validade</label>
              <input type="date" value={orcValidade} onChange={e => setOrcValidade(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tabela/Convênio</label>
            <select value={orcTabela} onChange={e => setOrcTabela(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
              <option>Particular</option><option>Unimed</option><option>Bradesco</option><option>Amil</option>
            </select>
          </div>
          <textarea value={orcObs} onChange={e => setOrcObs(e.target.value)} placeholder="Observações..." rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => { resetOrcamento(); setShowOrcamento(false); }}>Cancelar</Button>
          <Button onClick={handleCriarOrcamento}><FilePlus className="h-3.5 w-3.5 mr-1.5" />Criar Orçamento</Button>
        </DialogFooter>
      </Dialog>

      {/* Fatura modal */}
      <Dialog open={showFatura} onClose={() => { resetFatura(); setShowFatura(false); }} title="Nova Fatura" size="md">
        <div className="space-y-3">
          <PatientSearch label="Paciente" onSelect={p => setFatPatient(p)} />
          {fatPatient && (
            <p className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
              ✓ {fatPatient.full_name || fatPatient.name}
            </p>
          )}
          <div>
            <label className="block text-xs font-medium mb-1">Descrição *</label>
            <input value={fatDesc} onChange={e => setFatDesc(e.target.value)} placeholder="Serviço / procedimento..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CurrencyInput label="Valor Total" required value={fatValue} onChange={setFatValue} />
            <div>
              <label className="block text-xs font-medium mb-1">Vencimento *</label>
              <input type="date" value={fatVenc} onChange={e => setFatVenc(e.target.value)}
                className={cn('w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30',
                  fatVenc && fatVenc < today ? 'border-amber-400 bg-amber-50' : 'border-border')} />
              {fatVenc && fatVenc < today && (
                <p className="text-[10px] text-amber-700 mt-0.5">⚠ Data retroativa — requer senha Master ao emitir</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Forma de pagamento</label>
              <select value={fatForma} onChange={e => setFatForma(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
                <option>PIX</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tabela/Convênio</label>
              <select value={fatTabela} onChange={e => setFatTabela(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
                <option>Particular</option><option>Unimed</option><option>Bradesco</option><option>Amil</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Guia Nr. (opcional — preenche orçamento existente)</label>
            <input value={fatGuia} onChange={e => setFatGuia(e.target.value)} placeholder="G-XXXX ou número da guia"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <textarea value={fatObs} onChange={e => setFatObs(e.target.value)} placeholder="Observações..." rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => { resetFatura(); setShowFatura(false); }}>Cancelar</Button>
          <Button onClick={() => handleEmitirFatura()}><Receipt className="h-3.5 w-3.5 mr-1.5" />Emitir Fatura</Button>
        </DialogFooter>
      </Dialog>

      {/* Master password for retroactive date */}
      <MasterPasswordModal
        open={masterForRetro}
        onClose={() => { setMasterForRetro(false); setPendingFatura(null); }}
        title="Vencimento retroativo — autorização necessária"
        onConfirm={justification => handleEmitirFatura(justification)}
      />
    </div>
  );
}

// ── Lançamentos Financeiros ───────────────────────────────────────────────────

const MOCK_LANCAMENTOS = [
  { id: 'L001', vencimento: '2026-04-24', descricao: 'Consulta Ana Lima — Mounjaro', valor: 850, pago: 850, saldo: 0, controle: 'REC-4821', conta: 'Caixa Principal', filial: 'Principal', classificacao: 'Receita Clínica', tipo: 'RECEBER' },
  { id: 'L002', vencimento: '2026-04-25', descricao: 'Aluguel da Clínica', valor: 3500, pago: 0, saldo: 3500, controle: 'PAG-001', conta: 'Conta Corrente', filial: 'Principal', classificacao: 'Despesa Fixa', tipo: 'PAGAR' },
  { id: 'L003', vencimento: '2026-04-23', descricao: 'Sessão HCG — Marina Costa', valor: 480, pago: 480, saldo: 0, controle: 'REC-5542', conta: 'Caixa Principal', filial: 'Principal', classificacao: 'Receita Clínica', tipo: 'RECEBER' },
  { id: 'L004', vencimento: '2026-04-30', descricao: 'Fornecedor Farmácia (Mounjaro)', valor: 2200, pago: 0, saldo: 2200, controle: 'PAG-002', conta: 'Conta Corrente', filial: 'Principal', classificacao: 'Insumos', tipo: 'PAGAR' },
  { id: 'L005', vencimento: '2026-04-20', descricao: 'Carlos Souza — Consulta VIP', valor: 1200, pago: 600, saldo: 600, controle: 'REC-3102', conta: 'Caixa Principal', filial: 'Principal', classificacao: 'Receita Clínica', tipo: 'RECEBER' },
];

function LancamentosTab() {
  const [tipoFilter, setTipoFilter] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [conta, setConta] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showNovaReceita, setShowNovaReceita] = useState(false);
  const [showNovaDespesa, setShowNovaDespesa] = useState(false);
  const [showTransferencia, setShowTransferencia] = useState(false);
  const [showOFX, setShowOFX] = useState(false);
  const [showDefinirPago, setShowDefinirPago] = useState(false);
  const ofxRef = useRef<HTMLInputElement>(null);

  const { data: lancamentosDB = MOCK_LANCAMENTOS } = useQuery({
    queryKey: ['financial-transactions', from, to, tipoFilter],
    queryFn: () => fetchFinancialTransactions({
      from: from || undefined,
      to: to || undefined,
      tipo: tipoFilter || undefined,
    }).catch(() => MOCK_LANCAMENTOS),
    staleTime: 30_000,
  });

  const filtered = lancamentosDB.filter((l: any) => {
    if (tipoFilter && l.tipo !== tipoFilter) return false;
    if (conta && l.conta && !l.conta.toLowerCase().includes(conta.toLowerCase())) return false;
    if (search && !l.descricao.toLowerCase().includes(search.toLowerCase()) && !(l.controle ?? '').includes(search) && !String(l.valor).includes(search)) return false;
    if (from && l.vencimento < from) return false;
    if (to && l.vencimento > to) return false;
    return true;
  });

  const LancamentoForm = ({ tipo, onClose }: { tipo: 'RECEITA' | 'DESPESA'; onClose: () => void }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Select label="Unidade/Filial"><option>Principal</option><option>Filial 2</option></Select>
        <Select label="Conta Corrente"><option>Caixa Principal</option><option>Conta Corrente</option><option>Poupança</option></Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Nr. Documento" placeholder="Nº do documento" />
        <Input label="Nr. Controle" placeholder="Nº de controle" />
      </div>
      <Input label="Descrição *" placeholder={tipo === 'RECEITA' ? 'Descrição da receita...' : 'Descrição da despesa...'} />
      <Input label={tipo === 'RECEITA' ? 'Cliente/Paciente' : 'Fornecedor'} placeholder="Nome..." />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Classificação">
          <option>Receita Clínica</option><option>Despesa Fixa</option>
          <option>Insumos</option><option>Marketing</option><option>Impostos</option><option>Outro</option>
        </Select>
        <Input label="Valor (R$) *" type="number" placeholder="0,00" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Vencimento *" type="date" />
        <Input label="Quitação" type="date" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select label="Forma de Pagamento">
          <option>PIX</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option><option>Boleto</option>
        </Select>
        <div>
          <label className="block text-xs font-medium mb-1">Repetir</label>
          <div className="flex gap-2 items-center">
            <select className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs bg-white outline-none">
              <option value="">Não repetir</option>
              <option>Mensal</option><option>Semanal</option><option>Anual</option>
            </select>
            <input type="number" min="1" max="36" placeholder="N" className="w-16 rounded-lg border border-border px-2 py-1.5 text-xs outline-none" />
            <span className="text-xs text-muted-foreground">meses</span>
          </div>
        </div>
      </div>
      <Input label="Taxa Adm. (%)" type="number" placeholder="0" />
      <textarea placeholder="Observações..." rows={2}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      <p className="text-xs text-muted-foreground">Edição por: usuário atual</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Select label="Tipo" value={tipoFilter} onChange={(e: any) => setTipoFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="RECEBER">Contas a Receber</option>
            <option value="PAGAR">Contas a Pagar</option>
          </Select>
          <Select label="Unidade/Filial">
            <option value="">Todas</option><option>Principal</option><option>Filial 2</option>
          </Select>
          <Input label="Conta Corrente" placeholder="Todas" value={conta} onChange={(e: any) => setConta(e.target.value)} />
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium mb-1">Período</label>
            <div className="flex gap-1 items-center">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30" />
              <span className="text-xs text-muted-foreground">–</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Descrição, nº controle ou valor..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <Button size="sm" variant="secondary" onClick={() => { setSearch(''); setFrom(''); setTo(''); setConta(''); setTipoFilter(''); }}>
            <X className="h-3.5 w-3.5 mr-1" />Limpar
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowNovaReceita(true)}><Plus className="h-3.5 w-3.5 mr-1" />Nova Receita</Button>
        <Button size="sm" variant="secondary" onClick={() => setShowNovaDespesa(true)}><TrendingDown className="h-3.5 w-3.5 mr-1" />Nova Despesa</Button>
        <Button size="sm" variant="secondary" disabled={!selected} onClick={() => selected && toast.info(`Editar ${selected.id}`)}><Edit2 className="h-3.5 w-3.5 mr-1" />Editar</Button>
        <Button size="sm" variant="secondary" disabled={!selected || selected?.pago >= selected?.valor}
          onClick={() => selected && setShowDefinirPago(true)}>
          <Check className="h-3.5 w-3.5 mr-1" />Definir Pago
        </Button>
        <Button size="sm" variant="secondary"
          onClick={() => { setTipoFilter(''); setSearch(''); setFrom(''); setTo(''); setConta(''); toast.info('Mostrando pendentes'); setTipoFilter(''); }}>
          <AlertCircle className="h-3.5 w-3.5 mr-1" />Pendentes
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowTransferencia(true)}>
          <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />Transferência entre Contas
        </Button>
        <Button size="sm" variant="secondary" onClick={() => ofxRef.current?.click()}>
          <Upload className="h-3.5 w-3.5 mr-1" />Upload OFX
        </Button>
        <input ref={ofxRef} type="file" accept=".ofx,.OFX" className="hidden" onChange={e => {
          if (e.target.files?.[0]) { toast.success(`OFX "${e.target.files[0].name}" importado`); e.target.value = ''; }
        }} />
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['', 'Vencimento', 'Descrição', 'Valor', 'Pago', 'Saldo', 'Nº Controle', 'Conta', 'Filial', 'Classificação'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">Nenhum lançamento encontrado.</td></tr>
            ) : filtered.map(l => (
              <tr key={l.id} onClick={() => setSelected((s: typeof l | null) => s?.id === l.id ? null : l)}
                className={cn('cursor-pointer hover:bg-muted/30 transition-colors', selected?.id === l.id ? 'bg-primary/5' : '')}>
                <td className="px-3 py-2.5">
                  <input type="radio" checked={selected?.id === l.id} onChange={() => setSelected(l)} className="accent-primary" />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{fmtDate(l.vencimento)}</td>
                <td className="px-3 py-2.5 max-w-[200px] truncate">{l.descricao}</td>
                <td className={cn('px-3 py-2.5 font-medium whitespace-nowrap', l.tipo === 'RECEBER' ? 'text-green-700' : 'text-red-600')}>{fmt(l.valor)}</td>
                <td className="px-3 py-2.5 text-green-700">{fmt(l.pago)}</td>
                <td className={cn('px-3 py-2.5 font-medium', l.saldo > 0 ? 'text-amber-700' : 'text-muted-foreground')}>{fmt(l.saldo)}</td>
                <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{l.controle}</td>
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{l.conta}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{l.filial}</td>
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{l.classificacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nova Receita */}
      <Dialog open={showNovaReceita} onClose={() => setShowNovaReceita(false)} title="Nova Receita" size="lg">
        <LancamentoForm tipo="RECEITA" onClose={() => setShowNovaReceita(false)} />
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setShowNovaReceita(false)}>Cancelar</Button>
          <Button onClick={() => { toast.success('Receita lançada'); setShowNovaReceita(false); }}>Salvar Receita</Button>
        </DialogFooter>
      </Dialog>

      {/* Nova Despesa */}
      <Dialog open={showNovaDespesa} onClose={() => setShowNovaDespesa(false)} title="Nova Despesa" size="lg">
        <LancamentoForm tipo="DESPESA" onClose={() => setShowNovaDespesa(false)} />
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setShowNovaDespesa(false)}>Cancelar</Button>
          <Button onClick={() => { toast.success('Despesa lançada'); setShowNovaDespesa(false); }}>Salvar Despesa</Button>
        </DialogFooter>
      </Dialog>

      {/* Transferência */}
      <Dialog open={showTransferencia} onClose={() => setShowTransferencia(false)} title="Transferência entre Contas" size="sm">
        <div className="space-y-3">
          <Select label="Conta Origem *"><option>Caixa Principal</option><option>Conta Corrente</option></Select>
          <Select label="Conta Destino *"><option>Conta Corrente</option><option>Caixa Principal</option><option>Poupança</option></Select>
          <Input label="Valor (R$) *" type="number" placeholder="0,00" />
          <Input label="Data" type="date" />
          <textarea placeholder="Observação..." rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setShowTransferencia(false)}>Cancelar</Button>
          <Button onClick={() => { toast.success('Transferência realizada'); setShowTransferencia(false); }}>
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />Transferir
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Definir Pago */}
      <Dialog open={showDefinirPago} onClose={() => setShowDefinirPago(false)} title="Definir como Pago" size="sm">
        {selected && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{selected.descricao}</p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>Valor total:</span><span className="font-medium">{fmt(selected.valor)}</span></div>
              <div className="flex justify-between"><span>Já pago:</span><span className="text-green-700">{fmt(selected.pago)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Saldo:</span><span className="text-amber-700">{fmt(selected.saldo)}</span></div>
            </div>
            <Input label="Valor a quitar" type="number" defaultValue={String(selected.saldo)} />
            <Input label="Data de quitação" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
            <Select label="Forma de pagamento"><option>PIX</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option></Select>
            <Input label="Depósito (conta destino)" placeholder="Conta que recebeu..." />
          </div>
        )}
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setShowDefinirPago(false)}>Cancelar</Button>
          <Button onClick={() => { toast.success('Pagamento registrado'); setShowDefinirPago(false); }}>
            <Check className="h-3.5 w-3.5 mr-1.5" />Confirmar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ── Dashboard de Gestão ───────────────────────────────────────────────────────

function DashboardGestaoTab() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const [from, setFrom] = useState(startOfMonth);
  const [to, setTo] = useState(today);

  const { data: summary, refetch } = useQuery({
    queryKey: ['finance-summary', from, to],
    queryFn: () => api.get(`/finance/reports/summary?from=${from}&to=${to}`).then(r => r.data).catch(() => null),
  });
  const { data: health } = useQuery({
    queryKey: ['finance-health'],
    queryFn: () => api.get('/finance/reports/health').then(r => r.data).catch(() => null),
  });
  const { data: dre } = useQuery({
    queryKey: ['finance-dre', from, to],
    queryFn: () => api.get(`/finance/reports/dre?from=${from}&to=${to}`).then(r => r.data).catch(() => null),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <Input type="date" value={from} onChange={(e: any) => setFrom(e.target.value)} className="h-9 w-40" />
        <span className="text-muted-foreground text-sm">até</span>
        <Input type="date" value={to} onChange={(e: any) => setTo(e.target.value)} className="h-9 w-40" />
        <Button size="sm" variant="secondary" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1" />Atualizar</Button>
        <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 mr-1" />Imprimir</Button>
        <Button size="sm" variant="secondary" onClick={() => toast.info('Exportando XLS...')}><Download className="h-3.5 w-3.5 mr-1" />XLS</Button>
        <Button size="sm" variant="secondary" onClick={() => toast.info('Exportando CSV...')}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
      </div>

      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Receita (30d)</p>
            <p className="text-xl font-bold text-green-700">{fmt(health.revenue_30d)}</p>
          </Card>
          <Card className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Taxa de Cobrança</p>
            <p className={`text-xl font-bold ${health.collection_rate_30d >= 80 ? 'text-green-700' : 'text-amber-600'}`}>{health.collection_rate_30d}%</p>
          </Card>
          <Card className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Inadimplentes</p>
            <p className={`text-xl font-bold ${health.overdue_count > 0 ? 'text-red-600' : 'text-green-600'}`}>{health.overdue_count}</p>
          </Card>
          <Card className="p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Saúde Financeira</p>
            <span className={cn('text-sm font-bold px-2 py-0.5 rounded-full', health.health_label === 'SAUDAVEL' ? 'bg-green-100 text-green-800' : health.health_label === 'CRITICO' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800')}>
              {health.health_label === 'SAUDAVEL' ? 'Saudável' : health.health_label === 'CRITICO' ? 'Crítico' : 'Atenção'}
            </span>
          </Card>
        </div>
      )}

      {summary && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Resumo do Período — {fmtDate(from)} a {fmtDate(to)}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Faturado:</span> <span className="font-medium">{fmt(summary.receivables?.total)}</span></div>
            <div><span className="text-muted-foreground">Recebido:</span> <span className="font-medium text-green-700">{fmt(summary.receivables?.paid)}</span></div>
            <div><span className="text-muted-foreground">Pendente:</span> <span className="font-medium text-amber-700">{fmt(summary.receivables?.pending)}</span></div>
            <div><span className="text-muted-foreground">Despesas:</span> <span className="font-medium text-red-700">{fmt(summary.payables?.total)}</span></div>
            <div className="col-span-2 border-t pt-2">
              <span className="text-muted-foreground">Resultado Líquido:</span>
              <span className={cn('font-bold text-lg ml-2', Number(summary.net) >= 0 ? 'text-green-700' : 'text-red-700')}>{fmt(summary.net)}</span>
            </div>
          </div>
        </Card>
      )}

      {dre && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">DRE — Demonstrativo de Resultado</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Receita Bruta</span><span className="font-medium text-green-700">{fmt(dre.gross_revenue)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Despesas Totais</span><span className="font-medium text-red-700">({fmt(dre.expenses)})</span></div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Lucro Líquido</span>
              <span className={Number(dre.net_profit) >= 0 ? 'text-green-700' : 'text-red-700'}>{fmt(dre.net_profit)}</span>
            </div>
            {dre.expenses_by_category && Object.keys(dre.expenses_by_category).length > 0 && (
              <div className="pt-2 space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Despesas por categoria</p>
                {Object.entries(dre.expenses_by_category).map(([cat, val]: any) => (
                  <div key={cat} className="flex justify-between text-xs py-0.5">
                    <span className="text-muted-foreground capitalize">{cat.toLowerCase()}</span>
                    <span>{fmt(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Relatórios Financeiros ────────────────────────────────────────────────────

const RELATORIOS = {
  'Faturamento': [
    'Faturamento por período',
    'Faturamento por tipo de pagamento',
    'Faturamento por profissional e período (regime de competência)',
    'Faturamento por profissional e período (regime de caixa)',
    'Faturamento por tabela e período',
    'Faturamento por procedimentos',
    'Faturamento por paciente',
    'Faturamento por paciente por procedimento',
  ],
  'Receitas': [
    'Receitas quitadas por data de pagamento',
    'Receitas quitadas por data de vencimento',
  ],
  'Despesas': [
    'Despesas quitadas por data de pagamento',
    'Despesas quitadas por data de vencimento',
    'Análise de despesas por período',
  ],
  'Contas a Pagar e Receber': [
    'Contas a Receber por vencimento',
    'Contas a Pagar por vencimento',
    'Listagem de contas a pagar e contas a receber por vencimento',
    'Transações em atraso',
  ],
  'Gerenciais': [
    'Faturas geradas por usuário',
    'Comissões de profissionais por serviços avulsos',
    'Comissões de profissionais por serviços recorrentes (Sessões)',
    'Controle de sessões',
    'Listagem de Sessões Realizadas',
    'Pacientes que mais consumiram',
  ],
};

function RelatoriosTab() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];
  const [from, setFrom] = useState(startOfMonth);
  const [to, setTo] = useState(today);
  const [profissional, setProfissional] = useState('');
  const [paciente, setPaciente] = useState('');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Input label="Profissional/Usuário" placeholder="Todos" value={profissional} onChange={(e: any) => setProfissional(e.target.value)} />
          <Select label="Unidade/Filial"><option value="">Todas</option><option>Principal</option></Select>
          <Select label="Conta-Corrente"><option value="">Todas</option><option>Caixa Principal</option><option>Conta Corrente</option></Select>
          <Select label="Tabela/Convênio"><option value="">Todos</option><option>Particular</option><option>Unimed</option><option>Bradesco</option></Select>
          <div>
            <label className="block text-xs font-medium mb-1">Período</label>
            <div className="flex gap-1 items-center">
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30" />
              <span className="text-xs text-muted-foreground">–</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <Input label="Paciente" placeholder="Buscar paciente..." value={paciente} onChange={(e: any) => setPaciente(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 mr-1" />Imprimir</Button>
          <Button size="sm" variant="secondary" onClick={() => toast.info('Exportando XLS...')}><Download className="h-3.5 w-3.5 mr-1" />Exportar XLS</Button>
          <Button size="sm" variant="secondary" onClick={() => toast.info('Exportando CSV...')}><Download className="h-3.5 w-3.5 mr-1" />Exportar CSV</Button>
        </div>
      </div>

      {/* Report categories */}
      <div className="space-y-4">
        {Object.entries(RELATORIOS).map(([category, reports]) => (
          <Card key={category} className="p-4">
            <h3 className="text-sm font-semibold mb-3">{category}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {reports.map(r => (
                <button
                  key={r}
                  onClick={() => { setSelectedReport(r); toast.info(`Gerando: ${r}`); }}
                  className={cn(
                    'flex items-center gap-2 text-left px-3 py-2.5 rounded-lg border transition-colors text-sm',
                    selectedReport === r ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40 hover:bg-muted/30 text-foreground'
                  )}
                >
                  <BarChart3 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  {r}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Controle de Sessões & Protocolos ─────────────────────────────────────────

interface Protocolo {
  id: string; patient: string; medico: string; tratamento: string;
  objetivo: string; total_sessoes: number; sessoes_realizadas: number;
  frequencia: string; valor: number; validade: string; obs: string;
  status: 'ATIVO' | 'PAUSADO' | 'INATIVO' | 'FINALIZADO';
  created_at: string; protocolo_anterior?: string;
  produtos: { nome: string; quantidade: number }[];
  motivo_pausa?: string;
}

interface SessaoProto {
  id: string; protocolo_id: string; patient: string; procedimento: string;
  medico: string; data: string; numero_sessao: number;
  status: 'AGENDADA' | 'REALIZADA' | 'CANCELADA'; valor: number;
  obs: string; checkin_at?: string;
}

const PROTO_STATUS: Record<string, string> = {
  ATIVO: 'bg-green-100 text-green-800', PAUSADO: 'bg-amber-100 text-amber-800',
  INATIVO: 'bg-gray-100 text-gray-600', FINALIZADO: 'bg-blue-100 text-blue-800',
};
const SESSAO_STATUS: Record<string, string> = {
  AGENDADA: 'bg-blue-100 text-blue-800', REALIZADA: 'bg-green-100 text-green-800', CANCELADA: 'bg-red-100 text-red-800',
};

const INITIAL_PROTOCOLOS: Protocolo[] = [
  { id: 'P001', patient: 'Ana Lima', medico: 'Dr. Marcos Oliveira', tratamento: 'Mounjaro + Semaglutida', objetivo: 'Perda de peso — 10kg em 3 meses', total_sessoes: 12, sessoes_realizadas: 7, frequencia: 'Semanal', valor: 5760, validade: '2026-07-24', obs: 'Alergia a penicilina. Jejum 2h antes.', status: 'ATIVO', created_at: '2026-01-24', produtos: [{ nome: 'Mounjaro 10mg', quantidade: 1 }, { nome: 'Semaglutida 0.5mg', quantidade: 1 }] },
  { id: 'P002', patient: 'Marina Costa', medico: 'Dr. Marcos Oliveira', tratamento: 'HCG + Testosterona', objetivo: 'Reequilíbrio hormonal', total_sessoes: 8, sessoes_realizadas: 3, frequencia: 'Quinzenal', valor: 3040, validade: '2026-06-18', obs: '', status: 'ATIVO', created_at: '2026-03-18', produtos: [{ nome: 'HCG 5000UI', quantidade: 1 }] },
  { id: 'P003', patient: 'Carlos Souza', medico: 'Dr. André Lima', tratamento: 'Testosterona Enantato', objetivo: 'TRT — reposição hormonal', total_sessoes: 6, sessoes_realizadas: 2, frequencia: 'Mensal', valor: 1920, validade: '2026-09-22', obs: 'Monitorar hematócrito.', status: 'PAUSADO', created_at: '2026-02-22', motivo_pausa: 'Paciente viajando — retorna em maio', produtos: [{ nome: 'Testosterona Enantato 250mg', quantidade: 1 }] },
  { id: 'P004', patient: 'Beatriz Fernandes', medico: 'Lorrana Silva', tratamento: 'Soroterapia Premium', objetivo: 'Imunidade e energia', total_sessoes: 10, sessoes_realizadas: 10, frequencia: 'Semanal', valor: 6500, validade: '2026-04-01', obs: '', status: 'FINALIZADO', created_at: '2026-01-22', produtos: [{ nome: 'Vitamina C IV', quantidade: 1 }, { nome: 'Zinco', quantidade: 1 }] },
  { id: 'P005', patient: 'Pedro Gomes', medico: 'Dr. Marcos Oliveira', tratamento: 'Ozempic 0.5mg', objetivo: 'Controle glicêmico', total_sessoes: 4, sessoes_realizadas: 0, frequencia: 'Mensal', valor: 1800, validade: '2026-08-20', obs: 'Diabetes tipo 2.', status: 'INATIVO', created_at: '2026-04-20', produtos: [{ nome: 'Ozempic 0.5mg', quantidade: 1 }] },
];

const INITIAL_SESSOES_PROTO: SessaoProto[] = [
  { id: 'SP001', protocolo_id: 'P001', patient: 'Ana Lima', procedimento: 'Mounjaro 10mg', medico: 'Dr. Marcos Oliveira', data: '2026-04-24', numero_sessao: 7, status: 'REALIZADA', valor: 480, obs: '', checkin_at: '2026-04-24T09:15:00' },
  { id: 'SP002', protocolo_id: 'P001', patient: 'Ana Lima', procedimento: 'Mounjaro 10mg', medico: 'Dr. Marcos Oliveira', data: '2026-05-01', numero_sessao: 8, status: 'AGENDADA', valor: 480, obs: '' },
  { id: 'SP003', protocolo_id: 'P002', patient: 'Marina Costa', procedimento: 'HCG 5000UI', medico: 'Dr. Marcos Oliveira', data: '2026-04-23', numero_sessao: 3, status: 'REALIZADA', valor: 380, obs: '', checkin_at: '2026-04-23T10:00:00' },
  { id: 'SP004', protocolo_id: 'P002', patient: 'Marina Costa', procedimento: 'HCG 5000UI', medico: 'Dr. Marcos Oliveira', data: '2026-05-07', numero_sessao: 4, status: 'AGENDADA', valor: 380, obs: '' },
  { id: 'SP005', protocolo_id: 'P003', patient: 'Carlos Souza', procedimento: 'Testosterona Enantato', medico: 'Dr. André Lima', data: '2026-03-22', numero_sessao: 2, status: 'REALIZADA', valor: 320, obs: '' },
  { id: 'SP006', protocolo_id: 'P004', patient: 'Beatriz Fernandes', procedimento: 'Soroterapia Premium', medico: 'Lorrana Silva', data: '2026-04-01', numero_sessao: 10, status: 'REALIZADA', valor: 650, obs: '', checkin_at: '2026-04-01T08:45:00' },
];

// ── NovoProtocoloModal ────────────────────────────────────────────────────────

function NovoProtocoloModal({ open, onClose, onSave, base }: {
  open: boolean; onClose: () => void;
  onSave: (p: Protocolo) => void;
  base?: Protocolo; // used for renovação
}) {
  const [patient, setPatient] = useState<any>(null);
  const [patientName, setPatientName] = useState(base?.patient ?? '');
  const [medico, setMedico] = useState(base?.medico ?? 'Dr. Marcos Oliveira');
  const [tratamento, setTratamento] = useState(base?.tratamento ?? '');
  const [objetivo, setObjetivo] = useState(base?.objetivo ?? '');
  const [totalSessoes, setTotalSessoes] = useState(String(base?.total_sessoes ?? 12));
  const [frequencia, setFrequencia] = useState(base?.frequencia ?? 'Semanal');
  const [valorStr, setValorStr] = useState(base ? fmt(base.valor) : '');
  const [validade, setValidade] = useState('');
  const [obs, setObs] = useState(base?.obs ?? '');
  const [status, setStatus] = useState<Protocolo['status']>('ATIVO');
  const [produtos, setProdutos] = useState<{ nome: string; quantidade: number }[]>(
    base?.produtos ?? [{ nome: '', quantidade: 1 }]
  );

  if (!open) return null;

  const addProduto = () => setProdutos(prev => [...prev, { nome: '', quantidade: 1 }]);
  const updateProduto = (i: number, field: 'nome' | 'quantidade', val: string | number) =>
    setProdutos(prev => prev.map((p, j) => j === i ? { ...p, [field]: val } : p));
  const removeProduto = (i: number) => setProdutos(prev => prev.filter((_, j) => j !== i));

  const handleSave = () => {
    const name = patient?.full_name || patient?.name || patientName;
    if (!name) { toast.error('Selecione um paciente'); return; }
    if (!tratamento.trim()) { toast.error('Tratamento obrigatório'); return; }
    if (!validade) { toast.error('Validade obrigatória'); return; }
    const newP: Protocolo = {
      id: `P${Date.now()}`, patient: name, medico, tratamento, objetivo,
      total_sessoes: parseInt(totalSessoes) || 12, sessoes_realizadas: 0,
      frequencia, valor: parseCurrency(valorStr), validade, obs, status,
      created_at: todayISO(),
      protocolo_anterior: base?.id,
      produtos: produtos.filter(p => p.nome.trim()),
    };
    onSave(newP);
    onClose();
    toast.success(`Protocolo criado para ${name}`);
    toast.info('📋 Vinculado ao Prontuário', { duration: 2000 });
    if (parseCurrency(valorStr) > 0) toast.info('💰 Orçamento gerado no Financeiro', { duration: 2500 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{base ? `Renovar Protocolo — ${base.patient}` : 'Novo Protocolo'}</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        {base && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            Renovação do protocolo <strong>{base.id}</strong> · {base.tratamento}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            {!base ? (
              <PatientSearch label="Paciente" onSelect={p => { setPatient(p); setPatientName(p.full_name || p.name); }} />
            ) : (
              <div>
                <label className="block text-xs font-medium mb-1">Paciente</label>
                <input value={patientName} readOnly className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-muted/30" />
              </div>
            )}
            {patientName && <p className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-lg mt-1">✓ {patientName}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Médico/Responsável *</label>
            <select value={medico} onChange={e => setMedico(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
              <option>Dr. Marcos Oliveira</option><option>Dr. André Lima</option><option>Lorrana Silva</option><option>Dr. Rafael Costa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Status inicial</label>
            <select value={status} onChange={e => setStatus(e.target.value as Protocolo['status'])}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
              <option value="ATIVO">Ativo</option><option value="INATIVO">Inativo (aguardando)</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1">Tratamento/Protocolo *</label>
            <input value={tratamento} onChange={e => setTratamento(e.target.value)} placeholder="Ex.: Mounjaro 10mg + Semaglutida 0.5mg"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1">Objetivo</label>
            <input value={objetivo} onChange={e => setObjetivo(e.target.value)} placeholder="Ex.: Perda de peso — 10kg em 3 meses"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Nº de sessões *</label>
            <input type="number" min="1" value={totalSessoes} onChange={e => setTotalSessoes(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Frequência</label>
            <select value={frequencia} onChange={e => setFrequencia(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
              <option>Diária</option><option>Semanal</option><option>Quinzenal</option><option>Mensal</option><option>Sob demanda</option>
            </select>
          </div>

          <div>
            <CurrencyInput label="Valor total do protocolo" value={valorStr} onChange={setValorStr} />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Validade *</label>
            <input type="date" value={validade} onChange={e => setValidade(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Produtos/Estoque */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium">Produtos/Estoque utilizados</label>
            <button onClick={addProduto} className="text-xs text-primary hover:underline flex items-center gap-1">
              <Plus className="h-3 w-3" />Adicionar produto
            </button>
          </div>
          <div className="space-y-2">
            {produtos.map((p, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                <input value={p.nome} onChange={e => updateProduto(i, 'nome', e.target.value)} placeholder="Nome do produto..."
                  className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                <input type="number" min="1" value={p.quantidade} onChange={e => updateProduto(i, 'quantidade', parseInt(e.target.value) || 1)}
                  className="w-16 rounded-lg border border-border px-2 py-1.5 text-sm outline-none text-center" />
                <button onClick={() => removeProduto(i)} disabled={produtos.length === 1}>
                  <X className={cn('h-4 w-4', produtos.length === 1 ? 'text-muted-foreground/30' : 'text-muted-foreground hover:text-red-500')} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Observações</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} placeholder="Alergias, contraindicações, notas..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        {/* Integrations info */}
        <div className="rounded-xl bg-muted/40 border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Ao salvar, este protocolo será vinculado a:</p>
          <div className="flex gap-3 flex-wrap">
            {['📋 Prontuário', '📅 Agenda', '💰 Financeiro', '📦 Estoque'].map(s => (
              <span key={s} className="text-xs bg-white border border-border rounded-full px-2.5 py-0.5">{s}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />{base ? 'Renovar Protocolo' : 'Criar Protocolo'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── CheckInModal ──────────────────────────────────────────────────────────────

function CheckInModal({ sessao, onClose, onConfirm }: {
  sessao: SessaoProto; onClose: () => void; onConfirm: (obs: string) => void;
}) {
  const [obs, setObs] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
            <Check className="h-4 w-4 text-green-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Check-in — Sessão {sessao.numero_sessao}</h3>
            <p className="text-xs text-muted-foreground">Confirmar presença do paciente</p>
          </div>
        </div>

        <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Paciente</span><span className="font-medium">{sessao.patient}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Procedimento</span><span>{sessao.procedimento}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Data agendada</span><span>{fmtDate(sessao.data)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Profissional</span><span>{sessao.medico}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Valor da sessão</span><span className="text-green-700 font-medium">{fmt(sessao.valor)}</span></div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Observações da sessão (opcional)</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
            placeholder="Intercorrências, anotações clínicas..."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-xs text-blue-700 space-y-0.5">
          <p>✓ Presença registrada no <strong>Prontuário</strong></p>
          <p>✓ Lançamento gerado no <strong>Financeiro</strong></p>
          <p>✓ Progresso atualizado no protocolo</p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onConfirm(obs); onClose(); }}>
            <Check className="h-3.5 w-3.5 mr-1.5" />Confirmar Check-in
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── ReativarModal ─────────────────────────────────────────────────────────────

function ReativarModal({ protocolo, onClose, onConfirm }: {
  protocolo: Protocolo; onClose: () => void;
  onConfirm: (motivo: string, novaFrequencia: string, proximaData: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [novaFreq, setNovaFreq] = useState(protocolo.frequencia);
  const [proximaData, setProximaData] = useState(todayISO());
  const [error, setError] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <RefreshCw className="h-4 w-4 text-amber-700" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Reativar Protocolo</h3>
            <p className="text-xs text-muted-foreground">{protocolo.patient} · {protocolo.tratamento}</p>
          </div>
        </div>

        {protocolo.motivo_pausa && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <strong>Motivo da pausa:</strong> {protocolo.motivo_pausa}
          </div>
        )}

        <div className="rounded-xl bg-muted/40 border border-border p-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Sessões realizadas</span><span className="font-medium">{protocolo.sessoes_realizadas}/{protocolo.total_sessoes}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Sessões restantes</span><span className="font-medium text-primary">{protocolo.total_sessoes - protocolo.sessoes_realizadas}</span></div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">Motivo da reativação *</label>
          <textarea value={motivo} onChange={e => { setMotivo(e.target.value); setError(''); }} rows={2}
            placeholder="Ex.: Paciente retornou de viagem e deseja continuar o protocolo."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Nova frequência</label>
            <select value={novaFreq} onChange={e => setNovaFreq(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
              <option>Diária</option><option>Semanal</option><option>Quinzenal</option><option>Mensal</option><option>Sob demanda</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Próxima sessão</label>
            <input type="date" value={proximaData} onChange={e => setProximaData(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="rounded-xl bg-green-50 border border-green-200 p-2.5 text-xs text-green-800 space-y-0.5">
          <p>✓ Status atualizado para <strong>ATIVO</strong></p>
          <p>✓ Nova sessão agendada em <strong>{fmtDate(proximaData)}</strong></p>
          <p>✓ Registro no Prontuário e Agenda</p>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!motivo.trim()) { setError('Motivo obrigatório'); return; }
            onConfirm(motivo, novaFreq, proximaData);
            onClose();
          }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Reativar Protocolo
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── SessoesTab ────────────────────────────────────────────────────────────────

function SessoesTab() {
  const [protocolos, setProtocolos] = useState<Protocolo[]>(INITIAL_PROTOCOLOS);
  const [sessoes, setSessoes] = useState<SessaoProto[]>(INITIAL_SESSOES_PROTO);
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [selectedProto, setSelectedProto] = useState<Protocolo | null>(null);

  // Modals
  const [showNovo, setShowNovo] = useState(false);
  const [showCheckin, setShowCheckin] = useState<SessaoProto | null>(null);
  const [showReativar, setShowReativar] = useState<Protocolo | null>(null);
  const [showRenovar, setShowRenovar] = useState<Protocolo | null>(null);

  const filteredProtos = protocolos.filter(p =>
    (!search || p.patient.toLowerCase().includes(search.toLowerCase()) || p.tratamento.toLowerCase().includes(search.toLowerCase())) &&
    (!statusF || p.status === statusF)
  );

  const sessoesDoProto = selectedProto
    ? sessoes.filter(s => s.protocolo_id === selectedProto.id).sort((a, b) => a.numero_sessao - b.numero_sessao)
    : [];

  const handleCheckin = (sessao: SessaoProto, obs: string) => {
    const now = new Date().toISOString();
    setSessoes(prev => prev.map(s => s.id === sessao.id ? { ...s, status: 'REALIZADA', checkin_at: now, obs } : s));
    setProtocolos(prev => prev.map(p => p.id === sessao.protocolo_id
      ? { ...p, sessoes_realizadas: p.sessoes_realizadas + 1, status: p.sessoes_realizadas + 1 >= p.total_sessoes ? 'FINALIZADO' : p.status }
      : p));
    if (selectedProto?.id === sessao.protocolo_id) {
      setSelectedProto(prev => prev ? { ...prev, sessoes_realizadas: prev.sessoes_realizadas + 1 } : prev);
    }
    toast.success(`Check-in registrado — Sessão ${sessao.numero_sessao} de ${sessao.patient}`);
    toast.info('📋 Prontuário atualizado · 💰 Lançamento gerado', { duration: 2500 });
  };

  const handleReativar = (proto: Protocolo, motivo: string, novaFreq: string, proximaData: string) => {
    setProtocolos(prev => prev.map(p => p.id === proto.id
      ? { ...p, status: 'ATIVO', frequencia: novaFreq, motivo_pausa: undefined }
      : p));
    // Create next session
    const nextNum = proto.sessoes_realizadas + 1;
    const valorSessao = proto.total_sessoes > 0 ? Math.round(proto.valor / proto.total_sessoes) : proto.valor;
    const newSessao: SessaoProto = {
      id: `SP${Date.now()}`, protocolo_id: proto.id, patient: proto.patient,
      procedimento: proto.tratamento, medico: proto.medico,
      data: proximaData, numero_sessao: nextNum, status: 'AGENDADA',
      valor: valorSessao, obs: `Reativado — ${motivo}`,
    };
    setSessoes(prev => [...prev, newSessao]);
    toast.success(`Protocolo de ${proto.patient} reativado`);
    toast.info(`📅 Sessão ${nextNum} agendada para ${fmtDate(proximaData)}`, { duration: 2500 });
  };

  const handleRenovar = (novoProto: Protocolo) => {
    // Create initial AGENDADA session for new protocol
    const valorSessao = novoProto.total_sessoes > 0 ? Math.round(novoProto.valor / novoProto.total_sessoes) : novoProto.valor;
    const primeiraData = todayISO();
    const primeiraSessionId = `SP${Date.now()}`;
    const primeiraSessao: SessaoProto = {
      id: primeiraSessionId, protocolo_id: novoProto.id, patient: novoProto.patient,
      procedimento: novoProto.tratamento, medico: novoProto.medico,
      data: primeiraData, numero_sessao: 1, status: 'AGENDADA',
      valor: valorSessao, obs: 'Primeira sessão do protocolo renovado',
    };
    setProtocolos(prev => [...prev, novoProto]);
    setSessoes(prev => [...prev, primeiraSessao]);
  };

  const handleNovoProtocolo = (novoProto: Protocolo) => {
    const valorSessao = novoProto.total_sessoes > 0 ? Math.round(novoProto.valor / novoProto.total_sessoes) : novoProto.valor;
    const primeiraSessao: SessaoProto = {
      id: `SP${Date.now()}`, protocolo_id: novoProto.id, patient: novoProto.patient,
      procedimento: novoProto.tratamento, medico: novoProto.medico,
      data: todayISO(), numero_sessao: 1, status: 'AGENDADA',
      valor: valorSessao, obs: '',
    };
    setProtocolos(prev => [...prev, novoProto]);
    setSessoes(prev => [...prev, primeiraSessao]);
    toast.info(`📅 Primeira sessão agendada para hoje`, { duration: 2000 });
  };

  // ── Protocol list view ──
  if (!selectedProto) return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente ou tratamento..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="px-2.5 py-2 rounded-lg border border-border text-sm bg-white outline-none">
          <option value="">Todos status</option>
          <option value="ATIVO">Ativo</option>
          <option value="PAUSADO">Pausado</option>
          <option value="INATIVO">Inativo</option>
          <option value="FINALIZADO">Finalizado</option>
        </select>
        <Button size="sm" onClick={() => setShowNovo(true)}><Plus className="h-3.5 w-3.5 mr-1" />Novo Protocolo</Button>
        <Button size="sm" variant="secondary" onClick={() => toast.info('Exportando...')}><Download className="h-3.5 w-3.5 mr-1" />Exportar</Button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {(['ATIVO', 'PAUSADO', 'INATIVO', 'FINALIZADO'] as const).map(s => {
          const count = protocolos.filter(p => p.status === s).length;
          return (
            <button key={s} onClick={() => setStatusF(statusF === s ? '' : s)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                statusF === s ? PROTO_STATUS[s] + ' border-transparent' : 'border-border text-muted-foreground hover:border-primary/40')}>
              <span>{s}</span><span className="font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Protocol cards */}
      <div className="space-y-2">
        {filteredProtos.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
            <Activity className="h-7 w-7 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum protocolo encontrado.</p>
          </div>
        ) : filteredProtos.map(p => {
          const pct = p.total_sessoes > 0 ? (p.sessoes_realizadas / p.total_sessoes) * 100 : 0;
          const proxima = sessoes.find(s => s.protocolo_id === p.id && s.status === 'AGENDADA');
          return (
            <div key={p.id} className={cn('rounded-xl border border-border bg-white p-4 space-y-3 hover:shadow-sm transition-shadow',
              p.status === 'PAUSADO' && 'border-amber-200 bg-amber-50/30',
              p.status === 'FINALIZADO' && 'opacity-75')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{p.patient}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PROTO_STATUS[p.status])}>{p.status}</span>
                    <span className="text-xs text-muted-foreground">{p.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.tratamento}</p>
                  {p.objetivo && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{p.objetivo}</p>}
                  {p.motivo_pausa && (
                    <p className="text-xs text-amber-700 mt-1">⚠ {p.motivo_pausa}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-green-700">{fmt(p.valor)}</p>
                  <p className="text-xs text-muted-foreground">{p.medico}</p>
                  <p className="text-xs text-muted-foreground">{p.frequencia}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{p.sessoes_realizadas}/{p.total_sessoes} sessões</span>
                  <span>{Math.round(pct)}%</span>
                  {proxima && <span>Próxima: {fmtDate(proxima.data)}</span>}
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn('h-2 rounded-full transition-all', pct === 100 ? 'bg-blue-500' : 'bg-primary')}
                    style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedProto(p)}>
                  <Activity className="h-3 w-3 mr-1" />Ver Sessões
                </Button>
                {p.status === 'ATIVO' && proxima && (
                  <Button size="sm" variant="secondary" className="h-7 text-xs bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
                    onClick={() => setShowCheckin(proxima)}>
                    <Check className="h-3 w-3 mr-1" />Check-in
                  </Button>
                )}
                {(p.status === 'PAUSADO' || p.status === 'INATIVO') && (
                  <Button size="sm" variant="secondary" className="h-7 text-xs bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                    onClick={() => setShowReativar(p)}>
                    <RefreshCw className="h-3 w-3 mr-1" />Reativar
                  </Button>
                )}
                {p.status === 'FINALIZADO' && (
                  <Button size="sm" variant="secondary" className="h-7 text-xs bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
                    onClick={() => setShowRenovar(p)}>
                    <FilePlus className="h-3 w-3 mr-1" />Renovar
                  </Button>
                )}
                {p.produtos.length > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                    <Package className="h-3 w-3" />
                    {p.produtos.map(pr => pr.nome).join(', ')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {showNovo && (
        <NovoProtocoloModal open={showNovo} onClose={() => setShowNovo(false)} onSave={handleNovoProtocolo} />
      )}
      {showCheckin && (
        <CheckInModal sessao={showCheckin} onClose={() => setShowCheckin(null)}
          onConfirm={obs => handleCheckin(showCheckin, obs)} />
      )}
      {showReativar && (
        <ReativarModal protocolo={showReativar} onClose={() => setShowReativar(null)}
          onConfirm={(motivo, freq, data) => handleReativar(showReativar, motivo, freq, data)} />
      )}
      {showRenovar && (
        <NovoProtocoloModal open={!!showRenovar} onClose={() => setShowRenovar(null)}
          onSave={p => { handleRenovar(p); setShowRenovar(null); }} base={showRenovar} />
      )}
    </div>
  );

  // ── Session detail view ──
  const pct = selectedProto.total_sessoes > 0 ? (selectedProto.sessoes_realizadas / selectedProto.total_sessoes) * 100 : 0;
  const proxima = sessoesDoProto.find(s => s.status === 'AGENDADA');

  return (
    <div className="space-y-4">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={() => setSelectedProto(null)}>
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />Voltar aos protocolos
        </Button>
        <div className="h-px flex-1 bg-border" />
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PROTO_STATUS[selectedProto.status])}>{selectedProto.status}</span>
      </div>

      {/* Protocol card summary */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-base font-semibold">{selectedProto.patient}</p>
            <p className="text-sm text-muted-foreground">{selectedProto.tratamento}</p>
            <p className="text-xs text-muted-foreground/70 italic mt-0.5">{selectedProto.objetivo}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-green-700">{fmt(selectedProto.valor)}</p>
            <p className="text-xs text-muted-foreground">{selectedProto.medico}</p>
            <p className="text-xs text-muted-foreground">{selectedProto.frequencia} · Validade {fmtDate(selectedProto.validade)}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{selectedProto.sessoes_realizadas}/{selectedProto.total_sessoes} sessões realizadas</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {selectedProto.obs && (
          <p className="text-xs text-muted-foreground border-t border-border pt-2">{selectedProto.obs}</p>
        )}

        {selectedProto.produtos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {selectedProto.produtos.map((pr, i) => (
              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                <Package className="h-2.5 w-2.5 inline mr-1" />{pr.nome} ×{pr.quantidade}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {selectedProto.status === 'ATIVO' && proxima && (
            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => setShowCheckin(proxima)}>
              <Check className="h-3 w-3 mr-1" />Check-in (Sessão {proxima.numero_sessao})
            </Button>
          )}
          {(selectedProto.status === 'PAUSADO' || selectedProto.status === 'INATIVO') && (
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setShowReativar(selectedProto)}>
              <RefreshCw className="h-3 w-3 mr-1" />Reativar
            </Button>
          )}
          {selectedProto.status === 'FINALIZADO' && (
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setShowRenovar(selectedProto)}>
              <FilePlus className="h-3 w-3 mr-1" />Renovar Protocolo
            </Button>
          )}
        </div>
      </div>

      {/* Sessions table */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico de Sessões</h4>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Nº', 'Data', 'Procedimento', 'Profissional', 'Valor', 'Check-in', 'Status', 'Ação'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessoesDoProto.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground text-sm">Nenhuma sessão registrada.</td></tr>
              ) : sessoesDoProto.map(s => (
                <tr key={s.id} className={cn('hover:bg-muted/30', s.status === 'AGENDADA' && 'bg-blue-50/30')}>
                  <td className="px-3 py-2.5 font-mono text-xs font-bold">{s.numero_sessao}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(s.data)}</td>
                  <td className="px-3 py-2.5">{s.procedimento}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{s.medico}</td>
                  <td className="px-3 py-2.5 font-medium text-green-700">{fmt(s.valor)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {s.checkin_at ? new Date(s.checkin_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', SESSAO_STATUS[s.status])}>{s.status}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {s.status === 'AGENDADA' && (
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-green-700 hover:bg-green-50"
                        onClick={() => setShowCheckin(s)}>
                        <Check className="h-3 w-3 mr-0.5" />Check-in
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCheckin && (
        <CheckInModal sessao={showCheckin} onClose={() => setShowCheckin(null)}
          onConfirm={obs => handleCheckin(showCheckin, obs)} />
      )}
      {showReativar && (
        <ReativarModal protocolo={showReativar} onClose={() => setShowReativar(null)}
          onConfirm={(motivo, freq, data) => handleReativar(showReativar, motivo, freq, data)} />
      )}
      {showRenovar && (
        <NovoProtocoloModal open={!!showRenovar} onClose={() => setShowRenovar(null)}
          onSave={p => { handleRenovar(p); setShowRenovar(null); }} base={showRenovar} />
      )}
    </div>
  );
}

// ── Pagamentos Stone ──────────────────────────────────────────────────────────

const MOCK_STONE = [
  { id: 'ST001', patient: 'Ana Lima', date: '2026-04-24', status: 'APROVADO', tid: 'TID-20240424-001', value: 850 },
  { id: 'ST002', patient: 'Carlos Souza', date: '2026-04-23', status: 'PENDENTE', tid: 'TID-20240423-002', value: 600 },
  { id: 'ST003', patient: 'Beatriz Fernandes', date: '2026-04-22', status: 'APROVADO', tid: 'TID-20240422-003', value: 650 },
  { id: 'ST004', patient: 'Pedro Gomes', date: '2026-04-20', status: 'CANCELADO', tid: 'TID-20240420-004', value: 450 },
];

function StoneTab() {
  const [search, setSearch] = useState('');
  const filtered = MOCK_STONE.filter(s => !search || s.patient.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome do paciente..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <Button size="sm" variant="secondary" onClick={() => toast.info('Atualizando...')}><RefreshCw className="h-3.5 w-3.5 mr-1" />Atualizar</Button>
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-orange-600 shrink-0" />
        <p className="text-xs text-orange-700">Web Pagamentos Stone — integração via API Stone. Configure as credenciais em Configurações → Integrações.</p>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Nome do Paciente', 'Data', 'Status', 'TID', 'Valor'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Nenhum pagamento encontrado.</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 font-medium">{s.patient}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(s.date)}</td>
                <td className="px-3 py-2.5">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    s.status === 'APROVADO' ? 'bg-green-100 text-green-800' :
                    s.status === 'PENDENTE' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800')}>
                    {s.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{s.tid}</td>
                <td className="px-3 py-2.5 font-medium">{fmt(s.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Guia TISS ─────────────────────────────────────────────────────────────────

const MOCK_TISS = [
  { id: 'T001', patient: 'Ana Lima', convenio: 'Unimed', data_consulta: '2026-04-24', created_at: '2026-04-24', status: 'ENVIADA' },
  { id: 'T002', patient: 'Carlos Souza', convenio: 'Bradesco', data_consulta: '2026-04-23', created_at: '2026-04-23', status: 'PENDENTE' },
  { id: 'T003', patient: 'Beatriz Fernandes', convenio: 'Unimed', data_consulta: '2026-04-20', created_at: '2026-04-21', status: 'APROVADA' },
];

function TissTab() {
  const [search, setSearch] = useState('');
  const [showNovaGuia, setShowNovaGuia] = useState(false);
  const [selectedGuia, setSelectedGuia] = useState<any>(null);
  const filtered = MOCK_TISS.filter(t => !search || t.patient.toLowerCase().includes(search.toLowerCase()) || t.convenio.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar paciente ou convênio..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <Button size="sm" variant="secondary" onClick={() => toast.info('Voltar')}><ChevronLeft className="h-3.5 w-3.5 mr-1" />Voltar</Button>
        <Button size="sm" onClick={() => setShowNovaGuia(true)}><Plus className="h-3.5 w-3.5 mr-1" />Nova Guia</Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Paciente', 'Convênio', 'Data da Consulta', 'Data de Criação', 'Status', 'Visualizar'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Nenhuma guia.</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 font-medium">{t.patient}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{t.convenio}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(t.data_consulta)}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(t.created_at)}</td>
                <td className="px-3 py-2.5">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                    t.status === 'APROVADA' ? 'bg-green-100 text-green-800' :
                    t.status === 'ENVIADA' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800')}>
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setSelectedGuia(t)}>
                    <FileText className="h-3 w-3 mr-1" />Ver
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showNovaGuia} onClose={() => setShowNovaGuia(false)} title="Nova Guia TISS" size="md">
        <div className="space-y-3">
          <Input label="Paciente *" placeholder="Buscar paciente..." />
          <Select label="Convênio *"><option>Unimed</option><option>Bradesco</option><option>Amil</option><option>SulAmérica</option></Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data da Consulta *" type="date" />
            <Input label="Carteirinha" placeholder="Nº da carteirinha" />
          </div>
          <Select label="Tipo de Guia"><option>Consulta</option><option>SADT</option><option>Internação</option><option>Honorário</option></Select>
          <Input label="CID" placeholder="Código CID-10" />
          <textarea placeholder="Observações..." rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setShowNovaGuia(false)}>Cancelar</Button>
          <Button onClick={() => { toast.success('Guia TISS criada'); setShowNovaGuia(false); }}>Criar Guia</Button>
        </DialogFooter>
      </Dialog>

      {selectedGuia && <TissViewModal guia={selectedGuia} onClose={() => setSelectedGuia(null)} />}
    </div>
  );
}

// ── AYRON Financeiro IA ───────────────────────────────────────────────────────

const IA_TEMPLATES = [
  'Faturamento por profissional e convênio',
  'Faturamento por procedimento',
  'Despesas por categoria',
  'Resultado financeiro do mês',
];

function IATab() {
  const [messages, setMessages] = useState<{ from: 'me' | 'ia'; text: string }[]>([
    { from: 'ia', text: 'Olá! Sou o AYRON Financeiro, seu assistente financeiro. Faça uma pergunta sobre os dados financeiros da clínica ou use um dos modelos abaixo.' },
  ]);
  const [draft, setDraft] = useState('');

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { from: 'me', text }, { from: 'ia', text: `Analisando: "${text}"... Esta funcionalidade requer conexão com os dados financeiros em tempo real. Configure a integração IA em Configurações → AYRON IA.` }]);
    setDraft('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center"><Brain className="h-4 w-4 text-amber-600" /></div>
          <div>
            <p className="text-sm font-semibold">AYRON Financeiro — Análise Financeira</p>
            <p className="text-xs text-muted-foreground">Powered by AYRON IA</p>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setMessages([{ from: 'ia', text: 'Nova conversa iniciada.' }])}>
          <Plus className="h-3.5 w-3.5 mr-1" />Nova
        </Button>
      </div>

      {/* Chat */}
      <div className="rounded-xl border border-border bg-white min-h-[200px] max-h-[320px] overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm',
              m.from === 'me' ? 'bg-primary text-white rounded-tr-sm' : 'bg-muted rounded-tl-sm')}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Templates */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Perguntas modelo</p>
        <div className="flex gap-2 flex-wrap">
          {IA_TEMPLATES.map(t => (
            <button key={t} onClick={() => send(t)}
              className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors">
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(draft)}
          placeholder="Do que precisa hoje? Escreva sua pergunta..."
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <Button size="sm" onClick={() => send(draft)} disabled={!draft.trim()}><Send className="h-4 w-4" /></Button>
      </div>
      <p className="text-xs text-muted-foreground">⚠️ O AYRON Financeiro pode cometer erros. Verifique informações importantes.</p>
    </div>
  );
}

// ── Nota Fiscal ───────────────────────────────────────────────────────────────

const MOCK_NFE = [
  { id: 'NF001', data: '2026-04-24', client: 'Ana Lima', valor: 850, status: 'EMITIDA' },
  { id: 'NF002', data: '2026-04-23', client: 'Carlos Souza', valor: 600, status: 'PENDENTE' },
  { id: 'NF003', data: '2026-04-20', client: 'Beatriz Fernandes', valor: 650, status: 'EMITIDA' },
  { id: 'NF004', data: '2026-04-18', client: 'Pedro Gomes', valor: 450, status: 'CANCELADA' },
];

function NotaFiscalTab() {
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const filtered = MOCK_NFE.filter(n =>
    (!search || n.client.toLowerCase().includes(search.toLowerCase())) &&
    (!statusF || n.status === statusF)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="px-2.5 py-2 rounded-lg border border-border text-sm bg-white outline-none">
          <option value="">Todas</option>
          <option value="EMITIDA">Emitida</option>
          <option value="PENDENTE">Pendente</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <Button size="sm" variant="secondary" onClick={() => toast.info('Voltar')}><ChevronLeft className="h-3.5 w-3.5 mr-1" />Voltar</Button>
        <Button size="sm" variant="secondary" onClick={() => setShowConfig(true)}><Filter className="h-3.5 w-3.5 mr-1" />Configurações</Button>
        <Button size="sm" onClick={() => toast.info('Emitir nota fiscal')}><Plus className="h-3.5 w-3.5 mr-1" />Nova NFS-e</Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['#', 'Data Fatura', 'Cliente', 'Valor Recebido', 'Status', 'Ações'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Nenhuma nota fiscal.</td></tr>
            ) : filtered.map((n, idx) => (
              <tr key={n.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{fmtDate(n.data)}</td>
                <td className="px-3 py-2.5 font-medium">{n.client}</td>
                <td className="px-3 py-2.5 font-medium text-green-700">{fmt(n.valor)}</td>
                <td className="px-3 py-2.5">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[n.status] ?? 'bg-gray-100')}>
                    {STATUS_LABELS[n.status] ?? n.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1">
                    {n.status === 'EMITIDA' && (
                      <>
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => window.print()}><Printer className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => toast.info('Enviando...')}><Send className="h-3 w-3" /></Button>
                      </>
                    )}
                    {n.status === 'PENDENTE' && (
                      <Button size="sm" variant="secondary" className="h-6 text-xs px-2" onClick={() => toast.success('NFS-e emitida')}>Emitir</Button>
                    )}
                    {n.status !== 'CANCELADA' && (
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2 text-red-500" onClick={() => toast.success('Nota cancelada')}>Cancelar</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showConfig} onClose={() => setShowConfig(false)} title="Configurações de Nota Fiscal" size="md">
        <div className="space-y-3">
          <Input label="CNPJ da Clínica" placeholder="00.000.000/0001-00" />
          <Input label="Inscrição Municipal" placeholder="Nº inscrição" />
          <Input label="Código da Cidade (IBGE)" placeholder="Ex.: 3550308" />
          <Select label="Regime Tributário"><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option></Select>
          <Input label="Alíquota ISS (%)" type="number" placeholder="5" />
          <Input label="Código do Serviço (LC116)" placeholder="Ex.: 4.03" />
          <Input label="Token/API da Prefeitura" type="password" placeholder="Token de integração" />
        </div>
        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => setShowConfig(false)}>Cancelar</Button>
          <Button onClick={() => { toast.success('Configurações salvas'); setShowConfig(false); }}>Salvar Configurações</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

// ── Fechamento ────────────────────────────────────────────────────────────────

const MOCK_CAIXAS_ABERTOS = [
  { id: 'CX001', data_abertura: '2026-04-24', unidade: 'Principal', responsavel: 'Dr. Marcos Oliveira', total_receitas: 2850, total_despesas: 0, pendencias: 3 },
  { id: 'CX002', data_abertura: '2026-04-23', unidade: 'Filial 2', responsavel: 'Dra. Ana Lima', total_receitas: 1200, total_despesas: 500, pendencias: 1 },
  { id: 'CX003', data_abertura: '2026-04-22', unidade: 'Principal', responsavel: 'Dr. Marcos Oliveira', total_receitas: 3400, total_despesas: 200, pendencias: 0 },
];

const MOCK_PENDENCIAS_FECHAMENTO = [
  { id: 'P001', caixa_id: 'CX001', tipo: 'Consulta sem cobrança', paciente: 'Carlos Souza', valor: 1200, data: '2026-04-24' },
  { id: 'P002', caixa_id: 'CX001', tipo: 'Pagamento parcial em aberto', paciente: 'Marina Costa', valor: 2000, data: '2026-04-24' },
  { id: 'P003', caixa_id: 'CX001', tipo: 'Lançamento sem quitação', paciente: '—', valor: 3500, data: '2026-04-24' },
  { id: 'P004', caixa_id: 'CX002', tipo: 'Consulta sem cobrança', paciente: 'Pedro Gomes', valor: 450, data: '2026-04-23' },
];

function FechamentoTab() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [selectedCaixa, setSelectedCaixa] = useState<any>(null);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['finance-closing', date],
    queryFn: () => api.get(`/finance/close-day?date=${date}`).then(r => r.data).catch(() => null),
    enabled: false,
  });

  // Caixas abertos há mais de 1 dia
  const caixasAbertos = MOCK_CAIXAS_ABERTOS.map(c => {
    const diffDays = Math.floor((Date.now() - new Date(c.data_abertura).getTime()) / 86400000);
    return { ...c, diffDays };
  });
  const alertCaixas = caixasAbertos.filter(c => c.diffDays > 1);

  const pendenciasDoCaixa = (id: string) => MOCK_PENDENCIAS_FECHAMENTO.filter(p => p.caixa_id === id);

  return (
    <div className="space-y-4">

      {/* Multi-day open alert */}
      {alertCaixas.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              {alertCaixas.length} caixa{alertCaixas.length > 1 ? 's' : ''} aberto{alertCaixas.length > 1 ? 's' : ''} há mais de 1 dia
            </p>
          </div>
          <div className="space-y-1">
            {alertCaixas.map(c => (
              <div key={c.id} className="flex items-center justify-between text-xs text-amber-700 rounded-lg bg-amber-100/60 px-3 py-1.5">
                <span><strong>{c.unidade}</strong> — {c.responsavel}</span>
                <span className="font-medium">Aberto há {c.diffDays} dia{c.diffDays !== 1 ? 's' : ''} · {c.pendencias} pendência{c.pendencias !== 1 ? 's' : ''}</span>
                <button onClick={() => setSelectedCaixa(c === selectedCaixa ? null : c)}
                  className="ml-3 text-amber-800 underline whitespace-nowrap">
                  {selectedCaixa?.id === c.id ? 'Ocultar' : 'Ver pendências'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending list for selected caixa */}
      {selectedCaixa && (() => {
        const pends = pendenciasDoCaixa(selectedCaixa.id);
        return (
          <div className="rounded-xl border border-border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Pendências — {selectedCaixa.unidade} · {fmtDate(selectedCaixa.data_abertura)}</h4>
              <button onClick={() => setSelectedCaixa(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            {pends.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma pendência registrada.</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {['Tipo', 'Paciente', 'Valor', 'Data'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pends.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 text-xs font-medium">{p.tipo}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.paciente}</td>
                        <td className="px-3 py-2.5 text-xs text-amber-700 font-medium">{fmt(p.valor)}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(p.data)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Caixas abertos list */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Caixas em aberto</h4>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Data Abertura', 'Unidade', 'Responsável', 'Receitas', 'Despesas', 'Pendências', 'Ação'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {caixasAbertos.map(c => (
                <tr key={c.id} className={cn('hover:bg-muted/30', c.diffDays > 1 && 'bg-amber-50/40')}>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {fmtDate(c.data_abertura)}
                    {c.diffDays > 1 && <span className="ml-1.5 text-[10px] text-amber-600 font-medium">+{c.diffDays}d</span>}
                  </td>
                  <td className="px-3 py-2.5 font-medium">{c.unidade}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{c.responsavel}</td>
                  <td className="px-3 py-2.5 text-green-700 font-medium">{fmt(c.total_receitas)}</td>
                  <td className="px-3 py-2.5 text-red-600">{c.total_despesas > 0 ? fmt(c.total_despesas) : '—'}</td>
                  <td className="px-3 py-2.5">
                    {c.pendencias > 0
                      ? <span className="text-xs text-amber-700 font-medium">{c.pendencias} pendência{c.pendencias !== 1 ? 's' : ''}</span>
                      : <span className="text-xs text-green-700">Sem pendências</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="secondary" className="h-7 text-xs"
                      onClick={() => { setDate(c.data_abertura); setTimeout(() => refetch(), 50); toast.info(`Fechando caixa ${c.id}…`); }}>
                      <BarChart3 className="h-3 w-3 mr-1" />Fechar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual close */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <h4 className="text-sm font-semibold">Fechar dia manualmente</h4>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e: any) => setDate(e.target.value)} className="h-9 w-44" />
          <Button size="sm" onClick={() => refetch()} disabled={isLoading}>
            <BarChart3 className="h-3.5 w-3.5 mr-1" />{isLoading ? 'Processando…' : 'Fechar Dia'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer className="h-3.5 w-3.5 mr-1" />Imprimir</Button>
        </div>

        {!data && !isLoading && (
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">
            <Wallet className="h-7 w-7 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Selecione uma data e clique em "Fechar Dia" para gerar o fechamento.</p>
          </div>
        )}

        {data && (
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Resultado do Fechamento — {fmtDate(date)}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Consultas finalizadas:</span> <span className="font-bold">{data.appointments_completed}</span></div>
              <div><span className={`font-bold ${data.appointments_without_charge > 0 ? 'text-red-600' : 'text-green-600'}`}>{data.appointments_without_charge} sem cobrança</span></div>
              <div><span className="text-muted-foreground">Cobranças emitidas:</span> <span className="font-medium">{data.receivables_issued?.count ?? 0}</span></div>
              <div><span className="text-muted-foreground">Vencidos atualizados:</span> <span className="font-medium">{data.overdue_updated}</span></div>
            </div>
            {data.missing_charges?.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-xs font-semibold text-red-800 mb-1">Consultas sem cobrança:</p>
                {data.missing_charges.map((m: any) => (
                  <p key={m.appointment_id} className="text-xs text-red-700">Consulta {m.appointment_id.slice(0, 8)} — Paciente {m.patient_id.slice(0, 8)}</p>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Auditoria ─────────────────────────────────────────────────────────────────

function AuditoriaTab() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data, isLoading } = useQuery({
    queryKey: ['finance-audit', filters],
    queryFn: () => { const p = new URLSearchParams(filters as any); return api.get(`/finance/reports/audit?${p}`).then(r => r.data).catch(() => []); },
  });
  const rows: any[] = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div className="space-y-4">
      <AdvancedFilter
        fields={[
          { key: 'entity_type', label: 'Tipo', type: 'select', options: [
            { value: 'Receivable', label: 'Recebível' }, { value: 'Payable', label: 'Despesa' },
            { value: 'Budget', label: 'Orçamento' }, { value: 'LedgerEntry', label: 'Lançamento' },
          ]},
          { key: 'from', label: 'De', type: 'date' },
          { key: 'to', label: 'Até', type: 'date' },
        ]}
        values={filters}
        onChange={setFilters}
      />
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Data', 'Tipo', 'Ação', 'Valor', 'Usuário'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sem registros de auditoria.</td></tr>
            ) : rows.map((r: any) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-3 py-2.5 text-muted-foreground">{new Date(r.created_at).toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2.5">{r.entity_type}</td>
                <td className="px-3 py-2.5"><span className="text-xs bg-muted px-1.5 py-0.5 rounded font-medium">{r.action}</span></td>
                <td className="px-3 py-2.5">{r.amount ? fmt(r.amount) : '—'}</td>
                <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{r.user_id?.slice(0, 8) ?? 'sistema'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancialPage() {
  const searchParams = useSearchParams();
  const patientNameFromUrl = searchParams.get('patientName');
  const [module, setModule] = useState<ModuleKey>(() => patientNameFromUrl ? 'vendas' : 'hub');

  const currentModule = MODULES.find(m => m.key === module);

  return (
    <div>
      <Topbar title="Financeiro" />
      <div className="p-6 space-y-5">

        {/* Breadcrumb */}
        {module !== 'hub' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setModule('hub')} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
              <ChevronLeft className="h-3.5 w-3.5" />Financeiro
            </button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-medium">{currentModule?.label}</span>
          </div>
        )}

        {module === 'hub' && <FinancialHub onSelect={setModule} />}
        {module === 'vendas' && <VendasTab initialSearch={patientNameFromUrl ?? undefined} />}
        {module === 'lancamentos' && <LancamentosTab />}
        {module === 'dashboard' && <DashboardGestaoTab />}
        {module === 'relatorios' && <RelatoriosTab />}
        {module === 'sessoes' && <SessoesTab />}
        {module === 'stone' && <StoneTab />}
        {module === 'tiss' && <TissTab />}
        {module === 'ia' && <IATab />}
        {module === 'nfe' && <NotaFiscalTab />}
        {module === 'fechamento' && <FechamentoTab />}
        {module === 'auditoria' && <AuditoriaTab />}
      </div>
    </div>
  );
}
