# Graph Report - /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron  (2026-04-23)

## Corpus Check
- 187 files · ~98,234 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 913 nodes · 1104 edges · 83 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 205 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Alerts & Waitlist Engine|Alerts & Waitlist Engine]]
- [[_COMMUNITY_Inventory & Purchase Orders|Inventory & Purchase Orders]]
- [[_COMMUNITY_E2E Tests & Fixtures|E2E Tests & Fixtures]]
- [[_COMMUNITY_Alerts Controller|Alerts Controller]]
- [[_COMMUNITY_PDF & Document Storage|PDF & Document Storage]]
- [[_COMMUNITY_Finance Full Controller|Finance Full Controller]]
- [[_COMMUNITY_App Bootstrap & Health|App Bootstrap & Health]]
- [[_COMMUNITY_Alerts Engine Rules|Alerts Engine Rules]]
- [[_COMMUNITY_Agenda Service|Agenda Service]]
- [[_COMMUNITY_Bioimpedância & Clinical|Bioimpedância & Clinical]]
- [[_COMMUNITY_Crypto & Patients Service|Crypto & Patients Service]]
- [[_COMMUNITY_Communication Service|Communication Service]]
- [[_COMMUNITY_Cognitive Engine (CSSRRSCRS)|Cognitive Engine (CSS/RRS/CRS)]]
- [[_COMMUNITY_Agenda Controller|Agenda Controller]]
- [[_COMMUNITY_Documents Controller|Documents Controller]]
- [[_COMMUNITY_Dashboard UI Pages|Dashboard UI Pages]]
- [[_COMMUNITY_Patient & Document Modals|Patient & Document Modals]]
- [[_COMMUNITY_Patients Controller|Patients Controller]]
- [[_COMMUNITY_Financial Controller|Financial Controller]]
- [[_COMMUNITY_Prisma + RLS Interceptor|Prisma + RLS Interceptor]]
- [[_COMMUNITY_Professionals Controller|Professionals Controller]]
- [[_COMMUNITY_Professionals Service|Professionals Service]]
- [[_COMMUNITY_Protocol Scheduler|Protocol Scheduler]]
- [[_COMMUNITY_Services Controller|Services Controller]]
- [[_COMMUNITY_Auth & Sidebar|Auth & Sidebar]]
- [[_COMMUNITY_Exams Controller|Exams Controller]]
- [[_COMMUNITY_Kanban View|Kanban View]]
- [[_COMMUNITY_Cadence Spec Tests|Cadence Spec Tests]]
- [[_COMMUNITY_Dashboard Service|Dashboard Service]]
- [[_COMMUNITY_Playwright E2E Config|Playwright E2E Config]]
- [[_COMMUNITY_Settings & Status Pages|Settings & Status Pages]]
- [[_COMMUNITY_Auth Controller|Auth Controller]]
- [[_COMMUNITY_Dashboard Controller|Dashboard Controller]]
- [[_COMMUNITY_Debug E2E Tests|Debug E2E Tests]]
- [[_COMMUNITY_TanStack Query Providers|TanStack Query Providers]]
- [[_COMMUNITY_JWT Strategy|JWT Strategy]]
- [[_COMMUNITY_Playbook Spec|Playbook Spec]]
- [[_COMMUNITY_Scheduling Rules|Scheduling Rules]]
- [[_COMMUNITY_Roles Guard|Roles Guard]]
- [[_COMMUNITY_AYRON Chat Page|AYRON Chat Page]]
- [[_COMMUNITY_Exam DTOs|Exam DTOs]]
- [[_COMMUNITY_Protocol DTOs|Protocol DTOs]]
- [[_COMMUNITY_Document DTOs|Document DTOs]]
- [[_COMMUNITY_App Module|App Module]]
- [[_COMMUNITY_Patients Module|Patients Module]]
- [[_COMMUNITY_Create Patient DTO|Create Patient DTO]]
- [[_COMMUNITY_Change Status DTO|Change Status DTO]]
- [[_COMMUNITY_Update Patient DTO|Update Patient DTO]]
- [[_COMMUNITY_Financial Module|Financial Module]]
- [[_COMMUNITY_Create Transaction DTO|Create Transaction DTO]]
- [[_COMMUNITY_Professionals Module|Professionals Module]]
- [[_COMMUNITY_Create Professional DTO|Create Professional DTO]]
- [[_COMMUNITY_Auth Module|Auth Module]]
- [[_COMMUNITY_Login DTO|Login DTO]]
- [[_COMMUNITY_Alerts Module|Alerts Module]]
- [[_COMMUNITY_Add Waitlist Action DTO|Add Waitlist Action DTO]]
- [[_COMMUNITY_Query Alerts DTO|Query Alerts DTO]]
- [[_COMMUNITY_Resolve Alert DTO|Resolve Alert DTO]]
- [[_COMMUNITY_Snooze Alert DTO|Snooze Alert DTO]]
- [[_COMMUNITY_Create Charge Action DTO|Create Charge Action DTO]]
- [[_COMMUNITY_Dashboard Module|Dashboard Module]]
- [[_COMMUNITY_Crypto Module|Crypto Module]]
- [[_COMMUNITY_Prisma Module|Prisma Module]]
- [[_COMMUNITY_PDF Module|PDF Module]]
- [[_COMMUNITY_Storage Module|Storage Module]]
- [[_COMMUNITY_Audit Module|Audit Module]]
- [[_COMMUNITY_Inventory Module|Inventory Module]]
- [[_COMMUNITY_Create Movement DTO|Create Movement DTO]]
- [[_COMMUNITY_Create Item DTO|Create Item DTO]]
- [[_COMMUNITY_Exams Module|Exams Module]]
- [[_COMMUNITY_Agenda Module|Agenda Module]]
- [[_COMMUNITY_Update Appointment DTO|Update Appointment DTO]]
- [[_COMMUNITY_Create Appointment DTO|Create Appointment DTO]]
- [[_COMMUNITY_Clinical Module|Clinical Module]]
- [[_COMMUNITY_Create Clinical Record DTO|Create Clinical Record DTO]]
- [[_COMMUNITY_Create Implant DTO|Create Implant DTO]]
- [[_COMMUNITY_Create Patient Metrics DTO|Create Patient Metrics DTO]]
- [[_COMMUNITY_Documents Module|Documents Module]]
- [[_COMMUNITY_Communication Module|Communication Module]]
- [[_COMMUNITY_Create Message DTO|Create Message DTO]]
- [[_COMMUNITY_Events Module|Events Module]]
- [[_COMMUNITY_Services Module|Services Module]]
- [[_COMMUNITY_Create Service DTO|Create Service DTO]]

## God Nodes (most connected - your core abstractions)
1. `InventoryService` - 38 edges
2. `InventoryController` - 35 edges
3. `AlertsController` - 34 edges
4. `FinanceFullService` - 29 edges
5. `FinanceFullController` - 27 edges
6. `ClinicalController` - 17 edges
7. `CognitiveEngine` - 16 edges
8. `CadenceEngine` - 15 edges
9. `AgendaController` - 15 edges
10. `AgendaService` - 14 edges

## Surprising Connections (you probably didn't know these)
- `formatDate()` --calls--> `format()`  [INFERRED]
  /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/api/src/common/pdf/templates/document.template.ts → /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/src/app/(dashboard)/patients/[id]/appointments/[appointmentId]/page.tsx
- `handleClose()` --calls--> `reset()`  [INFERRED]
  /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/src/components/patients/new-patient-modal.tsx → /Users/marcospaulosoliveira/.verdent/verdent-projects/Ayron/apps/web/src/components/documents/create-document-modal.tsx

## Communities

### Community 0 - "Alerts & Waitlist Engine"
Cohesion: 0.05
Nodes (8): AlertsService, AuditService, ClinicalService, FinanceFullService, pag(), bootstrap(), main(), ServicesService

### Community 1 - "Inventory & Purchase Orders"
Cohesion: 0.04
Nodes (2): InventoryController, InventoryService

### Community 2 - "E2E Tests & Fixtures"
Cohesion: 0.04
Nodes (16): AYRON — Teste E2E do Fluxo Clínico Completo Cobre: login, criar paciente, agenda, Login com credenciais válidas → redireciona para /dashboard., Login com senha errada → permanece em /login com mensagem de erro., Cria paciente via API e verifica response., TestAgenda, TestAPIHealth, TestClinicalHub, TestDashboard (+8 more)

### Community 3 - "Alerts Controller"
Cohesion: 0.06
Nodes (4): AlertsController, CreateWaitlistDto, ScheduleWaitlistDto, TasksService

### Community 4 - "PDF & Document Storage"
Cohesion: 0.08
Nodes (9): CommunicationController, buildDocumentHtml(), escapeHtml(), formatDate(), statusLabel(), DocumentsService, format(), PdfService (+1 more)

### Community 5 - "Finance Full Controller"
Cohesion: 0.05
Nodes (2): FinanceFullController, FinancialService

### Community 6 - "App Bootstrap & Health"
Cohesion: 0.08
Nodes (7): AppController, CadenceEngine, daysFromNow(), HttpExceptionFilter, act(), cn(), daysUntil()

### Community 7 - "Alerts Engine Rules"
Cohesion: 0.11
Nodes (5): AlertsEngine, calculateScore(), AlertsScheduler, ClinicalRules, FinancialRules

### Community 8 - "Agenda Service"
Cohesion: 0.15
Nodes (3): AgendaService, EventsService, ExamsService

### Community 9 - "Bioimpedância & Clinical"
Cohesion: 0.09
Nodes (2): BioimpedanciaService, ClinicalController

### Community 10 - "Crypto & Patients Service"
Cohesion: 0.18
Nodes (2): CryptoService, PatientsService

### Community 11 - "Communication Service"
Cohesion: 0.12
Nodes (3): CommunicationService, handleKeyDown(), sendMessage()

### Community 12 - "Cognitive Engine (CSS/RRS/CRS)"
Cohesion: 0.23
Nodes (2): cap(), CognitiveEngine

### Community 13 - "Agenda Controller"
Cohesion: 0.12
Nodes (2): AgendaController, CancelDto

### Community 14 - "Documents Controller"
Cohesion: 0.13
Nodes (2): DocumentsController, PatientDocumentsController

### Community 15 - "Dashboard UI Pages"
Cohesion: 0.18
Nodes (2): fmt(), toggle()

### Community 16 - "Patient & Document Modals"
Cohesion: 0.18
Nodes (3): handleClose(), reset(), handleClose()

### Community 17 - "Patients Controller"
Cohesion: 0.18
Nodes (1): PatientsController

### Community 18 - "Financial Controller"
Cohesion: 0.2
Nodes (1): FinancialController

### Community 19 - "Prisma + RLS Interceptor"
Cohesion: 0.22
Nodes (2): PrismaService, RlsInterceptor

### Community 20 - "Professionals Controller"
Cohesion: 0.25
Nodes (1): ProfessionalsController

### Community 21 - "Professionals Service"
Cohesion: 0.36
Nodes (1): ProfessionalsService

### Community 22 - "Protocol Scheduler"
Cohesion: 0.36
Nodes (4): addDays(), getPreferredSlot(), nextOccurrence(), ProtocolSchedulerService

### Community 23 - "Services Controller"
Cohesion: 0.25
Nodes (1): ServicesController

### Community 24 - "Auth & Sidebar"
Cohesion: 0.29
Nodes (2): AuthService, handleLogout()

### Community 25 - "Exams Controller"
Cohesion: 0.29
Nodes (1): ExamsController

### Community 26 - "Kanban View"
Cohesion: 0.47
Nodes (3): getStage(), handleDrop(), stageIndex()

### Community 27 - "Cadence Spec Tests"
Cohesion: 0.4
Nodes (2): daysAgo(), makeTask()

### Community 28 - "Dashboard Service"
Cohesion: 0.4
Nodes (1): DashboardService

### Community 29 - "Playwright E2E Config"
Cohesion: 0.4
Nodes (2): auth_page(), Page already logged in via browser UI (sets both cookie + localStorage).

### Community 32 - "Settings & Status Pages"
Cohesion: 0.4
Nodes (1): f()

### Community 35 - "Auth Controller"
Cohesion: 0.4
Nodes (1): AuthController

### Community 36 - "Dashboard Controller"
Cohesion: 0.4
Nodes (1): DashboardController

### Community 37 - "Debug E2E Tests"
Cohesion: 0.5
Nodes (1): Debug: captura HTML real de páginas problemáticas

### Community 40 - "TanStack Query Providers"
Cohesion: 0.83
Nodes (3): getQueryClient(), makeQueryClient(), Providers()

### Community 41 - "JWT Strategy"
Cohesion: 0.5
Nodes (1): JwtStrategy

### Community 43 - "Playbook Spec"
Cohesion: 0.67
Nodes (2): makePrisma(), makeRedPrisma()

### Community 44 - "Scheduling Rules"
Cohesion: 0.5
Nodes (1): SchedulingRules

### Community 45 - "Roles Guard"
Cohesion: 0.5
Nodes (1): RolesGuard

### Community 47 - "AYRON Chat Page"
Cohesion: 1.0
Nodes (2): handleKey(), send()

### Community 55 - "Exam DTOs"
Cohesion: 0.67
Nodes (2): CreateExamDto, CreateExamMarkerDto

### Community 56 - "Protocol DTOs"
Cohesion: 0.67
Nodes (2): CreateProtocolDto, UpdateProtocolDto

### Community 57 - "Document DTOs"
Cohesion: 0.67
Nodes (2): CreateDocumentDto, UpdateDocumentDto

### Community 87 - "App Module"
Cohesion: 1.0
Nodes (1): AppModule

### Community 88 - "Patients Module"
Cohesion: 1.0
Nodes (1): PatientsModule

### Community 89 - "Create Patient DTO"
Cohesion: 1.0
Nodes (1): CreatePatientDto

### Community 90 - "Change Status DTO"
Cohesion: 1.0
Nodes (1): ChangeStatusDto

### Community 91 - "Update Patient DTO"
Cohesion: 1.0
Nodes (1): UpdatePatientDto

### Community 92 - "Financial Module"
Cohesion: 1.0
Nodes (1): FinancialModule

### Community 93 - "Create Transaction DTO"
Cohesion: 1.0
Nodes (1): CreateTransactionDto

### Community 94 - "Professionals Module"
Cohesion: 1.0
Nodes (1): ProfessionalsModule

### Community 95 - "Create Professional DTO"
Cohesion: 1.0
Nodes (1): CreateProfessionalDto

### Community 96 - "Auth Module"
Cohesion: 1.0
Nodes (1): AuthModule

### Community 97 - "Login DTO"
Cohesion: 1.0
Nodes (1): LoginDto

### Community 98 - "Alerts Module"
Cohesion: 1.0
Nodes (1): AlertsModule

### Community 99 - "Add Waitlist Action DTO"
Cohesion: 1.0
Nodes (1): AddWaitlistActionDto

### Community 100 - "Query Alerts DTO"
Cohesion: 1.0
Nodes (1): QueryAlertsDto

### Community 101 - "Resolve Alert DTO"
Cohesion: 1.0
Nodes (1): ResolveAlertDto

### Community 102 - "Snooze Alert DTO"
Cohesion: 1.0
Nodes (1): SnoozeAlertDto

### Community 103 - "Create Charge Action DTO"
Cohesion: 1.0
Nodes (1): CreateChargeActionDto

### Community 106 - "Dashboard Module"
Cohesion: 1.0
Nodes (1): DashboardModule

### Community 107 - "Crypto Module"
Cohesion: 1.0
Nodes (1): CryptoModule

### Community 109 - "Prisma Module"
Cohesion: 1.0
Nodes (1): PrismaModule

### Community 110 - "PDF Module"
Cohesion: 1.0
Nodes (1): PdfModule

### Community 111 - "Storage Module"
Cohesion: 1.0
Nodes (1): StorageModule

### Community 112 - "Audit Module"
Cohesion: 1.0
Nodes (1): AuditModule

### Community 113 - "Inventory Module"
Cohesion: 1.0
Nodes (1): InventoryModule

### Community 114 - "Create Movement DTO"
Cohesion: 1.0
Nodes (1): CreateMovementDto

### Community 115 - "Create Item DTO"
Cohesion: 1.0
Nodes (1): CreateItemDto

### Community 116 - "Exams Module"
Cohesion: 1.0
Nodes (1): ExamsModule

### Community 117 - "Agenda Module"
Cohesion: 1.0
Nodes (1): AgendaModule

### Community 118 - "Update Appointment DTO"
Cohesion: 1.0
Nodes (1): UpdateAppointmentDto

### Community 119 - "Create Appointment DTO"
Cohesion: 1.0
Nodes (1): CreateAppointmentDto

### Community 120 - "Clinical Module"
Cohesion: 1.0
Nodes (1): ClinicalModule

### Community 121 - "Create Clinical Record DTO"
Cohesion: 1.0
Nodes (1): CreateClinicalRecordDto

### Community 122 - "Create Implant DTO"
Cohesion: 1.0
Nodes (1): CreateImplantDto

### Community 123 - "Create Patient Metrics DTO"
Cohesion: 1.0
Nodes (1): CreatePatientMetricsDto

### Community 124 - "Documents Module"
Cohesion: 1.0
Nodes (1): DocumentsModule

### Community 125 - "Communication Module"
Cohesion: 1.0
Nodes (1): CommunicationModule

### Community 126 - "Create Message DTO"
Cohesion: 1.0
Nodes (1): CreateMessageDto

### Community 127 - "Events Module"
Cohesion: 1.0
Nodes (1): EventsModule

### Community 128 - "Services Module"
Cohesion: 1.0
Nodes (1): ServicesModule

### Community 129 - "Create Service DTO"
Cohesion: 1.0
Nodes (1): CreateServiceDto

## Knowledge Gaps
- **55 isolated node(s):** `AYRON — Teste E2E do Fluxo Clínico Completo Cobre: login, criar paciente, agenda`, `Login com credenciais válidas → redireciona para /dashboard.`, `Login com senha errada → permanece em /login com mensagem de erro.`, `Cria paciente via API e verifica response.`, `Page already logged in via browser UI (sets both cookie + localStorage).` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Inventory & Purchase Orders`** (74 nodes): `inventory.controller.ts`, `inventory.service.ts`, `InventoryController`, `.approvePurchaseOrder()`, `.cancelPurchaseOrder()`, `.cancelReservation()`, `.constructor()`, `.consumeReservation()`, `.create()`, `.createPurchaseOrder()`, `.createReservation()`, `.createSupplier()`, `.deleteSupplier()`, `.findAll()`, `.findOne()`, `.getABC()`, `.getAlerts()`, `.getConsumptionReport()`, `.getCritical()`, `.getDashboard()`, `.getExpired()`, `.getExpiring()`, `.getLosses()`, `.getLossesReport()`, `.getPurchaseOrders()`, `.getReorder()`, `.getReservations()`, `.getSuppliers()`, `.getTurnoverReport()`, `.move()`, `.receivePurchaseOrder()`, `.registerLoss()`, `.update()`, `.updateSupplier()`, `.validateOcr()`, `.validateOcr2()`, `InventoryService`, `.approvePurchaseOrder()`, `.calculateABC()`, `.cancelPurchaseOrder()`, `.cancelReservation()`, `.constructor()`, `.consumeReservation()`, `.create()`, `.createPurchaseOrder()`, `.createReservation()`, `.createSupplier()`, `.dailyInventoryCheck()`, `.deleteSupplier()`, `.findAll()`, `.findOne()`, `.getAuditLog()`, `.getConsumptionReport()`, `.getCriticalItems()`, `.getDashboardKPIs()`, `.getExpiredItems()`, `.getExpiringItems()`, `.getLosses()`, `.getLowStockAlerts()`, `.getPurchaseOrders()`, `.getReorderSuggestions()`, `.getReservations()`, `.getSuppliers()`, `.getTurnoverReport()`, `.logAudit()`, `.move()`, `.receivePurchaseOrder()`, `.registerLoss()`, `.update()`, `.updateConsumptionMetrics()`, `.updateConsumptionMetricsAllClinics()`, `.updateExpiredStatus()`, `.updateSupplier()`, `.validateOcr()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Finance Full Controller`** (38 nodes): `finance-full.controller.ts`, `financial.service.ts`, `FinanceFullController`, `.approveBudget()`, `.cancelPayable()`, `.cancelReceivable()`, `.closeDay()`, `.constructor()`, `.convertBudget()`, `.createAccount()`, `.createBudget()`, `.createCounterparty()`, `.createPayable()`, `.createReceivable()`, `.createTransfer()`, `.getAudit()`, `.getDRE()`, `.getHealth()`, `.getPatientFinancialStatus()`, `.getSummary()`, `.listAccounts()`, `.listBudgets()`, `.listCounterparties()`, `.listLedger()`, `.listPayables()`, `.listReceivables()`, `.markPayablePaid()`, `.markReceivablePaid()`, `.updateAccount()`, `FinancialService`, `.constructor()`, `.create()`, `.findAll()`, `.findByPatient()`, `.getDRE()`, `.getHealthScore()`, `.getPatientBalance()`, `.getAuditLog()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bioimpedância & Clinical`** (24 nodes): `bioimpedancia.service.ts`, `clinical.controller.ts`, `BioimpedanciaService`, `.constructor()`, `.extractFromFilename()`, `.uploadAndExtract()`, `ClinicalController`, `.confirmBioimpedance()`, `.constructor()`, `.createImplant()`, `.createMetrics()`, `.createProtocol()`, `.createRecord()`, `.generateProtocolSlots()`, `.getActiveAppointment()`, `.getAppointmentRecord()`, `.getMetricsHistory()`, `.getPatientHistory()`, `.getPatientImplants()`, `.getPatientProtocols()`, `.getProtocolSessions()`, `.updateProtocol()`, `.uploadBioimpedance()`, `.getPatientMetricsHistory()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Crypto & Patients Service`** (20 nodes): `crypto.service.ts`, `patients.service.ts`, `CryptoService`, `.constructor()`, `.decrypt()`, `.encrypt()`, `.hashForSearch()`, `.isEnabled()`, `.onModuleInit()`, `PatientsService`, `.addConsent()`, `.changeStatus()`, `.constructor()`, `.create()`, `.decryptPatient()`, `.findAll()`, `.findOne()`, `.getKanban()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cognitive Engine (CSS/RRS/CRS)`** (18 nodes): `.runScores()`, `cognitive.engine.ts`, `cap()`, `CognitiveEngine`, `.calcCDT()`, `.calcCSS()`, `.calcDR30()`, `.calcFinancialPriority()`, `.calcNSP()`, `.calcRRS()`, `.constructor()`, `.getPatientBrief()`, `.getPlaybookActions()`, `.getThresholds()`, `.onEvent()`, `.runClinicScores()`, `.runPatientScore()`, `.runScheduled()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Agenda Controller`** (17 nodes): `AgendaController`, `.cancel()`, `.checkIn()`, `.checkOut()`, `.constructor()`, `.create()`, `.finalizeConsulta()`, `.findAll()`, `.findByPatient()`, `.findOne()`, `.getDailyClosingStatus()`, `.performDailyClosing()`, `.startConsulta()`, `.update()`, `.updateKanbanStage()`, `CancelDto`, `agenda.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Documents Controller`** (15 nodes): `.cancelTask()`, `documents.controller.ts`, `DocumentsController`, `.cancel()`, `.constructor()`, `.create()`, `.download()`, `.findOne()`, `.retryPdfUpload()`, `.sign()`, `.update()`, `.uploadValidated()`, `PatientDocumentsController`, `.constructor()`, `.findByPatient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard UI Pages`** (12 nodes): `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `fmt()`, `fmtCpf()`, `fmtPhone()`, `InfoItem()`, `KpiCard()`, `Section()`, `SectionTitle()`, `toggle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Patients Controller`** (11 nodes): `patients.controller.ts`, `PatientsController`, `.addConsent()`, `.changeStatus()`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.getKanban()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Financial Controller`** (10 nodes): `financial.controller.ts`, `FinancialController`, `.constructor()`, `.create()`, `.findAll()`, `.findByPatient()`, `.getDRE()`, `.getHealthScore()`, `.getPatientBalance()`, `.markPaid()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma + RLS Interceptor`** (10 nodes): `rls.interceptor.ts`, `prisma.service.ts`, `PrismaService`, `.applySqlSetup()`, `.onModuleDestroy()`, `.onModuleInit()`, `.setClinicContext()`, `RlsInterceptor`, `.constructor()`, `.intercept()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Professionals Controller`** (8 nodes): `professionals.controller.ts`, `ProfessionalsController`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Professionals Service`** (8 nodes): `professionals.service.ts`, `ProfessionalsService`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Services Controller`** (8 nodes): `services.controller.ts`, `ServicesController`, `.constructor()`, `.create()`, `.findAll()`, `.findOne()`, `.remove()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth & Sidebar`** (7 nodes): `auth.service.ts`, `sidebar.tsx`, `AuthService`, `.constructor()`, `.logout()`, `getBadgeCount()`, `handleLogout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Exams Controller`** (7 nodes): `exams.controller.ts`, `ExamsController`, `.constructor()`, `.create()`, `.findByPatient()`, `.findOne()`, `.getMarkerTrend()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cadence Spec Tests`** (6 nodes): `cadence.spec.ts`, `daysAgo()`, `daysFromNow()`, `makeAudit()`, `makePrisma()`, `makeTask()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Service`** (6 nodes): `dashboard.service.ts`, `DashboardService`, `.constructor()`, `.getExecutiveMetrics()`, `.getOverview()`, `.getWeeklyChart()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Playwright E2E Config`** (5 nodes): `auth_page()`, `browser_instance()`, `page()`, `Page already logged in via browser UI (sets both cookie + localStorage).`, `conftest.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings & Status Pages`** (5 nodes): `page.tsx`, `page.tsx`, `page.tsx`, `f()`, `getStatusColor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Controller`** (5 nodes): `auth.controller.ts`, `AuthController`, `.constructor()`, `.login()`, `.logout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Controller`** (5 nodes): `dashboard.controller.ts`, `DashboardController`, `.constructor()`, `.getOverview()`, `.getWeeklyChart()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Debug E2E Tests`** (4 nodes): `Debug: captura HTML real de páginas problemáticas`, `test_financial_debug()`, `test_inventory_debug()`, `test_debug.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `JWT Strategy`** (4 nodes): `jwt.strategy.ts`, `JwtStrategy`, `.constructor()`, `.validate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Playbook Spec`** (4 nodes): `playbook.spec.ts`, `makeAudit()`, `makePrisma()`, `makeRedPrisma()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Scheduling Rules`** (4 nodes): `scheduling.rules.ts`, `SchedulingRules`, `.checkSlotCandidates()`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Roles Guard`** (4 nodes): `roles.guard.ts`, `RolesGuard`, `.canActivate()`, `.constructor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AYRON Chat Page`** (3 nodes): `page.tsx`, `handleKey()`, `send()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Exam DTOs`** (3 nodes): `create-exam.dto.ts`, `CreateExamDto`, `CreateExamMarkerDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Protocol DTOs`** (3 nodes): `create-protocol.dto.ts`, `CreateProtocolDto`, `UpdateProtocolDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Document DTOs`** (3 nodes): `document.dto.ts`, `CreateDocumentDto`, `UpdateDocumentDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Module`** (2 nodes): `AppModule`, `app.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Patients Module`** (2 nodes): `patients.module.ts`, `PatientsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Patient DTO`** (2 nodes): `create-patient.dto.ts`, `CreatePatientDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Change Status DTO`** (2 nodes): `change-status.dto.ts`, `ChangeStatusDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Update Patient DTO`** (2 nodes): `update-patient.dto.ts`, `UpdatePatientDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Financial Module`** (2 nodes): `financial.module.ts`, `FinancialModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Transaction DTO`** (2 nodes): `create-transaction.dto.ts`, `CreateTransactionDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Professionals Module`** (2 nodes): `professionals.module.ts`, `ProfessionalsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Professional DTO`** (2 nodes): `create-professional.dto.ts`, `CreateProfessionalDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Module`** (2 nodes): `auth.module.ts`, `AuthModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login DTO`** (2 nodes): `login.dto.ts`, `LoginDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Alerts Module`** (2 nodes): `AlertsModule`, `alerts.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Add Waitlist Action DTO`** (2 nodes): `AddWaitlistActionDto`, `add-waitlist-action.dto.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Query Alerts DTO`** (2 nodes): `query-alerts.dto.ts`, `QueryAlertsDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Resolve Alert DTO`** (2 nodes): `resolve-alert.dto.ts`, `ResolveAlertDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Snooze Alert DTO`** (2 nodes): `snooze-alert.dto.ts`, `SnoozeAlertDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Charge Action DTO`** (2 nodes): `create-charge-action.dto.ts`, `CreateChargeActionDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Module`** (2 nodes): `dashboard.module.ts`, `DashboardModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Crypto Module`** (2 nodes): `crypto.module.ts`, `CryptoModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Prisma Module`** (2 nodes): `prisma.module.ts`, `PrismaModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PDF Module`** (2 nodes): `pdf.module.ts`, `PdfModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Storage Module`** (2 nodes): `storage.module.ts`, `StorageModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit Module`** (2 nodes): `audit.module.ts`, `AuditModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Inventory Module`** (2 nodes): `inventory.module.ts`, `InventoryModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Movement DTO`** (2 nodes): `create-movement.dto.ts`, `CreateMovementDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Item DTO`** (2 nodes): `create-item.dto.ts`, `CreateItemDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Exams Module`** (2 nodes): `exams.module.ts`, `ExamsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Agenda Module`** (2 nodes): `AgendaModule`, `agenda.module.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Update Appointment DTO`** (2 nodes): `update-appointment.dto.ts`, `UpdateAppointmentDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Appointment DTO`** (2 nodes): `create-appointment.dto.ts`, `CreateAppointmentDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Clinical Module`** (2 nodes): `clinical.module.ts`, `ClinicalModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Clinical Record DTO`** (2 nodes): `create-clinical-record.dto.ts`, `CreateClinicalRecordDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Implant DTO`** (2 nodes): `create-implant.dto.ts`, `CreateImplantDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Patient Metrics DTO`** (2 nodes): `create-patient-metrics.dto.ts`, `CreatePatientMetricsDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Documents Module`** (2 nodes): `documents.module.ts`, `DocumentsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Communication Module`** (2 nodes): `communication.module.ts`, `CommunicationModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Message DTO`** (2 nodes): `create-message.dto.ts`, `CreateMessageDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Events Module`** (2 nodes): `events.module.ts`, `EventsModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Services Module`** (2 nodes): `services.module.ts`, `ServicesModule`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Service DTO`** (2 nodes): `create-service.dto.ts`, `CreateServiceDto`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InventoryController` connect `Inventory & Purchase Orders` to `Finance Full Controller`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `AYRON — Teste E2E do Fluxo Clínico Completo Cobre: login, criar paciente, agenda`, `Login com credenciais válidas → redireciona para /dashboard.`, `Login com senha errada → permanece em /login com mensagem de erro.` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Alerts & Waitlist Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Inventory & Purchase Orders` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `E2E Tests & Fixtures` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Alerts Controller` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `PDF & Document Storage` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._