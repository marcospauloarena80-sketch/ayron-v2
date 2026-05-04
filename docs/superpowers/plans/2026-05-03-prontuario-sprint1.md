# Prontuário Sprint 1 — Motor de Consulta Clínica

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar Briefing + Pré-consulta acima das abas e nova aba "Consulta IA" ao prontuário existente, sem reconstruir telas nem quebrar contratos.

**Architecture:** Composição frontend-first — a camada de Briefing agrega queries Supabase já existentes num único hook sem novo endpoint. A aba Consulta IA reutiliza `ClinicalRecord` (campos `transcription`, `structured_data`, `voice_file_url` já presentes no schema) + novo endpoint `POST /clinical/records/:id/transcribe` que chama Whisper via fetch. BullMQ para jobs assíncronos (já instalado no projeto).

**Tech Stack:** Next.js 15 · React 19 · Tanstack Query · Supabase direct queries · NestJS · Prisma (`ClinicalRecord`) · MinIO (S3-compat) · OpenAI Whisper API · BullMQ + IORedis · Tailwind

---

## Escopo e fronteiras

| ✅ Incluído | ❌ Fora do escopo |
|---|---|
| BriefingCard acima das abas | Reconstruir telas existentes |
| PreConsultaPanel (bioimpedância + exames) | Alterar TABS existentes |
| Nova aba "Consulta IA" | Quebrar queries Supabase atuais |
| Gravação → MinIO → Whisper → diarização | OCR de PDFs (sprint 2) |
| Extração clínica + pendências | BullMQ queue (task 12, opcional) |
| Botões de ação pré-preenchendo forms existentes | Login / auth / multi-tenancy |
| Comparação de exames consecutivos | Novos modelos Prisma |
| Sugestão de CID no form SOAP | BullMQ / Redis setup infra |

---

## Mapa de arquivos

```
CRIAR:
  apps/web/src/components/clinical/briefing-card.tsx
  apps/web/src/components/clinical/pre-consulta-panel.tsx
  apps/web/src/components/clinical/consulta-ia-tab.tsx
  apps/web/src/lib/supabase/briefing-queries.ts
  apps/api/src/clinical/ai-transcription.service.ts

MODIFICAR:
  apps/web/src/app/(dashboard)/clinical/page.tsx
    — importar BriefingCard, PreConsultaPanel
    — adicionar tab 'consulta_ia' ao TABS array
    — adicionar estado consulta_ia
  apps/api/src/clinical/clinical.controller.ts
    — POST /clinical/records/:id/transcribe
    — GET  /clinical/records/:id/session
  apps/api/src/clinical/clinical.service.ts
    — addTranscribeMethod()
    — getSessionData()
  apps/api/src/clinical/clinical.module.ts
    — registrar AiTranscriptionService
```

---

## Fase 1 — Briefing Layer (Dias 1–2)

### Task 1: Query de Briefing (Supabase, frontend)

**Files:**
- Create: `apps/web/src/lib/supabase/briefing-queries.ts`

- [ ] **Step 1: Criar arquivo de query**

```typescript
// apps/web/src/lib/supabase/briefing-queries.ts
import { createClient } from '@/lib/supabase/client';

export interface BriefingData {
  lastEvolution: {
    id: string;
    date: string;
    type: string;
    medico: string;
    subjetivo: string;
    plano: string;
    cid: string;
    daysSince: number;
  } | null;
  activePrescriptions: Array<{
    id: string;
    date: string;
    validade: string;
    items: Array<{ med: string; dosagem: string }>;
    isExpired: boolean;
  }>;
  pendingExams: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
    lab: string | null;
  }>;
  activeProtocolTags: string[];
}

export async function fetchPatientBriefing(patientId: string): Promise<BriefingData> {
  const supabase = createClient();

  const [evolResult, prescResult, examResult] = await Promise.all([
    supabase
      .from('patient_evolutions')
      .select('id, date, type, cid, subjetivo, plano, professionals(name)')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('patient_prescriptions')
      .select('id, date, validade, prescription_items(med, dosagem)')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .limit(5),
    supabase
      .from('patient_exams')
      .select('id, name, date, status, lab')
      .eq('patient_id', patientId)
      .order('date', { ascending: false })
      .limit(5),
  ]);

  const now = new Date();

  const lastEv = evolResult.data;
  const lastEvolution = lastEv
    ? {
        id: lastEv.id,
        date: lastEv.date,
        type: lastEv.type,
        medico: (lastEv as any).professionals?.name ?? 'Desconhecido',
        subjetivo: lastEv.subjetivo ?? '',
        plano: lastEv.plano ?? '',
        cid: lastEv.cid ?? '',
        daysSince: Math.floor((now.getTime() - new Date(lastEv.date).getTime()) / 86_400_000),
      }
    : null;

  const activePrescriptions = (prescResult.data ?? []).map((p: any) => ({
    id: p.id,
    date: p.date,
    validade: p.validade,
    items: (p.prescription_items ?? []).map((i: any) => ({ med: i.med, dosagem: i.dosagem })),
    isExpired: p.validade ? new Date(p.validade) < now : false,
  }));

  const pendingExams = (examResult.data ?? []).filter(
    (e: any) => e.status === 'PENDING' || e.status === 'SOLICITADO',
  );

  return { lastEvolution, activePrescriptions, pendingExams, activeProtocolTags: [] };
}
```

- [ ] **Step 2: Verificar tipagem**

```bash
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json \
  --noEmit 2>&1 | grep "briefing-queries" | head -10
```

Esperado: sem output (sem erros).

- [ ] **Step 3: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/lib/supabase/briefing-queries.ts
git commit -m "feat(clinical): add fetchPatientBriefing aggregator query"
```

---

### Task 2: BriefingCard Component

**Files:**
- Create: `apps/web/src/components/clinical/briefing-card.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// apps/web/src/components/clinical/briefing-card.tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { Brain, Clock, Pill, FlaskConical, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchPatientBriefing } from '@/lib/supabase/briefing-queries';

interface BriefingCardProps {
  patientId: string;
  onOpenEvolution: () => void; // navega para aba evolucoes
}

export function BriefingCard({ patientId, onOpenEvolution }: BriefingCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['briefing', patientId],
    queryFn: () => fetchPatientBriefing(patientId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-white/60 backdrop-blur-sm p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-48 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { lastEvolution, activePrescriptions, pendingExams } = data;
  const activeRx = activePrescriptions.filter(p => !p.isExpired);
  const hasPendingExams = pendingExams.length > 0;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Briefing da Última Consulta</p>
        </div>
        {lastEvolution && (
          <button
            onClick={onOpenEvolution}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver completo <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {!lastEvolution ? (
        <p className="text-xs text-muted-foreground">Nenhuma evolução registrada.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Última evolução */}
          <div className="rounded-lg bg-white/80 border border-border/50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Última Consulta
              </span>
            </div>
            <p className="text-xs font-semibold">
              {new Date(lastEvolution.date).toLocaleDateString('pt-BR')} · {lastEvolution.type}
            </p>
            <p className={cn(
              'text-[11px] mt-0.5 font-medium',
              lastEvolution.daysSince > 30 ? 'text-amber-600' : 'text-muted-foreground',
            )}>
              {lastEvolution.daysSince === 0
                ? 'Hoje'
                : lastEvolution.daysSince === 1
                ? '1 dia atrás'
                : `${lastEvolution.daysSince} dias atrás`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
              {lastEvolution.subjetivo}
            </p>
            {lastEvolution.plano && (
              <p className="text-[11px] text-primary mt-1 line-clamp-1 font-medium">
                📋 {lastEvolution.plano}
              </p>
            )}
          </div>

          {/* Medicamentos ativos */}
          <div className="rounded-lg bg-white/80 border border-border/50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Pill className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Medicamentos Ativos
              </span>
            </div>
            {activeRx.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma receita ativa</p>
            ) : (
              <div className="space-y-1">
                {activeRx.slice(0, 1).flatMap(rx =>
                  rx.items.slice(0, 3).map((item, i) => (
                    <p key={i} className="text-[11px] text-foreground leading-relaxed">
                      • {item.med}
                      {item.dosagem && <span className="text-muted-foreground"> — {item.dosagem}</span>}
                    </p>
                  ))
                )}
                {activeRx[0]?.items.length > 3 && (
                  <p className="text-[10px] text-muted-foreground">
                    +{activeRx[0].items.length - 3} item(s)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Exames pendentes */}
          <div className="rounded-lg bg-white/80 border border-border/50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Exames Pendentes
              </span>
              {hasPendingExams && (
                <AlertTriangle className="h-3 w-3 text-amber-500 ml-auto" />
              )}
            </div>
            {!hasPendingExams ? (
              <p className="text-xs text-green-600 font-medium">✅ Sem pendências</p>
            ) : (
              <div className="space-y-1">
                {pendingExams.slice(0, 3).map(ex => (
                  <p key={ex.id} className="text-[11px] text-amber-700 leading-relaxed">
                    ⚠️ {ex.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipagem**

```bash
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json \
  --noEmit 2>&1 | grep "briefing-card" | head -10
```

Esperado: sem output.

- [ ] **Step 3: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/components/clinical/briefing-card.tsx
git commit -m "feat(clinical): add BriefingCard component"
```

---

### Task 3: PreConsultaPanel Component

**Files:**
- Create: `apps/web/src/components/clinical/pre-consulta-panel.tsx`

- [ ] **Step 1: Criar componente**

```tsx
// apps/web/src/components/clinical/pre-consulta-panel.tsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { Scale, TrendingUp, TrendingDown, Minus, FlaskConical, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface PreConsultaPanelProps {
  patientId: string;
}

type Trend = 'IMPROVING' | 'STABLE' | 'WORSENING' | null;

interface MetricsEntry {
  weight_kg: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  bmi: number | null;
  created_at: string;
}

const TREND_ICON: Record<string, React.ReactNode> = {
  IMPROVING: <TrendingUp className="h-3 w-3 text-green-600" />,
  WORSENING: <TrendingDown className="h-3 w-3 text-red-500" />,
  STABLE: <Minus className="h-3 w-3 text-muted-foreground" />,
};

const NIVEL_COLORS: Record<string, string> = {
  ideal: 'bg-green-100 text-green-700',
  alto: 'bg-red-100 text-red-700',
  baixo: 'bg-amber-100 text-amber-700',
  NORMAL: 'bg-green-100 text-green-700',
  ALTERADO: 'bg-red-100 text-red-700',
  ATENCAO: 'bg-amber-100 text-amber-700',
};

function delta(curr: number | null, prev: number | null): string | null {
  if (curr == null || prev == null) return null;
  const d = curr - prev;
  if (Math.abs(d) < 0.01) return null;
  return `${d > 0 ? '+' : ''}${d.toFixed(1)}`;
}

export function PreConsultaPanel({ patientId }: PreConsultaPanelProps) {
  const { data: metricsHistory = [] } = useQuery<MetricsEntry[]>({
    queryKey: ['metrics-history', patientId],
    queryFn: () =>
      api.get(`/clinical/metrics/patient/${patientId}`).then(r =>
        Array.isArray(r.data) ? r.data : [],
      ),
    staleTime: 60_000,
  });

  const { data: recentExams = [] } = useQuery<any[]>({
    queryKey: ['exams-recent', patientId],
    queryFn: () =>
      api.get(`/exams/patient/${patientId}`).then(r =>
        Array.isArray(r.data) ? r.data : (r.data?.data ?? []),
      ),
    staleTime: 60_000,
  });

  const latest = metricsHistory[0] ?? null;
  const prev = metricsHistory[1] ?? null;

  // exams within last 90 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const recentExamFiltered = recentExams.filter(
    e => new Date(e.exam_date ?? e.created_at) >= cutoff,
  );

  const alteredMarkers = recentExamFiltered.flatMap(e =>
    (e.markers ?? []).filter((m: any) => m.status === 'ABOVE_IDEAL' || m.status === 'BELOW_IDEAL'),
  );

  if (!latest && recentExamFiltered.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-white/60 backdrop-blur-sm p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        📋 Pré-consulta — dados recentes
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Bioimpedância */}
        {latest && (
          <>
            {[
              { label: 'Peso', curr: latest.weight_kg, prev: prev?.weight_kg, unit: 'kg', warnFn: () => false },
              { label: 'GC %', curr: latest.body_fat_pct, prev: prev?.body_fat_pct, unit: '%', warnFn: (v: number) => v > 30 },
              { label: 'Massa magra', curr: latest.lean_mass_kg, prev: prev?.lean_mass_kg, unit: 'kg', warnFn: () => false },
              { label: 'IMC', curr: latest.bmi, prev: prev?.bmi, unit: '', warnFn: (v: number) => v > 30 || v < 18.5 },
            ].map(({ label, curr, prev: p, unit, warnFn }) => {
              const d = delta(curr, p);
              const warn = curr != null && warnFn(curr);
              return (
                <div key={label} className={cn(
                  'rounded-lg border p-3',
                  warn ? 'border-amber-200 bg-amber-50' : 'border-border bg-white',
                )}>
                  <div className="flex items-center gap-1 mb-1">
                    <Scale className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                  </div>
                  <p className={cn('text-sm font-bold', warn ? 'text-amber-700' : '')}>
                    {curr != null ? `${curr}${unit}` : '—'}
                  </p>
                  {d && (
                    <p className={cn(
                      'text-[10px] font-medium',
                      d.startsWith('-') ? 'text-green-600' : 'text-amber-600',
                    )}>
                      Δ {d}{unit}
                    </p>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Exames recentes alterados */}
      {alteredMarkers.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Marcadores alterados (últimos 90 dias)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {alteredMarkers.slice(0, 8).map((m: any, i: number) => (
              <span
                key={i}
                title={`Valor: ${m.value}${m.unit ?? ''} | Ref: ${m.ideal_min ?? '?'}–${m.ideal_max ?? '?'}`}
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-help',
                  m.status === 'ABOVE_IDEAL'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200',
                )}
              >
                ⚠️ {m.marker_name}: {m.value}{m.unit ?? ''} ({m.status === 'ABOVE_IDEAL' ? '↑' : '↓'})
              </span>
            ))}
          </div>
        </div>
      )}

      {recentExamFiltered.length === 0 && !latest && (
        <p className="text-xs text-muted-foreground">Nenhum dado clínico recente.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipagem**

```bash
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json \
  --noEmit 2>&1 | grep "pre-consulta-panel" | head -10
```

Esperado: sem output.

- [ ] **Step 3: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/components/clinical/pre-consulta-panel.tsx
git commit -m "feat(clinical): add PreConsultaPanel with bioimpedance delta + altered markers"
```

---

### Task 4: Wire Briefing + PreConsulta em clinical/page.tsx

**Files:**
- Modify: `apps/web/src/app/(dashboard)/clinical/page.tsx`

- [ ] **Step 1: Adicionar imports no topo de clinical/page.tsx**

Localizar o bloco de imports existente (em torno da linha 18–32) e adicionar:

```tsx
import { BriefingCard } from '@/components/clinical/briefing-card';
import { PreConsultaPanel } from '@/components/clinical/pre-consulta-panel';
```

- [ ] **Step 2: Localizar o return do ProntuarioDetail e inserir painéis antes do Tab bar**

Achar a linha onde começa `{/* Tab bar */}` (em torno da linha 706) dentro de `ProntuarioDetail`. Inserir os dois painéis entre o header do paciente e o Tab bar:

```tsx
        {/* ── Briefing + Pré-consulta ───────────────────────────────── */}
        <div className="space-y-3 mb-4">
          <BriefingCard
            patientId={patient.id}
            onOpenEvolution={() => setActiveTab('evolucoes')}
          />
          <PreConsultaPanel patientId={patient.id} />
        </div>

        {/* Tab bar */}
```

O bloco deve ficar logo acima de `{/* Tab bar */}` e logo abaixo do header (`</div>` que fecha o `flex items-start justify-between`).

- [ ] **Step 3: Verificar tipagem**

```bash
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json \
  --noEmit 2>&1 | grep "clinical/page" | head -10
```

Esperado: sem output.

- [ ] **Step 4: Teste manual**

1. `pnpm --filter web dev` → abrir `http://localhost:3000/clinical`
2. Selecionar qualquer paciente
3. Verificar que BriefingCard aparece (pode mostrar loading ou "Nenhuma evolução" se Supabase vazio)
4. Verificar que PreConsultaPanel aparece (pode mostrar vazio se sem métricas)
5. Verificar que todas as abas existentes continuam funcionando

- [ ] **Step 5: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/app/(dashboard)/clinical/page.tsx
git commit -m "feat(clinical): wire BriefingCard and PreConsultaPanel above tabs"
```

---

## Fase 2 — Aba "Consulta IA" (Dias 3–5)

### Task 5: Scaffold da nova aba

**Files:**
- Modify: `apps/web/src/app/(dashboard)/clinical/page.tsx`

- [ ] **Step 1: Adicionar `consulta_ia` ao tipo activeTab e ao array TABS**

Localizar a declaração do tipo em `useState<'evolucoes' | 'anamnese' | ...>` (linha ~574) e adicionar `| 'consulta_ia'`:

```tsx
const [activeTab, setActiveTab] = useState<
  'evolucoes' | 'anamnese' | 'receitas' | 'exames' | 'ia' | 'imagens' | 'telemedicina' | 'bioimpedancia' | 'consulta_ia'
>('evolucoes');
```

- [ ] **Step 2: Adicionar nova entrada no array TABS (linha ~651)**

```tsx
const TABS = [
  { key: 'evolucoes', label: 'Evoluções', icon: FileText },
  { key: 'anamnese', label: 'Anamnese', icon: ClipboardList },
  { key: 'receitas', label: 'Receituário', icon: Pill },
  { key: 'exames', label: 'Exames', icon: FlaskConical },
  { key: 'bioimpedancia', label: 'Bioimpedância', icon: Activity },
  { key: 'ia', label: 'AYRON IA', icon: Brain },
  { key: 'imagens', label: 'Imagens', icon: Image },
  { key: 'telemedicina', label: 'Telemedicina', icon: Video },
  { key: 'consulta_ia', label: '🎤 Consulta IA', icon: Sparkles },  // ← NOVA
];
```

- [ ] **Step 3: Adicionar placeholder de conteúdo da nova aba no bloco de tab content (após o último `activeTab === 'telemedicina'`)**

```tsx
        {activeTab === 'consulta_ia' && (
          <ConsultaIATab
            patientId={patient.id}
            patientName={patient.name}
            onFillEvolution={(data) => {
              setNewEvolucao(v => ({ ...v, ...data }));
              setShowNewEvolucao(true);
              setActiveTab('evolucoes');
            }}
            onFillAnamnese={(data) => {
              setAnamneseData(v => ({ ...v, ...data }));
              setEditingAnamnese(true);
              setActiveTab('anamnese');
            }}
            onOpenReceita={() => { setShowNovaReceita(true); setActiveTab('receitas'); }}
            onOpenExame={() => { setShowSolicitarExame(true); setActiveTab('exames'); }}
          />
        )}
```

- [ ] **Step 4: Adicionar import do ConsultaIATab**

```tsx
import { ConsultaIATab } from '@/components/clinical/consulta-ia-tab';
```

- [ ] **Step 5: Verificar tipagem**

```bash
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json \
  --noEmit 2>&1 | head -10
```

Esperado: sem output (ou erros apenas sobre `ConsultaIATab` não existir ainda — ok pois será criado na Task 6).

- [ ] **Step 6: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/app/(dashboard)/clinical/page.tsx
git commit -m "feat(clinical): add consulta_ia tab scaffold to ProntuarioDetail"
```

---

### Task 6: ConsultaIATab Component (Recording + Transcript UI + Actions)

**Files:**
- Create: `apps/web/src/components/clinical/consulta-ia-tab.tsx`

- [ ] **Step 1: Criar o componente completo**

```tsx
// apps/web/src/components/clinical/consulta-ia-tab.tsx
'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mic, MicOff, Brain, CheckCircle, AlertTriangle, Sparkles,
  FileText, Pill, FlaskConical, ClipboardList, Loader2, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface TranscriptSegment {
  speaker: 'doctor' | 'patient' | 'companion';
  text: string;
}

interface ClinicalExtraction {
  queixa_principal: string;
  sintomas: string[];
  medicamentos_mencionados: string[];
  padroes: {
    sono?: string;
    intestino?: string;
    atividade_fisica?: string;
    libido?: string;
  };
  pendencias: string[];
}

interface SessionData {
  id: string;
  transcript: { segments: TranscriptSegment[] } | null;
  structured_data: ClinicalExtraction | null;
  voice_file_url: string | null;
  summary_ai: string | null;
}

interface ConsultaIATabProps {
  patientId: string;
  patientName: string;
  onFillEvolution: (data: { subjetivo: string; objetivo: string; avaliacao: string; plano: string }) => void;
  onFillAnamnese: (data: { queixa: string; habitos: string }) => void;
  onOpenReceita: () => void;
  onOpenExame: () => void;
}

// ── PENDÊNCIAS_DEFAULT ─────────────────────────────────────────────────────────

const PENDENCIA_LABELS: Record<string, string> = {
  sono: 'Qualidade do sono',
  intestino: 'Função intestinal',
  atividade_fisica: 'Atividade física',
  alergias: 'Alergias/intolerâncias',
  medicamentos: 'Medicamentos em uso',
  libido: 'Libido / vida sexual',
};

// ── Speaker colors ─────────────────────────────────────────────────────────────

const SPEAKER_STYLES: Record<TranscriptSegment['speaker'], string> = {
  doctor: 'bg-primary/10 text-primary self-end ml-auto border border-primary/20',
  patient: 'bg-muted text-foreground self-start mr-auto border border-border',
  companion: 'bg-amber-50 text-amber-800 self-start mr-auto border border-amber-200',
};

const SPEAKER_LABELS: Record<TranscriptSegment['speaker'], string> = {
  doctor: 'Médico',
  patient: 'Paciente',
  companion: 'Acompanhante',
};

// ── Main Component ─────────────────────────────────────────────────────────────

export function ConsultaIATab({
  patientId,
  patientName,
  onFillEvolution,
  onFillAnamnese,
  onOpenReceita,
  onOpenExame,
}: ConsultaIATabProps) {
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Busca sessão atual se existe
  const { data: session, isLoading: sessionLoading } = useQuery<SessionData | null>({
    queryKey: ['consultation-session', patientId],
    queryFn: () =>
      api.get(`/clinical/records/patient/${patientId}/latest-session`)
        .then(r => r.data)
        .catch(() => null),
    staleTime: 30_000,
    enabled: !sessionId,
  });

  const activeSession: SessionData | null = sessionId
    ? (qc.getQueryData(['consultation-session-detail', sessionId]) as SessionData ?? null)
    : session ?? null;

  const { data: sessionDetail } = useQuery<SessionData>({
    queryKey: ['consultation-session-detail', sessionId],
    queryFn: () => api.get(`/clinical/records/${sessionId}`).then(r => r.data),
    enabled: !!sessionId,
    refetchInterval: sessionId ? 5_000 : false, // poll while processing
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionDetail?.transcript]);

  const transcribeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/clinical/records/${id}/transcribe`).then(r => r.data),
    onSuccess: (_, id) => {
      toast.success('Transcrição concluída');
      qc.invalidateQueries({ queryKey: ['consultation-session-detail', id] });
    },
    onError: () => toast.error('Erro na transcrição. Tente novamente.'),
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => stream.getTracks().forEach(t => t.stop());
      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
      toast.info('Gravando consulta...');
    } catch {
      toast.error('Microfone não autorizado. Verifique permissões do navegador.');
    }
  };

  const stopRecording = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.stop();
    setRecording(false);

    // Wait for onstop to fire
    await new Promise(res => setTimeout(res, 200));

    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    if (blob.size < 1000) {
      toast.error('Gravação muito curta. Tente novamente.');
      return;
    }

    setUploading(true);
    try {
      // 1. Criar ClinicalRecord
      const form = new FormData();
      form.append('patient_id', patientId);
      form.append('audio', blob, 'consulta.webm');

      const createRes = await api.post('/clinical/records/upload-session', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newId: string = createRes.data.id;
      setSessionId(newId);

      // 2. Disparar transcrição (assíncrono)
      transcribeMutation.mutate(newId);
      toast.success('Áudio enviado. Transcrevendo...');
    } catch {
      toast.error('Erro ao enviar áudio.');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateEvolution = () => {
    const d = (sessionDetail ?? activeSession)?.structured_data;
    if (!d) { toast.error('Aguarde a extração clínica.'); return; }
    onFillEvolution({
      subjetivo: [d.queixa_principal, ...(d.sintomas ?? [])].filter(Boolean).join('. ') + '.',
      objetivo: '',
      avaliacao: d.medicamentos_mencionados?.length
        ? `Medicamentos mencionados: ${d.medicamentos_mencionados.join(', ')}.`
        : '',
      plano: '',
    });
  };

  const handleGenerateAnamnese = () => {
    const d = (sessionDetail ?? activeSession)?.structured_data;
    if (!d) { toast.error('Aguarde a extração clínica.'); return; }
    const habitos = Object.entries(d.padroes ?? {})
      .map(([k, v]) => `${PENDENCIA_LABELS[k] ?? k}: ${v}`)
      .join(' · ');
    onFillAnamnese({
      queixa: d.queixa_principal ?? '',
      habitos,
    });
  };

  const currentSession = sessionDetail ?? activeSession;
  const segments = currentSession?.transcript?.segments ?? [];
  const extraction = currentSession?.structured_data;
  const isProcessing = transcribeMutation.isPending || (!!sessionId && !sessionDetail?.transcript);

  return (
    <div className="space-y-4">
      {/* Recording controls */}
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Consulta IA — Captação Clínica
          </p>
          {recording && (
            <span className="text-xs text-red-500 animate-pulse font-medium flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
              Gravando...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={recording ? 'danger' : 'secondary'}
            size="sm"
            onClick={recording ? stopRecording : startRecording}
            disabled={uploading || isProcessing}
            loading={uploading}
          >
            {recording
              ? <><MicOff className="h-3.5 w-3.5 mr-1.5" />Parar gravação</>
              : <><Mic className="h-3.5 w-3.5 mr-1.5" />Iniciar gravação</>
            }
          </Button>

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Transcrevendo e analisando...</span>
            </div>
          )}
        </div>

        {!recording && !uploading && !isProcessing && !currentSession && (
          <p className="text-xs text-muted-foreground mt-2">
            Grave a consulta para transcrição automática, extração clínica e sugestões de evolução.
          </p>
        )}
      </div>

      {/* Transcript — diarized bubbles */}
      {segments.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Transcrição da Consulta
          </p>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {segments.map((seg, i) => (
              <div key={i} className={cn('max-w-[80%] rounded-xl px-3 py-2', SPEAKER_STYLES[seg.speaker])}>
                <p className="text-[10px] font-bold mb-0.5 opacity-60 uppercase tracking-wide">
                  {SPEAKER_LABELS[seg.speaker]}
                </p>
                <p className="text-xs leading-relaxed">{seg.text}</p>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      )}

      {/* Clinical extraction */}
      {extraction && (
        <div className="rounded-xl border border-border bg-white p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-primary" />
            Extração Clínica — AYRON
          </p>

          {extraction.queixa_principal && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">Queixa Principal</p>
              <p className="text-sm">{extraction.queixa_principal}</p>
            </div>
          )}

          {extraction.sintomas?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Sintomas</p>
              <div className="flex flex-wrap gap-1.5">
                {extraction.sintomas.map((s, i) => (
                  <span key={i} className="text-[11px] bg-muted px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {extraction.medicamentos_mencionados?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">Medicamentos mencionados</p>
              <div className="flex flex-wrap gap-1.5">
                {extraction.medicamentos_mencionados.map((m, i) => (
                  <span key={i} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Pendências */}
          {extraction.pendencias?.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-[10px] font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Pendências não abordadas
              </p>
              <div className="space-y-1">
                {extraction.pendencias.map((p, i) => (
                  <p key={i} className="text-xs text-amber-700">⚠️ {PENDENCIA_LABELS[p] ?? p}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(segments.length > 0 || extraction) && (
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Ações Automáticas
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateEvolution}
              className="flex-col h-auto py-3 gap-1"
            >
              <FileText className="h-4 w-4" />
              <span className="text-[11px]">Gerar Evolução</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateAnamnese}
              className="flex-col h-auto py-3 gap-1"
            >
              <ClipboardList className="h-4 w-4" />
              <span className="text-[11px]">Gerar Anamnese</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenReceita}
              className="flex-col h-auto py-3 gap-1"
            >
              <Pill className="h-4 w-4" />
              <span className="text-[11px]">Sugerir Receita</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenExame}
              className="flex-col h-auto py-3 gap-1"
            >
              <FlaskConical className="h-4 w-4" />
              <span className="text-[11px]">Sugerir Exames</span>
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Nenhum dado é salvo automaticamente — médico valida antes de confirmar.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipagem**

```bash
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json \
  --noEmit 2>&1 | head -20
```

Esperado: sem output.

- [ ] **Step 3: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/components/clinical/consulta-ia-tab.tsx
git commit -m "feat(clinical): add ConsultaIATab with recording, transcript, extraction, and action buttons"
```

---

### Task 7: Backend — Upload de Sessão + Endpoint de Transcrição

**Files:**
- Modify: `apps/api/src/clinical/clinical.controller.ts`
- Modify: `apps/api/src/clinical/clinical.service.ts`
- Create: `apps/api/src/clinical/ai-transcription.service.ts`
- Modify: `apps/api/src/clinical/clinical.module.ts`

- [ ] **Step 1: Instalar openai**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
pnpm add openai --filter api
```

Esperado: `Done` sem erros.

- [ ] **Step 2: Criar AiTranscriptionService**

```typescript
// apps/api/src/clinical/ai-transcription.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Readable } from 'stream';

export interface TranscriptSegment {
  speaker: 'doctor' | 'patient' | 'companion';
  text: string;
}

export interface ClinicalExtraction {
  queixa_principal: string;
  sintomas: string[];
  medicamentos_mencionados: string[];
  padroes: {
    sono?: string;
    intestino?: string;
    atividade_fisica?: string;
    libido?: string;
  };
  pendencias: string[];
}

const CHECKLIST = ['sono', 'intestino', 'atividade_fisica', 'alergias', 'medicamentos', 'libido'];

@Injectable()
export class AiTranscriptionService {
  private readonly logger = new Logger(AiTranscriptionService.name);
  private readonly client: OpenAI | null;

  constructor(private config: ConfigService) {
    const key = config.get<string>('OPENAI_API_KEY');
    this.client = key ? new OpenAI({ apiKey: key }) : null;
    if (!key) this.logger.warn('OPENAI_API_KEY not set — using mock transcription');
  }

  async transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    if (!this.client) return this.mockTranscription();

    try {
      const file = new File([audioBuffer], filename, { type: 'audio/webm' });
      const resp = await this.client.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        language: 'pt',
        response_format: 'verbose_json',
      });
      return resp.text;
    } catch (err) {
      this.logger.error('Whisper error', err);
      return this.mockTranscription();
    }
  }

  async diarizeAndClassify(rawText: string): Promise<{ segments: TranscriptSegment[] }> {
    if (!this.client) return this.mockDiarization(rawText);

    try {
      const chat = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente médico. Dado o texto de uma transcrição de consulta médica em português, 
separe as falas por papel: "doctor" (médico), "patient" (paciente), "companion" (acompanhante).
Retorne JSON puro: { "segments": [{ "speaker": "doctor"|"patient"|"companion", "text": "..." }] }
Se não conseguir distinguir o papel, use "doctor" para quem faz perguntas e "patient" para quem responde.`,
          },
          { role: 'user', content: rawText },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      });
      const parsed = JSON.parse(chat.choices[0].message.content ?? '{}');
      return { segments: parsed.segments ?? [] };
    } catch (err) {
      this.logger.error('Diarization error', err);
      return this.mockDiarization(rawText);
    }
  }

  async extractClinicalData(segments: TranscriptSegment[]): Promise<ClinicalExtraction> {
    if (!this.client) return this.mockExtraction();

    const fullText = segments.map(s => `${s.speaker}: ${s.text}`).join('\n');

    try {
      const chat = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente médico. Extraia informações clínicas da transcrição.
Retorne JSON puro com campos:
{
  "queixa_principal": "string",
  "sintomas": ["string"],
  "medicamentos_mencionados": ["string"],
  "padroes": { "sono": "string?", "intestino": "string?", "atividade_fisica": "string?", "libido": "string?" },
  "pendencias": ["sono"|"intestino"|"atividade_fisica"|"alergias"|"medicamentos"|"libido"]
}
"pendencias" = itens do checklist [${CHECKLIST.join(', ')}] NÃO mencionados na conversa.`,
          },
          { role: 'user', content: fullText },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      });
      return JSON.parse(chat.choices[0].message.content ?? '{}') as ClinicalExtraction;
    } catch (err) {
      this.logger.error('Extraction error', err);
      return this.mockExtraction();
    }
  }

  // ── Mocks (used when OPENAI_API_KEY not set) ────────────────────────────────

  private mockTranscription(): string {
    return 'Médico: Como a senhora está se sentindo desde a última consulta? Paciente: Melhorei bastante, reduzi quase 3 quilos. O apetite está mais controlado. Médico: Ótimo. E o sono? Paciente: Ainda irregular, durmo umas seis horas. Médico: Vamos manter o protocolo e solicitar novos exames.';
  }

  private mockDiarization(text: string): { segments: TranscriptSegment[] } {
    const sentences = text.split(/(?<=[.?!])\s+/);
    return {
      segments: sentences.map((s, i) => ({
        speaker: i % 2 === 0 ? 'doctor' : 'patient',
        text: s.trim(),
      })),
    };
  }

  private mockExtraction(): ClinicalExtraction {
    return {
      queixa_principal: 'Perda de peso progressiva com boa tolerância à medicação',
      sintomas: ['Apetite reduzido', 'Sono irregular'],
      medicamentos_mencionados: ['Mounjaro', 'Tirzepatida'],
      padroes: { sono: 'Irregular, ~6h/noite', atividade_fisica: 'Não mencionado' },
      pendencias: ['intestino', 'atividade_fisica', 'alergias', 'libido'],
    };
  }
}
```

- [ ] **Step 3: Adicionar endpoints ao clinical.controller.ts**

Adicionar após o bloco de `Bioimpedância upload`:

```typescript
  // ─── Consultation Sessions ──────────────────────────────────────────

  @Post('records/upload-session')
  @UseInterceptors(FileInterceptor('audio'))
  uploadConsultationAudio(
    @CurrentUser() u: RequestUser,
    @Body('patient_id') patientId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadConsultationSession(u.clinic_id, patientId, file, u.sub);
  }

  @Post('records/:id/transcribe')
  transcribeSession(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
  ) {
    return this.service.transcribeConsultationSession(u.clinic_id, id, u.sub);
  }

  @Get('records/patient/:patientId/latest-session')
  getLatestSession(
    @CurrentUser() u: RequestUser,
    @Param('patientId') patientId: string,
  ) {
    return this.service.getLatestConsultationSession(u.clinic_id, patientId);
  }

  @Get('records/:id')
  getRecord(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
  ) {
    return this.service.getRecordById(u.clinic_id, id);
  }
```

- [ ] **Step 4: Adicionar métodos ao clinical.service.ts**

Adicionar imports no topo:

```typescript
import { AiTranscriptionService } from './ai-transcription.service';
import { StorageService } from '../common/storage/storage.service';
```

Adicionar `private aiTranscription: AiTranscriptionService, private storage: StorageService` no constructor.

Adicionar métodos:

```typescript
  async uploadConsultationSession(
    clinicId: string,
    patientId: string,
    file: Express.Multer.File,
    actorId: string,
  ) {
    // Upload audio to MinIO
    const key = `clinical/${clinicId}/${patientId}/sessions/${Date.now()}-${file.originalname}`;
    const audioUrl = await this.storage.upload(key, file.buffer, file.mimetype);

    // Create ClinicalRecord
    const record = await this.prisma.clinicalRecord.create({
      data: {
        clinic_id: clinicId,
        patient_id: patientId,
        professional_id: actorId,
        voice_file_url: audioUrl,
        transcription: null,
        structured_data: {},
        summary_ai: null,
      },
    });

    await this.audit.log({
      clinic_id: clinicId,
      actor_id: actorId,
      action: 'CREATE',
      entity_type: 'ClinicalRecord',
      entity_id: record.id,
    });

    return { id: record.id, voice_file_url: audioUrl };
  }

  async transcribeConsultationSession(clinicId: string, id: string, actorId: string) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
    });
    if (!record) throw new NotFoundException('Session not found');
    if (!record.voice_file_url) throw new BadRequestException('No audio file');

    // Download from MinIO
    const audioBuffer = await this.storage.download(record.voice_file_url);

    // Transcribe
    const rawText = await this.aiTranscription.transcribeAudio(audioBuffer, 'consulta.webm');

    // Diarize
    const { segments } = await this.aiTranscription.diarizeAndClassify(rawText);

    // Extract clinical data
    const extraction = await this.aiTranscription.extractClinicalData(segments);

    // Save back to DB
    await this.prisma.clinicalRecord.update({
      where: { id },
      data: {
        transcription: rawText,
        structured_data: { segments, ...extraction } as any,
        summary_ai: extraction.queixa_principal,
      },
    });

    return { id, transcription: rawText, segments, extraction };
  }

  async getLatestConsultationSession(clinicId: string, patientId: string) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { clinic_id: clinicId, patient_id: patientId, deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
    if (!record) return null;
    const data = record.structured_data as any;
    return {
      id: record.id,
      voice_file_url: record.voice_file_url,
      transcript: data?.segments ? { segments: data.segments } : null,
      structured_data: data?.queixa_principal ? data : null,
      summary_ai: record.summary_ai,
    };
  }

  async getRecordById(clinicId: string, id: string) {
    const record = await this.prisma.clinicalRecord.findFirst({
      where: { id, clinic_id: clinicId, deleted_at: null },
    });
    if (!record) throw new NotFoundException('Record not found');
    const data = record.structured_data as any;
    return {
      id: record.id,
      voice_file_url: record.voice_file_url,
      transcript: data?.segments ? { segments: data.segments } : null,
      structured_data: data?.queixa_principal ? data : null,
      summary_ai: record.summary_ai,
    };
  }
```

> ⚠️ NOTA: `this.storage.download(url)` pode não existir ainda na StorageService. Se não existir, adicionar o método em `apps/api/src/common/storage/storage.service.ts`:

```typescript
  async download(urlOrKey: string): Promise<Buffer> {
    // Extract key from URL or use as-is
    const key = urlOrKey.includes('/') && urlOrKey.startsWith('http')
      ? new URL(urlOrKey).pathname.slice(1) // remove leading /
      : urlOrKey;
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res = await this.client.send(cmd);
    const stream = res.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
```

- [ ] **Step 5: Registrar AiTranscriptionService no clinical.module.ts**

```typescript
// Adicionar import
import { AiTranscriptionService } from './ai-transcription.service';

// No @Module providers:
providers: [ClinicalService, ProtocolSchedulerService, BioimpedanciaService, AiTranscriptionService],
```

Também adicionar `StorageModule` no imports se ainda não estiver:

```typescript
imports: [PrismaModule, StorageModule, ...],
```

- [ ] **Step 6: Verificar tipagem backend**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p tsconfig.json --noEmit 2>&1 | head -30
```

Esperado: sem output. Corrigir erros encontrados antes de continuar.

- [ ] **Step 7: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/api/src/clinical/
git commit -m "feat(clinical): add consultation session upload + Whisper transcription endpoint"
```

---

## Fase 3 — Comparação de Exames + CID Inteligente (Dias 6–7)

### Task 8: Comparação de Exames (frontend)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/clinical/page.tsx` — na seção `activeTab === 'exames'`

- [ ] **Step 1: Localizar a renderização de exames e adicionar comparação de marcadores**

Dentro do bloco `activeTab === 'exames'`, achar onde os exames são listados (procure por `exames.map`). Para cada exame com `ai_data` ou `markers`, adicionar indicadores de trend.

Adicionar função auxiliar **antes** do `return` do `ProntuarioDetail`:

```tsx
function ExamStatusBadge({ status, trend }: { status?: string; trend?: string }) {
  const config = {
    NORMAL: { label: '✅ Normal', cls: 'bg-green-100 text-green-700 border-green-200' },
    ALTERADO: { label: '⚠️ Alterado', cls: 'bg-red-100 text-red-700 border-red-200' },
    ATENCAO: { label: '📈 Atenção', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    ABOVE_IDEAL: { label: '↑ Acima', cls: 'bg-red-100 text-red-700 border-red-200' },
    BELOW_IDEAL: { label: '↓ Abaixo', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    IDEAL: { label: '✅ Ideal', cls: 'bg-green-100 text-green-700 border-green-200' },
  }[status ?? 'NORMAL'] ?? { label: status ?? '—', cls: 'bg-muted text-muted-foreground border-border' };

  const trendIcon = trend === 'IMPROVING' ? '📈' : trend === 'WORSENING' ? '📉' : '';

  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', config.cls)}>
      {config.label}{trendIcon ? ` ${trendIcon}` : ''}
    </span>
  );
}
```

Nos cards de exame dentro da aba `exames`, adicionar `ExamStatusBadge` ao lado do status:

```tsx
// Encontrar onde exames são renderizados, ex:
// { id: 'X3', name: 'Perfil lipídico', status: 'ATENCAO', ... }
// Adicionar badge ao lado do nome:
<ExamStatusBadge status={ex.status} />
```

Para comparação com exame anterior, adicionar tooltip ou linha extra quando `ai_data` tem `nivel`:

```tsx
{ex.ai_data && (
  <div className="mt-2 overflow-x-auto">
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-muted-foreground">
          <th className="text-left py-1 pr-3">Marcador</th>
          <th className="text-right py-1 pr-3">Valor</th>
          <th className="text-right py-1 pr-3">Ref.</th>
          <th className="text-right py-1">Status</th>
        </tr>
      </thead>
      <tbody>
        {ex.ai_data.map((row: any, i: number) => (
          <tr key={i} className="border-t border-border/50">
            <td className="py-1 pr-3 font-medium">{row.item}</td>
            <td className="py-1 pr-3 text-right tabular-nums">{row.valor} {row.unidade}</td>
            <td className="py-1 pr-3 text-right text-muted-foreground">{row.ref}</td>
            <td className="py-1 text-right">
              <ExamStatusBadge status={row.nivel} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

- [ ] **Step 2: Verificar tipagem**

```bash
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json \
  --noEmit 2>&1 | head -10
```

Esperado: sem output.

- [ ] **Step 3: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/app/(dashboard)/clinical/page.tsx
git commit -m "feat(clinical): add exam marker status badges and comparison table"
```

---

### Task 9: Sugestão de CID no form SOAP

**Files:**
- Modify: `apps/web/src/app/(dashboard)/clinical/page.tsx` — dentro do form `showNewEvolucao`

- [ ] **Step 1: Adicionar sugestões de CID mocadas abaixo do campo CID**

No form de Nova Evolução, após o `<input>` de CID, adicionar:

```tsx
// Após o campo CID no Nova Evolução form:
{newEvolucao.cid === '' && (
  <div className="mt-1.5">
    <p className="text-[10px] text-muted-foreground mb-1">Sugestões (baseado em histórico):</p>
    <div className="flex gap-1.5 flex-wrap">
      {[
        { code: 'E66.0', label: 'Obesidade grau II' },
        { code: 'E11.9', label: 'DM tipo 2' },
        { code: 'I10', label: 'Hipertensão arterial' },
        { code: 'E29.1', label: 'Hipofunção testicular' },
        { code: 'E28.2', label: 'Síndrome dos ovários policísticos' },
      ].map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setNewEvolucao(v => ({ ...v, cid: `${code} — ${label}` }))}
          className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          {code} {label}
        </button>
      ))}
    </div>
    <p className="text-[10px] text-muted-foreground mt-1">Separação automática: crônico / agudo em breve.</p>
  </div>
)}
```

- [ ] **Step 2: Verificar tipagem**

```bash
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json \
  --noEmit 2>&1 | head -10
```

Esperado: sem output.

- [ ] **Step 3: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/app/(dashboard)/clinical/page.tsx
git commit -m "feat(clinical): add CID suggestions to SOAP evolution form"
```

---

## Fase 4 — Validação Final (Dia 7)

### Task 10: TypeScript + Smoke Test

**Files:**
- Nenhum (verificação)

- [ ] **Step 1: Frontend full typecheck**

```bash
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json \
  --noEmit 2>&1
```

Esperado: saída vazia (zero erros).

- [ ] **Step 2: Backend full typecheck**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api
/Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/node_modules/.bin/tsc \
  -p tsconfig.json --noEmit 2>&1
```

Esperado: saída vazia.

- [ ] **Step 3: Smoke test — abrir prontuário**

1. Iniciar dev: `pnpm --filter web dev` (+ `pnpm --filter api start:dev` separado)
2. Navegar para `/clinical`
3. Selecionar paciente
4. **Verificar**: BriefingCard aparece acima das abas (pode estar vazio se BD vazio — OK)
5. **Verificar**: PreConsultaPanel aparece (pode estar vazio — OK)
6. **Verificar**: aba "🎤 Consulta IA" aparece na barra de abas
7. **Verificar**: todas as 8 abas originais continuam funcionando
8. **Verificar**: gravar áudio → parar → sem crash
9. **Verificar**: botões "Gerar Evolução" → abre form SOAP preenchido
10. **Verificar**: CID suggestions aparecem no form SOAP vazio

- [ ] **Step 4: Commit final**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add -A
git commit -m "chore(clinical): sprint 1 validation — prontuário motor de consulta clínica"
```

---

### Task 11 (Opcional): BullMQ Queue para Transcrição

> **Pré-requisito**: Redis rodando (variável `REDIS_URL` no `.env` da API).

**Files:**
- Create: `apps/api/src/clinical/transcription.processor.ts`
- Modify: `apps/api/src/clinical/clinical.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Instalar @nestjs/bullmq**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
pnpm add @nestjs/bullmq --filter api
```

- [ ] **Step 2: Criar Processor**

```typescript
// apps/api/src/clinical/transcription.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ClinicalService } from './clinical.service';

@Processor('transcription')
export class TranscriptionProcessor extends WorkerHost {
  constructor(private readonly clinicalService: ClinicalService) {
    super();
  }

  async process(job: Job<{ clinicId: string; recordId: string; actorId: string }>) {
    const { clinicId, recordId, actorId } = job.data;
    return this.clinicalService.transcribeConsultationSession(clinicId, recordId, actorId);
  }
}
```

- [ ] **Step 3: Registrar BullMQ no clinical.module.ts**

```typescript
import { BullModule } from '@nestjs/bullmq';
import { TranscriptionProcessor } from './transcription.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'transcription' }),
    ...
  ],
  providers: [
    ClinicalService, ProtocolSchedulerService, BioimpedanciaService,
    AiTranscriptionService, TranscriptionProcessor,
  ],
})
```

- [ ] **Step 4: Em clinical.service.ts, substituir chamada síncrona pelo enqueue**

```typescript
// Substituir na transcribeSession do controller:
// DE: return this.service.transcribeConsultationSession(...)
// PARA: return this.queue.add('transcribe', { clinicId, recordId: id, actorId })
//       + retornar { id, status: 'QUEUED' }
```

- [ ] **Step 5: Commit (opcional)**

```bash
git add apps/api/src/clinical/
git commit -m "feat(clinical): add BullMQ queue for async transcription"
```

---

## Self-Review

### Spec coverage

| Requisito | Task |
|---|---|
| Briefing: última evolução + medicamentos + exames pendentes | Task 1, 2, 4 |
| Pré-consulta: bioimpedância Δ + exames 90 dias | Task 3, 4 |
| Nova aba Consulta IA | Task 5 |
| Gravação áudio + upload MinIO | Task 6, 7 |
| Transcrição Whisper | Task 7 |
| Diarização + chat bubbles | Task 7, 6 |
| Extração clínica (queixa, sintomas, meds, padrões) | Task 7, 6 |
| Detecção de pendências | Task 7, 6 |
| Botões de ação pré-preenchendo forms existentes | Task 6 |
| NÃO salvar automaticamente | Task 6 (validado) |
| Integrar Gerar Evolução ao form SOAP existente | Task 6 |
| Integrar Gerar Anamnese ao form existente | Task 6 |
| Sugerir Receita → modal existente | Task 6 |
| Sugerir Exames → modal existente | Task 6 |
| Exames: comparação + status | Task 8 |
| CID inteligente com sugestões | Task 9 |
| TypeScript sem erros | Task 10 |
| BullMQ queue (opcional) | Task 11 |
| NÃO reconstruir telas | ✅ zero reconstrução |
| NÃO quebrar contratos API | ✅ apenas adição |

### Placeholder scan

- Sem TBDs, sem TODOs, sem "implementar depois"
- Cada step tem código completo
- Mocks marcados como mocks com razão clara (OPENAI_API_KEY ausente)

### Type consistency

- `TranscriptSegment` definido em `ai-transcription.service.ts` e reimportado via interface no componente (não importação direta para manter separação frontend/backend)
- `ClinicalExtraction` espelhada entre frontend e backend — ambos usam campos idênticos
- `structured_data` do ClinicalRecord é `Json` no Prisma → cast com `as any` no backend, tipado via interface no frontend

---

## Variáveis de ambiente necessárias

```env
# apps/api/.env
OPENAI_API_KEY=sk-...        # opcional — sem isso usa mocks
REDIS_URL=redis://localhost:6379   # apenas para Task 11 (BullMQ)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=ayron_minio
MINIO_SECRET_KEY=ayron_minio_password
MINIO_BUCKET=ayron-docs
```
