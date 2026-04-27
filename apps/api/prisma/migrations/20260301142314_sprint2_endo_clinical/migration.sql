-- CreateEnum
CREATE TYPE "PatientTag" AS ENUM ('GELADEIRA', 'FROZEN', 'DIAMANTE', 'APENAS_CONSULTA');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "ProtocolType" AS ENUM ('EMAGRECIMENTO', 'GANHO_MASSA', 'IMPLANTE_HORMONAL', 'SOROTERAPIA', 'LONGEVIDADE', 'NUTRICIONAL', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "ProtocolStatus" AS ENUM ('ATIVO', 'PAUSADO', 'FINALIZADO', 'SUSPENSO');

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "photo_url" TEXT;

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "ocr_validated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ocr_validated_at" TIMESTAMP(3),
ADD COLUMN     "ocr_validated_by" TEXT,
ADD COLUMN     "ocr_validated_by2" TEXT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "tags" "PatientTag"[] DEFAULT ARRAY[]::"PatientTag"[];

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "valid_until" TIMESTAMP(3),
    "converted_at" TIMESTAMP(3),
    "items" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'INTERNAL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_metrics" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "recorded_by" TEXT NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "height_cm" DECIMAL(5,1),
    "bmi" DECIMAL(5,2),
    "body_fat_pct" DECIMAL(5,2),
    "lean_mass_kg" DECIMAL(5,2),
    "waist_cm" DECIMAL(5,1),
    "bp_systolic" INTEGER,
    "bp_diastolic" INTEGER,
    "heart_rate" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "patient_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_protocols" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "type" "ProtocolType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" "ProtocolStatus" NOT NULL DEFAULT 'ATIVO',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "treatment_protocols_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hormone_implants" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "applied_by" TEXT NOT NULL,
    "hormone_type" TEXT NOT NULL,
    "dosage_mg" DECIMAL(8,2) NOT NULL,
    "application_date" TIMESTAMP(3) NOT NULL,
    "lot_number" TEXT,
    "next_change_date" TIMESTAMP(3),
    "site" TEXT,
    "observations" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hormone_implants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budgets_clinic_id_status_created_at_idx" ON "budgets"("clinic_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "budgets_patient_id_status_idx" ON "budgets"("patient_id", "status");

-- CreateIndex
CREATE INDEX "message_templates_clinic_id_channel_is_active_idx" ON "message_templates"("clinic_id", "channel", "is_active");

-- CreateIndex
CREATE INDEX "patient_metrics_clinic_id_patient_id_idx" ON "patient_metrics"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "patient_metrics_patient_id_created_at_idx" ON "patient_metrics"("patient_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "treatment_protocols_clinic_id_patient_id_status_idx" ON "treatment_protocols"("clinic_id", "patient_id", "status");

-- CreateIndex
CREATE INDEX "hormone_implants_clinic_id_patient_id_idx" ON "hormone_implants"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "hormone_implants_next_change_date_idx" ON "hormone_implants"("next_change_date");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_metrics" ADD CONSTRAINT "patient_metrics_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_metrics" ADD CONSTRAINT "patient_metrics_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_metrics" ADD CONSTRAINT "patient_metrics_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_protocols" ADD CONSTRAINT "treatment_protocols_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_protocols" ADD CONSTRAINT "treatment_protocols_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hormone_implants" ADD CONSTRAINT "hormone_implants_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hormone_implants" ADD CONSTRAINT "hormone_implants_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hormone_implants" ADD CONSTRAINT "hormone_implants_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
