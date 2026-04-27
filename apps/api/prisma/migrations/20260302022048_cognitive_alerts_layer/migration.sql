-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'SNOOZED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('CLINICAL_OPS', 'FINANCIAL_OPS', 'SCHEDULING');

-- CreateEnum
CREATE TYPE "AlertOwnerRole" AS ENUM ('MEDICO', 'GERENTE', 'ADMIN', 'ALL');

-- CreateEnum
CREATE TYPE "WaitlistReason" AS ENUM ('RETURN', 'IMPLANT', 'NEW_VISIT', 'OTHER');

-- CreateEnum
CREATE TYPE "WaitlistEntryStatus" AS ENUM ('OPEN', 'CONTACTED', 'SCHEDULED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ALERT_ACK';
ALTER TYPE "AuditAction" ADD VALUE 'ALERT_SNOOZE';
ALTER TYPE "AuditAction" ADD VALUE 'ALERT_RESOLVE';
ALTER TYPE "AuditAction" ADD VALUE 'ALERT_DISMISS';
ALTER TYPE "AuditAction" ADD VALUE 'WAITLIST_CONTACTED';
ALTER TYPE "AuditAction" ADD VALUE 'WAITLIST_SCHEDULED';

-- AlterTable
ALTER TABLE "waitlist_entries" ADD COLUMN     "preferred_days_json" JSONB,
ADD COLUMN     "preferred_shift" TEXT,
ADD COLUMN     "preferred_window_end" TEXT,
ADD COLUMN     "preferred_window_start" TEXT,
ADD COLUMN     "priority_score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reason" "WaitlistReason" NOT NULL DEFAULT 'NEW_VISIT',
ADD COLUMN     "status" "WaitlistEntryStatus" NOT NULL DEFAULT 'OPEN';

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "appointment_id" TEXT,
    "rule_key" TEXT NOT NULL,
    "category" "AlertCategory" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "owner_role_target" "AlertOwnerRole" NOT NULL DEFAULT 'ALL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rationale" JSONB NOT NULL,
    "suggested_actions" JSONB NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "due_at" TIMESTAMP(3),
    "snoozed_until" TIMESTAMP(3),
    "dedup_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "resolution_note" TEXT,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_action_logs" (
    "id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_rule_configs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "params" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rule_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_clinic_id_status_severity_idx" ON "alerts"("clinic_id", "status", "severity");

-- CreateIndex
CREATE INDEX "alerts_clinic_id_owner_role_target_status_idx" ON "alerts"("clinic_id", "owner_role_target", "status");

-- CreateIndex
CREATE INDEX "alerts_clinic_id_patient_id_idx" ON "alerts"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "alerts_clinic_id_created_at_idx" ON "alerts"("clinic_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_dedup_key_key" ON "alerts"("dedup_key");

-- CreateIndex
CREATE INDEX "alert_action_logs_alert_id_idx" ON "alert_action_logs"("alert_id");

-- CreateIndex
CREATE INDEX "alert_action_logs_clinic_id_created_at_idx" ON "alert_action_logs"("clinic_id", "created_at");

-- CreateIndex
CREATE INDEX "alert_rule_configs_clinic_id_idx" ON "alert_rule_configs"("clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "alert_rule_configs_clinic_id_rule_key_key" ON "alert_rule_configs"("clinic_id", "rule_key");

-- CreateIndex
CREATE INDEX "waitlist_entries_clinic_id_status_priority_score_idx" ON "waitlist_entries"("clinic_id", "status", "priority_score");

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_action_logs" ADD CONSTRAINT "alert_action_logs_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rule_configs" ADD CONSTRAINT "alert_rule_configs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
