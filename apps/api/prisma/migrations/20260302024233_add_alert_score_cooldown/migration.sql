-- AlterTable
ALTER TABLE "alerts" ADD COLUMN     "last_triggered_at" TIMESTAMP(3),
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;
