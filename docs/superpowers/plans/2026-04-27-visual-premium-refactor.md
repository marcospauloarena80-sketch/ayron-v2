# Visual Premium Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir visualmente o sistema AYRON para aparência premium com glassmorphism refinado, profundidade, microinterações e consistência global — sem alterar lógica, estrutura ou funcionalidades.

**Architecture:** Abordagem A — cascade via componentes base. Alterar 7 arquivos (`globals.css` + 4 UI components + 2 layout components). Todas as 15+ páginas herdam automaticamente. Zero toque em páginas individuais.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v3, CSS Custom Properties, `backdrop-filter`, Framer Motion (já instalado).

**Spec:** `docs/superpowers/specs/2026-04-27-visual-premium-refactor-design.md`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `apps/web/src/app/globals.css` | Modify | Tokens globais, background, classes glass, fallback, focus-visible, z-index |
| `apps/web/src/components/ui/card.tsx` | Modify | Surface glass, shadow layers, hover lift |
| `apps/web/src/components/ui/button.tsx` | Modify | Gradiente primary, glass secondary, glow hover |
| `apps/web/src/components/ui/input.tsx` | Modify | Glass bg, focus glow laranja |
| `apps/web/src/components/ui/badge.tsx` | Modify | Bordas refinadas, sem backdrop-blur |
| `apps/web/src/components/layout/sidebar.tsx` | Modify | Floating glass, active glow laranja, z-20 |
| `apps/web/src/components/layout/topbar.tsx` | Modify | Glass header, dropdown glass, modais glass, z-30/z-60 |

---

## Task 1: globals.css — Tokens, Background e Classes Glass

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Verificar estado atual do arquivo**

```bash
cat apps/web/src/app/globals.css
```
Confirmar que só existe `@tailwind base/components/utilities` + `:root` com tokens existentes.

- [ ] **Step 2: Substituir conteúdo do globals.css**

Substituir o conteúdo completo por:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Tokens existentes — mantidos */
    --background: 0 0% 100%;
    --foreground: 210 20% 15%;
    --primary: 24 100% 50%;        /* #FF6B00 — laranja AYRON */
    --primary-foreground: 0 0% 100%;
    --secondary: 210 29% 19%;      /* #1B3A4B — azul petróleo */
    --secondary-foreground: 0 0% 100%;
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;
    --border: 220 13% 91%;
    --ring: 24 100% 50%;
    --radius: 0.5rem;

    /* Glass surfaces */
    --glass-bg: rgba(255, 255, 255, 0.72);
    --glass-bg-strong: rgba(255, 255, 255, 0.85);
    --glass-border: rgba(255, 255, 255, 0.40);

    /* Sombras padronizadas */
    --shadow-soft: 0 8px 24px rgba(0, 0, 0, 0.06);
    --shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.10);
    --glass-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
    --glass-shadow-hover: 0 8px 32px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.06);

    /* Gradiente e glow primário */
    --primary-gradient: linear-gradient(135deg, #FF6A00 0%, #FF3B00 100%);
    --primary-glow: 0 0 16px rgba(255, 106, 0, 0.25);

    /* Tipografia com contraste garantido */
    --text-primary: rgba(15, 23, 42, 0.90);
    --text-secondary: rgba(15, 23, 42, 0.60);

    /* Raios e transições */
    --radius-card: 16px;
    --radius-btn: 10px;
    --transition-fast: 150ms ease;
    --transition-base: 220ms ease;
  }
}

@layer base {
  * { @apply border-border; }

  body {
    @apply text-foreground antialiased;
    background: linear-gradient(135deg, #F7F9FB 0%, #EEF2F7 100%);
    background-attachment: fixed;
    min-height: 100vh;
    color: var(--text-primary);
  }

  /* Focus visible global — acessibilidade */
  :focus-visible {
    outline: 2px solid #FF6A00;
    outline-offset: 2px;
  }

  /* Reset outline para elementos com ring Tailwind customizado */
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible,
  button:focus-visible {
    outline: none;
  }
}

/* ── Classes Glass Utilitárias ──────────────────────────────────────────── */

@layer components {
  .glass {
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    border-radius: var(--radius-card);
  }

  .glass-strong {
    background: var(--glass-bg-strong);
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }

  .glass-card {
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    border-radius: var(--radius-card);
    transition: box-shadow var(--transition-base), transform var(--transition-base);
  }

  .glass-card:hover {
    box-shadow: var(--glass-shadow-hover);
    transform: translateY(-1px);
  }

  .glass-modal {
    background: var(--glass-bg-strong);
    -webkit-backdrop-filter: blur(24px);
    backdrop-filter: blur(24px);
    border: 1px solid var(--glass-border);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08);
  }
}

/* ── Fallback: ambientes sem backdrop-filter ────────────────────────────── */

@supports not (backdrop-filter: blur(1px)) {
  .glass,
  .glass-strong,
  .glass-card,
  .glass-modal {
    background: rgba(255, 255, 255, 0.95);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
```

- [ ] **Step 3: Verificar visualmente no browser**

Abrir `http://localhost:3000/dashboard`.  
Confirmar: fundo com gradiente suave (azul-acinzentado muito claro), não mais branco chapado.  
Se branco puro ainda aparecer, verificar se `background-attachment: fixed` está sendo sobrescrito por `bg-background` em algum wrapper.

- [ ] **Step 4: Verificar que tokens existentes não quebraram**

No browser, checar sidebar (cor primária laranja ativa) e topbar — devem estar iguais funcionalmente ao estado anterior.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "style: add glass design tokens, gradient background, focus-visible, and @supports fallback"
```

---

## Task 2: card.tsx — Glass Surface + Hover Lift

**Files:**
- Modify: `apps/web/src/components/ui/card.tsx`

- [ ] **Step 1: Verificar estado atual**

```bash
cat apps/web/src/components/ui/card.tsx
```
Confirmar classes: `rounded-xl border border-border bg-white p-6 shadow-sm`.

- [ ] **Step 2: Aplicar glass no Card**

Substituir o conteúdo completo:

```tsx
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[16px] border border-white/40 p-6',
        'bg-white/72 backdrop-blur-[16px]',
        '[box-shadow:var(--glass-shadow)]',
        'transition-all duration-[220ms] ease',
        'hover:[box-shadow:var(--glass-shadow-hover)] hover:-translate-y-px',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('mb-4 flex items-center justify-between', className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardProps) {
  return (
    <h3
      className={cn('text-sm font-semibold uppercase tracking-wide', className)}
      style={{ color: 'var(--text-secondary)' }}
      {...props}
    />
  );
}

export function CardValue({ className, ...props }: CardProps) {
  return (
    <p
      className={cn('text-3xl font-bold', className)}
      style={{ color: 'var(--text-primary)' }}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Verificar no browser**

Abrir `http://localhost:3000/dashboard`.  
Confirmar: cards com superfície glass sutil, hover com leve elevação.  
Cards devem parecer "flutuando" sobre o gradiente de fundo.  
Texto deve estar legível (dark over light surface).

- [ ] **Step 4: Confirmar que className override funciona**

Cards em páginas que passam `className` extra (ex: dashboard usa `Card` com classes adicionais) devem manter as classes extras. Checar dashboard — KPI cards devem preservar layout.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/card.tsx
git commit -m "style: apply glass surface and hover lift to Card component"
```

---

## Task 3: button.tsx — Gradiente Primary + Glass Secondary + Glow

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`

- [ ] **Step 1: Verificar estado atual**

```bash
cat apps/web/src/components/ui/button.tsx
```
Confirmar variants: `primary: 'bg-primary text-white hover:bg-primary/90'`.

- [ ] **Step 2: Aplicar premium em todos os variants**

Substituir conteúdo completo:

```tsx
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: [
    'text-white font-semibold',
    '[background:var(--primary-gradient)]',
    'hover:[box-shadow:var(--primary-glow)] hover:-translate-y-px',
    'active:translate-y-0 active:opacity-90',
    'focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1',
  ].join(' '),

  secondary: [
    'bg-white/70 backdrop-blur-sm',
    'border border-secondary/25 text-secondary',
    'hover:bg-white/90 hover:[box-shadow:var(--shadow-soft)] hover:-translate-y-px',
    'focus-visible:ring-2 focus-visible:ring-secondary/30 focus-visible:ring-offset-1',
  ].join(' '),

  ghost: [
    'bg-transparent text-foreground',
    'hover:bg-white/60 hover:backdrop-blur-sm',
    'focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-1',
  ].join(' '),

  danger: [
    'bg-red-500 text-white',
    'hover:bg-red-600 hover:[box-shadow:0_0_12px_rgba(239,68,68,0.30)] hover:-translate-y-px',
    'focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-1',
  ].join(' '),
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
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
}
```

- [ ] **Step 3: Verificar no browser**

Abrir `http://localhost:3000/dashboard` e qualquer página com botões primários.  
Confirmar: botão primário com gradiente laranja→vermelho, hover com glow suave + leve lift.  
Botão secondary: glass neutro com borda azul-petróleo sutil.  
Hover em danger: glow vermelho discreto.

- [ ] **Step 4: Verificar disabled e loading**

Testar página com `loading={true}` ou `disabled={true}` — opacidade 50%, sem pointer-events.  
`animate-spin` no Loader2 mantido.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/button.tsx
git commit -m "style: premium gradient primary button, glass secondary, glow hover states"
```

---

## Task 4: input.tsx — Glass Background + Focus Glow

**Files:**
- Modify: `apps/web/src/components/ui/input.tsx`

- [ ] **Step 1: Verificar estado atual**

```bash
cat apps/web/src/components/ui/input.tsx
```

- [ ] **Step 2: Aplicar glass no Input**

Substituir conteúdo completo:

```tsx
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full rounded-[10px] px-3 py-2.5 text-sm outline-none',
          'bg-white/60 backdrop-blur-sm',
          'border border-white/50',
          'placeholder:text-muted-foreground/60',
          'transition-all duration-[150ms] ease',
          'focus:ring-[3px] focus:ring-primary/25 focus:border-primary/50 focus:bg-white/80',
          error
            ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
            : '',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Verificar no browser**

Abrir qualquer página com formulários (ex: `/settings`, `/patients`).  
Confirmar: input com fundo glass sutil, placeholder mais suave.  
Focus: ring laranja discreto, fundo levemente mais opaco.  
Error state: borda vermelha mantida.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/input.tsx
git commit -m "style: glass background and orange focus glow on Input"
```

---

## Task 5: badge.tsx — Bordas Refinadas (sem backdrop-blur)

**Files:**
- Modify: `apps/web/src/components/ui/badge.tsx`

- [ ] **Step 1: Verificar estado atual**

```bash
cat apps/web/src/components/ui/badge.tsx
```

- [ ] **Step 2: Aplicar bordas refinadas**

Substituir conteúdo completo:

```tsx
import { cn } from '@/lib/utils';

/* NOTA: Sem backdrop-blur — badges renderizam N vezes em listas/tabelas.
   Usar apenas bg-opacity + border para manter performance. */

const variants: Record<string, string> = {
  default:  'bg-muted/80 text-foreground border border-border/60',
  primary:  'bg-primary/15 text-primary border border-primary/25',
  success:  'bg-green-50/80 text-green-700 border border-green-200/70',
  warning:  'bg-amber-50/80 text-amber-700 border border-amber-200/70',
  danger:   'bg-red-50/80 text-red-700 border border-red-200/70',
  info:     'bg-blue-50/80 text-blue-700 border border-blue-200/70',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 3: Verificar no browser**

Abrir `/patients` e `/alerts` (telas com muitos badges).  
Confirmar: badges com bordas suaves, sem performance issue.  
Todas as variantes de cor visíveis e legíveis.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/badge.tsx
git commit -m "style: refined badge variants with borders, no backdrop-blur for performance"
```

---

## Task 6: sidebar.tsx — Floating Glass + Active Glow + Z-index

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Verificar estado atual da sidebar**

```bash
grep -n "className\|bg-white\|border-r\|bg-primary\|hover:bg" apps/web/src/components/layout/sidebar.tsx | head -30
```

- [ ] **Step 2: Aplicar glass no container aside**

Localizar linha:
```tsx
'flex h-screen flex-col border-r border-border bg-white transition-all duration-200',
```
Substituir por:
```tsx
'flex h-screen flex-col border-r border-white/30 transition-all duration-200 z-20',
'[background:var(--glass-bg-strong)] [backdrop-filter:blur(20px)] [-webkit-backdrop-filter:blur(20px)]',
'[box-shadow:2px_0_16px_rgba(0,0,0,0.06)]',
```

- [ ] **Step 3: Aplicar glass no header logo**

Localizar linha:
```tsx
<div className={cn('flex h-16 items-center border-b', collapsed ? 'justify-center px-0' : 'gap-2 px-6')}>
```
Substituir `border-b` por `border-b border-white/30`.

Localizar o ícone Brain:
```tsx
<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
```
Substituir por:
```tsx
<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0 [box-shadow:0_2px_8px_rgba(255,106,0,0.35)]">
```

- [ ] **Step 4: Aplicar glass nos nav items — estado padrão (hover)**

Localizar:
```tsx
active
  ? 'bg-primary/10 text-primary'
  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
```
Substituir por:
```tsx
active
  ? [
      'text-primary font-medium',
      'bg-gradient-to-r from-primary/20 to-primary/5',
      '[box-shadow:inset_0_0_0_1px_rgba(255,106,0,0.20),0_2px_8px_rgba(255,106,0,0.15)]',
    ].join(' ')
  : [
      'text-muted-foreground',
      'hover:bg-white/60 hover:text-foreground',
      'hover:[box-shadow:var(--shadow-soft)]',
    ].join(' '),
```

E na linha do `whileHover`:
```tsx
whileHover={{ x: collapsed ? 0 : 2 }}
```
Mantido como está.

- [ ] **Step 5: Aplicar glass no bottom section**

Localizar:
```tsx
<div className="border-t p-3 space-y-1">
```
Substituir `border-t` por `border-t border-white/30`.

Localizar logout button hover:
```tsx
'w-full flex items-center rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors',
```
Substituir `hover:bg-red-50` por `hover:bg-red-50/70`.

- [ ] **Step 6: Verificar no browser**

Abrir `http://localhost:3000/dashboard`.  
Confirmar: sidebar com superfície glass sobre gradiente, não mais bloco branco sólido.  
Item ativo: gradiente laranja sutil + glow.  
Hover: background branco/60 sem blur (performance).  
Ícone Brain: leve glow laranja.

- [ ] **Step 7: Verificar sidebar collapsed**

Clicar "Minimizar". Sidebar estreita deve manter glass e badges de contagem.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "style: floating glass sidebar with active gradient glow and z-20 layer"
```

---

## Task 7: topbar.tsx — Glass Header + Dropdown Glass + Modais Glass + Z-index

**Files:**
- Modify: `apps/web/src/components/layout/topbar.tsx`

- [ ] **Step 1: Aplicar glass na barra principal**

Localizar:
```tsx
<div className="flex h-14 items-center justify-between border-b border-border bg-white px-6">
```
Substituir por:
```tsx
<div className="flex h-14 items-center justify-between border-b border-white/30 px-6 z-30 [background:var(--glass-bg-strong)] [backdrop-filter:blur(16px)] [-webkit-backdrop-filter:blur(16px)] [box-shadow:0_1px_8px_rgba(0,0,0,0.05)]">
```

- [ ] **Step 2: Aplicar glass no botão de busca**

Localizar:
```tsx
className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
```
Substituir por:
```tsx
className="flex items-center gap-2 rounded-lg border border-white/40 bg-white/50 backdrop-blur-sm px-3 py-1.5 text-xs text-muted-foreground hover:bg-white/70 transition-all duration-[150ms]"
```

- [ ] **Step 3: Aplicar glass no botão bell**

Localizar:
```tsx
className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors relative"
```
Substituir `hover:bg-muted` por `hover:bg-white/60`.

- [ ] **Step 4: Aplicar glass no user dropdown trigger**

Localizar:
```tsx
className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors"
```
Substituir por:
```tsx
className="flex items-center gap-2 rounded-lg border border-white/40 bg-white/50 backdrop-blur-sm px-3 py-1.5 hover:bg-white/70 transition-all duration-[150ms]"
```

- [ ] **Step 5: Aplicar glass no dropdown menu**

Localizar:
```tsx
<div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-white shadow-xl">
```
Substituir por:
```tsx
<div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-white/40 [background:var(--glass-bg-strong)] [backdrop-filter:blur(20px)] [-webkit-backdrop-filter:blur(20px)] [box-shadow:var(--glass-shadow-hover)]">
```

Localizar todas as bordas internas do dropdown (`border-t border-border`) e substituir por `border-t border-white/20`.

- [ ] **Step 6: Aplicar glass no ProfileModal**

Localizar:
```tsx
<div className="w-full max-w-md rounded-2xl border bg-white shadow-2xl">
```
Substituir por:
```tsx
<div className="w-full max-w-md rounded-2xl border border-white/40 [background:var(--glass-bg-strong)] [backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)] [box-shadow:0_24px_64px_rgba(0,0,0,0.15)]">
```

Localizar `fixed inset-0 z-50 flex` no ProfileModal e substituir `z-50` por `z-[60]`.

Bordas internas: `border-b` e `border-t` → adicionar `/border-b border-white\/30/` e `/border-t border-white\/30/`.

- [ ] **Step 7: Aplicar glass no PermissionsModal**

Localizar:
```tsx
<div className="w-full max-w-lg rounded-2xl border bg-white shadow-2xl">
```
Substituir por:
```tsx
<div className="w-full max-w-lg rounded-2xl border border-white/40 [background:var(--glass-bg-strong)] [backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)] [box-shadow:0_24px_64px_rgba(0,0,0,0.15)]">
```

Localizar `fixed inset-0 z-50 flex` no PermissionsModal → `z-[60]`.

- [ ] **Step 8: Verificar a seção PasswordModal (se existir)**

```bash
grep -n "PasswordModal\|bg-white shadow-2xl\|z-50" apps/web/src/components/layout/topbar.tsx | head -20
```
Se houver modal de senha: aplicar mesmo padrão glass + `z-[60]`.

- [ ] **Step 9: Verificar no browser**

Abrir `http://localhost:3000/dashboard`.  
Confirmar:
- Topbar: glass sutil, não mais bloco branco sólido
- Clicar no avatar → dropdown com glass
- Clicar "Meu Perfil" → modal com glass
- Clicar "Permissões" → modal com glass
- Toast do Sonner visível acima dos modais (z-9999 já configurado pelo Sonner por padrão)

- [ ] **Step 10: Verificar z-index stack completo**

Abrir um modal → confirmar que ele aparece acima da sidebar e topbar.  
Disparar um toast (salvar perfil) → confirmar que aparece acima do modal.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/components/layout/topbar.tsx
git commit -m "style: glass topbar, dropdown, and modals with z-index layering (z-30/z-60)"
```

---

## Task 8: QA Visual + Verificação de Regressão

**Files:** Nenhum — só verificação.

- [ ] **Step 1: Percorrer todas as telas principais**

Acessar cada rota e confirmar glass cascade aplicado:

```
http://localhost:3000/dashboard
http://localhost:3000/patients
http://localhost:3000/agenda
http://localhost:3000/clinical
http://localhost:3000/financial
http://localhost:3000/sessions
http://localhost:3000/inventory
http://localhost:3000/messages
http://localhost:3000/marketing
http://localhost:3000/alerts
http://localhost:3000/inbox
http://localhost:3000/analytics
http://localhost:3000/qualidade
http://localhost:3000/ajuda
http://localhost:3000/ayron
http://localhost:3000/settings
```

Em cada tela verificar: gradiente de fundo visível, cards com glass, botões com gradiente, sidebar glass.

- [ ] **Step 2: Verificar contraste textual**

Em `/dashboard`: KPI values (números grandes) devem estar com `var(--text-primary)` — escuros, legíveis.  
Labels de cards (CardTitle) devem estar com `var(--text-secondary)` — levemente mais suaves mas legíveis.

- [ ] **Step 3: Verificar error states**

Em qualquer formulário, forçar erro (campo vazio ao submeter).  
Input com erro deve ter borda vermelha + ring vermelho — não laranja.

- [ ] **Step 4: Verificar disabled states**

Qualquer botão `disabled` deve ter `opacity-50` e sem pointer-events.

- [ ] **Step 5: Verificar sidebar collapsed**

Minimizar sidebar → ícones alinhados, badges de contagem visíveis no canto.  
Estado glass deve permanecer.

- [ ] **Step 6: Verificar @supports fallback**

Abrir DevTools → Rendering → desabilitar `backdrop-filter` via CSS override:
```css
/* No DevTools console: */
document.querySelectorAll('.glass, .glass-strong, .glass-card, .glass-modal').forEach(el => {
  el.style.backdropFilter = 'none';
  el.style.background = 'rgba(255,255,255,0.95)';
});
```
Confirmar: interface ainda legível, sem artefato visual.

- [ ] **Step 7: Verificar focus-visible**

Pressionar Tab em qualquer página.  
Confirmar: outline laranja 2px visível em botões, links e inputs.  
Confirmar: sem outline duplo (outline + ring).

- [ ] **Step 8: Verificar performance**

DevTools → Performance → gravar 3s de scroll em `/patients` (lista densa).  
Confirmar: sem jank, sem frames perdidos causados por `backdrop-filter`.  
(backdrop-blur está ausente em badges e nav items — só em 4 elementos por view)

- [ ] **Step 9: Commit final**

```bash
git add .
git commit -m "style: visual premium refactor complete — glass, gradients, microinteractions, z-index"
```

---

## Checklist Final de Não-Regressão

- [ ] Nenhuma estrutura HTML alterada
- [ ] Nenhuma lógica JavaScript modificada
- [ ] Nenhum componente criado ou removido
- [ ] `cn()` override funciona em todos os componentes
- [ ] Error states preservados (Input vermelho)
- [ ] Disabled states preservados (opacity-50)
- [ ] `animate-spin` no Loader2 preservado
- [ ] Badges de contagem na sidebar funcionando
- [ ] Modal z-index stack: sidebar(20) → topbar(30) → dropdown(50) → modal(60) → toast(9999)
- [ ] Fallback @supports funcionando
- [ ] Focus-visible acessível sem conflito
- [ ] Performance: backdrop-blur só em elementos estruturais (não em listas)
