# FASE 2 — Módulo Pacientes: Design Spec

**Data:** 2026-04-25
**Status:** Aprovado com ajustes
**Escopo:** 6 subsistemas dentro do módulo Pacientes. Sem refatoração estrutural.

---

## 1. Indicadores de Pendência no PatientCard

### Problema
Badge "Incompleto" sobrepõe o corner do card. É genérico — não indica qual setor tem pendência. Todos os outros botões (Email, SMS, Questionários, Imprimir) disputam espaço na base do card.

### Solução

**Interface central** em `src/lib/patient-pending-flags.ts`:

```typescript
export interface PatientPendingFlags {
  dados: { hasPending: boolean; reasons: string[] }
  agenda: { hasPending: boolean; reasons: string[] }
  prontuario: { hasPending: boolean; reasons: string[] }
  financeiro: { hasPending: boolean; reasons: string[] }
}

export function getPatientPendingFlags(patient: any): PatientPendingFlags
```

**Lógica por setor:**

| Setor | Condição de pendência | Campo / Fonte |
|-------|-----------------------|---------------|
| Dados | CPF ausente | `patient.cpf` |
| Dados | E-mail ausente | `patient.email` |
| Dados | Telefone ausente | `patient.phone` |
| Dados | Endereço incompleto | `patient.address?.city` ausente |
| Agenda | Sem próxima consulta | `patient.next_appointment_date` nulo |
| Agenda | Retorno vencido | `patient.days_absent > 90` |
| Agenda | Aguardando agendamento | `current_status === 'AGUARDANDO_AGENDAMENTO'` |
| Prontuário | Sem prontuário iniciado | `patient.has_prontuario === false` (campo futuro — padrão: `false`, sem pendência automática se ausente) |
| Financeiro | Pendência financeira | `patient.has_pending_financial === true` (campo futuro — padrão: `false`) |

**Regra crítica:** campos futuros (`has_prontuario`, `has_pending_financial`) que não existem na API atual são tratados como `false` — **não geram pendência automática**. Cada campo futuro deve ter um `// TODO(api): adicionar campo X no endpoint /patients` no código.

**Visual no PatientCard:**
- Remover badge "Incompleto" completamente
- Base do card: apenas 4 botões — **Financeiro · Agenda · Prontuário · Dados**
- Email, SMS, Questionários, Imprimir → movidos para menu "Mais ações" (botão `···` ou `MoreHorizontal`)
- Se setor tem `hasPending === true`: botão recebe dot `animate-ping` (laranja para Dados, vermelho para os demais) + atributo `title` nativo com `reasons.join(', ')`
- Nenhuma chamada extra de API na listagem — apenas dados já disponíveis no objeto `patient`

**Preparação para futura evolução:**
- Estrutura pronta para consumir `/patients/:id/status-summary`
- Flag `source: 'local' | 'remote'` na interface para quando a Abordagem B for implementada

### Arquivos
- **Criar:** `src/lib/patient-pending-flags.ts`
- **Modificar:** `src/app/(dashboard)/patients/page.tsx` — `PatientCard` + remoção do badge + menu "Mais ações"

---

## 2. Acessos Rápidos — Navegação Contextual por Paciente

### Problema
Botões já existem no card mas os destinos (`/agenda`, `/clinical`, `/financial`) não leem `?patientId=...` via searchParams. Navegação sem contexto.

### Solução

**Rotas confirmadas no código:**
- `/patients` → `src/app/(dashboard)/patients/page.tsx` ✅
- `/patients/[id]` → `src/app/(dashboard)/patients/[id]/page.tsx` ✅
- `/agenda` → `src/app/(dashboard)/agenda/page.tsx` ✅
- `/clinical` → `src/app/(dashboard)/clinical/page.tsx` ✅
- `/financial` → `src/app/(dashboard)/financial/page.tsx` ✅

**Origem (PatientCard) — botões de ação:**

| Botão | Rota destino |
|-------|-------------|
| Dados | `/patients/{id}` |
| Agenda | `/agenda?patientId={id}&patientName={nome}` |
| Prontuário | `/clinical?patientId={id}&patientName={nome}` |
| Financeiro | `/financial?patientId={id}&patientName={nome}` |

**Destino — integração por página:**

**`/agenda`** — já tem estado `preselectedPatient: string | undefined`. Conectar via:
```typescript
// No componente AgendaPage, após declaração de estados existentes:
const searchParams = useSearchParams()
const patientIdFromUrl = searchParams.get('patientId')
const patientNameFromUrl = searchParams.get('patientName')

// Inicializar preselectedPatient existente com valor da URL
useEffect(() => {
  if (patientIdFromUrl) setPreselectedPatient(patientIdFromUrl)
}, [patientIdFromUrl])
```
Exibir banner: *"Filtrando por paciente: {patientName}"* com botão X → `setPreselectedPatient(undefined)`.

**`/financial`** — tem `search: string` que filtra por `v.client` (nome do paciente). Conectar via:
```typescript
const searchParams = useSearchParams()
const patientNameFromUrl = searchParams.get('patientName')
const [search, setSearch] = useState(patientNameFromUrl ?? '')
// Banner: se patientNameFromUrl presente, exibir badge "Filtrando por: {patientNameFromUrl}"
```

**`/clinical`** — tem hub de seleção de paciente. Conectar `?patientId` para pré-selecionar paciente no hub:
```typescript
const searchParams = useSearchParams()
const patientIdFromUrl = searchParams.get('patientId')
// Se patientIdFromUrl presente: pular tela de seleção e abrir ProntuarioDetail diretamente
```

**Regra comum nos 3 destinos:**
- Se parâmetro presente: mostrar banner fixo no topo: *"Filtrando por: {patientName}"* com botão X
- Limpar filtro → remove banner, reseta estado local, NÃO altera a URL

### Arquivos
- **Modificar:** `src/app/(dashboard)/agenda/page.tsx` — ler `?patientId`, inicializar `preselectedPatient`
- **Modificar:** `src/app/(dashboard)/clinical/page.tsx` — ler `?patientId`, pré-selecionar paciente no hub
- **Modificar:** `src/app/(dashboard)/financial/page.tsx` — ler `?patientName`, inicializar `search`

---

## 3. Novo Paciente — Validação Obrigatória + Correção de Erros

### Problema
Campos de Endereço e Documentação são todos opcionais no schema atual. Erro "Erro ao criar paciente" exibe mensagem genérica sem diagnóstico.

### Solução

**Campos obrigatórios por aba:**

| Aba | Campo | Condição |
|-----|-------|----------|
| Dados Pessoais | Nome completo | min 3 chars |
| Dados Pessoais | Data de nascimento | obrigatório |
| Dados Pessoais | Sexo | obrigatório |
| Dados Pessoais | Telefone | min 10 dígitos (celular ou fixo) |
| Documentação | CPF | obrigatório se `nationality === 'BR'` |
| Documentação | Tipo de documento | obrigatório se `nationality === 'ESTRANGEIRO'` |
| Documentação | Número do documento | obrigatório se `nationality === 'ESTRANGEIRO'` |
| Endereço | CEP | obrigatório |
| Endereço | Logradouro | obrigatório |
| Endereço | Número | obrigatório |
| Endereço | Cidade | obrigatório |
| Endereço | Estado | obrigatório |

**Abas opcionais** (não bloqueiam criação): Complementares · Preferências · Classificação

**Comportamento ao clicar "Criar Paciente":**
1. Usuário navega livremente entre abas (sem bloqueio)
2. Clica "Criar Paciente" → `handleSubmit` valida schema completo
3. Se erro:
   - Toast: `"Dados incompletos: faltam [lista específica dos campos]"`
   - `setTab()` automático para a primeira aba com erro
   - Campo com erro: borda vermelha + mensagem inline
   - Tab com erro: dot vermelho no seletor
4. `masterBypass` libera todos os campos obrigatórios (comportamento atual mantido)

**Schema:** substituir `schemaFull` com campos obrigatórios corretos. Manter `schemaBypass` para modo master.

**Correção do erro "Erro ao criar paciente":**
```typescript
onError: (e: any) => {
  // Log completo em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.error('[NewPatientModal] payload:', payload)
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

**Modal height fix:**
- `Dialog` com `max-h-[90vh] flex flex-col overflow-hidden`
- Tabs + form content: `flex-1 overflow-y-auto`
- `DialogFooter`: `flex-shrink-0 sticky bottom-0 bg-white border-t pt-4`

### Arquivos
- **Modificar:** `src/components/patients/new-patient-modal.tsx`

---

## 4. Tags — Entidade Centralizada com Permissões

### Problema
Tags criadas localmente no modal sem persistência no banco. Qualquer usuário pode criar. Sem entidade centralizada.

### Solução

**Arquivo de serviço** `src/lib/tags-service.ts`:
```typescript
export interface ClinicTag { id: string; name: string; clinic_id: string }

export const tagsService = {
  list: (): Promise<ClinicTag[]>           // GET /tags
  create: (name: string): Promise<ClinicTag>  // POST /tags
  // assignToPatient não é necessário — tags vão no payload do POST/PATCH /patients
}
```

Se `GET /tags` retornar 404:
- `list()` retorna `DEFAULT_TAGS` mapeados como fallback visual (leitura apenas)
- `create()` lança `TagsApiNotAvailableError`
- UI: botão "Criar Tag" desabilitado com tooltip: *"Criação de tags globais requer atualização do backend (POST /tags)"*

**Permissões:**
```typescript
const CAN_CREATE_TAG = ['GERENTE', 'ADMIN', 'MASTER']
const canCreateTag = CAN_CREATE_TAG.includes(user?.role ?? '')
```
- Usuário sem permissão: vê e seleciona tags existentes. Campo "criar nova tag" não renderizado.
- Usuário com permissão: vê campo + botão "Criar". Chama `tagsService.create()`. Invalida query `['tags']`.

**Fluxo:**
- `useQuery(['tags'])` carrega tags da API com `staleTime: 5min`
- Ao criar tag nova: `tagsService.create()` → `queryClient.invalidateQueries(['tags'])` → lista atualiza
- Seleção de tags atualiza `form.tags` localmente
- **Novo paciente:** tags enviadas no `POST /patients` payload
- **Edição:** tags enviadas no `PATCH /patients/:id` payload

### Arquivos
- **Criar:** `src/lib/tags-service.ts`
- **Modificar:** `src/components/patients/new-patient-modal.tsx` — aba Classificação

---

## 5. Aniversariantes — Filtro de Período + Export Excel/PDF

### Problema
Filtro atual só cobre o mês corrente. Sem export. Sem suporte a intervalos que cruzam ano-virada.

### Solução

**Novas dependências:** `xlsx`, `jspdf`, `jspdf-autotable`

**Serviço de export** `src/lib/birthday-export-service.ts`:
```typescript
export interface PatientBirthdayRow {
  full_name: string; birth_date: string; phone?: string; email?: string
  tags?: string[]; responsavel?: string; current_status?: string; notes?: string
}

export interface BirthdayExportOptions {
  format: 'excel' | 'pdf';
  source: 'client' | 'server';  // 'server' = futuro
  dateFrom: Date;
  dateTo: Date;
  patients: PatientBirthdayRow[];
}

export const birthdayExportService = {
  export: (options: BirthdayExportOptions): Promise<void>
  exportExcel: (rows: PatientBirthdayRow[], dateFrom: Date, dateTo: Date): void
  exportPDF: (rows: PatientBirthdayRow[], dateFrom: Date, dateTo: Date): void
}
```

**Regra de export:** pacientes sem `birth_date` válida são excluídos silenciosamente do relatório. Uma linha de aviso no rodapé do PDF e na última linha do Excel informa quantos foram excluídos (ex: *"3 pacientes sem data de nascimento não incluídos"*).

**Lógica do filtro (dia/mês, ignora ano):**
- Converte `dateFrom` e `dateTo` para `{month, day}`
- Se `dateFrom <= dateTo` (mesmo ano-calendário): inclui pacientes com aniversário entre as datas
- Se `dateFrom > dateTo` (cruza virada de ano, ex: 20/12 → 10/01): inclui aniversariantes de `dateFrom` até 31/12 **OU** de 01/01 até `dateTo`
- Idade calculada dinamicamente: `Math.floor((Date.now() - new Date(birth_date)) / 31557600000)`

**Modal "Aniversariantes":**
- Botão `🎂 Aniversariantes` no header de `/patients/page.tsx`
- Abre modal com: seletor de data inicial + final + preview da lista + botões export
- Preview: tabela scrollável com colunas Nome · Nascimento · Idade · Telefone · Tags
- Se `patients.length > 500`: banner de aviso antes de exportar

**UX:**
1. Clica "Exportar Excel": `setLoading(true)` → `birthdayExportService.exportExcel()` → download automático → `toast.success('Download iniciado')` → `setLoading(false)`
2. Mesmo fluxo para PDF
3. Botão exibe `"Gerando relatório..."` durante loading

**Colunas do relatório (Excel e PDF):**
Nome · Nascimento (DD/MM/YYYY) · Idade · Telefone · E-mail · Tags · Responsável · Status · Observação

**Nomes de arquivo:**
- Excel: `aniversariantes_YYYY-MM-DD.xlsx`
- PDF: `aniversariantes_YYYY-MM-DD.pdf` (onde YYYY-MM-DD = data da exportação)

### Arquivos
- **Criar:** `src/lib/birthday-export-service.ts`
- **Modificar:** `src/app/(dashboard)/patients/page.tsx` — botão + modal Aniversariantes

---

## Restrições

- Sem chamadas extras de API na listagem de pacientes (Abordagem A)
- Campos futuros (`has_prontuario`, `has_pending_financial`) = `false` por padrão, sem gerar pendência
- Tags sem `/tags` backend = leitura apenas (DEFAULT_TAGS), criação desabilitada com aviso
- Tooltip de pendência usa `title` HTML nativo (zero dependências)
- Export é 100% client-side nesta fase (`source: 'client'`)
- Modal de novo paciente usa `max-h-[90vh]` com footer fixo

---

## Dependências a Instalar

```bash
npm install xlsx jspdf jspdf-autotable
```

---

## Testes de Aceitação

1. **Pendências:** Abrir card de paciente com CPF e e-mail ausentes → dot laranja no botão "Dados" com tooltip listando o que falta
2. **Navegação:** Clicar "Agenda" no card → `/agenda?patientId=X` abre com banner "Filtrando por paciente: Nome"
3. **Novo paciente completo:** Preencher as 3 abas obrigatórias → criar → sucesso no banco
4. **Novo paciente incompleto:** Tentar criar sem CEP → toast com campo faltando + aba Endereço ativa com dot vermelho + campo com borda vermelha
5. **Tag como usuário comum:** Aba Classificação → sem campo "criar nova tag" visível
6. **Tag como Gerente/Admin/Master:** Campo visível → criar "DIABETICO" → aparece na lista → selecionar e salvar
7. **Aniversariantes 20/12 → 10/01:** Modal abre → filtrar → lista inclui pacientes de dez e jan → exportar Excel → download com colunas corretas
8. **Aniversariantes PDF:** Mesmo filtro → PDF com título, período e tabela formatada
