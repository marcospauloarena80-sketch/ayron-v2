-- CreateTable
CREATE TABLE "patient_cognitive_scores" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "clinical_stability_score" INTEGER NOT NULL DEFAULT 0,
    "retention_risk_score" INTEGER NOT NULL DEFAULT 0,
    "composite_risk_score" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "explanation_json" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "patient_cognitive_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_cognitive_scores_patient_id_key" ON "patient_cognitive_scores"("patient_id");

-- CreateIndex
CREATE INDEX "patient_cognitive_scores_clinic_id_composite_risk_score_idx" ON "patient_cognitive_scores"("clinic_id", "composite_risk_score");

-- CreateIndex
CREATE UNIQUE INDEX "patient_cognitive_scores_clinic_id_patient_id_key" ON "patient_cognitive_scores"("clinic_id", "patient_id");

-- AddForeignKey
ALTER TABLE "patient_cognitive_scores" ADD CONSTRAINT "patient_cognitive_scores_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_cognitive_scores" ADD CONSTRAINT "patient_cognitive_scores_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
