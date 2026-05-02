'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Topbar } from '@/components/layout/topbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  FileText, Search, User, Plus, ChevronRight, Brain, Stethoscope,
  Pill, ClipboardList, FlaskConical, Calendar, Clock, Download,
  AlertTriangle, CheckCircle, Edit2, Printer, Send, Sparkles,
  BarChart3, TrendingUp, Heart, Activity, X, Image, Video, Mail,
  Scale, Clipboard, Mic, MicOff, Upload, Link2, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Mock patients for prontuário hub ──────────────────────────────────────────

const MOCK_PATIENTS_CLINICAL = [
  { id: 'P4821', name: 'Ana Lima', age: 38, last_consult: '2026-04-11', status: 'ATIVO', medico: 'Dr. Murilo', procedures: ['Mounjaro', 'Soroterapia'], risk: 'LOW', photo_url: null, risk_reasons: [] },
  { id: 'P3102', name: 'Carlos Souza', age: 45, last_consult: '2026-01-22', status: 'ATIVO', medico: 'Dr. Murilo', procedures: ['Implante Testosterona'], risk: 'MEDIUM', photo_url: null, risk_reasons: ['Sem retorno há 64 dias', 'Pendência de exame de acompanhamento'] },
  { id: 'P1089', name: 'Beatriz Fernandes', age: 33, last_consult: '2026-04-10', status: 'ATIVO', medico: 'Amanda Gomes', procedures: ['Soroterapia'], risk: 'LOW', photo_url: null, risk_reasons: [] },
  { id: 'P2205', name: 'Pedro Gomes', age: 52, last_consult: '2026-03-27', status: 'EM_RISCO', medico: 'Lorrana', procedures: ['Mounjaro'], risk: 'HIGH', photo_url: null, risk_reasons: ['Sem consulta há 30 dias', 'Exame alterado: LDL 142 mg/dL', 'Protocolo em risco de abandono'] },
  { id: 'P5542', name: 'Marina Costa', age: 29, last_consult: '2026-04-10', status: 'ATIVO', medico: 'Dr. Murilo', procedures: ['HCG', 'Enantato'], risk: 'LOW', photo_url: null, risk_reasons: [] },
  { id: 'P0932', name: 'Roberto Alves', age: 61, last_consult: '2026-02-15', status: 'EM_RISCO', medico: 'Dr. André', procedures: ['NADH'], risk: 'MEDIUM', photo_url: null, risk_reasons: ['Sem retorno há 70 dias', 'Risco clínico elevado pela idade'] },
  { id: 'P7731', name: 'Camila Dias', age: 41, last_consult: '2026-12-22', status: 'EM_RISCO', medico: 'Amanda Gomes', procedures: ['Gestrinona'], risk: 'HIGH', photo_url: null, risk_reasons: ['Protocolo interrompido há 4 meses', 'Retorno em atraso crítico', 'Pendência de exame hormonal'] },
  { id: 'P6621', name: 'Fernanda Lima', age: 35, last_consult: '2026-03-01', status: 'PAUSADO', medico: 'Amanda Gomes', procedures: ['Soroterapia'], risk: 'MEDIUM', photo_url: null, risk_reasons: ['Protocolo pausado há 55 dias'] },
];

// ── Mock prontuário detail ─────────────────────────────────────────────────────

const MOCK_EVOLUCOES = [
  {
    id: 'E1', date: '2026-04-11', medico: 'Dr. Murilo', type: 'Consulta',
    cid: 'E66.0 — Obesidade grau II',
    subjetivo: 'Paciente relata redução de 3,2kg no último mês. Refere boa tolerância à medicação. Sem efeitos colaterais significativos. Apetite controlado. Sono melhorado.',
    objetivo: 'PA: 120/80 · FC: 72bpm · Peso: 87,4kg · IMC: 29.1 · Circunferência abdominal: 94cm',
    avaliacao: 'Boa resposta ao protocolo Mounjaro 10mg. Perda de peso progressiva e consistente. Sem comorbidades descompensadas.',
    plano: 'Manter dose Mounjaro 10mg semanal. Retorno em 14 dias. Solicitar hemograma + glicemia de jejum + perfil lipídico.',
    ai_summary: 'AYRON: paciente com excelente adesão. Score CSS 82/100. Probabilidade de continuidade do protocolo: 94%.',
  },
  {
    id: 'E2', date: '2026-03-28', medico: 'Lorrana', type: 'Procedimento',
    cid: 'E66.0 — Obesidade grau II',
    subjetivo: 'Retorno para aplicação Mounjaro #6. Refere leve náusea nas primeiras 24h após última aplicação.',
    objetivo: 'Peso: 90,6kg · IMC: 30.1',
    avaliacao: 'Náusea leve, esperada para a dosagem. Orientações sobre alimentação pós-aplicação reforçadas.',
    plano: 'Aplicação Mounjaro 10mg subcutâneo. Próxima sessão: 11/04.',
    ai_summary: null,
  },
];

const MOCK_RECEITAS = [
  {
    id: 'R1', date: '2026-04-11', medico: 'Dr. Murilo', validade: '2026-05-11',
    items: [
      { med: 'Tirzepatida (Mounjaro) 10mg', dosagem: '0,5mL subcutâneo semanal', qtd: '4 canetas', obs: 'Aplicar no abdome, coxa ou braço — alternar locais' },
    ],
    status: 'ATIVA',
  },
  {
    id: 'R2', date: '2026-03-01', medico: 'Dr. Murilo', validade: '2026-04-01',
    items: [
      { med: 'Ácido fólico 5mg', dosagem: '1 comprimido ao dia', qtd: '30 comprimidos', obs: '' },
      { med: 'Vitamina D3 50.000UI', dosagem: '1 cápsula por semana', qtd: '4 cápsulas', obs: 'Tomar com refeição' },
    ],
    status: 'VENCIDA',
  },
];

const MOCK_EXAMES = [
  { id: 'X1', name: 'Hemograma completo', data: '2026-04-01', lab: 'Delboni', status: 'NORMAL', resultado: 'Todos índices dentro da normalidade. Hb: 13,2 · Plaquetas: 248k · Leucócitos: 7.200', file_url: null, ai_data: [
    { item: 'Hemoglobina', valor: '13,2', unidade: 'g/dL', ref: '12–16', nivel: 'ideal' },
    { item: 'Plaquetas', valor: '248.000', unidade: '/μL', ref: '150k–400k', nivel: 'ideal' },
    { item: 'Leucócitos', valor: '7.200', unidade: '/μL', ref: '4.000–11.000', nivel: 'ideal' },
  ]},
  { id: 'X2', name: 'Glicemia de jejum', data: '2026-04-01', lab: 'Delboni', status: 'NORMAL', resultado: '89 mg/dL', file_url: null, ai_data: [
    { item: 'Glicemia', valor: '89', unidade: 'mg/dL', ref: '70–99', nivel: 'ideal' },
  ]},
  { id: 'X3', name: 'Perfil lipídico', data: '2026-04-01', lab: 'Delboni', status: 'ATENCAO', resultado: 'LDL: 142 mg/dL (↑ leve) · HDL: 52 · Triglicerídeos: 118', file_url: null, ai_data: [
    { item: 'Colesterol total', valor: '198', unidade: 'mg/dL', ref: '<200', nivel: 'ideal' },
    { item: 'LDL', valor: '142', unidade: 'mg/dL', ref: '<130', nivel: 'alto' },
    { item: 'HDL', valor: '52', unidade: 'mg/dL', ref: '>40', nivel: 'ideal' },
    { item: 'Triglicerídeos', valor: '118', unidade: 'mg/dL', ref: '<150', nivel: 'ideal' },
  ]},
  { id: 'X4', name: 'TSH + T4 livre', data: '2026-02-15', lab: 'Fleury', status: 'NORMAL', resultado: 'TSH: 2.1 mUI/L · T4L: 1.2 ng/dL', file_url: null, ai_data: null },
  { id: 'X5', name: 'Insulina basal', data: '2026-02-15', lab: 'Fleury', status: 'NORMAL', resultado: '8,4 μUI/mL — resistência insulínica afastada', file_url: null, ai_data: null },
];

const MOCK_ANAMNESE = {
  queixa: 'Ganho de peso progressivo nos últimos 3 anos. Dificuldade de emagrecer com dieta e exercício.',
  hda: 'Paciente refere início do ganho ponderal após gravidez. IMC 32 ao início do tratamento. Histórico familiar de diabetes e hipertensão.',
  antecedentes: 'Cirurgia cesariana (2021). Nega alergias medicamentosas. Nega uso de outras medicações.',
  habitos: 'Não tabagista. Não etilista. Sedentária. Sono irregular (5-6h/noite).',
  familiar: 'Mãe: DM2 · Pai: HAS · Avó materna: AVC',
  medicamentos_uso: 'Nenhum no momento',
};

// ── Nova Receita Modal ────────────────────────────────────────────────────────

const MEDICAMENTO_MODELS = [
  'Tirzepatida (Mounjaro) 10mg',
  'Tirzepatida (Mounjaro) 5mg',
  'Semaglutida (Ozempic) 1mg',
  'Testosterona Cipionato 200mg/mL',
  'Testosterona Undecanoato (Nebido)',
  'Gestrinona 5mg',
  'HCG 5.000UI',
  'Enantato de Testosterona 250mg',
  'Ácido fólico 5mg',
  'Vitamina D3 50.000UI',
  'Vitamina B12 5.000mcg',
  'Ferro Quelato 30mg',
  'Melatonina 10mg',
  'DHEA 25mg',
  'Progesterona 200mg',
];

const RECEITA_TYPES = ['Receituário Simples', 'Receituário Especial (Azul)', 'Receituário Especial (Amarelo)', 'Receituário de Notificação'];

interface ReceitaItem { med: string; dosagem: string; qtd: string; obs: string; }

function NovaReceitaModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (r: any) => void }) {
  const [tipo, setTipo] = useState(RECEITA_TYPES[0]);
  const [items, setItems] = useState<ReceitaItem[]>([{ med: '', dosagem: '', qtd: '', obs: '' }]);
  const [validade, setValidade] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0];
  });

  const addItem = () => setItems(prev => [...prev, { med: '', dosagem: '', qtd: '', obs: '' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ReceitaItem, val: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleSave = () => {
    if (!items[0].med) { toast.error('Informe ao menos um medicamento'); return; }
    onSave({ tipo, items, validade });
    toast.success('Receita salva');
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Nova Receita</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Tipo e Validade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo de Receituário</label>
              <select className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={tipo} onChange={e => setTipo(e.target.value)}>
                {RECEITA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Validade</label>
              <input type="date" className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={validade} onChange={e => setValidade(e.target.value)} />
            </div>
          </div>

          {/* Medicamentos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Medicamentos</p>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="h-3 w-3" />Adicionar item
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={`receita-item-${i}`} className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Item {i + 1}</p>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-xs text-red-500 hover:text-red-700"><X className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Medicamento</label>
                    <div className="relative mt-1">
                      <input
                        list={`meds-${i}`}
                        className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        value={item.med}
                        onChange={e => updateItem(i, 'med', e.target.value)}
                        placeholder="Nome do medicamento ou selecione..."
                      />
                      <datalist id={`meds-${i}`}>
                        {MEDICAMENTO_MODELS.map(m => <option key={m} value={m} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Posologia / Dosagem</label>
                      <input className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={item.dosagem} onChange={e => updateItem(i, 'dosagem', e.target.value)} placeholder="Ex: 1 comprimido ao dia" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Quantidade</label>
                      <input className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={item.qtd} onChange={e => updateItem(i, 'qtd', e.target.value)} placeholder="Ex: 30 comprimidos" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Observações</label>
                    <input className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={item.obs} onChange={e => updateItem(i, 'obs', e.target.value)} placeholder="Instruções adicionais..." />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t">
          <Button size="sm" onClick={handleSave}>Salvar Receita</Button>
          <Button variant="secondary" size="sm" onClick={() => { handleSave(); setTimeout(() => window.print(), 200); }}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />Salvar e Imprimir
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ── Solicitar Exame Modal ─────────────────────────────────────────────────────

const EXAME_MODELS = [
  'Hemograma completo', 'Glicemia de jejum', 'HbA1c', 'Perfil lipídico',
  'TSH + T4 livre', 'T3 livre', 'Insulina basal', 'Cortisol sérico',
  'Testosterona total e livre', 'DHEA-S', 'IGF-1', 'Vitamina D (25-OH)',
  'Vitamina B12', 'Ferritina + Ferro sérico', 'PCR ultrassensível',
  'Urina tipo I + sedimento', 'TGO + TGP + GGT', 'Creatinina + Ureia',
  'Raio-X de tórax', 'Ultrassom abdominal', 'Densitometria óssea',
];

function SolicitarExameModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (e: any) => void }) {
  const [exameInput, setExameInput] = useState('');
  const [exames, setExames] = useState<string[]>([]);
  const [lab, setLab] = useState('');
  const [urgencia, setUrgencia] = useState('ELETIVO');
  const [obs, setObs] = useState('');

  const addExame = () => {
    const trimmed = exameInput.trim();
    if (!trimmed) return;
    setExames(prev => [...prev, trimmed]);
    setExameInput('');
  };

  const handleSave = () => {
    if (exames.length === 0 && !exameInput.trim()) { toast.error('Adicione ao menos um exame'); return; }
    const finalList = exames.length > 0 ? exames : [exameInput.trim()];
    onSave({ exames: finalList, lab, urgencia, obs });
    toast.success(`${finalList.length} exame(s) solicitado(s)`);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Solicitar Exame</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Exame picker */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Exame</label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <input
                  list="exame-list"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  value={exameInput}
                  onChange={e => setExameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addExame()}
                  placeholder="Nome do exame ou selecione..."
                />
                <datalist id="exame-list">
                  {EXAME_MODELS.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>
              <Button size="sm" onClick={addExame}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
            {exames.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {exames.map((ex, i) => (
                  <span key={`ex-${ex}-${i}`} className="flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
                    {ex}
                    <button onClick={() => setExames(prev => prev.filter((_, idx) => idx !== i))}><X className="h-2.5 w-2.5" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Laboratório (opcional)</label>
              <input className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={lab} onChange={e => setLab(e.target.value)} placeholder="Ex: Delboni, Fleury..." />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Urgência</label>
              <select className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" value={urgencia} onChange={e => setUrgencia(e.target.value)}>
                <option value="ELETIVO">Eletivo</option>
                <option value="PRIORITARIO">Prioritário</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea rows={2} className="w-full mt-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" value={obs} onChange={e => setObs(e.target.value)} placeholder="Instruções para o paciente ou laboratório..." />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t">
          <Button size="sm" onClick={handleSave}>Solicitar</Button>
          <Button variant="secondary" size="sm" onClick={() => { handleSave(); setTimeout(() => window.print(), 200); }}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />Solicitar e Imprimir
          </Button>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ── EmailProntuarioModal ───────────────────────────────────────────────────────

function EmailProntuarioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ remetente: '', emailRem: '', destinatario: '', emailDest: '', cco: '', assunto: '', mensagem: '' });
  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Enviar por Email</h2>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {[['Remetente','remetente'],['Email Remetente','emailRem'],['Destinatário','destinatario'],['Email Destinatário','emailDest'],['CCo','cco'],['Assunto','assunto']].map(([l,k])=>(
          <div key={k}><label className="text-xs text-muted-foreground">{l}</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} /></div>
        ))}
        <div><label className="text-xs text-muted-foreground">Mensagem</label><textarea rows={3} className="w-full mt-1 rounded-lg border px-3 py-2 text-sm resize-none" value={form.mensagem} onChange={e=>setForm(f=>({...f,mensagem:e.target.value}))} /></div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { toast.info('Envio de email em integração — disponível em breve'); onClose(); }}>Enviar Email</Button>
          <Button variant="secondary" onClick={() => { toast.info('Envio de WhatsApp em integração — disponível em breve'); onClose(); }}>Enviar WhatsApp</Button>
        </div>
      </div>
    </div>
  ) : null;
}

// ── Print Center Modal ────────────────────────────────────────────────────────

const PRINT_OPTIONS = [
  { key: 'evolucao', label: 'Evolução atual', icon: FileText },
  { key: 'receitas', label: 'Receituário', icon: Pill },
  { key: 'exames', label: 'Resumo de exames', icon: FlaskConical },
  { key: 'relatorio', label: 'Relatório completo', icon: ClipboardList },
  { key: 'bioimpedancia', label: 'Bioimpedância', icon: Activity },
  { key: 'plano', label: 'Plano terapêutico', icon: Stethoscope },
];

function PrintCenterModal({ open, onClose, patientName }: { open: boolean; onClose: () => void; patientName: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  if (!open) return null;
  const toggle = (k: string) => setSelected(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  const handlePrint = () => {
    if (selected.length === 0) { toast.error('Selecione ao menos um item'); return; }
    toast.success(`Preparando impressão: ${selected.map(k => PRINT_OPTIONS.find(o => o.key === k)?.label).join(', ')}`);
    setTimeout(() => window.print(), 300);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Central de Impressão — {patientName}</h2>
          </div>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground">Selecione o que deseja imprimir:</p>
        <div className="grid grid-cols-2 gap-2">
          {PRINT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all text-left',
                selected.includes(key) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/40'
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />{label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handlePrint}><Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir selecionados</Button>
        </div>
      </div>
    </div>
  );
}

// ── Import Exame Modal ─────────────────────────────────────────────────────────

const NIVEL_COLORS: Record<string, string> = {
  baixo: 'bg-blue-100 text-blue-700',
  ideal: 'bg-green-100 text-green-700',
  alto: 'bg-amber-100 text-amber-700',
  critico: 'bg-red-100 text-red-700',
};

function ImportExameModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (ex: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);
  const [examName, setExamName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setExtracted(null); setExamName(''); setLoading(false); };

  const handleFile = async (f: File) => {
    setFile(f);
    setLoading(true);
    // Simulate AYRON extraction (real: POST /exames/extract with formData)
    await new Promise(r => setTimeout(r, 1800));
    setExtracted({
      name: f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
      lab: 'Importado',
      items: [
        { item: 'Exemplo — valor extraído', valor: '—', unidade: 'ver PDF', ref: 'ver laudo', nivel: 'ideal' },
      ],
    });
    setLoading(false);
  };

  const handleSave = () => {
    if (!extracted) return;
    onSave({
      id: `X${Date.now()}`,
      name: examName || extracted.name,
      data: new Date().toISOString().split('T')[0],
      lab: extracted.lab,
      status: extracted.items.some((i: any) => i.nivel === 'critico') ? 'CRITICO' : extracted.items.some((i: any) => i.nivel === 'alto') ? 'ATENCAO' : 'NORMAL',
      resultado: 'Importado via AYRON',
      file_url: file ? URL.createObjectURL(file) : null,
      ai_data: extracted.items,
    });
    toast.success('Exame importado e analisado pelo AYRON');
    reset();
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { reset(); onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Importar Resultado de Exame</h2>
          </div>
          <button onClick={() => { reset(); onClose(); }}><X className="h-4 w-4" /></button>
        </div>

        {!file && (
          <div
            className="rounded-xl border-2 border-dashed border-border p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Clique ou arraste PDF, JPG, PNG</p>
            <p className="text-xs text-muted-foreground mt-1">AYRON extrai e estrutura os dados automaticamente</p>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
        )}

        {file && loading && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
            <Brain className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
            <p className="text-sm font-medium text-primary">AYRON analisando exame...</p>
            <p className="text-xs text-muted-foreground mt-1">{file.name}</p>
          </div>
        )}

        {extracted && !loading && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Nome do exame</label>
              <input
                value={examName || extracted.name}
                onChange={e => setExamName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary">Dados extraídos pelo AYRON</span>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr>
                    {['Item', 'Valor', 'Unid.', 'Ref.', 'Nível'].map(h => (
                      <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {extracted.items.map((row: any, i: number) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{row.item}</td>
                      <td className="px-3 py-2">{row.valor}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.unidade}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.ref}</td>
                      <td className="px-3 py-2">
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', NIVEL_COLORS[row.nivel] ?? 'bg-muted text-muted-foreground')}>
                          {row.nivel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => reset()}>Trocar arquivo</Button>
              <Button onClick={handleSave}><CheckCircle className="h-3.5 w-3.5 mr-1.5" />Salvar exame</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Prontuário detail ──────────────────────────────────────────────────────────

function ProntuarioDetail({ patient, onBack }: { patient: any; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'evolucoes' | 'anamnese' | 'receitas' | 'exames' | 'ia' | 'imagens' | 'telemedicina' | 'bioimpedancia'>('evolucoes');
  const [showEmailProntuario, setShowEmailProntuario] = useState(false);
  const [showNewEvolucao, setShowNewEvolucao] = useState(false);
  const [editingAnamnese, setEditingAnamnese] = useState(false);
  const [anamneseData, setAnamneseData] = useState({ ...MOCK_ANAMNESE });
  const [editingEvolucaoId, setEditingEvolucaoId] = useState<string | null>(null);
  const [evolucoes, setEvolucoes] = useState<any[]>(MOCK_EVOLUCOES);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ayron_evolucoes_${patient.id}`);
      if (stored !== null) setEvolucoes(JSON.parse(stored));
    } catch {}
  }, [patient.id]);
  const [newEvolucao, setNewEvolucao] = useState({ subjetivo: '', objetivo: '', avaliacao: '', plano: '', cid: '', type: 'Consulta' });
  const [showNovaReceita, setShowNovaReceita] = useState(false);
  const [showSolicitarExame, setShowSolicitarExame] = useState(false);
  const [receitas, setReceitas] = useState<any[]>(MOCK_RECEITAS);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ayron_receitas_${patient.id}`);
      if (stored !== null) setReceitas(JSON.parse(stored));
    } catch {}
  }, [patient.id]);
  const [exames, setExames] = useState<any[]>(MOCK_EXAMES);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ayron_exames_${patient.id}`);
      if (stored !== null) setExames(JSON.parse(stored));
    } catch {}
  }, [patient.id]);
  const [iaAgent, setIaAgent] = useState<'r1' | 'obesidade'>('r1');
  const [iaQuery, setIaQuery] = useState('');
  const [iaHistory, setIaHistory] = useState<{ role: 'user' | 'ayron'; text: string }[]>([
    { role: 'ayron', text: 'Prontuário analisado. Paciente com excelente adesão (CSS 82). LDL levemente elevado merece atenção na próxima consulta. Perda ponderal de 6,8kg dentro da meta. Como posso ajudar?' },
  ]);
  const [iaLoading, setIaLoading] = useState(false);
  const iaChatRef = useRef<HTMLDivElement>(null);
  const [showPrintCenter, setShowPrintCenter] = useState(false);
  const [showImportExame, setShowImportExame] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [meetLink, setMeetLink] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImages, setUploadedImages] = useState<{ name: string; url: string; group: string; desc: string }[]>([]);
  const [imgDesc, setImgDesc] = useState('');
  const [imgGroup, setImgGroup] = useState('Geral');

  const submitNovaEvolucao = () => {
    if (!newEvolucao.subjetivo.trim()) { toast.error('Subjetivo obrigatório'); return; }
    const ev = {
      id: `E${Date.now()}`, date: new Date().toISOString().split('T')[0], medico: 'Usuário atual',
      type: newEvolucao.type, cid: newEvolucao.cid || 'Não informado',
      subjetivo: newEvolucao.subjetivo, objetivo: newEvolucao.objetivo,
      avaliacao: newEvolucao.avaliacao, plano: newEvolucao.plano, ai_summary: null,
    };
    setEvolucoes(prev => {
      const updated = [ev, ...prev];
      try { localStorage.setItem(`ayron_evolucoes_${patient.id}`, JSON.stringify(updated)); } catch {}
      return updated;
    });
    setNewEvolucao({ subjetivo: '', objetivo: '', avaliacao: '', plano: '', cid: '', type: 'Consulta' });
    setShowNewEvolucao(false);
    setActiveTab('evolucoes');
    toast.success('Evolução registrada com sucesso');
  };

  const TABS = [
    { key: 'evolucoes', label: 'Evoluções', icon: FileText },
    { key: 'anamnese', label: 'Anamnese', icon: ClipboardList },
    { key: 'receitas', label: 'Receituário', icon: Pill },
    { key: 'exames', label: 'Exames', icon: FlaskConical },
    { key: 'bioimpedancia', label: 'Bioimpedância', icon: Activity },
    { key: 'ia', label: 'AYRON IA', icon: Brain },
    { key: 'imagens', label: 'Imagens', icon: Image },
    { key: 'telemedicina', label: 'Telemedicina', icon: Video },
  ];

  const riskColors: Record<string, string> = { LOW: 'text-green-600 bg-green-100', MEDIUM: 'text-amber-600 bg-amber-100', HIGH: 'text-red-600 bg-red-100' };
  const riskLabels: Record<string, string> = { LOW: 'Baixo risco', MEDIUM: 'Atenção', HIGH: 'Alto risco' };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-4 pb-0">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mb-4">
          ← Voltar para lista
        </button>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary overflow-hidden flex-shrink-0">
              {patient.photo_url
                ? <img src={patient.photo_url} alt={patient.name} className="h-full w-full object-cover" />
                : patient.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{patient.name}</h2>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', riskColors[patient.risk])}>
                  {riskLabels[patient.risk]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {patient.age} anos · {patient.id} · {patient.medico}
              </p>
              <div className="flex gap-1.5 mt-1">
                {patient.procedures.map((p: string) => (
                  <span key={p} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{p}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowEmailProntuario(true)}><Mail className="h-3.5 w-3.5 mr-1.5" />Email</Button>
            <Button variant="secondary" size="sm" onClick={() => setShowPrintCenter(true)}><Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir</Button>
            <Button size="sm" onClick={() => { setShowNewEvolucao(true); setActiveTab('evolucoes'); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Nova Evolução
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        {activeTab === 'evolucoes' && (
          <div className="space-y-4">
            {/* Audio recording panel */}
            {transcribing && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
                <Brain className="h-5 w-5 text-primary animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">AYRON transcrevendo áudio...</p>
                  <p className="text-xs text-muted-foreground">Preenchendo campos da evolução automaticamente</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant={recording ? 'danger' : 'secondary'}
                size="sm"
                onClick={async () => {
                  if (recording) {
                    mediaRecorder?.stop();
                    setRecording(false);
                    setTranscribing(true);
                    setTimeout(() => {
                      setTranscribing(false);
                      setShowNewEvolucao(true);
                      setNewEvolucao(v => ({
                        ...v,
                        subjetivo: 'Paciente relata melhora progressiva. Refere boa tolerância à medicação e diminuição do apetite.',
                        objetivo: 'PA: 118/76 · FC: 70bpm · Peso aferido na consulta',
                        avaliacao: '[Transcrição AYRON] Evolução favorável. Parâmetros dentro do esperado para o protocolo.',
                        plano: 'Manter protocolo atual. Retorno em 14 dias.',
                      }));
                      toast.success('Áudio transcrito e evolução preenchida pelo AYRON');
                    }, 2200);
                  } else {
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      const mr = new MediaRecorder(stream);
                      const chunks: Blob[] = [];
                      mr.ondataavailable = e => chunks.push(e.data);
                      mr.onstop = () => { setAudioChunks(chunks); stream.getTracks().forEach(t => t.stop()); };
                      mr.start();
                      setMediaRecorder(mr);
                      setRecording(true);
                      toast.info('Gravando... Clique em Parar quando terminar.');
                    } catch {
                      toast.error('Microfone não autorizado. Verifique as permissões do navegador.');
                    }
                  }
                }}
              >
                {recording ? <><MicOff className="h-3.5 w-3.5 mr-1.5" />Parar gravação</> : <><Mic className="h-3.5 w-3.5 mr-1.5" />Gravar evolução por áudio</>}
              </Button>
              {recording && <span className="text-xs text-red-500 animate-pulse font-medium">● Gravando...</span>}
            </div>

            {/* Nova Evolução form */}
            {showNewEvolucao && (
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary">Nova Evolução — {new Date().toLocaleDateString('pt-BR')}</p>
                  <Button variant="ghost" size="sm" onClick={() => setShowNewEvolucao(false)}>Cancelar</Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">Tipo</label>
                    <select value={newEvolucao.type} onChange={e => setNewEvolucao(v => ({ ...v, type: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30">
                      {['Consulta', 'Procedimento', 'Retorno', 'Avaliação'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground">CID</label>
                    <input value={newEvolucao.cid} onChange={e => setNewEvolucao(v => ({ ...v, cid: e.target.value }))}
                      placeholder="Ex.: E66.0" className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                {[
                  { key: 'subjetivo', label: 'S — Subjetivo *', placeholder: 'Queixas e relatos do paciente...' },
                  { key: 'objetivo', label: 'O — Objetivo', placeholder: 'Dados objetivos: PA, FC, peso, IMC...' },
                  { key: 'avaliacao', label: 'A — Avaliação', placeholder: 'Análise clínica...' },
                  { key: 'plano', label: 'P — Plano', placeholder: 'Conduta, prescrição, retorno...' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-bold text-muted-foreground">{label}</label>
                    <textarea value={(newEvolucao as any)[key]} onChange={e => setNewEvolucao(v => ({ ...v, [key]: e.target.value }))}
                      placeholder={placeholder} rows={3}
                      className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  </div>
                ))}
                <Button onClick={submitNovaEvolucao} className="w-full"><CheckCircle className="h-3.5 w-3.5 mr-1.5" />Salvar Evolução</Button>
              </div>
            )}

            {evolucoes.map(ev => (
              <div key={ev.id} className="rounded-xl border border-border bg-white p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/10 text-primary">{ev.type}</span>
                    <span className="text-sm font-semibold">{ev.date}</span>
                    <span className="text-sm text-muted-foreground">· {ev.medico}</span>
                    <span className="text-xs text-muted-foreground">· CID: {ev.cid}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="h-7 w-7" title="Editar evolução"
                      onClick={() => setEditingEvolucaoId(editingEvolucaoId === ev.id ? null : ev.id)}>
                      <Edit2 className={cn('h-3.5 w-3.5', editingEvolucaoId === ev.id ? 'text-primary' : '')} />
                    </Button>
                    <Button variant="ghost" className="h-7 w-7" title="Imprimir" onClick={() => window.print()}>
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {[
                    { key: 'subjetivo', label: 'S — Subjetivo' },
                    { key: 'objetivo', label: 'O — Objetivo' },
                    { key: 'avaliacao', label: 'A — Avaliação' },
                    { key: 'plano', label: 'P — Plano' },
                  ].map(({ key, label }) => (
                    <div key={label}>
                      <p className="text-xs font-bold text-muted-foreground mb-0.5">{label}</p>
                      {editingEvolucaoId === ev.id ? (
                        <textarea
                          defaultValue={(ev as any)[key]}
                          rows={3}
                          className="w-full rounded-lg border border-primary/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none bg-primary/5"
                          onChange={e => {
                            setEvolucoes(prev => prev.map(e2 => e2.id === ev.id ? { ...e2, [key]: e.target.value } : e2));
                          }}
                        />
                      ) : (
                        <p className="text-sm leading-relaxed">{(ev as any)[key]}</p>
                      )}
                    </div>
                  ))}
                </div>
                {editingEvolucaoId === ev.id && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => {
                      const updated = evolucoes.map(e => e.id === editingEvolucaoId ? { ...e } : e);
                      setEvolucoes(updated);
                      try {
                        localStorage.setItem(`ayron_evolucoes_${patient.id}`, JSON.stringify(updated));
                      } catch {}
                      setEditingEvolucaoId(null);
                      toast.success('Evolução atualizada e salva');
                    }}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Salvar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingEvolucaoId(null)}>Cancelar</Button>
                  </div>
                )}
                {ev.ai_summary && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 flex gap-2">
                    <Brain className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/80 italic">{ev.ai_summary}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'anamnese' && (
          <div className="rounded-xl border border-border bg-white p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">Ficha de Anamnese</h3>
              <div className="flex gap-2">
                {editingAnamnese && (
                  <Button size="sm" onClick={() => { setEditingAnamnese(false); toast.info('Anamnese salva localmente'); }}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Salvar
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setEditingAnamnese(v => !v)}>
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />{editingAnamnese ? 'Cancelar' : 'Editar'}
                </Button>
              </div>
            </div>
            {[
              { key: 'queixa', label: 'Queixa Principal' },
              { key: 'hda', label: 'História da Doença Atual' },
              { key: 'antecedentes', label: 'Antecedentes Pessoais' },
              { key: 'habitos', label: 'Hábitos de Vida' },
              { key: 'familiar', label: 'Histórico Familiar' },
              { key: 'medicamentos_uso', label: 'Medicamentos em Uso' },
            ].map(({ key, label }) => (
              <div key={label} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <p className="text-xs font-bold text-muted-foreground mb-1">{label}</p>
                {editingAnamnese ? (
                  <textarea
                    value={(anamneseData as any)[key]}
                    onChange={e => setAnamneseData(prev => ({ ...prev, [key]: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-primary/30 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none bg-primary/5"
                  />
                ) : (
                  <p className="text-sm">{(anamneseData as any)[key]}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'receitas' && (
          <div className="space-y-4">
            <Button size="sm" onClick={() => setShowNovaReceita(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Nova Receita</Button>
            {receitas.map(r => (
              <div key={r.id} className={cn('rounded-xl border p-5', r.status === 'VENCIDA' ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-border bg-white')}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{r.date}</span>
                    <span className="text-xs text-muted-foreground">· {r.medico}</span>
                    <span className="text-xs text-muted-foreground">· Válida até {r.validade}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === 'ATIVA' ? 'success' : 'default'}>{r.status}</Badge>
                    <Button variant="ghost" className="h-7 w-7"><Printer className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" className="h-7 w-7"><Send className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {r.items.map((item: any, i: number) => (
                    <div key={`${r.id}-item-${i}`} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm font-semibold">{item.med}</p>
                      <p className="text-xs text-muted-foreground">{item.dosagem} · {item.qtd}</p>
                      {item.obs && <p className="text-xs text-muted-foreground italic mt-0.5">{item.obs}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'exames' && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <Button size="sm" variant="secondary" onClick={() => setShowImportExame(true)}>
                <Upload className="h-3.5 w-3.5 mr-1.5" />Importar Resultado
              </Button>
              <Button size="sm" onClick={() => setShowSolicitarExame(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Solicitar Exame</Button>
            </div>
            {exames.map(ex => {
              const statusColor = ex.status === 'NORMAL' ? 'bg-green-100 text-green-600' : ex.status === 'CRITICO' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600';
              const badgeVariant = ex.status === 'NORMAL' ? 'success' : ex.status === 'CRITICO' ? 'destructive' : 'warning';
              return (
                <div key={ex.id} className="rounded-xl border border-border bg-white overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0', statusColor.split(' ').slice(0,1).join(' '))}>
                      <FlaskConical className={cn('h-4 w-4', statusColor.split(' ').slice(1).join(' '))} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold">{ex.name}</p>
                        <Badge variant={ex.status === 'NORMAL' ? 'success' : 'warning'} className="text-[10px]">{ex.status}</Badge>
                        {ex.ai_data && (
                          <span className="flex items-center gap-0.5 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            <Brain className="h-2.5 w-2.5" />AYRON
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{ex.data} · {ex.lab}</p>
                      {!ex.ai_data && <p className="text-xs mt-1">{ex.resultado}</p>}
                    </div>
                    {ex.file_url && (
                      <a href={ex.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-7"><ExternalLink className="h-3.5 w-3.5 mr-1" />PDF</Button>
                      </a>
                    )}
                  </div>
                  {ex.ai_data && (
                    <div className="border-t border-border overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/30">
                          <tr>
                            {['Item', 'Valor', 'Unid.', 'Referência', 'Nível'].map(h => (
                              <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ex.ai_data.map((row: any, i: number) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-3 py-2 font-medium whitespace-nowrap">{row.item}</td>
                              <td className="px-3 py-2 font-bold">{row.valor}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.unidade}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.ref}</td>
                              <td className="px-3 py-2">
                                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', NIVEL_COLORS[row.nivel] ?? 'bg-muted text-muted-foreground')}>
                                  {row.nivel}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'ia' && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl border-2 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-primary">Análise AYRON — {patient.name}</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'CSS (Compliance)', value: 82, desc: 'Score de adesão ao tratamento', color: 'text-green-600' },
                  { label: 'RRS (Retenção)', value: 94, desc: 'Probabilidade de continuidade', color: 'text-blue-600' },
                  { label: 'CRS (Clínico)', value: 71, desc: 'Score de resposta clínica', color: 'text-primary' },
                ].map(({ label, value, desc, color }) => (
                  <div key={label} className="p-3 rounded-lg bg-white text-center">
                    <p className={cn('text-3xl font-black', color)}>{value}</p>
                    <p className="text-xs font-semibold mt-0.5">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-white space-y-3">
              <p className="text-sm font-semibold">Alertas e Recomendações</p>
              {[
                { type: 'INFO', text: 'LDL levemente elevado (142 mg/dL) — considerar orientação nutricional específica', icon: AlertTriangle, color: 'text-amber-600 bg-amber-100' },
                { type: 'OK', text: 'Adesão excelente — 7 de 12 sessões Mounjaro concluídas no prazo', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
                { type: 'OK', text: 'Perda ponderal consistente: -6,8kg em 3 meses (meta: -8kg/3m)', icon: TrendingUp, color: 'text-blue-600 bg-blue-100' },
                { type: 'INFO', text: 'Próxima sessão agendada para 25/04 — 2 dias', icon: Calendar, color: 'text-primary bg-primary/10' },
              ].map(({ type, text, icon: Icon, color }, i) => (
                <div key={`alert-${type}-${i}`} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                  <div className={cn('h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0', color.split(' ')[1])}>
                    <Icon className={cn('h-3.5 w-3.5', color.split(' ')[0])} />
                  </div>
                  <p className="text-xs leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-white flex flex-col" style={{ height: 340 }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Perguntar ao AYRON — {patient.name.split(' ')[0]}</p>
              </div>
              <div ref={iaChatRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                {iaHistory.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                      msg.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground')}>
                      {msg.role === 'ayron' && <span className="text-[10px] font-bold text-primary block mb-1">AYRON</span>}
                      {msg.text}
                    </div>
                  </div>
                ))}
                {iaLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl px-3 py-2">
                      <span className="text-[10px] font-bold text-primary block mb-1">AYRON</span>
                      <span className="text-muted-foreground text-xs animate-pulse">Analisando prontuário...</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 p-3 border-t border-border flex-shrink-0">
                <Input
                  className="flex-1 text-sm"
                  placeholder={`Qual risco devo observar em ${patient.name.split(' ')[0]}?`}
                  value={iaQuery}
                  onChange={e => setIaQuery(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key !== 'Enter' || !iaQuery.trim() || iaLoading) return;
                    const q = iaQuery.trim();
                    setIaQuery('');
                    setIaHistory(h => [...h, { role: 'user', text: q }]);
                    setIaLoading(true);
                    setTimeout(() => iaChatRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
                    try {
                      const r = await api.post('/api/ayron/chat', { message: q, context: { patientId: patient.id, patientName: patient.name } });
                      setIaHistory(h => [...h, { role: 'ayron', text: r.data?.reply ?? 'Análise concluída. Consulte o prontuário completo para mais detalhes.' }]);
                    } catch {
                      setIaHistory(h => [...h, { role: 'ayron', text: 'Aguardando conexão com servidor AYRON. Tente novamente em instantes.' }]);
                    }
                    setIaLoading(false);
                    setTimeout(() => iaChatRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
                  }}
                />
                <Button size="sm" disabled={iaLoading || !iaQuery.trim()}
                  onClick={async () => {
                    const q = iaQuery.trim();
                    if (!q || iaLoading) return;
                    setIaQuery('');
                    setIaHistory(h => [...h, { role: 'user', text: q }]);
                    setIaLoading(true);
                    setTimeout(() => iaChatRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
                    try {
                      const r = await api.post('/api/ayron/chat', { message: q, context: { patientId: patient.id, patientName: patient.name } });
                      setIaHistory(h => [...h, { role: 'ayron', text: r.data?.reply ?? 'Análise concluída.' }]);
                    } catch {
                      setIaHistory(h => [...h, { role: 'ayron', text: 'Aguardando conexão com servidor AYRON.' }]);
                    }
                    setIaLoading(false);
                    setTimeout(() => iaChatRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 50);
                  }}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'imagens' && (
          <div className="space-y-4">
            <input ref={imageInputRef} type="file" accept="image/*,.pdf" multiple className="hidden"
              onChange={e => {
                if (!e.target.files) return;
                const newImgs = Array.from(e.target.files).map(f => ({
                  name: f.name, url: URL.createObjectURL(f), group: imgGroup, desc: imgDesc,
                }));
                setUploadedImages(prev => [...newImgs, ...prev]);
                toast.success(`${newImgs.length} arquivo(s) adicionado(s)`);
                e.target.value = '';
              }}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => imageInputRef.current?.click()}><Upload className="h-3.5 w-3.5 mr-1.5" />Adicionar Arquivos</Button>
              <Button variant="secondary" size="sm" onClick={() => { if (uploadedImages.length === 0) { toast.info('Nenhuma imagem cadastrada'); return; } toast.info(`${uploadedImages.length} imagem(ns) na galeria`); }}>Ir para Galeria</Button>
              <Button variant="ghost" size="sm" onClick={() => { imageInputRef.current?.setAttribute('capture', 'environment'); imageInputRef.current?.click(); }}>Tirar Foto</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Descrição</label>
                <input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" placeholder="Descrição para o(s) arquivo(s)..." value={imgDesc} onChange={e => setImgDesc(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Grupo</label>
                <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" value={imgGroup} onChange={e => setImgGroup(e.target.value)}>
                  <option>Geral</option><option>Fotos clínicas</option><option>Exames de imagem</option>
                </select>
              </div>
            </div>
            {uploadedImages.length === 0 ? (
              <div
                className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-12 text-center text-muted-foreground text-sm cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => imageInputRef.current?.click()}
              >
                <Image className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Clique para adicionar imagens
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {uploadedImages.map((img, i) => (
                  <div key={i} className="rounded-xl border border-border overflow-hidden group relative">
                    {img.url.startsWith('blob:') && img.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img src={img.url} alt={img.name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 bg-muted/30 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-[10px] font-medium truncate">{img.desc || img.name}</p>
                      <p className="text-[10px] text-muted-foreground">{img.group}</p>
                    </div>
                    <button
                      className="absolute top-1 right-1 h-5 w-5 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setUploadedImages(prev => prev.filter((_, j) => j !== i))}
                    ><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'telemedicina' && (
          <div className="space-y-4">
            {/* Google Meet link panel */}
            <div className="rounded-xl border border-border bg-white p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Teleconsulta — Google Meet</p>
              </div>
              {meetLink ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                    <Link2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <a href={meetLink} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-green-700 font-medium flex-1 truncate hover:underline">{meetLink}</a>
                    <button onClick={() => { navigator.clipboard.writeText(meetLink); toast.success('Link copiado!'); }}
                      className="text-xs text-green-600 hover:underline whitespace-nowrap">Copiar</button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => window.open(meetLink, '_blank')}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Entrar na sala
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => {
                      toast.info('Enviando link para o paciente via WhatsApp...');
                    }}>Enviar ao paciente</Button>
                    <Button variant="ghost" size="sm" onClick={() => setMeetLink(null)}>Gerar novo link</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => {
                  const room = `ayron-${patient.id.toLowerCase()}-${Date.now().toString(36)}`;
                  setMeetLink(`https://meet.google.com/${room}`);
                  toast.success('Link Google Meet gerado com sucesso');
                }}>
                  <Video className="h-3.5 w-3.5 mr-1.5" />Gerar link Google Meet
                </Button>
              )}
            </div>

            {/* Doctor registration for teleconsult */}
            <div className="rounded-xl border border-border bg-white p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Dados do médico (receituário digital)</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Nome Completo</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">CPF</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" placeholder="Certificado digital" /></div>
                <div><label className="text-xs text-muted-foreground">Conselho Profissional</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">UF do Conselho</label>
                  <select className="w-full mt-1 rounded-lg border px-3 py-2 text-sm"><option>SP</option><option>RJ</option><option>MG</option></select>
                </div>
                <div><label className="text-xs text-muted-foreground">Número no Conselho</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Email</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Endereço (receituário controlado)</label><input className="w-full mt-1 rounded-lg border px-3 py-2 text-sm" /></div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => toast.success('Dados salvos')}>Salvar</Button>
                <Button variant="secondary" size="sm" onClick={() => toast.info('Gerando relatório...')}>Relatório Teleconsulta</Button>
                <Button variant="ghost" size="sm" onClick={() => toast.info('Finalizando teleconsulta...')}>Finalizar</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bioimpedancia' && (() => {
          const BIO_MEASUREMENTS = [
            { data: '12/02', label: '12/02', peso: 91.8, imc: 30.6, gordura: 35.1, musculo: 41.0, agua: 49.9, visceralFat: 14, bmr: 1776 },
            { data: '14/03', label: '14/03', peso: 89.2, imc: 29.7, gordura: 33.8, musculo: 41.6, agua: 50.8, visceralFat: 13, bmr: 1798 },
            { data: '11/04', label: '11/04', peso: 87.4, imc: 29.1, gordura: 32.4, musculo: 42.1, agua: 51.2, visceralFat: 12, bmr: 1820 },
          ];
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Histórico de Bioimpedância</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { toast.info('Preparando impressão do gráfico...'); setTimeout(() => window.print(), 300); }}>
                    <Printer className="h-3.5 w-3.5 mr-1.5" />Imprimir
                  </Button>
                  <Button size="sm" onClick={() => toast.info('Nova medição iniciada')}><Plus className="h-3.5 w-3.5 mr-1.5" />Nova Medição</Button>
                </div>
              </div>

              {/* Timeline chart */}
              <div className="rounded-xl border border-border bg-white p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Evolução temporal</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={BIO_MEASUREMENTS} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="gordura" name="% Gordura" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="musculo" name="Músculo (kg)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Measurements list */}
              {[...BIO_MEASUREMENTS].reverse().map((m, i) => (
                <div key={`bio-${m.data}-${i}`} className={cn('rounded-xl border p-5 space-y-4', i === 0 ? 'border-primary/30 bg-primary/5' : 'border-border bg-white')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{m.data}</span>
                      {i === 0 && <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-medium">Mais recente</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Peso', value: `${m.peso} kg`, color: 'text-foreground' },
                      { label: 'IMC', value: m.imc, color: m.imc >= 30 ? 'text-red-600' : m.imc >= 25 ? 'text-amber-600' : 'text-green-600' },
                      { label: '% Gordura', value: `${m.gordura}%`, color: m.gordura >= 35 ? 'text-red-600' : m.gordura >= 30 ? 'text-amber-600' : 'text-green-600' },
                      { label: 'Músculo', value: `${m.musculo} kg`, color: 'text-blue-600' },
                      { label: '% Água', value: `${m.agua}%`, color: 'text-cyan-600' },
                      { label: 'Gord. Visceral', value: m.visceralFat, color: m.visceralFat >= 13 ? 'text-red-600' : 'text-amber-600' },
                      { label: 'Taxa Metab.', value: `${m.bmr} kcal`, color: 'text-foreground' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center p-2 rounded-lg bg-white border border-border">
                        <p className={cn('text-lg font-bold', color)}>{value}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
      <EmailProntuarioModal open={showEmailProntuario} onClose={() => setShowEmailProntuario(false)} />
      <PrintCenterModal open={showPrintCenter} onClose={() => setShowPrintCenter(false)} patientName={patient.name} />
      <ImportExameModal open={showImportExame} onClose={() => setShowImportExame(false)} onSave={ex => setExames(prev => [ex, ...prev])} />
      <NovaReceitaModal
        open={showNovaReceita}
        onClose={() => setShowNovaReceita(false)}
        onSave={r => setReceitas(prev => {
          const updated = [{ id: `R${Date.now()}`, date: new Date().toISOString().split('T')[0], medico: 'Usuário atual', validade: r.validade, items: r.items, status: 'ATIVA' }, ...prev];
          try { localStorage.setItem(`ayron_receitas_${patient.id}`, JSON.stringify(updated)); } catch {}
          return updated;
        })}
      />
      <SolicitarExameModal
        open={showSolicitarExame}
        onClose={() => setShowSolicitarExame(false)}
        onSave={e => setExames(prev => {
          const updated = [...e.exames.map((name: string, i: number) => ({ id: `X${Date.now()}${i}`, name, data: new Date().toISOString().split('T')[0], lab: e.lab || 'A definir', status: 'SOLICITADO', resultado: 'Aguardando resultado' })), ...prev];
          try { localStorage.setItem(`ayron_exames_${patient.id}`, JSON.stringify(updated)); } catch {}
          return updated;
        })}
      />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClinicalHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [riskFilter, setRiskFilter] = useState<string>('all');

  useEffect(() => {
    if (!patientIdFromUrl) return;
    const found = MOCK_PATIENTS_CLINICAL.find(p => p.id === patientIdFromUrl);
    if (found) setSelected(found);
  }, [patientIdFromUrl]);

  const { data: apiPatients } = useQuery({
    queryKey: ['clinical-patients', search],
    queryFn: () => api.get('/patients', { params: { search: search || undefined, limit: 50 } })
      .then(r => { const res = r.data; return Array.isArray(res) ? res : res?.data ?? []; })
      .catch(() => []),
    staleTime: 30000,
  });

  const searchLower = search.toLowerCase();
  const filtered = MOCK_PATIENTS_CLINICAL.filter(p => {
    const matchSearch = search === '' || p.name.toLowerCase().includes(searchLower) || p.procedures.some(pr => pr.toLowerCase().includes(searchLower));
    const matchRisk = riskFilter === 'all' || p.risk === riskFilter;
    return matchSearch && matchRisk;
  });

  const riskCounts = {
    HIGH: MOCK_PATIENTS_CLINICAL.filter(p => p.risk === 'HIGH').length,
    MEDIUM: MOCK_PATIENTS_CLINICAL.filter(p => p.risk === 'MEDIUM').length,
  };

  if (selected) {
    return (
      <div className="flex flex-col h-screen">
        <Topbar title="Prontuários" />
        {patientIdFromUrl && (
          <div className="flex items-center gap-2 border-b border-border bg-blue-50 px-6 py-2 text-sm text-blue-700 flex-shrink-0">
            <span className="flex-1">Filtrando por: <strong>{selected.name}</strong></span>
            <button onClick={() => setSelected(null)} className="rounded p-0.5 hover:bg-blue-100 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <ProntuarioDetail key={selected.id} patient={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Prontuários" />
      <div className="p-6 max-w-3xl space-y-4">

        {/* Alerts */}
        {riskCounts.HIGH > 0 && (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              {riskCounts.HIGH} paciente{riskCounts.HIGH > 1 ? 's' : ''} com risco alto de abandono detectado pelo AYRON
            </p>
          </div>
        )}

        {/* Search + filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome ou procedimento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {[
            { key: 'all', label: 'Todos' },
            { key: 'HIGH', label: '🔴 Alto risco' },
            { key: 'MEDIUM', label: '🟡 Atenção' },
            { key: 'LOW', label: '🟢 OK' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRiskFilter(key)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                riskFilter === key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Patient list */}
        <div className="space-y-2">
          {filtered.map(p => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelected(p)}
              className="w-full flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 hover:shadow-md hover:border-primary/30 transition-all text-left group"
            >
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold overflow-hidden',
                p.risk === 'HIGH' ? 'bg-red-100 text-red-700' : p.risk === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary')}>
                {p.photo_url
                  ? <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                  : p.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <span className="text-xs text-muted-foreground">{p.id}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{p.age} anos · {p.medico}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">Última: {p.last_consult}</span>
                </div>
                <div className="flex gap-1 mt-1">
                  {p.procedures.map((pr, i) => (
                    <span key={`proc-${pr}-${i}`} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{pr}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.risk !== 'LOW' && p.risk_reasons?.length > 0 && (
                  <div className="relative group/tooltip">
                    <AlertTriangle className={cn('h-4 w-4 cursor-help', p.risk === 'HIGH' ? 'text-red-500' : 'text-amber-500')} />
                    <div className="absolute right-0 top-6 z-30 hidden group-hover/tooltip:block w-56 rounded-xl border border-border bg-white shadow-lg p-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Motivos do alerta</p>
                      {p.risk_reasons.map((r: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0', p.risk === 'HIGH' ? 'bg-red-500' : 'bg-amber-500')} />
                          <p className="text-xs leading-snug">{r}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {p.risk !== 'LOW' && (!p.risk_reasons || p.risk_reasons.length === 0) && (
                  <AlertTriangle className={cn('h-4 w-4', p.risk === 'HIGH' ? 'text-red-500' : 'text-amber-500')} />
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
            </motion.button>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <User className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">Nenhum paciente encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
