-- AlterTable
ALTER TABLE "patient_cognitive_scores" ADD COLUMN     "clinical_trend" TEXT NOT NULL DEFAULT 'STABLE',
ADD COLUMN     "dropout_risk_30d" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "no_show_probability" INTEGER NOT NULL DEFAULT 0;
