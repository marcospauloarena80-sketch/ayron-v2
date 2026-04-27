<div align="center">

<img src="https://img.shields.io/badge/AYRON-Cognitive%20Clinical%20OS-ff8c00?style=for-the-badge&logoColor=black" />

# AYRON — Cognitive Clinical OS

**Sistema operacional clínico de nova geração com inteligência cognitiva integrada.**  
Projetado para clínicas de endocrinologia, medicina integrativa e procedimentos estéticos.

[![NestJS](https://img.shields.io/badge/API-NestJS%2010-E0234E?style=flat-square&logo=nestjs)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Web-Next.js%2015-000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%206-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL%2015-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)

</div>

---

## Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Módulos do Sistema](#módulos-do-sistema)
- [Camada Cognitiva](#camada-cognitiva)
- [Stack Tecnológica](#stack-tecnológica)
- [Estrutura do Repositório](#estrutura-do-repositório)
- [Início Rápido](#início-rápido)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Docker (Produção)](#docker-produção)
- [Banco de Dados](#banco-de-dados)
- [Testes](#testes)
- [Segurança & Compliance](#segurança--compliance)
- [Roadmap](#roadmap)

---

## Visão Geral

AYRON é um **sistema operacional clínico cognitivo** que combina gestão clínica completa com uma camada de inteligência artificial supervisionada por humanos. O princípio central é **"Jarvis com aval do Tony Stark"** — a IA observa, sugere e solicita aprovação; o médico decide e assina.

### Diferenciais

| Característica | Descrição |
|---|---|
| **Cognitivo v1–v3** | Motor de alertas, scores de risco e predição de comportamento clínico |
| **Multi-tenant** | Isolamento total por `clinic_id` em todas as queries + Row Level Security no PostgreSQL |
| **Audit imutável** | Trigger no banco impede UPDATE/DELETE em `audit_logs` |
| **LGPD-ready** | Consentimento explícito, campos sensíveis criptografados (AES), trilha de acesso |
| **Human-in-the-loop** | Nenhuma ação clínica é executada automaticamente sem aprovação médica |
| **Estoque inteligente** | Predição de consumo, Curva ABC, reserva técnica automática, reposição preditiva |

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         AYRON Platform                          │
├──────────────────────────┬──────────────────────────────────────┤
│     apps/web (Next.js)   │         apps/api (NestJS)            │
│  ┌─────────────────────┐ │  ┌──────────────────────────────┐   │
│  │  App Router (React) │ │  │  REST API  /api/v1            │   │
│  │  TailwindCSS        │ │  │  JWT Auth + RBAC              │   │
│  │  TanStack Query     │ │  │  Prisma ORM                   │   │
│  │  Zustand (auth)     │ │  │  Bull Queues (Redis)          │   │
│  │  React Hook Form    │ │  │  Cron Jobs (Schedule)         │   │
│  └─────────────────────┘ │  └──────────────────────────────┘   │
├──────────────────────────┴──────────────────────────────────────┤
│                      Infrastructure                              │
│   PostgreSQL 15  │  Redis 7  │  MinIO (S3)  │  Docker Compose  │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Request

```
Browser → Next.js (SSR/CSR) → REST API → Guard (JWT) → RBAC
                                       → Prisma → PostgreSQL (RLS)
                                       → AuditService (append-only)
                                       → EventsService → AlertEngine
```

---

## Módulos do Sistema

### Clínico
| Módulo | Descrição |
|---|---|
| **Agenda** | Agendamento com RBAC (médico vê só a própria agenda), Kanban do dia, check-in/checkout |
| **Paciente 360** | Prontuário completo, métricas, bioimpedância, timeline clicável |
| **Consulta** | Evolução com autosave, assinatura digital, bloqueio pós-finalização |
| **Documentos** | Geração PDF, assinatura CFM, upload MinIO, validação em dupla |
| **Protocolos** | Soroterapia, implantes hormonais, agendamento recorrente automático |
| **Bioimpedância** | Upload de resultado + extração OCR + confirmação humana |
| **Prescrições** | Receitas, pedidos de exame, relatórios |

### Financeiro
| Módulo | Descrição |
|---|---|
| **Orçamentos** | DRAFT → SENT → APPROVED → CONVERTED com itens de serviço |
| **Recebíveis** | Contas a receber, pagamento parcial/total, OVERDUE automático |
| **Pagáveis** | Contas a pagar, fornecedores, anexos |
| **Ledger** | Razão de transações, conciliação, transferências entre contas |
| **Fechamento** | Fechamento diário/mensal com detecção de inconsistências |
| **Relatórios** | Resumo, DRE, saúde financeira, auditoria financeira |

### Estoque Inteligente
| Módulo | Descrição |
|---|---|
| **Dashboard KPIs** | 10 indicadores: vencimentos, ruptura, perdas, giro, custo total |
| **Reposição Preditiva** | Cálculo automático baseado em consumo 30d/90d + lead time |
| **Curva ABC** | Classificação automática por valor anual de consumo |
| **Reservas Técnicas** | Reserva automática ao confirmar protocolo/procedimento |
| **Pedidos de Compra** | SUGGESTED → APPROVED → RECEIVED com recebimento parcial |
| **Centro de Perdas** | Registro com tipo, custo estimado e rastreabilidade |
| **Auditoria** | Log append-only de todas as movimentações |

### Cognitivo (IA Supervisionada)
Ver seção [Camada Cognitiva](#camada-cognitiva) abaixo.

---

## Camada Cognitiva

A Camada Cognitiva é o diferencial estratégico do AYRON. Segue os princípios:
- **FDA CDS Guidance** — transparência e supervisão humana
- **WHO AI for Health** — responsabilidade, segurança, explicabilidade
- **EU AI Act Art. 14** — human oversight obrigatório
- **LGPD** — dados sensíveis protegidos, sem PII nos logs cognitivos

### Regras Implementadas (R1–R7)

| Regra | Trigger | Severidade | Destinatário |
|---|---|---|---|
| R1 | Protocolo ativo sem retorno >30d | MEDIUM | MEDICO |
| R2 | Implante próximo da troca (<10d) | HIGH | MEDICO + GERENTE |
| R3 | Consulta finalizada sem documento | LOW | MEDICO |
| R4 | Primeira consulta sem bioimpedância | MEDIUM | MEDICO |
| R5 | Cobrança pendente >7d | HIGH | GERENTE |
| R6 | Checkout sem cobrança gerada | CRITICAL | GERENTE |
| R7 | Slot vago + candidatos na fila | MEDIUM | GERENTE |

### Scores Cognitivos

```
CSS (Risco Clínico)     = f(retorno, implante, peso, bioimp, alertas)
RRS (Risco de Abandono) = f(pendência, faltas, intervalo, dismissals, sem_agendamento)
CRS (Prioridade Geral)  = 0.5×CSS + 0.3×RRS + 0.2×financeiro

NSP (No-Show Probability) = f(faltas, cancel_tardio, RRS, CRS, intervalo)
DR30 (Dropout Risk 30d)   = f(CRS_persistente, RRS, sem_futuro, tasks_ignoradas, pendência)
```

### Playbooks por Faixa

| Faixa | Score | Ações Sugeridas |
|---|---|---|
| 🔴 RED | 70–100 | Priorizar retorno, Waitlist alta prioridade, Checklist consulta, Financeiro |
| 🟡 YELLOW | 40–69 | Sugerir retorno 7–14d, Revisar protocolo/implante |
| 🟢 GREEN | 0–39 | Manter rotina |

---

## Stack Tecnológica

### Backend (`apps/api`)
- **NestJS 10** + TypeScript 5
- **Prisma 6** (ORM com migrations)
- **PostgreSQL 15** com Row Level Security
- **Redis 7** (cache + Bull queues)
- **MinIO** (armazenamento S3-compatible para documentos)
- **JWT** (RS256, access + refresh tokens)
- **@nestjs/schedule** (Cron jobs cognitivos)
- **Multer** (upload de arquivos)
- **bcrypt** (hash de senhas)
- **class-validator / class-transformer** (DTOs)
- **Swagger** (documentação automática em `/api/docs`)

### Frontend (`apps/web`)
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript 5**
- **TailwindCSS 3**
- **TanStack Query v5** (server state)
- **Zustand** (client state — auth)
- **React Hook Form + Zod** (formulários)
- **Lucide React** (ícones)
- **Sonner** (toasts)
- **Axios** (HTTP client)

### DevOps / Infra
- **Turborepo** (monorepo build orchestration)
- **pnpm workspaces** (gerenciamento de dependências)
- **Docker Compose** (dev e produção)
- **GitHub Actions** (CI/CD pipeline)
- **Nginx** (reverse proxy em produção)

---

## Estrutura do Repositório

```
ayron/
├── apps/
│   ├── api/                        # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Modelo de dados completo (2130 linhas)
│   │   │   ├── migrations/         # Histórico de migrations
│   │   │   ├── seed.ts             # Dados iniciais de desenvolvimento
│   │   │   └── sql/                # Scripts SQL (RLS, triggers, audit)
│   │   ├── src/
│   │   │   ├── agenda/             # Agendamento, check-in, Kanban
│   │   │   ├── ai/                 # Módulo de IA/decisão
│   │   │   ├── alerts/             # Cognitivo: alertas, engine, playbooks, cadência
│   │   │   │   ├── alerts.service.ts
│   │   │   │   ├── rules.engine.ts  # R1–R7
│   │   │   │   ├── cognitive.engine.ts  # CSS/RRS/CRS/NSP/DR30
│   │   │   │   ├── cadence.engine.ts    # Tasks operacionais
│   │   │   │   └── alerts.scheduler.ts  # Cron 5min
│   │   │   ├── analytics/          # Dashboard executivo
│   │   │   ├── auth/               # JWT, bcrypt, guards
│   │   │   ├── clinical/           # Consultas, protocolos, implantes, métricas
│   │   │   ├── common/             # Prisma, Audit, decorators, interceptors
│   │   │   ├── communication/      # Mensagens internas
│   │   │   ├── config/             # Configurações de ambiente
│   │   │   ├── dashboard/          # KPIs e aggregations
│   │   │   ├── documents/          # Geração PDF, assinatura, MinIO
│   │   │   ├── events/             # EventLog pipeline
│   │   │   ├── exams/              # Pedidos e resultados de exame
│   │   │   ├── financial/          # Financeiro completo (DRE, ledger, budgets)
│   │   │   ├── forms/              # Formulários dinâmicos
│   │   │   ├── inventory/          # Estoque inteligente completo
│   │   │   ├── patients/           # Cadastro, LGPD, consentimento
│   │   │   ├── professionals/      # Profissionais e RBAC
│   │   │   └── services/           # Catálogo de serviços
│   │   ├── test/                   # Testes E2E (Jest + Supertest)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                        # Frontend Next.js
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/
│       │   │   │   └── login/      # Login com vídeo + animação 6s
│       │   │   └── (dashboard)/
│       │   │       ├── agenda/     # Agenda + Kanban do dia
│       │   │       ├── alerts/     # Central de alertas
│       │   │       ├── analytics/  # Dashboard executivo
│       │   │       ├── clinical/   # Prontuário lateral
│       │   │       ├── dashboard/  # Home com KPIs
│       │   │       ├── financial/  # Financeiro (7 abas)
│       │   │       ├── inventory/  # Estoque (10 sub-páginas)
│       │   │       ├── patients/   # Paciente 360
│       │   │       └── tasks/      # Inbox operacional
│       │   ├── components/
│       │   │   ├── layout/         # Sidebar, Topbar, Providers
│       │   │   ├── patients/       # Brief modal, Cognitive Score, etc
│       │   │   ├── clinical/       # Clinical history, metrics
│       │   │   └── ui/             # Design system (Button, Badge, etc)
│       │   ├── hooks/              # Custom hooks
│       │   ├── lib/                # API client (Axios), utils
│       │   └── store/              # Zustand stores
│       ├── package.json
│       └── next.config.js
│
├── infra/                          # Infrastructure as Code
│   ├── nginx/                      # Nginx config
│   ├── postgres/                   # Init SQL, RLS policies
│   └── docker/                     # Dockerfiles
│
├── tests/                          # Testes de integração / E2E globais
│   └── e2e/
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # Pipeline: lint → typecheck → test → build
│
├── docker-compose.yml              # Desenvolvimento local
├── docker-compose.production.yml   # Produção
├── turbo.json                      # Turborepo pipeline
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example                    # Template de variáveis de ambiente
└── README.md
```

---

## Início Rápido

### Pré-requisitos

- **Node.js** >= 20.x
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **Docker** + **Docker Compose**

### 1. Clonar e instalar

```bash
git clone https://github.com/seu-org/ayron.git
cd ayron
pnpm install
```

### 2. Variáveis de ambiente

```bash
# Copiar templates
cp .env.example apps/api/.env
cp .env.web.example apps/web/.env.local

# Editar com seus valores
nano apps/api/.env
```

### 3. Subir infraestrutura local

```bash
docker compose up -d
# Sobe: PostgreSQL, Redis, MinIO
```

### 4. Banco de dados

```bash
cd apps/api

# Rodar migrations
pnpm prisma migrate dev

# Popular com dados de desenvolvimento
pnpm prisma db seed
```

### 5. Iniciar aplicações

```bash
# Na raiz do projeto — inicia API + Web em paralelo
pnpm dev
```

| Serviço | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:4000 |
| **Swagger** | http://localhost:4000/api/docs |
| **MinIO Console** | http://localhost:9001 |

### 6. Login inicial

```
E-mail: master@ayron.health
Senha:  Ayron@Master2025!
```

---

## Variáveis de Ambiente

### `apps/api/.env`

```bash
# === DATABASE ===
DATABASE_URL="postgresql://ayron:ayron@localhost:5432/ayron_dev"

# === REDIS ===
REDIS_URL="redis://localhost:6379"

# === AUTH ===
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# === APP ===
PORT=4000
NODE_ENV=development

# === MINIO (S3) ===
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="ayron_minio"
MINIO_SECRET_KEY="ayron_minio_password"
MINIO_BUCKET="ayron-docs"
MINIO_REGION="us-east-1"

# === CRIPTOGRAFIA (LGPD) ===
APP_FIELD_ENCRYPTION_KEY="32-char-aes-key-change-in-production"

# === CFM VALIDATION (opcional) ===
CFM_API_URL="https://api.cfm.org.br"
CFM_API_KEY=""
```

### `apps/web/.env.local`

```bash
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
```

---

## Docker (Produção)

```bash
# Build e start completo
docker compose -f docker-compose.production.yml up -d --build

# Migrations em produção
docker compose -f docker-compose.production.yml exec api \
  npx prisma migrate deploy

# Verificar health
curl https://seu-dominio.com/api/v1/health
```

### Serviços em produção

| Serviço | Porta interna | Descrição |
|---|---|---|
| `nginx` | 80/443 | Reverse proxy + SSL |
| `web` | 3000 | Next.js (SSR) |
| `api` | 4000 | NestJS REST API |
| `postgres` | 5432 | PostgreSQL 15 |
| `redis` | 6379 | Redis 7 |
| `minio` | 9000/9001 | Object storage |

---

## Banco de Dados

### Modelos principais (resumo)

```
Organization → Clinic → User (roles: MASTER/ADMIN/GERENTE/MEDICO/SECRETARIA)
Clinic → Patient → Appointment → ClinicalRecord
                 → PatientCognitiveScore (CSS/RRS/CRS/NSP/DR30)
                 → HormoneImplant
                 → TreatmentProtocol → ProtocolSession
                 → PatientMetrics (bioimpedância)
                 → PatientConsent (LGPD)

Clinic → Alert → AlertActionLog (append-only)
       → EventLog (append-only)
       → Task → TaskActionLog
       → Waitlist

Clinic → Budget → BudgetItem → Receivable → LedgerEntry
       → Payable → LedgerEntry
       → FinancialAccount

Clinic → InventoryItem → InventoryMovement
       → InventoryReservation
       → InventoryLoss
       → PurchaseOrder → PurchaseOrderItem
       → Supplier
       → InventoryAuditLog
```

### Segurança de dados

```sql
-- Row Level Security (PostgreSQL)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clinic_isolation ON patients
  USING (clinic_id = current_setting('app.current_clinic')::uuid);

-- Audit log append-only trigger
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
```

---

## Testes

```bash
# Todos os testes
pnpm test

# Apenas API (unit)
cd apps/api && pnpm test

# Apenas API (e2e)
cd apps/api && pnpm test:e2e

# Com cobertura
cd apps/api && pnpm test:cov

# Testes específicos
cd apps/api && pnpm test alerts
cd apps/api && pnpm test inventory
cd apps/api && pnpm test cognitive
```

### Cobertura atual

| Módulo | Cobertura |
|---|---|
| RulesEngine (R1–R7) | ~85% |
| CognitiveEngine (scores) | ~80% |
| CadenceEngine (tasks) | ~75% |
| FinancialService | ~70% |
| InventoryService | ~70% |

---

## Segurança & Compliance

### LGPD
- Consentimento explícito no cadastro de paciente (`PatientConsent`)
- Campos sensíveis criptografados: CPF, telefone (AES-256)
- Direito ao esquecimento: soft delete em todos os modelos
- Logs de acesso a dados sensíveis
- Base legal documentada no modelo de consentimento

### Segurança Técnica
- **JWT** com expiração curta (7d) + refresh token (30d)
- **RBAC** enforçado no backend (não apenas frontend)
- **Row Level Security** no PostgreSQL
- **Audit log imutável** via trigger no banco
- **Rate limiting** nos endpoints de auth
- **Helmet** (HTTP security headers)
- **CORS** configurado por domínio

### Papéis (RBAC)

| Role | Acesso |
|---|---|
| `MASTER` | Total — configurações, relatórios, todos os dados |
| `ADMIN` | Clínica completa — usuários, financeiro, agenda |
| `GERENTE` | Financeiro, agenda, alertas, relatórios operacionais |
| `MEDICO` | Apenas pacientes/consultas atribuídas a ele |
| `SECRETARIA` | Agenda, check-in/out, cadastro de pacientes |

---

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
jobs:
  ci:
    steps:
      - install       # pnpm install
      - typecheck     # tsc --noEmit (API + Web)
      - lint          # eslint
      - test          # jest unit tests
      - build         # turbo build
      - e2e           # playwright (headless)
```

---

## Roadmap

### v1.1 (próximas sprints)
- [ ] WhatsApp integration (cadência de follow-up automática com aprovação)
- [ ] Telemedicina (WebRTC)
- [ ] App mobile (React Native)
- [ ] Open Finance (integração bancária real)

### v1.2
- [ ] ML real (modelo preditivo treinado em dados históricos)
- [ ] Integração com laboratórios (HL7/FHIR)
- [ ] TISS/ANS (convênios)
- [ ] Multi-idioma (PT/EN/ES)

### v2.0
- [ ] Rede de clínicas (marketplace)
- [ ] API pública para integrações
- [ ] Dashboards customizáveis por clínica

---

## Licença

Este projeto é **proprietário e confidencial**.  
© 2025–2026 AYRON Health Technologies. Todos os direitos reservados.

---

<div align="center">
  <sub>Built with ❤️ for the future of clinical intelligence</sub>
</div>
