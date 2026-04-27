'use client';
import { useState, useMemo } from 'react';
import { Topbar } from '@/components/layout/topbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Users, UserPlus, Calendar, CheckCircle, XCircle, TrendingUp, TrendingDown,
  DollarSign, BarChart2, Star, Activity, Brain, AlertTriangle, Percent,
  FileText, Package, Repeat2, Megaphone, Download, FileSpreadsheet,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_CONTATOS = {
  total: 6036, novos_30d: 94, masculino: 1842, feminino: 4194,
  como_conheceu: [
    { name: 'Indicação', value: 65 }, { name: 'Instagram', value: 18 },
    { name: 'Internet', value: 8 }, { name: 'Facebook', value: 5 }, { name: 'Outros', value: 4 },
  ],
  novos_por_mes: [
    { mes: 'Nov', novos: 78 }, { mes: 'Dez', novos: 61 }, { mes: 'Jan', novos: 88 },
    { mes: 'Fev', novos: 73 }, { mes: 'Mar', novos: 94 }, { mes: 'Abr', novos: 45 },
  ],
  por_status: [
    { name: 'Ativo', value: 2841, color: '#22c55e' },
    { name: 'Em Risco', value: 891, color: '#f59e0b' },
    { name: 'Perdendo', value: 543, color: '#f97316' },
    { name: 'Sem Retorno', value: 1124, color: '#ef4444' },
    { name: 'Perdido', value: 637, color: '#94a3b8' },
  ],
};

const MOCK_AGENDA = {
  total_periodo: 1847, atendidos: 1543, desmarcados: 178, no_show: 126,
  taxa_no_show: 6.8, taxa_comparecimento: 83.5,
  por_mes: [
    { mes: 'Nov', atendidos: 298, desmarcados: 32, faltou: 21 },
    { mes: 'Dez', atendidos: 241, desmarcados: 28, faltou: 18 },
    { mes: 'Jan', atendidos: 312, desmarcados: 35, faltou: 24 },
    { mes: 'Fev', atendidos: 287, desmarcados: 31, faltou: 19 },
    { mes: 'Mar', atendidos: 405, desmarcados: 52, faltou: 44 },
  ],
  por_profissional: [
    { prof: 'Dr. Murilo', atendidos: 412 }, { prof: 'Amanda G.', atendidos: 387 },
    { prof: 'Dr. André', atendidos: 298 }, { prof: 'Lorrana', atendidos: 241 },
    { prof: 'Dra. Julia', atendidos: 205 },
  ],
};

const MOCK_FINANCEIRO = {
  receita_periodo: 2847320, ticket_medio: 1845, crescimento_pct: 12.4,
  por_mes: [
    { mes: 'Nov', receita: 421300 }, { mes: 'Dez', receita: 387200 },
    { mes: 'Jan', receita: 498700 }, { mes: 'Fev', receita: 461800 },
    { mes: 'Mar', receita: 612400 }, { mes: 'Abr', receita: 465920 },
  ],
  por_profissional: [
    { prof: 'Dr. Murilo', receita: 892400 }, { prof: 'Amanda G.', receita: 741200 },
    { prof: 'Dr. André', receita: 612800 }, { prof: 'Lorrana', receita: 387100 },
    { prof: 'Dra. Julia', receita: 213820 },
  ],
  por_procedimento: [
    { proc: 'Mounjaro', receita: 621400 }, { proc: 'Impl. Testo.', receita: 481200 },
    { proc: 'Soroterapia', receita: 398700 }, { proc: 'Hormonal', receita: 312800 },
    { proc: 'Consulta', receita: 287100 },
  ],
  por_forma: [
    { name: 'Cartão Crédito', value: 42 }, { name: 'PIX', value: 31 },
    { name: 'Débito', value: 14 }, { name: 'Dinheiro', value: 8 }, { name: 'Transf.', value: 5 },
  ],
};

const MOCK_PRONTUARIO = {
  total_prontuarios: 5841, evolucoes_periodo: 2134, prescricoes: 891, exames_solicitados: 647,
  por_profissional: [
    { prof: 'Dr. Murilo', evolucoes: 712 }, { prof: 'Amanda G.', evolucoes: 598 },
    { prof: 'Dr. André', evolucoes: 441 }, { prof: 'Lorrana', evolucoes: 383 },
  ],
  por_mes: [
    { mes: 'Nov', evolucoes: 312 }, { mes: 'Dez', evolucoes: 287 }, { mes: 'Jan', evolucoes: 398 },
    { mes: 'Fev', evolucoes: 421 }, { mes: 'Mar', evolucoes: 498 }, { mes: 'Abr', evolucoes: 218 },
  ],
};

const MOCK_ESTOQUE = {
  total_itens: 47, itens_criticos: 8, itens_vencidos: 2, valor_estoque: 124800,
  movimentacoes_periodo: 312,
  por_categoria: [
    { cat: 'Medicamentos', total: 18, criticos: 3 },
    { cat: 'Hormonais', total: 12, criticos: 2 },
    { cat: 'Soroterapia', total: 9, criticos: 1 },
    { cat: 'Descartáveis', total: 8, criticos: 2 },
  ],
  por_mes: [
    { mes: 'Nov', entradas: 48, saidas: 52 }, { mes: 'Dez', entradas: 41, saidas: 38 },
    { mes: 'Jan', entradas: 63, saidas: 58 }, { mes: 'Fev', entradas: 55, saidas: 61 },
    { mes: 'Mar', entradas: 72, saidas: 68 }, { mes: 'Abr', entradas: 33, saidas: 35 },
  ],
};

const MOCK_SESSOES = {
  total_sessoes: 1243, sessoes_concluidas: 1089, protocolos_ativos: 834,
  taxa_conclusao: 87.6, media_sessoes_protocolo: 4.2,
  por_tipo: [
    { tipo: 'Hormonal', sessoes: 412 }, { tipo: 'Soroterapia', sessoes: 287 },
    { tipo: 'Mounjaro', sessoes: 312 }, { tipo: 'Emagrecimento', sessoes: 232 },
  ],
  por_mes: [
    { mes: 'Nov', sessoes: 187 }, { mes: 'Dez', sessoes: 154 }, { mes: 'Jan', sessoes: 221 },
    { mes: 'Fev', sessoes: 208 }, { mes: 'Mar', sessoes: 298 }, { mes: 'Abr', sessoes: 175 },
  ],
};

const MOCK_MARKETING = {
  campanhas_ativas: 3, mensagens_enviadas: 2455, taxa_resposta: 31, conversoes: 58,
  nps_score: 77,
  por_canal: [
    { name: 'WhatsApp', value: 71 }, { name: 'E-mail', value: 22 }, { name: 'Interno', value: 7 },
  ],
  por_mes: [
    { mes: 'Nov', enviadas: 312, respostas: 98 }, { mes: 'Dez', enviadas: 287, respostas: 89 },
    { mes: 'Jan', enviadas: 421, respostas: 131 }, { mes: 'Fev', enviadas: 398, respostas: 122 },
    { mes: 'Mar', enviadas: 612, respostas: 189 }, { mes: 'Abr', enviadas: 425, respostas: 131 },
  ],
};

const MOCK_QUALIDADE = {
  nps_score: 77, total_respostas: 892, promotores: 81, neutros: 12, detratores: 7,
  nota_media: 4.7, reclamacoes_abertas: 14,
  por_categoria: [
    { cat: 'Atendimento Médico', nota: 4.8 }, { cat: 'Recepção', nota: 4.6 },
    { cat: 'Limpeza', nota: 4.7 }, { cat: 'Tempo Espera', nota: 4.1 },
    { cat: 'Resultados', nota: 4.9 }, { cat: 'Custo x Benefício', nota: 4.4 },
  ],
  por_mes: [
    { mes: 'Nov', nps: 62 }, { mes: 'Dez', nps: 65 }, { mes: 'Jan', nps: 68 },
    { mes: 'Fev', nps: 71 }, { mes: 'Mar', nps: 74 }, { mes: 'Abr', nps: 77 },
  ],
};

const MOCK_AYRON = {
  avg_css: 38, avg_rrs: 44, band_red: 312, band_yellow: 891, band_green: 4833,
  avg_nsp: 67, diamantes_sem_contato: 3, alertas_abertos: 47,
  protocolos_ativos: 834, implantes_troca_prox: 28,
};

// ── Utils ──────────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#FF6B00', '#1B3A4B', '#22c55e', '#f59e0b', '#94a3b8'];
const STATUS_COLORS: Record<string, string> = {
  'Ativo': '#22c55e', 'Em Risco': '#f59e0b', 'Perdendo': '#f97316',
  'Sem Retorno': '#ef4444', 'Perdido': '#94a3b8',
};
const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

// ── Components ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color = 'default' }: {
  icon: any; label: string; value: string | number; sub?: string;
  color?: 'green' | 'red' | 'orange' | 'blue' | 'default';
}) {
  const colors = {
    green: 'text-green-600 bg-green-50', red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50', blue: 'text-blue-600 bg-blue-50',
    default: 'text-primary bg-primary/10',
  };
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold mb-3">{children}</h3>;
}

// ── Tab panels ─────────────────────────────────────────────────────────────────

function TabContatos() {
  const d = MOCK_CONTATOS;
  const pctF = Math.round((d.feminino / d.total) * 100);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Users} label="Total de pacientes" value={d.total.toLocaleString('pt-BR')} />
        <KpiCard icon={UserPlus} label="Novos no período" value={d.novos_30d} color="green" />
        <KpiCard icon={Users} label="Feminino" value={`${pctF}%`} sub={d.feminino.toLocaleString('pt-BR')} color="blue" />
        <KpiCard icon={Users} label="Masculino" value={`${100 - pctF}%`} sub={d.masculino.toLocaleString('pt-BR')} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle>Como conheceram a clínica</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={d.como_conheceu} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                {d.como_conheceu.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % 5]} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <SectionTitle>Novos pacientes por mês</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.novos_por_mes}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="novos" fill="#FF6B00" radius={[4, 4, 0, 0]} name="Novos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card className="p-4">
        <SectionTitle>Distribuição por status de retorno</SectionTitle>
        <div className="space-y-3">
          {d.por_status.map((s: any) => {
            const pct = Math.round((s.value / d.total) * 100);
            return (
              <div key={s.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.value.toLocaleString('pt-BR')} · {pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[s.name] ?? '#94a3b8' }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function TabAgenda() {
  const d = MOCK_AGENDA;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Calendar} label="Total agendamentos" value={d.total_periodo.toLocaleString('pt-BR')} />
        <KpiCard icon={CheckCircle} label="Atendidos" value={d.atendidos.toLocaleString('pt-BR')} color="green"
          sub={`${d.taxa_comparecimento}% comparecimento`} />
        <KpiCard icon={XCircle} label="Desmarcados" value={d.desmarcados} color="orange" />
        <KpiCard icon={AlertTriangle} label="No-show" value={d.no_show} color="red" sub={`Taxa: ${d.taxa_no_show}%`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle>Atendimentos por mês</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.por_mes}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="atendidos" fill="#22c55e" radius={[4, 4, 0, 0]} name="Atendidos" stackId="a" />
              <Bar dataKey="desmarcados" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Desmarcados" stackId="a" />
              <Bar dataKey="faltou" fill="#ef4444" radius={[4, 4, 0, 0]} name="Faltou" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <SectionTitle>Por profissional</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.por_profissional} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="prof" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="atendidos" fill="#1B3A4B" radius={[0, 4, 4, 0]} name="Atendidos" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function TabFinanceiro() {
  const d = MOCK_FINANCEIRO;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard icon={DollarSign} label="Receita no período" value={fmt(d.receita_periodo)} color="green" />
        <KpiCard icon={BarChart2} label="Ticket médio" value={fmt(d.ticket_medio)} />
        <KpiCard icon={TrendingUp} label="Crescimento" value={`+${d.crescimento_pct}%`} color="green" />
      </div>
      <Card className="p-4">
        <SectionTitle>Faturamento mensal</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={d.por_mes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => fmt(v)} />
            <Line type="monotone" dataKey="receita" stroke="#FF6B00" strokeWidth={2} dot={{ fill: '#FF6B00', r: 4 }} name="Receita" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle>Por profissional</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.por_profissional} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="prof" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="receita" fill="#FF6B00" radius={[0, 4, 4, 0]} name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <SectionTitle>Por procedimento</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.por_procedimento} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="proc" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="receita" fill="#1B3A4B" radius={[0, 4, 4, 0]} name="Receita" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card className="p-4">
        <SectionTitle>Formas de pagamento</SectionTitle>
        <div className="grid grid-cols-5 gap-3">
          {d.por_forma.map((f: any, i: number) => (
            <div key={f.name} className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold" style={{ color: PIE_COLORS[i] }}>{f.value}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">{f.name}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TabProntuario() {
  const d = MOCK_PRONTUARIO;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={FileText} label="Total de prontuários" value={d.total_prontuarios.toLocaleString('pt-BR')} />
        <KpiCard icon={FileText} label="Evoluções no período" value={d.evolucoes_periodo.toLocaleString('pt-BR')} color="blue" />
        <KpiCard icon={FileText} label="Prescrições emitidas" value={d.prescricoes} color="green" />
        <KpiCard icon={FileText} label="Exames solicitados" value={d.exames_solicitados} color="orange" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle>Evoluções por mês</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.por_mes}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="evolucoes" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Evoluções" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <SectionTitle>Evoluções por profissional</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.por_profissional} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="prof" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="evolucoes" fill="#1B3A4B" radius={[0, 4, 4, 0]} name="Evoluções" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function TabEstoque() {
  const d = MOCK_ESTOQUE;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Package} label="Total de itens" value={d.total_itens} />
        <KpiCard icon={Package} label="Itens críticos" value={d.itens_criticos} color="red" sub="Abaixo do mínimo" />
        <KpiCard icon={Package} label="Itens vencidos" value={d.itens_vencidos} color="orange" />
        <KpiCard icon={DollarSign} label="Valor do estoque" value={fmt(d.valor_estoque)} color="green" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle>Movimentações por mês</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.por_mes}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="entradas" fill="#22c55e" radius={[4, 4, 0, 0]} name="Entradas" />
              <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <SectionTitle>Itens por categoria</SectionTitle>
          <div className="space-y-3 mt-2">
            {d.por_categoria.map(c => (
              <div key={c.cat} className="flex items-center justify-between">
                <span className="text-sm">{c.cat}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{c.total} itens</span>
                  {c.criticos > 0 && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                      {c.criticos} críticos
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function TabSessoes() {
  const d = MOCK_SESSOES;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Repeat2} label="Total de sessões" value={d.total_sessoes.toLocaleString('pt-BR')} />
        <KpiCard icon={CheckCircle} label="Sessões concluídas" value={d.sessoes_concluidas.toLocaleString('pt-BR')} color="green"
          sub={`${d.taxa_conclusao}% de conclusão`} />
        <KpiCard icon={Activity} label="Protocolos ativos" value={d.protocolos_ativos} color="blue" />
        <KpiCard icon={BarChart2} label="Média sessões/protocolo" value={d.media_sessoes_protocolo} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle>Sessões por mês</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.por_mes}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="sessoes" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Sessões" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <SectionTitle>Sessões por tipo de protocolo</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.por_tipo} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="tipo" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="sessoes" fill="#FF6B00" radius={[0, 4, 4, 0]} name="Sessões" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function TabMarketing() {
  const d = MOCK_MARKETING;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Megaphone} label="Campanhas ativas" value={d.campanhas_ativas} color="blue" />
        <KpiCard icon={Activity} label="Mensagens enviadas" value={d.mensagens_enviadas.toLocaleString('pt-BR')} />
        <KpiCard icon={Percent} label="Taxa de resposta" value={`${d.taxa_resposta}%`} color="green" />
        <KpiCard icon={Star} label="NPS Score" value={d.nps_score} color="green" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle>Envios por mês</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.por_mes}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="enviadas" fill="#1B3A4B" radius={[4, 4, 0, 0]} name="Enviadas" />
              <Bar dataKey="respostas" fill="#FF6B00" radius={[4, 4, 0, 0]} name="Respostas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <SectionTitle>Distribuição por canal</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={d.por_canal} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                {d.por_canal.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % 5]} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function TabQualidade() {
  const d = MOCK_QUALIDADE;
  const total = d.promotores + d.neutros + d.detratores;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Star} label="NPS Score" value={d.nps_score} color="green" sub="Meta: 70" />
        <KpiCard icon={Activity} label="Total de respostas" value={d.total_respostas.toLocaleString('pt-BR')} />
        <KpiCard icon={CheckCircle} label="Nota média" value={`${d.nota_media}/5`} color="green" />
        <KpiCard icon={AlertTriangle} label="Reclamações abertas" value={d.reclamacoes_abertas} color="red" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionTitle>Evolução NPS</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.por_mes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="nps" stroke="#FF6B00" strokeWidth={2.5} dot={{ r: 4, fill: '#FF6B00' }} name="NPS" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <SectionTitle>Distribuição promotores/detratores</SectionTitle>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              { label: 'Promotores', pct: d.promotores, color: 'bg-green-500', text: 'text-green-600' },
              { label: 'Neutros', pct: d.neutros, color: 'bg-amber-400', text: 'text-amber-600' },
              { label: 'Detratores', pct: d.detratores, color: 'bg-red-500', text: 'text-red-600' },
            ].map(({ label, pct, color, text }) => (
              <div key={label} className="text-center">
                <p className={cn('text-2xl font-bold', text)}>{pct}%</p>
                <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-4">
        <SectionTitle>Notas por categoria</SectionTitle>
        <div className="space-y-3">
          {d.por_categoria.map(c => (
            <div key={c.cat} className="flex items-center gap-3">
              <p className="text-sm w-44 flex-shrink-0">{c.cat}</p>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full', c.nota >= 4.7 ? 'bg-green-500' : c.nota >= 4.3 ? 'bg-amber-400' : 'bg-red-500')}
                  style={{ width: `${(c.nota / 5) * 100}%` }}
                />
              </div>
              <p className="text-sm font-bold w-8">{c.nota}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function TabAyron() {
  const d = MOCK_AYRON;
  const total = d.band_green + d.band_yellow + d.band_red;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary flex-shrink-0">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold">Painel Cognitivo AYRON</p>
          <p className="text-xs text-muted-foreground">{total.toLocaleString('pt-BR')} pacientes analisados em tempo real</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={Activity} label="Score Clínico Médio (CSS)" value={d.avg_css} sub="0 = sem risco, 100 = crítico" />
        <KpiCard icon={TrendingDown} label="Score Retenção (RRS)" value={d.avg_rrs} sub="0 = fiel, 100 = abandono" />
        <KpiCard icon={Percent} label="NSP Médio" value={`${d.avg_nsp}%`} sub="prob. retorno 30d" color="green" />
        <KpiCard icon={AlertTriangle} label="Alertas abertos" value={d.alertas_abertos} color="orange" />
      </div>
      <Card className="p-4">
        <SectionTitle>Distribuição de risco</SectionTitle>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Baixo Risco', value: d.band_green, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
            { label: 'Atenção', value: d.band_yellow, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-100' },
            { label: 'Crítico', value: d.band_red, color: 'text-red-600', bg: 'bg-red-50 border-red-100' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={cn('text-center p-4 rounded-xl border', bg)}>
              <p className={cn('text-3xl font-bold', color)}>{value.toLocaleString('pt-BR')}</p>
              <p className={cn('text-xs font-medium mt-1', color)}>{label}</p>
              <p className="text-xs text-muted-foreground">{Math.round((value / total) * 100)}% da base</p>
            </div>
          ))}
        </div>
        <div className="h-3 w-full rounded-full overflow-hidden flex">
          <div className="bg-green-500" style={{ width: `${(d.band_green / total) * 100}%` }} />
          <div className="bg-yellow-400" style={{ width: `${(d.band_yellow / total) * 100}%` }} />
          <div className="bg-red-500" style={{ width: `${(d.band_red / total) * 100}%` }} />
        </div>
      </Card>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'contatos', label: 'Pacientes', icon: Users },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'prontuario', label: 'Prontuário', icon: FileText },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'estoque', label: 'Estoque', icon: Package },
  { id: 'sessoes', label: 'Sessões', icon: Repeat2 },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'qualidade', label: 'Qualidade', icon: Star },
  { id: 'ayron', label: 'AYRON', icon: Brain },
];

const TODAY = new Date().toISOString().split('T')[0];
const SIX_MONTHS_AGO = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];

const PRESETS = [
  { label: '30d', from: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], to: TODAY },
  { label: '60d', from: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0], to: TODAY },
  { label: '6m', from: SIX_MONTHS_AGO, to: TODAY },
  { label: 'Ano', from: `${new Date().getFullYear()}-01-01`, to: TODAY },
];

export default function InsightsPage() {
  const [tab, setTab] = useState('contatos');
  const [dateFrom, setDateFrom] = useState(SIX_MONTHS_AGO);
  const [dateTo, setDateTo] = useState(TODAY);

  const periodLabel = useMemo(() => {
    const d1 = new Date(dateFrom).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const d2 = new Date(dateTo).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    return `${d1} — ${d2}`;
  }, [dateFrom, dateTo]);

  const handleExport = (type: 'pdf' | 'excel') => {
    const tabLabel = TABS.find(t => t.id === tab)?.label ?? tab;
    toast.success(`Exportando relatório "${tabLabel}" (${periodLabel}) como ${type.toUpperCase()}...`);
  };

  return (
    <div>
      <Topbar title="Insights" subtitle="Análise completa da clínica" />
      <div className="p-6 max-w-7xl space-y-4">

        {/* Date range + export */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Presets */}
          <div className="flex gap-1">
            {PRESETS.map(p => {
              const active = dateFrom === p.from && dateTo === p.to;
              return (
                <button key={p.label}
                  onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                    active ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:border-primary/40'
                  )}>
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <span className="text-xs text-muted-foreground">até</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="flex-1" />

          {/* Export */}
          <Button variant="secondary" size="sm" onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')}>
            <Download className="h-3.5 w-3.5 mr-1.5" />PDF
          </Button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl bg-muted p-1 flex-wrap">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap min-w-fit',
                tab === id ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Period label */}
        <p className="text-xs text-muted-foreground">Período: {periodLabel}</p>

        {tab === 'contatos' && <TabContatos />}
        {tab === 'agenda' && <TabAgenda />}
        {tab === 'prontuario' && <TabProntuario />}
        {tab === 'financeiro' && <TabFinanceiro />}
        {tab === 'estoque' && <TabEstoque />}
        {tab === 'sessoes' && <TabSessoes />}
        {tab === 'marketing' && <TabMarketing />}
        {tab === 'qualidade' && <TabQualidade />}
        {tab === 'ayron' && <TabAyron />}
      </div>
    </div>
  );
}
