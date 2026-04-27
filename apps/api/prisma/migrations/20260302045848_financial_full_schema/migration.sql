-- CreateEnum
CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'PIX', 'OTHER');

-- CreateEnum
CREATE TYPE "CounterpartyType" AS ENUM ('PATIENT', 'SUPPLIER', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayableCategory" AS ENUM ('RENT', 'SUPPLIES', 'STAFF', 'EQUIPMENT', 'MARKETING', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "PayableStatus" AS ENUM ('OPEN', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('RECEIPT', 'PAYMENT', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ProtocolFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'SEMIANNUAL', 'ANNUAL');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "finalization_note" TEXT,
ADD COLUMN     "finalized_at" TIMESTAMP(3),
ADD COLUMN     "kanban_stage" TEXT,
ADD COLUMN     "protocol_id" TEXT,
ADD COLUMN     "return_exception_note" TEXT,
ADD COLUMN     "return_scheduled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stage_skipped_reason" TEXT,
ADD COLUMN     "started_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "appointment_id" TEXT,
ADD COLUMN     "receivable_id" TEXT;

-- AlterTable
ALTER TABLE "patient_metrics" ADD COLUMN     "attachment_key" TEXT,
ADD COLUMN     "bmr" INTEGER,
ADD COLUMN     "extraction_raw" JSONB,
ADD COLUMN     "muscle_mass_kg" DECIMAL(5,2),
ADD COLUMN     "visceral_fat" DECIMAL(5,2);

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "can_be_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_document" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "treatment_protocols" ADD COLUMN     "frequency" "ProtocolFrequency",
ADD COLUMN     "preferred_time" TEXT,
ADD COLUMN     "preferred_weekday" INTEGER,
ADD COLUMN     "total_sessions" INTEGER;

-- CreateTable
CREATE TABLE "financial_accounts" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialAccountType" NOT NULL DEFAULT 'CASH',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparties" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "type" "CounterpartyType" NOT NULL DEFAULT 'OTHER',
    "patient_id" TEXT,
    "name" TEXT NOT NULL,
    "document_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "budget_id" TEXT,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "payment_terms" JSONB,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "counterparty_id" TEXT,
    "category" "PayableCategory" NOT NULL DEFAULT 'OTHER',
    "status" "PayableStatus" NOT NULL DEFAULT 'OPEN',
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "attachment_key" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "account_id" TEXT,
    "account_to_id" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "receivable_id" TEXT,
    "payable_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'OTHER',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_action_logs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_accounts_clinic_id_is_active_idx" ON "financial_accounts"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "counterparties_clinic_id_type_idx" ON "counterparties"("clinic_id", "type");

-- CreateIndex
CREATE INDEX "receivables_clinic_id_status_due_date_idx" ON "receivables"("clinic_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "receivables_clinic_id_patient_id_idx" ON "receivables"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "receivables_appointment_id_idx" ON "receivables"("appointment_id");

-- CreateIndex
CREATE INDEX "payables_clinic_id_status_due_date_idx" ON "payables"("clinic_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "payables_clinic_id_category_idx" ON "payables"("clinic_id", "category");

-- CreateIndex
CREATE INDEX "ledger_entries_clinic_id_type_occurred_at_idx" ON "ledger_entries"("clinic_id", "type", "occurred_at");

-- CreateIndex
CREATE INDEX "ledger_entries_clinic_id_receivable_id_idx" ON "ledger_entries"("clinic_id", "receivable_id");

-- CreateIndex
CREATE INDEX "ledger_entries_clinic_id_payable_id_idx" ON "ledger_entries"("clinic_id", "payable_id");

-- CreateIndex
CREATE INDEX "financial_action_logs_clinic_id_entity_type_entity_id_idx" ON "financial_action_logs"("clinic_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "financial_action_logs_clinic_id_created_at_idx" ON "financial_action_logs"("clinic_id", "created_at");

-- AddForeignKey
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparties" ADD CONSTRAINT "counterparties_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_to_id_fkey" FOREIGN KEY ("account_to_id") REFERENCES "financial_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_action_logs" ADD CONSTRAINT "financial_action_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
