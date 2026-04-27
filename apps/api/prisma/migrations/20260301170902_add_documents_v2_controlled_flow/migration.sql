/*
  Warnings:

  - Added the required column `title` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'UPLOAD';
ALTER TYPE "AuditAction" ADD VALUE 'DOWNLOAD';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentStatus" ADD VALUE 'PENDING_CFM_VALIDATION';
ALTER TYPE "DocumentStatus" ADD VALUE 'SIGNED_VALIDATED';
ALTER TYPE "DocumentStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'PRESCRIPTION_CONTROLLED';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "appointment_id" TEXT,
ADD COLUMN     "document_hash" TEXT,
ADD COLUMN     "locked_at" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB DEFAULT '{}',
ADD COLUMN     "pdf_object_key" TEXT,
ADD COLUMN     "signed_by" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "validated_pdf_object_key" TEXT;

-- CreateIndex
CREATE INDEX "documents_clinic_id_appointment_id_idx" ON "documents"("clinic_id", "appointment_id");

-- CreateIndex
CREATE INDEX "documents_clinic_id_type_created_at_idx" ON "documents"("clinic_id", "type", "created_at");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_signed_by_fkey" FOREIGN KEY ("signed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
