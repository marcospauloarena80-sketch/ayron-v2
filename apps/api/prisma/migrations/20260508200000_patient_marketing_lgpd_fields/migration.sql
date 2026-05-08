-- AYRON: add marketing + LGPD + cached-appointment fields to patients
-- Safe: all columns nullable or have defaults; idempotent via IF NOT EXISTS.

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "tier" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "origin" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "referred_by" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "lgpd_consent" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "lgpd_consent_at" TIMESTAMP(3);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "last_appointment_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "patients_clinic_id_tier_idx" ON "patients" ("clinic_id", "tier");
CREATE INDEX IF NOT EXISTS "patients_clinic_id_origin_idx" ON "patients" ("clinic_id", "origin");
CREATE INDEX IF NOT EXISTS "patients_clinic_id_last_appointment_at_idx" ON "patients" ("clinic_id", "last_appointment_at");
