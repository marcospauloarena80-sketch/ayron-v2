# Supabase Gaps — Financial Writes + Alert Persistence + RLS

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Supabase persistence for financial transactions writes, alert status mutations, and harden RLS from permissive-anon to require authenticated session.

**Architecture:** Three isolated tasks in priority order: (1) financial writes add `insertFinancialTransaction` to `queries.ts` and wire the controlled `LancamentoForm` in `financial/page.tsx`; (2) alert persistence adds `updateAlertStatus`/`insertAlert` to `queries.ts` and replaces local-only `handleUpdate` / `handleSaveAlerta` with `useMutation`; (3) RLS hardens by adding a new SQL migration that drops the `anon_all_*` policies and creates `authenticated`-only policies using `auth.uid() IS NOT NULL`.

**Tech Stack:** Next.js 15 App Router, `@supabase/ssr` browser client, `@tanstack/react-query` v5, TypeScript, SQL (Supabase)

---

## File Map

| File | Action |
|------|--------|
| `apps/web/src/lib/supabase/queries.ts` | Add: `insertFinancialTransaction`, `updateAlertStatus`, `insertAlert` |
| `apps/web/src/app/(dashboard)/financial/page.tsx` | Modify: make `LancamentoForm` controlled, add `insertMutation`, wire save buttons |
| `apps/web/src/app/(dashboard)/alerts/page.tsx` | Modify: add `useMutation` + `useQueryClient`, replace `handleUpdate`/`handleSaveAlerta` |
| `supabase/migrations/20260502000001_rls_auth.sql` | Create: drop anon policies, add authenticated-only policies |

---

## Task 1: Financial transaction writes

**Files:**
- Modify: `apps/web/src/lib/supabase/queries.ts` (append after `fetchFinancialTransactions`)
- Modify: `apps/web/src/app/(dashboard)/financial/page.tsx` (lines ~866–1055, `LancamentosTab` + `LancamentoForm`)

- [ ] **Step 1: Add `insertFinancialTransaction` to queries.ts**

Append after the existing `fetchFinancialTransactions` function (around line 133):

```typescript
export async function insertFinancialTransaction(data: {
  descricao: string;
  valor: number;
  tipo: 'RECEBER' | 'PAGAR';
  vencimento: string;
  pago_em?: string;
  classificacao?: string;
  conta?: string;
  filial?: string;
  forma_pagamento?: string;
  patient_id?: string;
}): Promise<any> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('financial_transactions')
    .insert({
      ...data,
      status: data.pago_em ? 'PAGO' : 'ABERTO',
      pago: data.pago_em ? data.valor : 0,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...row, saldo: Number(row.valor) - Number(row.pago ?? 0), controle: row.id.slice(0, 8).toUpperCase() };
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web
npx tsc --noEmit 2>&1 | grep "queries.ts"
```

Expected: no output (no errors).

- [ ] **Step 3: Make `LancamentoForm` controlled with local state**

In `financial/page.tsx`, `LancamentoForm` is currently a pure JSX block with no state (all inputs are uncontrolled). Replace it with a controlled version that lifts state up through a callback.

Find the `LancamentosTab` component (~line 866). Add a form state type at the top of the function body (before the existing `const [tipoFilter...]`):

```typescript
const [formData, setFormData] = useState<{
  descricao: string; valor: string; vencimento: string;
  pago_em: string; classificacao: string; conta: string;
  filial: string; forma_pagamento: string;
}>({
  descricao: '', valor: '', vencimento: '', pago_em: '',
  classificacao: 'Receita Clínica', conta: 'Caixa Principal',
  filial: 'Principal', forma_pagamento: 'PIX',
});
const resetForm = () => setFormData({
  descricao: '', valor: '', vencimento: '', pago_em: '',
  classificacao: 'Receita Clínica', conta: 'Caixa Principal',
  filial: 'Principal', forma_pagamento: 'PIX',
});
```

- [ ] **Step 4: Add `insertMutation` using `useMutation` in `LancamentosTab`**

`useMutation` and `useQueryClient` are already imported in `financial/page.tsx`. Add the mutation inside `LancamentosTab` body (after the `useQuery`):

```typescript
const queryClient = useQueryClient();
const [currentTipo, setCurrentTipo] = useState<'RECEBER' | 'PAGAR'>('RECEBER');

const insertMutation = useMutation({
  mutationFn: (tipo: 'RECEBER' | 'PAGAR') =>
    insertFinancialTransaction({
      descricao: formData.descricao,
      valor: parseFloat(formData.valor || '0'),
      tipo,
      vencimento: formData.vencimento,
      pago_em: formData.pago_em || undefined,
      classificacao: formData.classificacao || undefined,
      conta: formData.conta || undefined,
      filial: formData.filial || undefined,
      forma_pagamento: formData.forma_pagamento || undefined,
    }),
  onSuccess: () => {
    toast.success(currentTipo === 'RECEBER' ? 'Receita lançada ✓' : 'Despesa lançada ✓');
    queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
    resetForm();
    setShowNovaReceita(false);
    setShowNovaDespesa(false);
  },
  onError: (e: any) => toast.error(`Erro ao salvar: ${e.message}`),
});
```

Add the import at the top of the file if not present (it already is: `import { insertFinancialTransaction } from '@/lib/supabase/queries'` — add this to the existing queries import).

- [ ] **Step 5: Update `LancamentoForm` to be controlled**

Replace the `LancamentoForm` inner component definition (~line 899) with:

```typescript
const LancamentoForm = ({ tipo, onClose }: { tipo: 'RECEITA' | 'DESPESA'; onClose: () => void }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <Select label="Unidade/Filial" value={formData.filial} onChange={(e: any) => setFormData(p => ({ ...p, filial: e.target.value }))}>
        <option>Principal</option><option>Filial 2</option>
      </Select>
      <Select label="Conta Corrente" value={formData.conta} onChange={(e: any) => setFormData(p => ({ ...p, conta: e.target.value }))}>
        <option>Caixa Principal</option><option>Conta Corrente</option><option>Poupança</option>
      </Select>
    </div>
    <Input label="Descrição *" placeholder={tipo === 'RECEITA' ? 'Descrição da receita...' : 'Descrição da despesa...'} value={formData.descricao} onChange={(e: any) => setFormData(p => ({ ...p, descricao: e.target.value }))} />
    <div className="grid grid-cols-2 gap-3">
      <Select label="Classificação" value={formData.classificacao} onChange={(e: any) => setFormData(p => ({ ...p, classificacao: e.target.value }))}>
        <option>Receita Clínica</option><option>Despesa Fixa</option>
        <option>Insumos</option><option>Marketing</option><option>Impostos</option><option>Outro</option>
      </Select>
      <Input label="Valor (R$) *" type="number" placeholder="0,00" value={formData.valor} onChange={(e: any) => setFormData(p => ({ ...p, valor: e.target.value }))} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Input label="Vencimento *" type="date" value={formData.vencimento} onChange={(e: any) => setFormData(p => ({ ...p, vencimento: e.target.value }))} />
      <Input label="Quitação" type="date" value={formData.pago_em} onChange={(e: any) => setFormData(p => ({ ...p, pago_em: e.target.value }))} />
    </div>
    <Select label="Forma de Pagamento" value={formData.forma_pagamento} onChange={(e: any) => setFormData(p => ({ ...p, forma_pagamento: e.target.value }))}>
      <option>PIX</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option><option>Boleto</option>
    </Select>
    <p className="text-xs text-muted-foreground">Edição por: usuário atual</p>
  </div>
);
```

- [ ] **Step 6: Wire "Salvar" buttons in the dialogs**

In the Nova Receita dialog footer (~line 1044), replace:
```typescript
<Button onClick={() => { toast.success('Receita lançada'); setShowNovaReceita(false); }}>Salvar Receita</Button>
```
With:
```typescript
<Button
  disabled={insertMutation.isPending || !formData.descricao || !formData.valor || !formData.vencimento}
  onClick={() => { setCurrentTipo('RECEBER'); insertMutation.mutate('RECEBER'); }}
>
  {insertMutation.isPending ? 'Salvando...' : 'Salvar Receita'}
</Button>
```

In the Nova Despesa dialog footer (~line 1053), replace:
```typescript
<Button onClick={() => { toast.success('Despesa lançada'); setShowNovaDespesa(false); }}>Salvar Despesa</Button>
```
With:
```typescript
<Button
  disabled={insertMutation.isPending || !formData.descricao || !formData.valor || !formData.vencimento}
  onClick={() => { setCurrentTipo('PAGAR'); insertMutation.mutate('PAGAR'); }}
>
  {insertMutation.isPending ? 'Salvando...' : 'Salvar Despesa'}
</Button>
```

Also add `insertFinancialTransaction` to the existing queries import at the top of the file.

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web
npx tsc --noEmit 2>&1 | grep "financial"
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/lib/supabase/queries.ts apps/web/src/app/\(dashboard\)/financial/page.tsx
git commit -m "feat: financial transaction writes via Supabase (receita/despesa)"
```

---

## Task 2: Alert status persistence

**Files:**
- Modify: `apps/web/src/lib/supabase/queries.ts` (append two functions)
- Modify: `apps/web/src/app/(dashboard)/alerts/page.tsx` (add imports, mutations, replace `handleUpdate`/`handleSaveAlerta`)

- [ ] **Step 1: Add `updateAlertStatus` and `insertAlert` to queries.ts**

Append after `fetchAlerts` function (~line 533):

```typescript
export async function updateAlertStatus(id: string, status: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('alerts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function insertAlert(data: {
  title: string;
  description?: string;
  type: string;
  severity: string;
  patient_id?: string;
  due_date?: string;
}): Promise<any> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from('alerts')
    .insert({ ...data, status: 'OPEN' })
    .select('*, patients(id, full_name)')
    .single();
  if (error) throw error;
  return {
    id: row.id,
    title: row.title,
    message: row.description ?? '',
    severity: row.severity,
    status: row.status,
    category: (row.type ?? 'CLINICO').toLowerCase(),
    rationale: [],
    suggested_actions: suggestedActionsForType(row.type),
    patient: row.patients ? { id: row.patients.id, full_name: row.patients.full_name } : undefined,
    created_at: row.created_at,
  };
}
```

- [ ] **Step 2: Verify no TypeScript errors in queries.ts**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web
npx tsc --noEmit 2>&1 | grep "queries.ts"
```

Expected: no output.

- [ ] **Step 3: Add `useMutation` and `useQueryClient` imports to alerts/page.tsx**

In `alerts/page.tsx` line 3, change:
```typescript
import { useQuery } from '@tanstack/react-query';
```
To:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

Also add to the queries import:
```typescript
import { fetchAlerts, updateAlertStatus, insertAlert } from '@/lib/supabase/queries';
```

- [ ] **Step 4: Replace `handleUpdate` and `handleSaveAlerta` with mutations in `AlertsPage`**

In the `AlertsPage` function body (~line 374), after the `useQuery`, add:

```typescript
const queryClient = useQueryClient();

const statusMutation = useMutation({
  mutationFn: ({ id, status }: { id: string; status: string }) => updateAlertStatus(id, status),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  onError: (e: any) => toast.error(`Erro: ${e.message}`),
});

const newAlertMutation = useMutation({
  mutationFn: (data: Parameters<typeof insertAlert>[0]) => insertAlert(data),
  onSuccess: (newAlert) => {
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
    toast.success('Alerta criado');
    setShowNovoAlerta(false);
  },
  onError: (e: any) => toast.error(`Erro ao criar alerta: ${e.message}`),
});
```

Replace the existing `handleUpdate` function:
```typescript
// OLD:
const handleUpdate = (id: string, changes: Partial<AlertItem>) => {
  setLocalAlerts(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
};

// NEW:
const handleUpdate = (id: string, changes: Partial<AlertItem>) => {
  // Optimistic update
  setLocalAlerts(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
  // Persist if status change
  if (changes.status) {
    statusMutation.mutate({ id, status: changes.status });
  }
};
```

Replace `handleSaveAlerta` function:
```typescript
// OLD:
const handleSaveAlerta = (a: AlertItem) => {
  setLocalAlerts(prev => [a, ...prev]);
};

// NEW:
const handleSaveAlerta = (a: AlertItem) => {
  newAlertMutation.mutate({
    title: a.title,
    description: a.message,
    type: (a.category ?? 'CLINICO').toUpperCase(),
    severity: a.severity,
    patient_id: a.patient?.id,
  });
};
```

- [ ] **Step 5: TypeScript check**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web
npx tsc --noEmit 2>&1 | grep "alerts"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add apps/web/src/lib/supabase/queries.ts apps/web/src/app/\(dashboard\)/alerts/page.tsx
git commit -m "feat: alert status/create mutations persisted via Supabase"
```

---

## Task 3: RLS hardening — require authenticated session

**Files:**
- Create: `supabase/migrations/20260502000001_rls_auth.sql`

**Context:** Current policies use `USING (true)` allowing both `anon` and `authenticated` roles full access. Goal: require a valid Supabase session (`auth.uid() IS NOT NULL`). The app already uses `signInWithPassword` so authenticated users will have a JWT. The browser client (`createBrowserClient`) automatically sends the session token — this change only blocks unauthenticated (anon) requests.

> ⚠️ **IMPORTANT:** After applying this migration, test that login works and dashboard loads. If any query silently fails, the session cookie may not be forwarded — check that `.env.local` has both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260502000001_rls_auth.sql`:

```sql
-- ══════════════════════════════════════════════════════════════════════════════
-- RLS hardening: replace permissive anon policies with auth-required policies
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'professionals','patients','appointments','patient_medical_history',
    'patient_evolutions','patient_prescriptions','prescription_items',
    'patient_exams','treatment_protocols','alerts','financial_transactions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- Drop permissive anon policy
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%s" ON %I', tbl, tbl);

    -- Read: any authenticated user
    EXECUTE format('
      CREATE POLICY "auth_read_%s" ON %I
      FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
    ', tbl, tbl);

    -- Write: any authenticated user
    EXECUTE format('
      CREATE POLICY "auth_write_%s" ON %I
      FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
    ', tbl, tbl);

    EXECUTE format('
      CREATE POLICY "auth_update_%s" ON %I
      FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    ', tbl, tbl);

    EXECUTE format('
      CREATE POLICY "auth_delete_%s" ON %I
      FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
    ', tbl, tbl);
  END LOOP;
END $$;
```

- [ ] **Step 2: Apply migration to Supabase**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
npx supabase db push 2>&1
```

If `supabase` CLI not available, apply via Supabase Dashboard SQL editor (Project → SQL Editor → paste file content → Run).

Expected output: migration applied without errors.

- [ ] **Step 3: Verify login still works after RLS change**

Open https://web-self-ten-76.vercel.app (or run local `npm run dev`), log in with `admin@ayron.health` / `Ayron@Admin2025!`, navigate to Pacientes and Agenda.

If data loads: RLS working correctly — session token forwarded.

If data returns empty/403: the session token is not being sent. Check `createClient` in `apps/web/src/lib/supabase/client.ts` — must use `createBrowserClient` from `@supabase/ssr` (not `createClient` from `@supabase/supabase-js`).

- [ ] **Step 4: Commit**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron
git add supabase/migrations/20260502000001_rls_auth.sql
git commit -m "security: harden RLS to require authenticated session (auth.uid() IS NOT NULL)"
```

---

## Task 4: Deploy to Vercel production

**Files:** None — deploy only

- [ ] **Step 1: Deploy**

```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web
vercel deploy --prod 2>&1 | tail -5
```

Expected: deployment URL ending in `vercel.app`.

- [ ] **Step 2: Smoke test production**

1. Open production URL
2. Log in: `admin@ayron.health` / `Ayron@Admin2025!`
3. Navigate to Financeiro → Lançamentos → click "Nova Receita", fill fields, save
4. Verify new row appears in table
5. Navigate to Alertas → click Reconhecer on an alert, refresh page — verify status persisted

- [ ] **Step 3: Commit (if any last-minute fixes)**

```bash
git add -p
git commit -m "fix: post-deploy adjustments"
```

---

## Self-Review

**Spec coverage:**
- ✅ Financial writes: `insertFinancialTransaction` + controlled form + wired buttons
- ✅ Alert persistence: `updateAlertStatus` + `insertAlert` + mutations replace local-only state
- ✅ RLS hardening: migration drops anon policies, adds authenticated-only policies
- ✅ Deploy: production deployment + smoke test

**No placeholders:** All code blocks complete, no TBD.

**Type consistency:**
- `insertFinancialTransaction` returns `any` (matches query return type)
- `updateAlertStatus(id: string, status: string)` matches `changes.status` usage (string)
- `insertAlert` parameters match `AlertItem` fields used in `handleSaveAlerta`
- `suggestedActionsForType` already exported from `queries.ts`
