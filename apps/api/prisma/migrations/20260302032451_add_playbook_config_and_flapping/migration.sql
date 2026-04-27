-- AlterTable
ALTER TABLE "patient_cognitive_scores" ADD COLUMN     "band_locked_until" TIMESTAMP(3),
ADD COLUMN     "consecutive_hits_red" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "consecutive_hits_yellow" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "current_band" TEXT NOT NULL DEFAULT 'GREEN',
ADD COLUMN     "score_previous" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score_trend" TEXT NOT NULL DEFAULT 'FLAT';

-- CreateTable
CREATE TABLE "playbook_configs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "thresholds" JSONB NOT NULL DEFAULT '{"red":70,"yellow":40}',
    "actions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playbook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "playbook_configs_clinic_id_key" ON "playbook_configs"("clinic_id");

-- AddForeignKey
ALTER TABLE "playbook_configs" ADD CONSTRAINT "playbook_configs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
