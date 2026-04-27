-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CANCEL';
ALTER TYPE "AuditAction" ADD VALUE 'CONVERT';
ALTER TYPE "AuditAction" ADD VALUE 'MARK_PAID';
ALTER TYPE "AuditAction" ADD VALUE 'START';
ALTER TYPE "AuditAction" ADD VALUE 'FINALIZE';
ALTER TYPE "AuditAction" ADD VALUE 'STAGE_CHANGE';
