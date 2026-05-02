# Premium Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 8 premium polish improvements to elevate AYRON UI to high-ticket level.

**Architecture:** CSS-first, non-destructive. All changes via globals.css global rules or targeted class replacements in existing components. Zero new files.

**Tech Stack:** Next.js 15, Tailwind CSS v3, CSS Custom Properties, framer-motion

---

### Task 1: Custom Scrollbar

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] Add webkit-scrollbar styles to globals.css `@layer base` block:

```css
/* Scrollbar premium */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgba(15, 23, 42, 0.18);
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover { background: rgba(15, 23, 42, 0.30); }
* { scrollbar-width: thin; scrollbar-color: rgba(15,23,42,0.18) transparent; }
```

- [ ] Commit: `git commit -m "style: add premium scrollbar"`

---

### Task 2: Avatar Color — violet → secondary

**Files:**
- Modify: `apps/web/src/components/layout/topbar.tsx`

- [ ] Replace all `bg-violet-600` → `bg-secondary` (lines 54, 83, 90, 98, 132)
- [ ] Replace `hover:bg-violet-700` → `hover:bg-secondary/90`
- [ ] Replace `border-violet-500 bg-violet-50 text-violet-700` → `border-primary/40 bg-primary/8 text-primary`
- [ ] Replace `focus:ring-violet-500` → `focus:ring-primary/30`
- [ ] Commit: `git commit -m "style: unify avatar color to secondary brand token"`

---

### Task 3: Typography — Stronger H1/Page Titles

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] Add heading styles to `@layer base`:

```css
/* Tipografia — títulos de página */
h1 {
  font-size: 1.5rem;      /* 24px */
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  line-height: 1.3;
}
h2 {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}
```

- [ ] Commit: `git commit -m "style: strengthen heading typography"`

---

### Task 4: Table Row Hover

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] Add table hover rule to `@layer components`:

```css
/* Table row hover premium */
tbody tr {
  transition: background-color 150ms ease;
}
tbody tr:hover {
  background-color: rgba(255, 255, 255, 0.70) !important;
}
```

- [ ] Commit: `git commit -m "style: add table row hover effect"`

---

### Task 5: Settings Sub-Sidebar Glass

**Files:**
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`

- [ ] Line 1775: replace `w-56 border-r border-border bg-white overflow-y-auto flex-shrink-0`
  with: `w-56 border-r border-white/30 [background:var(--glass-bg-strong)] [backdrop-filter:blur(16px)] [-webkit-backdrop-filter:blur(16px)] overflow-y-auto flex-shrink-0`
- [ ] Line 1800: replace `hover:bg-muted` → `hover:bg-white/60`
- [ ] Line 1813: remove `bg-muted/20` from content wrapper (→ just `flex-1 overflow-y-auto p-6`)
- [ ] Commit: `git commit -m "style: settings sub-sidebar glass treatment"`

---

### Task 6: FAB AYRON Glass + Glow

**Files:**
- Modify: `apps/web/src/components/ayron/ayron-widget.tsx`

- [ ] Line 92 FAB: replace `bg-primary shadow-lg shadow-primary/30`
  with: `[background:var(--primary-gradient)] [box-shadow:0_4px_20px_rgba(255,106,0,0.45),0_0_0_1px_rgba(255,255,255,0.20)]`
- [ ] Line 110 panel: replace `bg-white shadow-2xl`
  with: `[background:var(--glass-bg-strong)] [backdrop-filter:blur(20px)] [-webkit-backdrop-filter:blur(20px)] [box-shadow:0_24px_64px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.08)] border-white/40`
- [ ] Commit: `git commit -m "style: FAB AYRON glass morphism + glow"`

---

### Task 7: Settings Raw Inputs → Glass Style

**Files:**
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`

- [ ] Replace all `w-full border rounded-lg px-3 py-2 text-sm` (raw inputs without focus:ring-primary) with:
  `w-full bg-white/60 backdrop-blur-sm border border-white/50 rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-[3px] focus:ring-primary/25 focus:border-primary/50 focus:bg-white/80 transition-all duration-[220ms]`
- [ ] Replace `w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30` with:
  `w-full bg-white/60 backdrop-blur-sm border border-white/50 rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-[3px] focus:ring-primary/25 focus:border-primary/50 focus:bg-white/80 transition-all duration-[220ms]`
- [ ] Same for `<select>` and `<textarea>` with same pattern
- [ ] Commit: `git commit -m "style: settings inputs use glass input style"`

---

### Task 8: Page Transitions

**Files:**
- Modify: `apps/web/src/components/layout/dashboard-shell.tsx`

- [ ] Remove `bg-muted/30` from outer div (background comes from body gradient)
- [ ] Wrap `{children}` in framer-motion div:

```tsx
import { motion, AnimatePresence } from 'framer-motion';
// ...
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
    className="flex-1 overflow-y-auto"
  >
    {children}
  </motion.div>
</AnimatePresence>
```

- [ ] Add `usePathname` import from `next/navigation`
- [ ] Commit: `git commit -m "style: page entry transitions"`
