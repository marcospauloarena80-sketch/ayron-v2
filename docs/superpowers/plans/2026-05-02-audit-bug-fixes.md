# AYRON Audit Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical and medium-priority bugs identified in the 28/04/2026 audit report, without requiring a live backend.

**Architecture:** Purely frontend fixes — localStorage isolation per patient, Button component default type safety, hydration SSR/client mismatch, and UX labeling cleanup. No backend required for these fixes. FC-01 (backend URL) is documented as an env-var instruction for Vercel.

**Tech Stack:** Next.js 15 App Router, TypeScript, TailwindCSS v3, React Query (TanStack), Zustand, Sonner (toast), Framer Motion

---

## Scope

### In scope (code fixes)
| Bug ID | Description | File |
|--------|-------------|------|
| FC-02 | Prontuários show wrong patient data | `clinical/page.tsx` |
| FC-06 | React Error #418 hydration mismatch | `patients/[id]/page.tsx`, `clinical/page.tsx` |
| FC-05 | Check-in likely caused by accidental form submit | `button.tsx` |
| Fm-03 | All buttons default to `type="submit"` | `button.tsx` |
| Fm-01 | "bypass" label exposed in production UI | `new-patient-modal.tsx` |

### Out of scope (needs backend/infra)
| Bug ID | Description | Action |
|--------|-------------|--------|
| FC-01 | `NEXT_PUBLIC_API_URL` → localhost in production | Set env var in Vercel (Task 5 documents this) |
| FC-03 | Forms fail silently | Already has `onError` toast; root cause is FC-01 |
| FC-04 | `/patients/[id]` returns "not found" | Root cause is FC-01 (API returns 503) |
| FM-01–FM-11 | All medium bugs except FM-03 | Root cause is FC-01 |

---

## Task 1: Fix Button default type (Fm-03 + likely FC-05)

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`

**Why critical:** HTML `<button>` without explicit `type` defaults to `type="submit"` inside any `<form>`. The entire system uses the `Button` component which doesn't set a type. This causes accidental form submissions on any button click inside a form — which is the likely cause of FC-05 (check-in redirect to /inventory, which is the next page in the Nav).

- [ ] **Step 1: Add `type="button"` default to Button component**

Open `apps/web/src/components/ui/button.tsx`. Replace lines 55–70:

```tsx
// BEFORE (line 55):
<button
  className={cn(

// AFTER:
<button
  type="button"
  className={cn(
```

Full updated component render:
```tsx
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2',
        'rounded-[10px] font-medium',
        'transition-all duration-[220ms] ease',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
```

> Note: The `type="button"` is overridden by any `type="submit"` passed via `...props`. All actual submit buttons in the codebase already pass `type="submit"` explicitly (e.g. `<Button type="submit" ...>` in `new-patient-modal.tsx:733` and `login/CinematicLogin.tsx`). This change is safe.

- [ ] **Step 2: Verify no submit button is broken**

```bash
grep -rn 'type="submit"' apps/web/src/ --include="*.tsx"
```

Expected: `new-patient-modal.tsx` and `CinematicLogin.tsx` should appear. These already pass `type="submit"` explicitly via props — they will not be affected.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/button.tsx
git commit -m "fix(ui): default Button type to button to prevent accidental form submits"
```

---

## Task 2: Fix hydration mismatch — patients/[id] page (FC-06)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/patients/[id]/page.tsx` (lines 4–19)

**Why:** The `useLocalStorage` hook reads `localStorage.getItem()` synchronously inside a `React.useState` lazy initializer. During SSR, `localStorage` is undefined → the `try/catch` returns `initial`. On the client, the lazy initializer runs again and reads actual localStorage data → different HTML → React hydration mismatch Error #418.

- [ ] **Step 1: Fix useLocalStorage hook**

Replace lines 4–19 in `apps/web/src/app/(dashboard)/patients/[id]/page.tsx`:

```tsx
// BEFORE:
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch { return initial; }
  });
  const set = (v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [value, set] as const;
}
```

```tsx
// AFTER:
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(initial);
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {}
  }, [key]);
  const set = (v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [value, set] as const;
}
```

**What changed:** `useState(initial)` always on first render (SSR + client match). `useEffect` hydrates from localStorage after mount (client only). No more SSR/client HTML mismatch.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/patients/\[id\]/page.tsx
git commit -m "fix(hydration): use useEffect for localStorage to prevent React Error #418"
```

---

## Task 3: Fix hydration mismatch — clinical/page.tsx evolucoes (FC-06)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/clinical/page.tsx` (lines 568–573)

**Why:** `ProntuarioDetail` component uses a lazy `useState` initializer that reads `localStorage` synchronously (line 570). Same SSR mismatch as Task 2.

- [ ] **Step 1: Fix evolucoes state initialization**

In `apps/web/src/app/(dashboard)/clinical/page.tsx`, the `ProntuarioDetail` function starts at line 561.

Replace lines 568–573:

```tsx
// BEFORE:
  const [evolucoes, setEvolucoes] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem(`ayron_evolucoes_${patient.id}`);
      return stored ? JSON.parse(stored) : MOCK_EVOLUCOES;
    } catch { return MOCK_EVOLUCOES; }
  });
```

```tsx
// AFTER:
  const [evolucoes, setEvolucoes] = useState<any[]>(MOCK_EVOLUCOES);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ayron_evolucoes_${patient.id}`);
      if (stored !== null) setEvolucoes(JSON.parse(stored));
    } catch {}
  }, [patient.id]);
```

> `useEffect` is already imported at the top of `clinical/page.tsx` (line 3).

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/clinical/page.tsx
git commit -m "fix(hydration): move evolucoes localStorage read to useEffect in ProntuarioDetail"
```

---

## Task 4: Fix wrong patient data in prontuário (FC-02)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/clinical/page.tsx`
  - Line 1359: add `key` prop to `ProntuarioDetail`
  - Lines 577–578: localStorage-based init for `receitas` and `exames`

**Why:** Three causes:
1. `<ProntuarioDetail patient={selected}>` has no `key` prop → React reuses the component instance when `selected` changes → all `useState` values (including `receitas`, `exames`, `anamneseData`) persist from the previous patient.
2. `receitas` (line 577) and `exames` (line 578) are initialized from static `MOCK_RECEITAS`/`MOCK_EXAMES` instead of patient-scoped localStorage.
3. Fix: `key={selected.id}` forces full remount on patient change (resets ALL state). Per-patient localStorage init ensures saved data is loaded correctly for each patient.

- [ ] **Step 1: Add key prop to ProntuarioDetail**

In `clinical/page.tsx` around line 1359, change:

```tsx
// BEFORE:
        <ProntuarioDetail patient={selected} onBack={() => setSelected(null)} />
```

```tsx
// AFTER:
        <ProntuarioDetail key={selected.id} patient={selected} onBack={() => setSelected(null)} />
```

- [ ] **Step 2: Fix receitas initialization (line 577)**

In the `ProntuarioDetail` function body, replace line 577:

```tsx
// BEFORE:
  const [receitas, setReceitas] = useState(MOCK_RECEITAS);
```

```tsx
// AFTER:
  const [receitas, setReceitas] = useState<any[]>(MOCK_RECEITAS);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ayron_receitas_${patient.id}`);
      if (stored !== null) setReceitas(JSON.parse(stored));
    } catch {}
  }, [patient.id]);
```

- [ ] **Step 3: Fix exames initialization (line 578)**

Replace line 578:

```tsx
// BEFORE:
  const [exames, setExames] = useState(MOCK_EXAMES);
```

```tsx
// AFTER:
  const [exames, setExames] = useState<any[]>(MOCK_EXAMES);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ayron_exames_${patient.id}`);
      if (stored !== null) setExames(JSON.parse(stored));
    } catch {}
  }, [patient.id]);
```

- [ ] **Step 4: Persist receitas saves to localStorage**

Search for `setReceitas(prev => ` or wherever receitas are saved after creating a new receita in `ProntuarioDetail`. Find the `onSave` handler for `NovaReceitaModal`. After updating `receitas`, persist to localStorage:

```tsx
// Current pattern (around line 890–920 area):
onSave={r => setReceitas(prev => [r, ...prev])}

// Replace with:
onSave={r => setReceitas(prev => {
  const updated = [r, ...prev];
  try { localStorage.setItem(`ayron_receitas_${patient.id}`, JSON.stringify(updated)); } catch {}
  return updated;
})}
```

- [ ] **Step 5: Persist exames saves to localStorage**

Find `onSave` for `SolicitarExameModal` (around line 1305). After updating `exames`, persist to localStorage:

```tsx
// Current pattern (around line 1305):
onSave={e => setExames(prev => [...e.exames.map(...), ...prev])}

// Replace with:
onSave={e => setExames(prev => {
  const updated = [...e.exames.map((name: string, i: number) => ({ id: `X${Date.now()}${i}`, name, data: new Date().toISOString().split('T')[0], lab: e.lab || 'A definir', urgencia: e.urgencia, status: 'SOLICITADO', resultado: 'Aguardando resultado' })), ...prev];
  try { localStorage.setItem(`ayron_exames_${patient.id}`, JSON.stringify(updated)); } catch {}
  return updated;
})}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/clinical/page.tsx
git commit -m "fix(clinical): isolate prontuario data per patient using key prop and localStorage"
```

---

## Task 5: Rename "bypass" button to professional label (Fm-01)

**Files:**
- Modify: `apps/web/src/components/patients/new-patient-modal.tsx` (line 726)

**Why:** The label "bypass" is development terminology that should never appear in a production clinical system. Rename to "Acesso Master".

- [ ] **Step 1: Change the label**

In `apps/web/src/components/patients/new-patient-modal.tsx`, replace line 726:

```tsx
// BEFORE:
                    <Lock className="h-3 w-3" /> bypass
```

```tsx
// AFTER:
                    <Lock className="h-3 w-3" /> Acesso Master
```

Also update the toast at line 260:

```tsx
// BEFORE:
      toast.success('Modo bypass ativado — campos obrigatórios liberados');
```

```tsx
// AFTER:
      toast.success('Modo Master ativado — campos obrigatórios liberados');
```

And the banner at line 390 (the yellow banner text):

Search for `Modo bypass ativo` and replace:

```tsx
// BEFORE:
          Modo bypass ativo — campos obrigatórios liberados. Paciente será salvo com dados incompletos.
```

```tsx
// AFTER:
          Modo Master ativo — campos obrigatórios liberados. Paciente será salvo com dados incompletos.
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/patients/new-patient-modal.tsx
git commit -m "fix(ux): rename bypass label to Acesso Master for production UI"
```

---

## Task 6: Document NEXT_PUBLIC_API_URL setup (FC-01)

**Files:**
- Create: `apps/web/.env.example`
- Modify: `apps/web/src/lib/api.ts` (improve error visibility)

**Why:** The entire backend is unreachable in production because `NEXT_PUBLIC_API_URL` is not set in Vercel. This single env var fixes FC-01, FC-03, FC-04, and all FM bugs.

- [ ] **Step 1: Create .env.example**

Create `apps/web/.env.example`:

```bash
# ── Backend API ───────────────────────────────────────────────────────────────
# REQUIRED: Set this in Vercel > Project Settings > Environment Variables
# Value must be the full base URL of the production backend (no trailing slash)
# Example (Railway): https://ayron-api-production.up.railway.app/api/v1
# Example (custom domain): https://api.ayron.com.br/api/v1
NEXT_PUBLIC_API_URL=https://your-backend-url/api/v1

# ── Auth ─────────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://your-vercel-app-url.vercel.app
```

- [ ] **Step 2: Add a console warning in api.ts when URL is missing**

In `apps/web/src/lib/api.ts`, modify the baseURL line:

```typescript
// BEFORE:
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
});
```

```typescript
// AFTER:
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    '[AYRON] NEXT_PUBLIC_API_URL is not set. API calls will fail in production. ' +
    'Set this variable in Vercel > Project Settings > Environment Variables.'
  );
}

const api = axios.create({
  baseURL: API_BASE,
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/.env.example apps/web/src/lib/api.ts
git commit -m "docs: add .env.example and warn when NEXT_PUBLIC_API_URL is missing"
```

---

## Verification

After all tasks are complete, manually verify the following in a browser (dev server: `npm run dev` in `apps/web`):

- [ ] **V1:** Click any non-submit Button inside a form — confirm no accidental navigation
- [ ] **V2:** Open Prontuários, select Ana Lima, then switch to Carlos Souza — confirm Carlos shows empty/different data, not Ana's evoluções
- [ ] **V3:** Open browser console — confirm no React Error #418 appears on page load or patient switch
- [ ] **V4:** Open New Patient modal, check footer — confirm "Acesso Master" label instead of "bypass"
- [ ] **V5:** Open browser console on any page — confirm `[AYRON] NEXT_PUBLIC_API_URL is not set` warning appears in local dev (where env var is absent)
- [ ] **V6:** Open Sessões, click Check-in on any protocol, click Confirmar — confirm stays on Sessions page, does not redirect to /inventory

---

## Deploy

After local verification:

1. Set `NEXT_PUBLIC_API_URL` in Vercel:
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `<production backend URL>`
   - Apply to: Production, Preview, Development
2. Push branch, open PR, deploy preview
3. Verify on preview URL that API calls reach backend (Network tab)
