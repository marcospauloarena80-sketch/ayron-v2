# AYRON QA Roadmap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 170+ problemas encontrados na auditoria QA — prioridade crítica e alta primeiro, depois média.

**Architecture:** Correções isoladas por arquivo. Sem refatoração estrutural. Preservar toda funcionalidade existente.

**Tech Stack:** Next.js 15, React 18, TypeScript, TanStack Query, Zustand, Tailwind, Sonner

---

## PRIORIDADE CRÍTICA

### Task 1: Remover toasts falsos de ações críticas em patients/page.tsx

**Files:**
- Modify: `apps/web/src/app/(dashboard)/patients/page.tsx`

- [ ] **Step 1:** No `EmailModal`, substituir botão "Enviar Email" que faz `toast.success()` fake:

```tsx
// ANTES:
onClick={() => { toast.success('Email enviado'); onClose(); }}

// DEPOIS:
onClick={() => { toast.info('Envio de email em integração — disponível em breve'); onClose(); }}
```

- [ ] **Step 2:** No `SMSModal`, substituir botão "Enviar SMS":

```tsx
// ANTES:
onClick={() => { toast.success('SMS enviado'); onClose(); }}

// DEPOIS:
onClick={() => { toast.info('Envio de SMS em integração — disponível em breve'); onClose(); }}
```

- [ ] **Step 3:** No `QuestionariosModal`, substituir 3 botões fake:

```tsx
// Botão "Enviar Link":
onClick={() => toast.info('Envio de questionários em integração')}

// Botão "Criar Questionário":
onClick={() => toast.info('Editor de questionários em desenvolvimento')}

// Botão "Enviar Todos":
onClick={() => toast.info('Envio em lote em integração')}
```

- [ ] **Step 4:** No `ImprimirFichaModal`, remover toast fake de "PDF exportado":

```tsx
// Manter window.print() para impressão nativa
// Remover: toast.success('Ficha exportada como PDF')
// Trocar botão "Exportar PDF" por:
<Button variant="secondary" size="sm" onClick={() => toast.info('Exportação PDF em desenvolvimento')}>
  <Download className="h-3.5 w-3.5 mr-1.5" />Exportar PDF
</Button>
```

- [ ] **Step 5:** No `ReactivationModal`, desabilitar campaigns WhatsApp e Desconto fake:

```tsx
// Opções que não existem ainda → disabled com visual muted
{ id: 'whatsapp', label: 'Campanha WhatsApp', disabled: true },
{ id: 'desconto', label: 'Oferta de Desconto', disabled: true },
```

- [ ] **Step 6:** Verificar TS: `npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial`

---

### Task 2: Persistir Telefonemas e Pré-Pagamento em localStorage

**Files:**
- Modify: `apps/web/src/app/(dashboard)/patients/[id]/page.tsx`

- [ ] **Step 1:** Criar helper de persistência no topo do arquivo:

```tsx
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
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

- [ ] **Step 2:** Em `TabTelefonemas`, trocar `useState(MOCK_TELEFONEMAS)` por:

```tsx
const [telefonemas, setTelefonemas] = useLocalStorage(
  `ayron_telefonemas_${patientId}`,
  MOCK_TELEFONEMAS
);
```

- [ ] **Step 3:** Em `TabPrePagamento`, trocar `useState(MOCK_PREPAGAMENTOS)` e `useState(MOCK_MOVIMENTOS_PP)` por:

```tsx
const [prepagamentos, setPrepagamentos] = useLocalStorage(
  `ayron_prepagamentos_${patientId}`,
  MOCK_PREPAGAMENTOS
);
const [movimentos, setMovimentos] = useLocalStorage(
  `ayron_movimentos_pp_${patientId}`,
  MOCK_MOVIMENTOS_PP
);
```

- [ ] **Step 4:** Em `TabPrePagamento.handleSalvar`, atualizar movimentos também:

```tsx
function handleSalvar() {
  if (!novoCredito.valor || Number(novoCredito.valor) <= 0) {
    toast.error('Informe um valor válido');
    return;
  }
  const novo = {
    id: `PP${Date.now()}`,
    data: new Date().toISOString().split('T')[0],
    descricao: `Crédito adicionado — ${novoCredito.forma}`,
    valor: Number(novoCredito.valor),
    tipo: 'CREDITO' as const,
    saldo: Number(novoCredito.valor),
  };
  setMovimentos(m => [novo, ...m]);
  setPrepagamentos(p => [{
    id: `PP${Date.now()}`,
    valor: Number(novoCredito.valor),
    usado: 0,
    forma: novoCredito.forma,
    vencimento: novoCredito.vencimento || null,
    obs: novoCredito.obs || '',
    status: 'ATIVO' as const,
  }, ...p]);
  setNovoCredito({ valor: '', forma: 'PIX', vencimento: '', obs: '' });
  toast.success('Crédito adicionado e salvo');
}
```

- [ ] **Step 5:** Verificar TS.

---

### Task 3: Filtro de profissional na agenda filtrar de verdade

**Files:**
- Modify: `apps/web/src/app/(dashboard)/agenda/page.tsx`

- [ ] **Step 1:** Localizar onde `appointments` é renderizado na view Lista/Slots. Adicionar filtro por `selectedProfessional`:

```tsx
const filteredAppointments = useMemo(() => {
  if (!appointments) return [];
  if (selectedProfessional === 'all') return appointments;
  return appointments.filter((a: any) =>
    (a.professional_id === selectedProfessional) ||
    (a.professional?.name?.toLowerCase().includes(
      MOCK_PROFESSIONALS.find(p => p.id === selectedProfessional)?.name?.toLowerCase() ?? ''
    ))
  );
}, [appointments, selectedProfessional]);
```

- [ ] **Step 2:** Substituir todos os usos de `appointments` nas views Lista e Slots por `filteredAppointments`.

- [ ] **Step 3:** No `SemanaProfView`, o mock já filtra por profissional — manter comportamento atual.

- [ ] **Step 4:** Verificar TS.

---

### Task 4: Remover dead event dispatch no Dashboard

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1:** Localizar `window.dispatchEvent(new CustomEvent('open-cmd-palette'))`.

- [ ] **Step 2:** Substituir por navegação ao topbar search:

```tsx
// REMOVER:
window.dispatchEvent(new CustomEvent('open-cmd-palette'));

// SUBSTITUIR por (rola para topo e foca no search):
window.scrollTo({ top: 0, behavior: 'smooth' });
toast.info('Use ⌘K para abrir a busca global');
```

- [ ] **Step 3:** Verificar TS.

---

## PRIORIDADE ALTA

### Task 5: Merge das duas tabs IA no prontuário clínico

**Files:**
- Modify: `apps/web/src/app/(dashboard)/clinical/page.tsx`

- [ ] **Step 1:** Localizar `{ key: 'ia_prontuario', label: 'I.A', icon: Brain }` no array TABS e remover essa entrada.

- [ ] **Step 2:** Remover o bloco `{activeTab === 'ia_prontuario' && (...)}` completo.

- [ ] **Step 3:** No tab `ia` (AYRON IA), enriquecer com o conteúdo do agente que estava em `ia_prontuario` — adicionar os dois agent tabs (R1 e Obesidade) abaixo do card de scores, aproveitando os estados `iaAgent`, `iaQuery`, `iaHistory` que já existem no componente:

```tsx
// Após o bloco de alertas existente no tab 'ia', adicionar:
<div className="border-t border-border pt-4">
  <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
    <Brain className="h-3.5 w-3.5 text-primary" />
    Consultar Agente AYRON
  </p>
  {/* Mover os agent tabs + chat window + clinical panels do bloco ia_prontuario para aqui */}
</div>
```

- [ ] **Step 4:** Remover do `useState` os estados `iaAgent`, `iaQuery`, `iaHistory` se ficarem fora do componente — garantir que ficam no nível do `ProntuarioDetail`.

- [ ] **Step 5:** Atualizar o tipo de `activeTab` removendo `'ia_prontuario'` da union:

```tsx
useState<'evolucoes' | 'anamnese' | 'receitas' | 'exames' | 'ia' | 'imagens' | 'telemedicina' | 'bioimpedancia'>('evolucoes')
```

- [ ] **Step 6:** Verificar TS.

---

### Task 6: Botões mortos em settings → disabled + tooltip

**Files:**
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1:** Para cada botão sem `onClick` real (Nova Unidade, Convidar Usuário, Novo Procedimento, Configurar 2FA, Encerrar Sessão, etc.), adicionar padrão:

```tsx
// ANTES:
<Button>Nova Unidade</Button>

// DEPOIS:
<Button
  disabled
  title="Em desenvolvimento"
  className="opacity-50 cursor-not-allowed"
>
  Nova Unidade
</Button>
```

- [ ] **Step 2:** Para botões que já têm `onClick` com `toast.success()` fake, trocar para `toast.info('Funcionalidade em desenvolvimento')`.

- [ ] **Step 3:** ClinicPanel — adicionar chamada API stub ao salvar:

```tsx
async function handleSave() {
  // Salvar em localStorage até API disponível
  try {
    localStorage.setItem('ayron_clinic_settings', JSON.stringify(form));
    toast.success('Configurações salvas localmente');
    setEditing(false);
  } catch {
    toast.error('Erro ao salvar');
  }
}
```

- [ ] **Step 4:** ProfilePanel — mesma estratégia de localStorage.

- [ ] **Step 5:** Verificar TS.

---

### Task 7: Botões mortos em marketing/page.tsx

**Files:**
- Modify: `apps/web/src/app/(dashboard)/marketing/page.tsx`

- [ ] **Step 1:** Botões "Nova Campanha", "Importar Segmento" — adicionar `onClick={() => toast.info('Em desenvolvimento')}` e `title="Em desenvolvimento"`.

- [ ] **Step 2:** Botões Edit/Copy em campanhas — mesmo padrão.

- [ ] **Step 3:** "Criar Segmento IA" → `onClick={() => toast.info('IA de segmentação em integração')}`.

- [ ] **Step 4:** textarea em PortalTab — conectar a estado:

```tsx
const [portalText, setPortalText] = useState('');
// ...
<textarea value={portalText} onChange={e => setPortalText(e.target.value)} ... />
```

- [ ] **Step 5:** Verificar TS.

---

## PRIORIDADE MÉDIA

### Task 8: Substituir key={i} por IDs únicos (8 lugares)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/clinical/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/agenda/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/patients/[id]/page.tsx`

- [ ] **Step 1:** clinical/page.tsx — receitas items map:

```tsx
// ANTES: key={i}
// DEPOIS: key={`${r.id}-item-${i}`}
```

- [ ] **Step 2:** clinical/page.tsx — procedures map:

```tsx
// ANTES: key={pr}
// DEPOIS: key={`proc-${pr}-${i}`} (com i no destructuring)
```

- [ ] **Step 3:** agenda/page.tsx — semana appointments:

```tsx
// ANTES: key={`${prof}-${dia}-${ai}`}
// DEPOIS: já é composto — OK. Verificar outros maps com key={i}
```

- [ ] **Step 4:** patients/[id]/page.tsx — nullable guards:

```tsx
// ANTES: protocols.map(...)
// DEPOIS: (protocols ?? []).map(...)

// ANTES: implants.map(...)  
// DEPOIS: (implants ?? []).map(...)

// ANTES: metrics.map(...)
// DEPOIS: (metrics ?? []).map(...)
```

- [ ] **Step 5:** Verificar TS.

---

### Task 9: staleTime em queries + cleanup de timers

**Files:**
- Modify: `apps/web/src/app/(dashboard)/patients/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/agenda/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/patients/[id]/page.tsx`
- Modify: `apps/web/src/components/layout/topbar.tsx`

- [ ] **Step 1:** Adicionar `staleTime: 30_000` em todas as `useQuery` sem staleTime (4 queries identificadas).

- [ ] **Step 2:** Em `topbar.tsx`, garantir cleanup do searchTimer:

```tsx
useEffect(() => {
  return () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };
}, []);
```

- [ ] **Step 3:** Em `DoctorTimer` na agenda, adicionar cleanup:

```tsx
useEffect(() => {
  const id = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
  return () => clearInterval(id);
}, []);
```

- [ ] **Step 4:** Verificar TS.

---

### Task 10: Limpar imports não utilizados

**Files:**
- Modify: `apps/web/src/app/(dashboard)/patients/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1:** patients/page.tsx — remover `ChevronUp` se não usado.

- [ ] **Step 2:** dashboard/page.tsx — remover `ChevronDown`, `Trash2` se não usados.

- [ ] **Step 3:** Verificar TS final: `npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial`

---

## Verificação Final

- [ ] `npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v financial` → zero erros
- [ ] Dev server responde em `http://localhost:3001` sem crash
- [ ] Nenhum toast falso de "sucesso" em ações não implementadas
- [ ] Dados de Telefonemas e Pré-Pagamento persistem entre reloads
