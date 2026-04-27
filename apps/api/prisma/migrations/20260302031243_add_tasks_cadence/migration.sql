-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('ALERT', 'SCORE', 'WAITLIST', 'FINANCE', 'MANUAL');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('CONTACT_PATIENT', 'SCHEDULE_VISIT', 'REQUEST_DOCUMENT', 'COLLECT_PAYMENT', 'FOLLOWUP_IMPLANT', 'FOLLOWUP_PROTOCOL', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'SNOOZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskActionType" AS ENUM ('CREATE', 'START', 'SNOOZE', 'COMPLETE', 'CANCEL', 'SYSTEM_UPDATE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TASK_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_COMPLETE';
ALTER TYPE "AuditAction" ADD VALUE 'TASK_CANCEL';

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "appointment_id" TEXT,
    "source" "TaskSource" NOT NULL DEFAULT 'MANUAL',
    "source_ref_id" TEXT,
    "rule_key" TEXT,
    "type" "TaskType" NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "owner_role_target" "AlertOwnerRole" NOT NULL,
    "assigned_user_id" TEXT,
    "snoozed_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "completed_by_user_id" TEXT,
    "resolution_note" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_action_logs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "TaskActionType" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_clinic_id_status_due_at_idx" ON "tasks"("clinic_id", "status", "due_at");

-- CreateIndex
CREATE INDEX "tasks_clinic_id_priority_idx" ON "tasks"("clinic_id", "priority");

-- CreateIndex
CREATE INDEX "tasks_clinic_id_patient_id_idx" ON "tasks"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "task_action_logs_clinic_id_task_id_idx" ON "task_action_logs"("clinic_id", "task_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_action_logs" ADD CONSTRAINT "task_action_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
