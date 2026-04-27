# FASE 1 — Navegação e AYRON Global: Design Spec

**Data:** 2026-04-25  
**Status:** Aprovado com ajustes  
**Escopo:** 4 componentes. Sem refatoração estrutural. Sem remoção de funcionalidades.

---

## 1. AYRON Floating Widget — Mini Chat com Contexto Real

### Problema
Widget atual mostra apenas insights da API. Não é interativo. Usuário precisa trocar de tela para acessar o AYRON. Contexto da tela atual nunca é transmitido.

### Solução

**Camada de API isolada** — `src/lib/ayron-chat.ts`
- Função `sendAyronMessage(message: string, context: AyronContext): Promise<string>`
- Tenta POST em `/api/ayron/chat` (futuro n8n/LLM endpoint)
- Fallback: resposta mock local se endpoint retornar erro ou não existir
- Interface `AyronContext` com campos:
  - `module`: rota atual (dashboard, patients, agenda, clinical, financial…)
  - `patientId` / `patientName`: se estiver em tela de paciente
  - `appointmentId`: se estiver em agenda com agendamento selecionado
  - `prontuarioId`: se estiver em prontuário aberto
  - `financialContext`: se estiver em financeiro (ex: paciente filtrado)
  - `userId` / `userRole`: vindo do auth store
  - `clinicId`: da clínica logada

**Context detection** — hook `useAyronContext()` em `src/hooks/use-ayron-context.ts`
- Usa `usePathname()` + Zustand auth store + props opcionais
- Exporta `AyronContext` preenchido com o que estiver disponível na tela

**Widget UI** — `src/components/ayron/ayron-widget.tsx`
- Manter aba "Insights" (comportamento atual)
- Adicionar aba "Chat" com:
  - Lista de mensagens (user + assistant)
  - Input na base
  - Loading state enquanto aguarda resposta
  - Histórico em `useState` (sessão — não persiste)
- Contexto injetado automaticamente no primeiro envio via `useAyronContext()`

### Arquivos
- **Criar:** `src/lib/ayron-chat.ts`
- **Criar:** `src/hooks/use-ayron-context.ts`
- **Modificar:** `src/components/ayron/ayron-widget.tsx`

---

## 2. QuickAccess Dashboard → Menu Global de Navegação

### Problema
`QuickAccessButton` no Dashboard dispara `toast.info('Use ⌘K...')` — ação morta. O Brain deveria ser ponto de acesso rápido a qualquer módulo do sistema.

### Solução

Substituir `QuickAccessButton()` por popover com grid de todos os 13 módulos:

| Módulo | Rota | Ícone |
|---|---|---|
| Pacientes | /patients | Users |
| Agenda | /agenda | Calendar |
| Prontuários | /clinical | FileText |
| Financeiro | /financial | DollarSign |
| Marketing | /marketing | Megaphone |
| Estoque | /inventory | Package |
| Mensagens | /messages | MessageSquare |
| Insights | /analytics | BarChart3 |
| Sessões | /sessions | Repeat2 |
| Qualidade | /qualidade | Star |
| Ajuda | /ajuda | HelpCircle |
| Configurações | /settings | Settings |
| AYRON | /ayron | Brain |

**Comportamento:**
- Clique no Brain → abre popover flutuante abaixo do botão
- Grid 4 colunas (ícone + label)
- Clique em módulo → `router.push(href)` + fecha popover
- Fecha com Escape ou clique fora (`useEffect` + `onMouseDown` no overlay)
- Sem modal separado — popover inline no componente

### Arquivo
- **Modificar:** `src/app/(dashboard)/dashboard/page.tsx` — componente `QuickAccessButton`

---

## 3. StatCards Dashboard → Navegáveis

### Problema
Quatro KPI cards no topo do Dashboard não respondem a clique. Usuário não consegue navegar diretamente da informação à tela correspondente.

### Solução

Adicionar prop `href?: string` ao `StatCard`:
- `cursor-pointer` e `hover:shadow-md active:scale-[0.98]` quando `href` presente
- Click → `router.push(href)`

Mapeamento:
- Consultas Hoje → `/agenda`
- Pacientes Ativos → `/patients`
- Receita do Mês → `/financial`
- Taxa de Ocupação → `/agenda`

### Arquivo
- **Modificar:** `src/app/(dashboard)/dashboard/page.tsx` — `StatCard` + suas 4 chamadas

---

## 4. Topbar Search — Oculta no Dashboard, Mantida nos Demais

### Problema
A lupa global aparece em todas as telas, inclusive no Dashboard onde o QuickAccess Brain já serve como ponto de navegação/busca. Redundância visual e de UX.

### Solução

Em `topbar.tsx`:
- `const pathname = usePathname()`
- `const showSearch = pathname !== '/dashboard'`
- Envolver o ícone de busca e o overlay de busca com `{showSearch && (...)}`
- O atalho ⌘K continua funcional em todos os módulos (só o ícone visual some no Dashboard)
- Nos demais módulos: lupa abre busca local do setor (comportamento atual mantido)

### Arquivo
- **Modificar:** `src/components/layout/topbar.tsx`

---

## 5. Sidebar — Collapse com Tooltip

### Problema
Sidebar sempre expandida. Em telas menores ou durante uso focado, ocupa espaço desnecessário sem opção de minimizar.

### Solução

Em `sidebar.tsx`:
- Estado: `const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('ayron_sidebar_collapsed') === 'true' } catch { return false } })`
- Persist: `useEffect` sincroniza mudanças ao localStorage
- Collapsed: `w-16` (só ícones), Expanded: `w-64` (comportamento atual)
- Transição: `transition-all duration-200`
- Botão toggle: ícone ChevronLeft/ChevronRight no rodapé da sidebar
- **Tooltip:** quando collapsed, cada item de nav exibe tooltip nativo com `title={label}` (sem dependência extra)
- Labels escondidas com `overflow-hidden` quando collapsed

### Arquivo
- **Modificar:** `src/components/layout/sidebar.tsx`

---

## Restrições

- Sem novos arquivos de UI — apenas `ayron-chat.ts` e `use-ayron-context.ts` são criados
- Sem mudança de rotas ou estrutura de pastas
- Sem remoção de funcionalidade existente (insights widget continua funcionando)
- Mock é fallback — não é default
- Tooltip no sidebar usa `title` nativo HTML (zero dependências novas)
