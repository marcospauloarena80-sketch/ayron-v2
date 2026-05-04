# Visual Premium Refactor — AYRON Medical SaaS

**Date:** 2026-04-27  
**Approach:** A — CSS Global + Componentes Base (non-destructive cascade)  
**Scope:** 7 files only. Zero logic/structure changes.

---

## Objetivo

Evolução visual premium não destrutiva. Glassmorphism refinado, profundidade, microinterações elegantes, consistência global. Sem alterar lógica, estrutura HTML, fluxo de dados ou funcionalidades.

---

## Arquivos Alvo

```
apps/web/src/app/globals.css
apps/web/src/components/ui/card.tsx
apps/web/src/components/ui/button.tsx
apps/web/src/components/ui/input.tsx
apps/web/src/components/ui/badge.tsx
apps/web/src/components/layout/sidebar.tsx
apps/web/src/components/layout/topbar.tsx
```

---

## Fase 1 — globals.css (Tokens Globais + Background + Classes Glass)

### Background Global
- `body`: `background: linear-gradient(135deg, #F7F9FB 0%, #EEF2F7 100%)` fixed
- `min-height: 100vh`

### Novos CSS Custom Properties
```css
/* Glass surfaces */
--glass-bg: rgba(255, 255, 255, 0.72);
--glass-bg-strong: rgba(255, 255, 255, 0.85);
--glass-border: rgba(255, 255, 255, 0.40);

/* Sombras padronizadas */
--shadow-soft: 0 8px 24px rgba(0, 0, 0, 0.06);
--shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.10);
--glass-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04);
--glass-shadow-hover: 0 8px 32px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.06);

/* Cores e gradientes */
--primary-gradient: linear-gradient(135deg, #FF6A00 0%, #FF3B00 100%);
--primary-glow: 0 0 16px rgba(255, 106, 0, 0.25);

/* Tipografia — contraste garantido */
--text-primary: rgba(15, 23, 42, 0.90);   /* ≥ 4.5:1 em qualquer surface glass */
--text-secondary: rgba(15, 23, 42, 0.60);

/* Raios e transições */
--radius-card: 16px;
--radius-btn: 10px;
--transition-fast: 150ms ease;
--transition-base: 220ms ease;
```

### Z-index Stack (previne bug glass + overlay)
```
Layer        z-index   Elemento
─────────────────────────────────
base         0         conteúdo de página
sidebar      20        aside sidebar
topbar       30        topbar header
dropdown     50        user dropdown, search results
modal        60        ProfileModal, PermissionsModal, PasswordModal
toast        9999      Sonner toasts
```
`backdrop-filter` não pode ultrapassar layer superior sem novo stacking context. Sidebar e topbar usam `z-index` definido. Modais usam `fixed inset-0 z-[60]`.

### Escopo do backdrop-filter (LIMITADO)
`backdrop-filter: blur()` **apenas em:**
- Cards principais (Card component)
- Sidebar container
- Topbar container
- Dropdowns e modais

`backdrop-filter` **proibido em:**
- Listas longas (`<table>`, grids > 12 itens por view)
- Badges individuais inline (usar só `bg-opacity`, sem blur)
- Itens de nav repetitivos (hover state dos nav items: sem blur — usar só bg-white/60)
- Qualquer elemento renderizado > 20× na mesma view

### Utilitárias .glass-*
```css
.glass          → glass-bg, blur(16px), glass-border, glass-shadow, radius-card
.glass-strong   → glass-bg-strong, blur(20px), glass-border, glass-shadow
.glass-card     → .glass + hover shadow upgrade + hover translateY(-1px)
.glass-modal    → glass-bg-strong, blur(24px), shadow-2xl
```

---

## Fase 2 — Componentes Base

### card.tsx
- `bg-white` → `var(--glass-bg)` + `backdrop-blur-[16px]`
- `shadow-sm` → `var(--glass-shadow)`
- `rounded-xl` → `rounded-[16px]`
- `border-border` → `border border-white/40`
- Hover: `translateY(-1px)` + shadow upgrade via `transition-all duration-200`

### button.tsx
**primary:**
- `bg-primary hover:bg-primary/90` → `background: var(--primary-gradient)` + `hover: box-shadow var(--primary-glow)` + `hover: translateY(-1px)`
- `rounded-lg` → `rounded-[10px]`
- `transition-colors` → `transition-all duration-[220ms] ease`

**secondary:**
- `bg-secondary` → `var(--glass-bg)` + `border border-secondary/30` + `text-secondary`
- hover: glass lift

**ghost:**
- `hover:bg-muted` → `hover:bg-white/60 hover:backdrop-blur-sm`

**danger:**
- add `hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]` + lift

**All:**
- `disabled:opacity-50` mantido

### input.tsx
- `border-border` → `border border-white/50 bg-white/60`
- `backdrop-blur-sm` adicionado
- `focus:ring-primary/30` → `focus:ring-[3px] focus:ring-primary/25 focus:border-primary/50`
- `rounded-lg` → `rounded-[10px]`
- add `placeholder:text-muted-foreground/60`
- transition: `transition-all duration-[150ms]`

### badge.tsx
**default:** `bg-muted/80 text-foreground` (sem backdrop-blur — inline)  
**primary:** `bg-primary/15 text-primary border border-primary/20`  
**success:** `bg-green-50/80 text-green-700 border border-green-200/60`  
**warning:** `bg-amber-50/80 text-amber-700 border border-amber-200/60`  
**danger:** `bg-red-50/80 text-red-700 border border-red-200/60`  
**info:** `bg-blue-50/80 text-blue-700 border border-blue-200/60`  
All: border refinado, mesmo `rounded-full px-2.5 py-0.5 text-xs font-medium`. **Sem backdrop-blur** — badges renderizam N vezes em listas.

---

## Fase 3 — Sidebar + Topbar

### sidebar.tsx
**Container:**
- `bg-white border-r border-border` → `var(--glass-bg-strong) backdrop-blur-[20px] border-r border-white/30`
- `box-shadow: 2px 0 16px rgba(0,0,0,0.06)`

**Logo area:**
- `border-b` → `border-b border-white/30`
- ícone Brain: adicionar `shadow-[0_2px_8px_rgba(255,106,0,0.35)]`

**Nav items — padrão:**
- `hover:bg-muted hover:text-foreground` → `hover:bg-white/60 hover:backdrop-blur-sm hover:shadow-sm hover:translate-x-0.5` (collapsed: sem translate-x)
- `transition-all duration-[150ms]`

**Nav items — ativo:**
- `bg-primary/10 text-primary` → `bg-gradient-to-r from-primary/20 to-primary/5 text-primary shadow-[inset_0_0_0_1px_rgba(255,106,0,0.2)] shadow-[0_2px_8px_rgba(255,106,0,0.15)]`

**Bottom section:**
- `border-t` → `border-t border-white/30`
- logout hover: `hover:bg-red-50/70 hover:text-red-600`

### topbar.tsx
**Barra principal:**
- `bg-white border-b border-border` → `var(--glass-bg-strong) backdrop-blur-[16px] border-b border-white/30`
- `box-shadow: 0 1px 8px rgba(0,0,0,0.05)`

**Botão search:**
- `bg-muted/40` → `bg-white/50 backdrop-blur-sm border-white/40`
- hover: `bg-white/70`

**Bell button:**
- hover: `bg-white/60`

**User dropdown trigger:**
- `border-border` → `border-white/40 bg-white/50 backdrop-blur-sm`
- hover: `bg-white/70`

**Dropdown menu:**
- `bg-white shadow-xl` → `var(--glass-bg-strong) backdrop-blur-[20px] shadow-[var(--glass-shadow-hover)] border-white/40`

**Modais (ProfileModal, PermissionsModal, PasswordModal):**
- `bg-black/40` backdrop mantido
- `bg-white shadow-2xl` → `var(--glass-bg-strong) backdrop-blur-[24px] shadow-2xl border border-white/40`
- headers/footers border: `border-white/30`

---

## Fallback — Ambientes sem backdrop-filter

```css
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
Aplica a todos os elementos que usam glass. Resultado: fundo quase-branco sólido — visual limpo, sem blur quebrado.

---

## Acessibilidade — Focus Visible

```css
/* Global — globals.css */
:focus-visible {
  outline: 2px solid #FF6A00;
  outline-offset: 2px;
}

/* Reset para elementos que já têm ring customizado (inputs, buttons) */
input:focus-visible,
button:focus-visible {
  outline: none; /* ring via Tailwind já definido por componente */
}
```
Garante navegação por teclado visível sem conflito com rings existentes.

---

## Regras de Não-Regressão

- Nenhuma class existente removida sem substituto equivalente
- `disabled:opacity-50 disabled:cursor-not-allowed` mantido em Button
- `error` state em Input mantido (`border-red-400 focus:ring-red-200`)
- `animate-spin` em Loader2 mantido
- Collapsed sidebar: badges e ícones mantidos
- `badgeKey` counts mantidos
- Todo `cn()` mantido — className prop override continua funcionando
- Sem `!important`
- `backdrop-filter` → prefixo `-webkit-backdrop-filter` adicionado para compatibilidade

---

## QA Checklist

**Visual**
- [ ] Background gradient visível em todas as telas
- [ ] Cards com glass surface + hover lift
- [ ] Button primary com gradiente + glow hover
- [ ] Input focus com glow laranja discreto
- [ ] Badges com bordas refinadas, sem backdrop-blur
- [ ] Sidebar floating glass + active glow
- [ ] Topbar glass + dropdown glass
- [ ] Modais glass

**Contraste**
- [ ] Texto primário (`--text-primary`) legível sobre glass (≥ 4.5:1)
- [ ] Texto secundário (`--text-secondary`) legível (≥ 3:1 para UI text)
- [ ] Badges coloridos com contraste preservado

**Acessibilidade**
- [ ] `:focus-visible` laranja visível em navegação por teclado
- [ ] Input ring + button ring sem conflito com outline global
- [ ] Sem outline duplo em nenhum elemento

**Regressão**
- [ ] Nenhuma funcionalidade quebrada
- [ ] Error states preservados (`border-red-400 focus:ring-red-200`)
- [ ] Disabled states preservados (`opacity-50 cursor-not-allowed`)
- [ ] Modais não quebram z-index stack (z-60 > topbar z-30 > sidebar z-20)
- [ ] Sonner toasts visíveis acima de modais (z-9999)
- [ ] `cn()` override funciona em todos os componentes

**Fallback**
- [ ] Em browser sem `backdrop-filter`: background sólido, sem artefato visual
- [ ] Testado em Firefox (backdrop-filter support parcial)
