-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "foreign_doc_number" TEXT,
ADD COLUMN     "foreign_doc_type" TEXT,
ADD COLUMN     "nationality" TEXT NOT NULL DEFAULT 'BR',
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "rg" TEXT;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "category" TEXT;
