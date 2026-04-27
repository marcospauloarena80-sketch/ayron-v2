# FASE 2 — Módulo Pacientes: Plano de Implementação

> **Para agentes:** Use superpowers:executing-plans ou superpowers:subagent-driven-development para executar tarefa a tarefa.

**Goal:** Implementar 5 subsistemas no módulo Pacientes — indicadores de pendência, navegação contextual, validação de formulário, tags centralizadas, e exportação de aniversariantes.

**Architecture:** Serviços isolados em `src/lib/` consumidos por componentes. Zero chamadas extras na listagem. Campos futuros com fallback seguro. Export 100% client-side.

**Tech Stack:** Next.js 15 App Router, React 19, TanStack Query, react-hook-form + zod, xlsx, jspdf + jspdf-autotable, Sonner toasts

---

## 1. Arquivos que serão alterados

### Criar
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/lib/patient-pending-flags.ts` | `PatientPendingFlags` interface + `getPatientPendingFlags(patient)` |
| `src/lib/tags-service.ts` | `ClinicTag` interface + `tagsService.list()` + `tagsService.create()` |
| `src/lib/birthday-export-service.ts` | `birthdayExportService.exportExcel()` + `exportPDF()` |

### Modificar
| Arquivo | O que muda |
|---------|-----------|
| `src/app/(dashboard)/patients/page.tsx` | PatientCard refatorado: dots de pendência, 4 botões + menu "Mais ações", modal Aniversariantes |
| `src/components/patients/new-patient-modal.tsx` | Schema obrigatório, erro melhorado, tags da API, height fix |
| `src/app/(dashboard)/agenda/page.tsx` | Ler `?patientId` → inicializar `preselectedPatient` + banner |
| `src/app/(dashboard)/clinical/page.tsx` | Ler `?patientId` → `setSelected()` no hub + banner |
| `src/app/(dashboard)/financial/page.tsx` | Ler `?patientName` → inicializar `search` + banner |

---

## 2. Ordem de implementação

```
Task 1 → patient-pending-flags.ts       (isolado, zero risco)
Task 2 → tags-service.ts                (isolado, zero risco)
Task 3 → birthday-export-service.ts     (isolado, requer npm install)
Task 4 → agenda/page.tsx                (searchParams — baixo risco)
Task 5 → clinical/page.tsx              (searchParams — baixo risco)
Task 6 → financial/page.tsx             (searchParams — baixo risco)
Task 7 → patients/page.tsx (PatientCard) (maior arquivo — risco médio)
Task 8 → new-patient-modal.tsx          (schema change — risco médio-alto)
```

Serviços primeiro → destinos de navegação → origem → formulário (mais complexo por último).

---

## 3. Risco por alteração

| Task | Arquivo | Risco | Razão |
|------|---------|-------|-------|
| 1 | `patient-pending-flags.ts` | 🟢 Baixo | Novo arquivo, zero dependências |
| 2 | `tags-service.ts` | 🟢 Baixo | Novo arquivo, API com fallback |
| 3 | `birthday-export-service.ts` | 🟡 Médio | Depende de libs novas (xlsx/jspdf) |
| 4 | `agenda/page.tsx` | 🟢 Baixo | Adiciona leitura de searchParams apenas |
| 5 | `clinical/page.tsx` | 🟢 Baixo | Adiciona leitura de searchParams apenas |
| 6 | `financial/page.tsx` | 🟢 Baixo | Adiciona leitura de searchParams apenas |
| 7 | `patients/page.tsx` | 🟡 Médio | Refatora PatientCard existente + adiciona modal |
| 8 | `new-patient-modal.tsx` | 🟠 Médio-Alto | Altera schema de validação e comportamento de submit |

**Mitigação Task 8:** `masterBypass` mantém comportamento atual intacto. Novo schema só ativa sem bypass.

---

## 4. Testes manuais obrigatórios

### Task 1 — patient-pending-flags.ts
Nenhum teste manual. Verificado via Task 7.

### Task 2 — tags-service.ts
Nenhum teste manual. Verificado via Task 8.

### Task 3 — birthday-export-service.ts
- Abrir modal Aniversariantes com período 01/01 → 31/12
- Clicar "Exportar Excel" → arquivo `.xlsx` deve baixar com 9 colunas
- Abrir no Excel/Sheets → verificar colunas: Nome, Nascimento, Idade, Telefone, E-mail, Tags, Responsável, Status, Observação
- Clicar "Exportar PDF" → arquivo `.pdf` deve baixar com tabela formatada
- Testar período cruzado 20/12 → 10/01 → deve incluir pacientes de dezembro e janeiro

### Task 4 — agenda/page.tsx
- Navegar para `/agenda?patientId=X&patientName=João+Silva`
- Banner "Filtrando por paciente: João Silva" deve aparecer no topo
- Clicar X no banner → banner desaparece, `preselectedPatient` limpo
- URL não deve mudar ao limpar o filtro

### Task 5 — clinical/page.tsx
- Navegar para `/clinical?patientId=P4821`
- `ProntuarioDetail` deve abrir diretamente para Ana Lima (P4821)
- Botão "Voltar" deve retornar ao hub
- Banner deve mostrar "Filtrando por: Ana Lima" acima do detalhe
- Navegar para `/clinical?patientId=INEXISTENTE` → hub deve abrir normalmente sem erro

### Task 6 — financial/page.tsx
- Navegar para `/financial?patientName=Ana+Lima`
- Campo de busca já deve estar preenchido com "Ana Lima"
- Lista deve estar filtrada para Ana Lima
- Badge "Filtrando por: Ana Lima" deve aparecer com botão X
- Clicar X → busca limpa, lista mostra todos

### Task 7 — patients/page.tsx (PatientCard)
- Abrir card de paciente com CPF ausente → dot laranja animado no botão "Dados"
- Hover no botão "Dados" → tooltip nativo mostra "CPF ausente, E-mail ausente" (ou campos em falta)
- Paciente com e-mail e CPF preenchidos → sem dot no botão "Dados"
- Paciente sem próxima consulta → dot vermelho no botão "Agenda"
- Verificar que badge "Incompleto" sumiu do canto do card
- Clicar "Agenda" no card → navega para `/agenda?patientId=X&patientName=Nome`
- Clicar "Prontuário" → navega para `/clinical?patientId=X&patientName=Nome`
- Clicar "Financeiro" → navega para `/financial?patientId=X&patientName=Nome`
- Clicar "Dados" → navega para `/patients/{id}`
- Clicar `···` (MoreHorizontal) → menu "Mais ações" abre com: Email, SMS, Questionários, Imprimir
- Verificar que botão "Aniversariantes 🎂" aparece no header da listagem

### Task 8 — new-patient-modal.tsx
- Abrir modal "Novo Paciente" → clicar "Criar Paciente" sem preencher nada
- Toast deve mostrar "Dados incompletos: faltam Nome completo, Data de nascimento..."
- Aba com erro deve receber dot vermelho
- Modal deve saltar para a aba com o primeiro erro
- Campo com erro deve ter borda vermelha + mensagem inline
- Preencher Dados Pessoais + Endereço (com CEP) → tentar criar sem CPF se nacionalidade BR → erro
- Preencher tudo obrigatório → criar → deve criar com sucesso
- Tags: logar como usuário sem role GERENTE/ADMIN/MASTER → aba Classificação não mostra campo "criar nova tag"
- Tags: logar como GERENTE → campo "criar nova tag" visível → criar "DIABETICO" → lista atualiza → selecionar → criar paciente → tags no payload POST
- `masterBypass` ativo → deve criar mesmo sem campos obrigatórios (comportamento mantido)
- Modal deve ter scroll interno com footer fixo (não cortar botão "Criar Paciente")

---

## 5. Critérios de aceite

### Task 1 — patient-pending-flags.ts
- [ ] `PatientPendingFlags` interface exportada com 4 setores: dados, agenda, prontuario, financeiro
- [ ] Cada setor: `{ hasPending: boolean; reasons: string[] }`
- [ ] `has_prontuario` ausente → `hasPending: false` (não gera pendência)
- [ ] `has_pending_financial` ausente → `hasPending: false`
- [ ] Agenda: pendência se `next_appointment_date === null` OR `days_absent > 90` OR `current_status === 'AGUARDANDO_AGENDAMENTO'`
- [ ] Dados: pendência se falta CPF, e-mail ou telefone, ou `address.city` ausente
- [ ] TODO comments para campos futuros da API

### Task 2 — tags-service.ts
- [ ] `ClinicTag` interface: `{ id: string; name: string; clinic_id: string }`
- [ ] `tagsService.list()` chama `GET /tags`, retorna `DEFAULT_TAGS` se 404
- [ ] `tagsService.create()` chama `POST /tags`, lança `TagsApiNotAvailableError` se 404
- [ ] `CAN_CREATE_TAG = ['GERENTE', 'ADMIN', 'MASTER']`

### Task 3 — birthday-export-service.ts
- [ ] `BirthdayExportOptions` interface com `format`, `source`, `dateFrom`, `dateTo`, `patients`
- [ ] Filtro ignora ano — compara apenas mês + dia
- [ ] Lógica cross-year: `dateFrom > dateTo` → OR (dez lado + jan lado)
- [ ] Pacientes sem `birth_date` excluídos silenciosamente
- [ ] Nota de rodapé informando quantidade excluída
- [ ] Excel: 9 colunas, arquivo `aniversariantes_YYYY-MM-DD.xlsx`
- [ ] PDF: título, período, tabela, arquivo `aniversariantes_YYYY-MM-DD.pdf`
- [ ] `source: 'client'` nesta fase

### Task 4 — agenda/page.tsx
- [ ] `useSearchParams()` lê `patientId` e `patientName`
- [ ] `patientId` inicializa `preselectedPatient` via `useEffect`
- [ ] Banner fixo no topo quando filtro ativo: "Filtrando por paciente: {patientName}"
- [ ] Botão X limpa `preselectedPatient`, NÃO altera URL
- [ ] Sem `?patientId` → comportamento igual ao atual

### Task 5 — clinical/page.tsx
- [ ] `useSearchParams()` lê `patientId`
- [ ] Se `patientId` presente e encontrado em `MOCK_PATIENTS_CLINICAL` → `setSelected(patient)` direto
- [ ] Se não encontrado → hub normal, sem erro
- [ ] Banner "Filtrando por: {nome}" acima do `ProntuarioDetail`
- [ ] Botão Voltar retorna ao hub e limpa filtro de URL

### Task 6 — financial/page.tsx
- [ ] `useSearchParams()` lê `patientName`
- [ ] `search` inicializado com `patientNameFromUrl ?? ''`
- [ ] Badge de filtro ativo quando `patientNameFromUrl` presente
- [ ] Botão X limpa `search`, NÃO altera URL

### Task 7 — patients/page.tsx
- [ ] Badge "Incompleto" removido do PatientCard
- [ ] Base do card: 4 botões — Financeiro · Agenda · Prontuário · Dados
- [ ] Email, SMS, Questionários, Imprimir → menu `···` (MoreHorizontal)
- [ ] `getPatientPendingFlags(patient)` chamado para cada card (sem API extra)
- [ ] Setor com `hasPending` → dot `animate-ping` no botão (laranja para Dados, vermelho para os demais)
- [ ] Atributo `title` nativo no botão com `reasons.join(', ')`
- [ ] Botão "Aniversariantes 🎂" no header com modal
- [ ] Modal: date picker início + fim, tabela preview scrollável (Nome · Nascimento · Idade · Telefone · Tags), botões Excel + PDF
- [ ] Se `patients.length > 500`: banner de aviso antes de exportar
- [ ] Navegação: cada botão usa rota correta com searchParams

### Task 8 — new-patient-modal.tsx
- [ ] `schemaFull` exige: nome (min 3), nascimento, sexo, telefone (min 10), CPF se BR, doc se estrangeiro, CEP, logradouro, número, cidade, estado
- [ ] Clique "Criar Paciente" sem campos → toast "Dados incompletos: faltam [lista]"
- [ ] Salto automático para primeira aba com erro
- [ ] Tab com erro: dot vermelho no seletor
- [ ] Campo com erro: borda vermelha + mensagem inline
- [ ] Tags: `useQuery(['tags'])` via `tagsService.list()`, `staleTime: 5min`
- [ ] Tags: campo criar visível só para GERENTE/ADMIN/MASTER
- [ ] Tags enviadas no `POST /patients` payload (não via PATCH separado)
- [ ] Erro HTTP melhorado: toast com status + mensagem real da API
- [ ] Modal: `max-h-[90vh] flex flex-col overflow-hidden`, footer `sticky bottom-0`
- [ ] `masterBypass` mantém comportamento atual

---

## Task 1 — Criar `patient-pending-flags.ts`

**Files:**
- Create: `src/lib/patient-pending-flags.ts`

- [ ] Criar arquivo com interface e função

```typescript
// TODO(api): adicionar campos has_prontuario e has_pending_financial no endpoint /patients

export interface PatientPendingFlags {
  dados: { hasPending: boolean; reasons: string[] }
  agenda: { hasPending: boolean; reasons: string[] }
  prontuario: { hasPending: boolean; reasons: string[] }
  financeiro: { hasPending: boolean; reasons: string[] }
}

export function getPatientPendingFlags(patient: any): PatientPendingFlags {
  // DADOS
  const dadosReasons: string[] = []
  if (!patient.cpf) dadosReasons.push('CPF ausente')
  if (!patient.email) dadosReasons.push('E-mail ausente')
  if (!patient.phone) dadosReasons.push('Telefone ausente')
  if (!patient.address?.city) dadosReasons.push('Endereço incompleto')

  // AGENDA
  const agendaReasons: string[] = []
  if (!patient.next_appointment_date) agendaReasons.push('Sem próxima consulta')
  if ((patient.days_absent ?? 0) > 90) agendaReasons.push('Retorno vencido')
  if (patient.current_status === 'AGUARDANDO_AGENDAMENTO') agendaReasons.push('Aguardando agendamento')

  // PRONTUÁRIO — campo futuro: ausente = false, sem pendência automática
  // TODO(api): adicionar has_prontuario no endpoint /patients
  const prontuarioReasons: string[] = []
  if (patient.has_prontuario === false) prontuarioReasons.push('Sem prontuário iniciado')

  // FINANCEIRO — campo futuro: ausente = false, sem pendência automática
  // TODO(api): adicionar has_pending_financial no endpoint /patients
  const financeiroReasons: string[] = []
  if (patient.has_pending_financial === true) financeiroReasons.push('Pendência financeira')

  return {
    dados:      { hasPending: dadosReasons.length > 0,      reasons: dadosReasons },
    agenda:     { hasPending: agendaReasons.length > 0,     reasons: agendaReasons },
    prontuario: { hasPending: prontuarioReasons.length > 0, reasons: prontuarioReasons },
    financeiro: { hasPending: financeiroReasons.length > 0, reasons: financeiroReasons },
  }
}
```

- [ ] Verificar TS: `npx tsc --noEmit --project /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json`
  Expected: zero errors

- [ ] Commit
```bash
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron add apps/web/src/lib/patient-pending-flags.ts
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron commit -m "feat(patients): add PatientPendingFlags service"
```

---

## Task 2 — Criar `tags-service.ts`

**Files:**
- Create: `src/lib/tags-service.ts`

- [ ] Criar arquivo

```typescript
import api from '@/lib/api'

export interface ClinicTag {
  id: string
  name: string
  clinic_id: string
}

export class TagsApiNotAvailableError extends Error {
  constructor() { super('Tags API not available (POST /tags not found)') }
}

const DEFAULT_TAGS: ClinicTag[] = [
  { id: 'default-1', name: 'VIP', clinic_id: '' },
  { id: 'default-2', name: 'Indicado', clinic_id: '' },
  { id: 'default-3', name: 'Plano Família', clinic_id: '' },
]

export const tagsService = {
  async list(): Promise<ClinicTag[]> {
    try {
      const r = await api.get('/tags')
      return r.data ?? []
    } catch (e: any) {
      if (e.response?.status === 404) return DEFAULT_TAGS
      throw e
    }
  },

  async create(name: string): Promise<ClinicTag> {
    try {
      const r = await api.post('/tags', { name })
      return r.data
    } catch (e: any) {
      if (e.response?.status === 404) throw new TagsApiNotAvailableError()
      throw e
    }
  },
}

export const CAN_CREATE_TAG = ['GERENTE', 'ADMIN', 'MASTER'] as const
```

- [ ] Verificar TS: zero errors

- [ ] Commit
```bash
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron add apps/web/src/lib/tags-service.ts
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron commit -m "feat(patients): add tags-service with API fallback and role constants"
```

---

## Task 3 — Criar `birthday-export-service.ts` + instalar dependências

**Files:**
- Create: `src/lib/birthday-export-service.ts`

- [ ] Instalar dependências
```bash
cd /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web && npm install xlsx jspdf jspdf-autotable
```
Expected: success, no peer errors

- [ ] Criar arquivo

```typescript
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns/format'

export interface PatientBirthdayRow {
  full_name: string
  birth_date: string
  phone?: string
  email?: string
  tags?: string[]
  responsavel?: string
  current_status?: string
  notes?: string
}

export interface BirthdayExportOptions {
  format: 'excel' | 'pdf'
  source: 'client' | 'server'
  dateFrom: Date
  dateTo: Date
  patients: PatientBirthdayRow[]
}

function isInBirthdayRange(birthDate: string, dateFrom: Date, dateTo: Date): boolean {
  const d = new Date(birthDate)
  if (isNaN(d.getTime())) return false
  const bMonth = d.getUTCMonth() + 1
  const bDay = d.getUTCDate()
  const fromMonth = dateFrom.getMonth() + 1
  const fromDay = dateFrom.getDate()
  const toMonth = dateTo.getMonth() + 1
  const toDay = dateTo.getDate()

  const toMonthDay = toMonth * 100 + toDay
  const fromMonthDay = fromMonth * 100 + fromDay
  const bMonthDay = bMonth * 100 + bDay

  if (fromMonthDay <= toMonthDay) {
    return bMonthDay >= fromMonthDay && bMonthDay <= toMonthDay
  } else {
    return bMonthDay >= fromMonthDay || bMonthDay <= toMonthDay
  }
}

function calcAge(birthDate: string): number {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / 31_557_600_000)
}

function filterAndExclude(patients: PatientBirthdayRow[], dateFrom: Date, dateTo: Date) {
  let excluded = 0
  const included: PatientBirthdayRow[] = []
  for (const p of patients) {
    if (!p.birth_date || isNaN(new Date(p.birth_date).getTime())) { excluded++; continue }
    if (isInBirthdayRange(p.birth_date, dateFrom, dateTo)) included.push(p)
  }
  return { included, excluded }
}

function buildRows(included: PatientBirthdayRow[]) {
  return included.map(p => ({
    nome: p.full_name,
    nascimento: format(new Date(p.birth_date), 'dd/MM/yyyy'),
    idade: String(calcAge(p.birth_date)),
    telefone: p.phone ?? '',
    email: p.email ?? '',
    tags: (p.tags ?? []).join(', '),
    responsavel: p.responsavel ?? '',
    status: p.current_status ?? '',
    obs: p.notes ?? '',
  }))
}

const COLUMNS = ['Nome', 'Nascimento', 'Idade', 'Telefone', 'E-mail', 'Tags', 'Responsável', 'Status', 'Observação']
const KEYS: (keyof ReturnType<typeof buildRows>[0])[] = ['nome', 'nascimento', 'idade', 'telefone', 'email', 'tags', 'responsavel', 'status', 'obs']

export const birthdayExportService = {
  exportExcel(rows: PatientBirthdayRow[], dateFrom: Date, dateTo: Date): void {
    const { included, excluded } = filterAndExclude(rows, dateFrom, dateTo)
    const data = buildRows(included)
    const wsData: string[][] = [COLUMNS, ...data.map(r => KEYS.map(k => r[k]))]
    if (excluded > 0) {
      wsData.push([`${excluded} paciente(s) sem data de nascimento não incluído(s)`])
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Aniversariantes')
    XLSX.writeFile(wb, `aniversariantes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  },

  exportPDF(rows: PatientBirthdayRow[], dateFrom: Date, dateTo: Date): void {
    const { included, excluded } = filterAndExclude(rows, dateFrom, dateTo)
    const data = buildRows(included)
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text('Aniversariantes', 14, 16)
    doc.setFontSize(10)
    doc.text(
      `Período: ${format(dateFrom, 'dd/MM')} até ${format(dateTo, 'dd/MM')}`,
      14, 23
    )
    autoTable(doc, {
      head: [COLUMNS],
      body: data.map(r => KEYS.map(k => r[k])),
      startY: 28,
      styles: { fontSize: 8 },
    })
    if (excluded > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 6
      doc.setFontSize(8)
      doc.text(`${excluded} paciente(s) sem data de nascimento não incluído(s)`, 14, finalY)
    }
    doc.save(`aniversariantes_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  },

  async export(options: BirthdayExportOptions): Promise<void> {
    if (options.format === 'excel') {
      this.exportExcel(options.patients, options.dateFrom, options.dateTo)
    } else {
      this.exportPDF(options.patients, options.dateFrom, options.dateTo)
    }
  },
}
```

- [ ] Verificar TS: zero errors

- [ ] Commit
```bash
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron add apps/web/src/lib/birthday-export-service.ts apps/web/package.json apps/web/package-lock.json
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron commit -m "feat(patients): add birthday-export-service with Excel and PDF support"
```

---

## Task 4 — Modificar `agenda/page.tsx`

**Files:**
- Modify: `src/app/(dashboard)/agenda/page.tsx`

- [ ] Adicionar imports no topo do arquivo
```typescript
import { useSearchParams } from 'next/navigation'
```

- [ ] Adicionar após declaração de estados existentes em `AgendaPage`:
```typescript
const searchParams = useSearchParams()
const patientIdFromUrl = searchParams.get('patientId')
const patientNameFromUrl = searchParams.get('patientName')

useEffect(() => {
  if (patientIdFromUrl) setPreselectedPatient(patientIdFromUrl)
}, [patientIdFromUrl])
```

- [ ] Adicionar banner logo após o `<Topbar>` (ou no topo do conteúdo principal):
```tsx
{patientNameFromUrl && preselectedPatient && (
  <div className="mx-6 mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
    <span className="flex-1">Filtrando por paciente: <strong>{decodeURIComponent(patientNameFromUrl)}</strong></span>
    <button
      onClick={() => setPreselectedPatient(undefined)}
      className="rounded p-0.5 hover:bg-blue-100 transition-colors"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  </div>
)}
```

- [ ] Verificar que `X` de lucide-react já está importado (adicionar se não estiver)

- [ ] Verificar TS: zero errors

- [ ] Commit
```bash
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron add apps/web/src/app/\(dashboard\)/agenda/page.tsx
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron commit -m "feat(agenda): pre-select patient from ?patientId searchParam"
```

---

## Task 5 — Modificar `clinical/page.tsx`

**Files:**
- Modify: `src/app/(dashboard)/clinical/page.tsx`

- [ ] Adicionar `useSearchParams` no import do `next/navigation`

- [ ] No `ClinicalHubPage`, adicionar após os estados existentes:
```typescript
const searchParams = useSearchParams()
const patientIdFromUrl = searchParams.get('patientId')

useEffect(() => {
  if (!patientIdFromUrl) return
  const found = MOCK_PATIENTS_CLINICAL.find(p => p.id === patientIdFromUrl)
  if (found) setSelected(found)
}, [patientIdFromUrl])
```

- [ ] Adicionar `useEffect` ao import do React

- [ ] Adicionar banner acima do `<ProntuarioDetail>` (dentro do `if (selected)` block):
```tsx
if (selected) {
  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Prontuários" />
      {patientIdFromUrl && (
        <div className="flex items-center gap-2 border-b border-border bg-blue-50 px-6 py-2 text-sm text-blue-700">
          <span className="flex-1">Filtrando por: <strong>{selected.name}</strong></span>
          <button onClick={() => setSelected(null)} className="rounded p-0.5 hover:bg-blue-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <ProntuarioDetail patient={selected} onBack={() => setSelected(null)} />
    </div>
  )
}
```

- [ ] Verificar que `X` de lucide-react já está importado

- [ ] Verificar TS: zero errors

- [ ] Commit
```bash
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron add apps/web/src/app/\(dashboard\)/clinical/page.tsx
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron commit -m "feat(clinical): pre-select patient from ?patientId searchParam"
```

---

## Task 6 — Modificar `financial/page.tsx`

**Files:**
- Modify: `src/app/(dashboard)/financial/page.tsx`

- [ ] Adicionar `useSearchParams` no import do `next/navigation`

- [ ] Localizar `const [search, setSearch] = useState('')` e substituir por:
```typescript
const searchParams = useSearchParams()
const patientNameFromUrl = searchParams.get('patientName')
const [search, setSearch] = useState(patientNameFromUrl ?? '')
```

- [ ] Adicionar badge de filtro ativo perto do campo de busca existente:
```tsx
{patientNameFromUrl && search === patientNameFromUrl && (
  <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
    <span>Filtrando por: <strong>{decodeURIComponent(patientNameFromUrl)}</strong></span>
    <button onClick={() => setSearch('')} className="ml-1 rounded-full hover:bg-blue-200 p-0.5">
      <X className="h-3 w-3" />
    </button>
  </div>
)}
```

- [ ] Verificar TS: zero errors

- [ ] Commit
```bash
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron add apps/web/src/app/\(dashboard\)/financial/page.tsx
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron commit -m "feat(financial): pre-filter by ?patientName searchParam"
```

---

## Task 7 — Modificar `patients/page.tsx` (PatientCard + Aniversariantes)

**Files:**
- Modify: `src/app/(dashboard)/patients/page.tsx`

- [ ] Adicionar imports:
```typescript
import { useRouter } from 'next/navigation'
import { getPatientPendingFlags } from '@/lib/patient-pending-flags'
import { birthdayExportService, type PatientBirthdayRow } from '@/lib/birthday-export-service'
import { MoreHorizontal, Cake } from 'lucide-react'
```

- [ ] Remover badge "Incompleto" do PatientCard (remover `hasIncompleteData` e `incompleteFields` chamadas no JSX do card, manter funções se usadas em outro lugar)

- [ ] Refatorar base do PatientCard — os 4 botões principais com dots de pendência:
```tsx
function PatientCard({ patient, onClick }: { patient: any, onClick: () => void }) {
  const router = useRouter()
  const flags = getPatientPendingFlags(patient)

  function pendingDot(hasPending: boolean, color: 'orange' | 'red') {
    if (!hasPending) return null
    const cls = color === 'orange' ? 'bg-orange-500' : 'bg-red-500'
    return (
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cls} opacity-75`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cls}`} />
      </span>
    )
  }

  // ... card header (click abre detalhes) ...

  return (
    <div className="...card styles...">
      {/* card header — click para /patients/{id} */}
      <div className="cursor-pointer" onClick={onClick}>
        {/* nome, status, etc */}
      </div>

      {/* Base do card — 4 botões de ação + menu */}
      <div className="flex items-center gap-1 mt-3 border-t pt-3">
        <button
          title={flags.financeiro.hasPending ? flags.financeiro.reasons.join(', ') : 'Financeiro'}
          onClick={() => router.push(`/financial?patientId=${patient.id}&patientName=${encodeURIComponent(patient.full_name ?? patient.name ?? '')}`)}
          className="relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          {pendingDot(flags.financeiro.hasPending, 'red')}
          Financeiro
        </button>

        <button
          title={flags.agenda.hasPending ? flags.agenda.reasons.join(', ') : 'Agenda'}
          onClick={() => router.push(`/agenda?patientId=${patient.id}&patientName=${encodeURIComponent(patient.full_name ?? patient.name ?? '')}`)}
          className="relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          {pendingDot(flags.agenda.hasPending, 'red')}
          Agenda
        </button>

        <button
          title={flags.prontuario.hasPending ? flags.prontuario.reasons.join(', ') : 'Prontuário'}
          onClick={() => router.push(`/clinical?patientId=${patient.id}&patientName=${encodeURIComponent(patient.full_name ?? patient.name ?? '')}`)}
          className="relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          {pendingDot(flags.prontuario.hasPending, 'red')}
          Prontuário
        </button>

        <button
          title={flags.dados.hasPending ? flags.dados.reasons.join(', ') : 'Dados'}
          onClick={() => router.push(`/patients/${patient.id}`)}
          className="relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          {pendingDot(flags.dados.hasPending, 'orange')}
          Dados
        </button>

        {/* Menu Mais ações */}
        <MoreActionsMenu patientId={patient.id} patientName={patient.full_name ?? patient.name ?? ''} />
      </div>
    </div>
  )
}
```

- [ ] Criar `MoreActionsMenu` component inline (mesmo arquivo):
```tsx
function MoreActionsMenu({ patientId, patientName }: { patientId: string, patientName: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const actions = [
    { label: 'Email', icon: Mail, onClick: () => {} },
    { label: 'SMS', icon: MessageSquare, onClick: () => {} },
    { label: 'Questionários', icon: ClipboardList, onClick: () => {} },
    { label: 'Imprimir', icon: Printer, onClick: () => {} },
  ]

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
        title="Mais ações"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-20 w-40 rounded-xl border border-border bg-white shadow-lg py-1">
          {actions.map(a => (
            <button
              key={a.label}
              onClick={() => { a.onClick(); setOpen(false) }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <a.icon className="h-3.5 w-3.5 text-muted-foreground" />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] Adicionar botão "Aniversariantes" no header da listagem e modal:

```tsx
// No header da página (próximo ao botão "Novo Paciente"):
<button
  onClick={() => setBirthdayModalOpen(true)}
  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
>
  <Cake className="h-4 w-4" />
  Aniversariantes
</button>
```

- [ ] Criar `BirthdayModal` component (mesmo arquivo, abaixo das funções existentes):
```tsx
function BirthdayModal({ patients, open, onClose }: { patients: any[], open: boolean, onClose: () => void }) {
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [dateTo, setDateTo] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d })
  const [loading, setLoading] = useState<'excel' | 'pdf' | null>(null)

  const rows: PatientBirthdayRow[] = patients.map(p => ({
    full_name: p.full_name ?? p.name ?? '',
    birth_date: p.birth_date ?? p.birthdate ?? '',
    phone: p.phone,
    email: p.email,
    tags: p.tags,
    responsavel: p.responsavel,
    current_status: p.current_status,
    notes: p.notes ?? p.obs,
  }))

  const preview = rows.filter(r => {
    if (!r.birth_date) return false
    const d = new Date(r.birth_date)
    if (isNaN(d.getTime())) return false
    return true
  })

  if (!open) return null

  async function handleExport(fmt: 'excel' | 'pdf') {
    setLoading(fmt)
    try {
      if (fmt === 'excel') birthdayExportService.exportExcel(rows, dateFrom, dateTo)
      else birthdayExportService.exportPDF(rows, dateFrom, dateTo)
      toast.success('Download iniciado')
    } catch {
      toast.error('Erro ao gerar relatório')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold">Aniversariantes</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0">
          <label className="text-sm text-muted-foreground">De</label>
          <input type="date" value={dateFrom.toISOString().slice(0,10)}
            onChange={e => setDateFrom(new Date(e.target.value + 'T12:00:00'))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <label className="text-sm text-muted-foreground">até</label>
          <input type="date" value={dateTo.toISOString().slice(0,10)}
            onChange={e => setDateTo(new Date(e.target.value + 'T12:00:00'))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>

        {preview.length > 500 && (
          <div className="mx-6 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            {preview.length} pacientes encontrados. O relatório pode ser grande.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 text-left font-medium">Nome</th>
                <th className="pb-2 text-left font-medium">Nascimento</th>
                <th className="pb-2 text-left font-medium">Idade</th>
                <th className="pb-2 text-left font-medium">Telefone</th>
                <th className="pb-2 text-left font-medium">Tags</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 100).map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5">{p.full_name}</td>
                  <td className="py-1.5">{p.birth_date ? new Date(p.birth_date).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="py-1.5">{p.birth_date ? Math.floor((Date.now() - new Date(p.birth_date).getTime()) / 31_557_600_000) : '—'}</td>
                  <td className="py-1.5">{p.phone ?? '—'}</td>
                  <td className="py-1.5">{(p.tags ?? []).join(', ') || '—'}</td>
                </tr>
              ))}
              {preview.length > 100 && (
                <tr><td colSpan={5} className="py-2 text-center text-muted-foreground">+{preview.length - 100} pacientes no export</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-4 flex-shrink-0">
          <button
            onClick={() => handleExport('excel')}
            disabled={loading !== null}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'excel' ? 'Gerando relatório...' : 'Exportar Excel'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={loading !== null}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'pdf' ? 'Gerando relatório...' : 'Exportar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] Adicionar `birthdayModalOpen` state na página principal + `<BirthdayModal>` no JSX

- [ ] Verificar TS: zero errors

- [ ] Commit
```bash
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron add apps/web/src/app/\(dashboard\)/patients/page.tsx
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron commit -m "feat(patients): pending flags dots, more-actions menu, birthday modal"
```

---

## Task 8 — Modificar `new-patient-modal.tsx`

**Files:**
- Modify: `src/components/patients/new-patient-modal.tsx`

- [ ] Adicionar imports:
```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tagsService, CAN_CREATE_TAG, TagsApiNotAvailableError } from '@/lib/tags-service'
import { useAuthStore } from '@/store/auth.store'
```

- [ ] Atualizar `schemaFull` com campos obrigatórios:
```typescript
const schemaFull = z.object({
  // Dados Pessoais
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  birth_date: z.string().min(1, 'Data de nascimento obrigatória'),
  gender: z.string().min(1, 'Sexo obrigatório'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').optional().or(z.literal('')),
  phone2: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  nationality: z.string().optional(),

  // Documentação — condicional
  cpf: z.string().optional(),
  document_type: z.string().optional(),
  document_number: z.string().optional(),

  // Endereço
  address: z.object({
    zip_code: z.string().min(1, 'CEP obrigatório'),
    street: z.string().min(1, 'Logradouro obrigatório'),
    number: z.string().min(1, 'Número obrigatório'),
    city: z.string().min(1, 'Cidade obrigatória'),
    state: z.string().min(1, 'Estado obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
  }).optional(),

  // Demais campos (opcionais)
  tags: z.array(z.string()).optional(),
  responsible: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Telefone obrigatório (pelo menos 10 dígitos)
  const phone = data.phone?.replace(/\D/g, '') ?? ''
  if (phone.length < 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Telefone obrigatório (mínimo 10 dígitos)', path: ['phone'] })
  }
  // CPF obrigatório se BR
  if (!data.nationality || data.nationality === 'BR') {
    if (!data.cpf) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CPF obrigatório para pacientes brasileiros', path: ['cpf'] })
    }
  }
  // Documento obrigatório se estrangeiro
  if (data.nationality === 'ESTRANGEIRO') {
    if (!data.document_type) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Tipo de documento obrigatório', path: ['document_type'] })
    }
    if (!data.document_number) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Número do documento obrigatório', path: ['document_number'] })
    }
  }
})
```

- [ ] Mapear erros por aba para detecção de aba com erro:
```typescript
const TAB_FIELDS: Record<string, string[]> = {
  'Dados Pessoais': ['full_name', 'birth_date', 'gender', 'phone'],
  'Documentos': ['cpf', 'document_type', 'document_number'],
  'Endereço': ['address.zip_code', 'address.street', 'address.number', 'address.city', 'address.state'],
}

function firstTabWithError(errors: Record<string, any>): string | null {
  const flatKeys = Object.keys(errors).flatMap(k =>
    typeof errors[k] === 'object' && errors[k] !== null && !errors[k].message
      ? Object.keys(errors[k]).map(sub => `${k}.${sub}`)
      : [k]
  )
  for (const [tab, fields] of Object.entries(TAB_FIELDS)) {
    if (fields.some(f => flatKeys.includes(f))) return tab
  }
  return null
}
```

- [ ] Atualizar `onSubmit` / `handleSubmit` para:
  1. Coletar erros do zod
  2. Mostrar toast com lista de campos faltando
  3. Chamar `setTab()` para a primeira aba com erro
  
```typescript
// Dentro do onError do form (react-hook-form):
const onError = (errors: any) => {
  const missingFields: string[] = []
  function collect(obj: any, prefix = '') {
    for (const [k, v] of Object.entries(obj)) {
      if ((v as any)?.message) missingFields.push((v as any).message)
      else if (typeof v === 'object') collect(v, `${prefix}${k}.`)
    }
  }
  collect(errors)
  toast.error(`Dados incompletos: ${missingFields.slice(0, 3).join(', ')}${missingFields.length > 3 ? ` e mais ${missingFields.length - 3}` : ''}`)
  const errTab = firstTabWithError(errors)
  if (errTab) setTab(errTab)
}
```

- [ ] Atualizar `onError` do `useMutation` para mostrar erro real da API:
```typescript
onError: (e: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error('[NewPatientModal] response:', e.response?.data)
  }
  const status = e.response?.status
  const raw = e.response?.data?.message ?? e.response?.data?.error ?? 'Erro ao criar paciente'
  const messages = Array.isArray(raw) ? raw : [raw]
  toast.error(messages[0], {
    description: [
      status ? `HTTP ${status}` : null,
      messages.slice(1).join(' · ') || null,
    ].filter(Boolean).join(' — ') || undefined,
  })
}
```

- [ ] Adicionar dot vermelho no tab com erro — no `TabsList` / seletor de abas:
```tsx
// Para cada tab button, verificar se tem erro:
const tabHasError = (tabName: string) => {
  const fields = TAB_FIELDS[tabName] ?? []
  return fields.some(f => {
    const parts = f.split('.')
    let cur: any = formState.errors
    for (const p of parts) cur = cur?.[p]
    return !!cur
  })
}

// No button da aba:
<button ...>
  {tab}
  {tabHasError(tab) && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />}
</button>
```

- [ ] Substituir lógica de tags locais pela API:
```typescript
const queryClient = useQueryClient()
const user = useAuthStore(s => s.user)
const canCreateTag = CAN_CREATE_TAG.includes((user?.role ?? '') as any)

const { data: apiTags = [] } = useQuery({
  queryKey: ['tags'],
  queryFn: tagsService.list,
  staleTime: 5 * 60 * 1000,
})

async function handleCreateTag(name: string) {
  try {
    await tagsService.create(name)
    await queryClient.invalidateQueries({ queryKey: ['tags'] })
    toast.success(`Tag "${name}" criada`)
  } catch (e) {
    if (e instanceof TagsApiNotAvailableError) {
      toast.error('Criação de tags globais requer atualização do backend (POST /tags)')
    } else {
      toast.error('Erro ao criar tag')
    }
  }
}
```

- [ ] Na aba Classificação: renderizar campo "criar nova tag" apenas se `canCreateTag`; botão desabilitado com tooltip se API não disponível

- [ ] Garantir que tags vão no payload do POST /patients (não somente via PATCH)

- [ ] Aplicar modal height fix ao `<Dialog>`:
```tsx
// No DialogContent:
<DialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
  {/* ... header ... */}
  <div className="flex-1 overflow-y-auto">
    {/* ... tabs e form content ... */}
  </div>
  <DialogFooter className="flex-shrink-0 sticky bottom-0 bg-white border-t pt-4">
    {/* ... botões ... */}
  </DialogFooter>
</DialogContent>
```

- [ ] Verificar TS: zero errors

- [ ] Commit final
```bash
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron add apps/web/src/components/patients/new-patient-modal.tsx
git -C /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron commit -m "feat(patients): required field validation, API tags, improved error handling, modal height fix"
```

---

## Verificação Final

- [ ] `npx tsc --noEmit --project /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/tsconfig.json` → zero errors
- [ ] Todos os 8 critérios de aceite validados manualmente
- [ ] Nenhuma chamada extra de API na listagem de pacientes
- [ ] `masterBypass` mantém comportamento original intacto
