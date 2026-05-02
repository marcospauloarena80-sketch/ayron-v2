-- ══════════════════════════════════════════════════════════════════════════════
-- AYRON v2 — Schema inicial
-- Executa no Supabase SQL Editor (uma única vez)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Extensões ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Helper: updated_at automático ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: professionals
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS professionals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'MEDICO', -- MEDICO, ENFERMEIRO, RECEPCIONISTA
  specialty   TEXT,
  crm         TEXT,
  email       TEXT UNIQUE,
  phone       TEXT,
  color       TEXT DEFAULT '#6366f1',
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_professionals_updated_at
  BEFORE UPDATE ON professionals FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: patients
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patients (
  id                    TEXT PRIMARY KEY, -- ex: P4821
  full_name             TEXT NOT NULL,
  birth_date            DATE,
  sex                   CHAR(1),          -- M, F
  phone                 TEXT,
  email                 TEXT,
  cpf                   TEXT,
  rg                    TEXT,
  nationality           TEXT DEFAULT 'BR',
  address_street        TEXT,
  address_number        TEXT,
  address_complement    TEXT,
  address_neighborhood  TEXT,
  address_city          TEXT,
  address_state         TEXT,
  address_zip           TEXT,
  current_status        TEXT DEFAULT 'NOVA_LEAD',
  tags                  TEXT[] DEFAULT '{}',
  tier                  TEXT DEFAULT 'SILVER',
  tipo_contato          TEXT DEFAULT 'WHATSAPP',
  mala_direta           BOOLEAN DEFAULT FALSE,
  photo_url             TEXT,
  notes                 TEXT,
  lgpd_consent          BOOLEAN DEFAULT FALSE,
  lgpd_consent_at       TIMESTAMPTZ,
  professional_id       UUID REFERENCES professionals(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS patients_full_name_idx ON patients (full_name);
CREATE INDEX IF NOT EXISTS patients_status_idx ON patients (current_status);
CREATE INDEX IF NOT EXISTS patients_tier_idx ON patients (tier);
CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: appointments
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      TEXT REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  type            TEXT DEFAULT 'CONSULTATION', -- CONSULTATION, FOLLOW_UP, EVALUATION, PROCEDURE
  status          TEXT DEFAULT 'SCHEDULED',    -- SCHEDULED, CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
  notes           TEXT,
  convenio        TEXT,
  procedure_name  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS appointments_patient_idx ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS appointments_start_time_idx ON appointments (start_time);
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: patient_medical_history (anamnese)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patient_medical_history (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        TEXT UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  queixa            TEXT,
  hda               TEXT,
  antecedentes      TEXT,
  habitos           TEXT,
  familiar          TEXT,
  medicamentos_uso  TEXT,
  alergias          TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_pmh_updated_at
  BEFORE UPDATE ON patient_medical_history FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: patient_evolutions (SOAP notes)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patient_evolutions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      TEXT REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  type            TEXT DEFAULT 'Consulta',
  cid             TEXT,
  subjetivo       TEXT,
  objetivo        TEXT,
  avaliacao       TEXT,
  plano           TEXT,
  ai_summary      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pe_patient_idx ON patient_evolutions (patient_id);
CREATE INDEX IF NOT EXISTS pe_date_idx ON patient_evolutions (date DESC);
CREATE TRIGGER trg_pe_updated_at
  BEFORE UPDATE ON patient_evolutions FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: patient_prescriptions (receitas)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patient_prescriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      TEXT REFERENCES patients(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  validade        DATE,
  status          TEXT DEFAULT 'ATIVA', -- ATIVA, VENCIDA, CANCELADA
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pp_patient_idx ON patient_prescriptions (patient_id);
CREATE TRIGGER trg_pp_updated_at
  BEFORE UPDATE ON patient_prescriptions FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ── prescription_items ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescription_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prescription_id  UUID REFERENCES patient_prescriptions(id) ON DELETE CASCADE,
  med              TEXT NOT NULL,
  dosagem          TEXT,
  qtd              TEXT,
  obs              TEXT
);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: patient_exams
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patient_exams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id  TEXT REFERENCES patients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  lab         TEXT,
  status      TEXT DEFAULT 'SOLICITADO', -- SOLICITADO, NORMAL, ATENCAO, CRITICO
  resultado   TEXT,
  file_url    TEXT,
  ai_data     JSONB,
  urgencia    TEXT DEFAULT 'NORMAL',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exam_patient_idx ON patient_exams (patient_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: treatment_protocols (sessões)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS treatment_protocols (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          TEXT REFERENCES patients(id) ON DELETE CASCADE,
  professional_id     UUID REFERENCES professionals(id),
  protocol_name       TEXT NOT NULL,
  category            TEXT DEFAULT 'Emagrecimento',
  total_sessions      INTEGER NOT NULL DEFAULT 1,
  completed_sessions  INTEGER DEFAULT 0,
  start_date          DATE DEFAULT CURRENT_DATE,
  next_session_date   DATE,
  last_session_date   DATE,
  interval_days       INTEGER DEFAULT 7,
  status              TEXT DEFAULT 'ATIVO', -- ATIVO, CONCLUIDO, PAUSADO, ATRASADO
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tp_patient_idx ON treatment_protocols (patient_id);
CREATE INDEX IF NOT EXISTS tp_status_idx ON treatment_protocols (status);
CREATE TRIGGER trg_tp_updated_at
  BEFORE UPDATE ON treatment_protocols FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: alerts
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id  TEXT REFERENCES patients(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- FINANCEIRO, CLINICO, PROTOCOLO, RETORNO
  severity    TEXT DEFAULT 'MEDIUM', -- CRITICAL, HIGH, MEDIUM, LOW
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'OPEN', -- OPEN, ACKNOWLEDGED, RESOLVED, DISMISSED
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS alerts_patient_idx ON alerts (patient_id);
CREATE INDEX IF NOT EXISTS alerts_status_idx ON alerts (status);
CREATE TRIGGER trg_alerts_updated_at
  BEFORE UPDATE ON alerts FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- TABELA: financial_transactions (lançamentos)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS financial_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      TEXT REFERENCES patients(id) ON DELETE SET NULL,
  descricao       TEXT NOT NULL,
  valor           NUMERIC(10,2) NOT NULL,
  pago            NUMERIC(10,2) DEFAULT 0,
  tipo            TEXT NOT NULL, -- RECEBER, PAGAR
  status          TEXT DEFAULT 'ABERTO', -- ABERTO, PAGO, PARCIAL, VENCIDO, CANCELADO
  vencimento      DATE,
  pago_em         DATE,
  classificacao   TEXT,
  conta           TEXT,
  filial          TEXT DEFAULT 'Matriz',
  convenio        TEXT,
  forma_pagamento TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ft_patient_idx ON financial_transactions (patient_id);
CREATE INDEX IF NOT EXISTS ft_status_idx ON financial_transactions (status);
CREATE INDEX IF NOT EXISTS ft_vencimento_idx ON financial_transactions (vencimento);
CREATE TRIGGER trg_ft_updated_at
  BEFORE UPDATE ON financial_transactions FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS — permissivo inicial (ajustar com auth depois)
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE professionals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medical_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_evolutions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_prescriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_exams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_protocols      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions   ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas temporárias (anon pode tudo — trocar por auth depois)
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'professionals','patients','appointments','patient_medical_history',
    'patient_evolutions','patient_prescriptions','prescription_items',
    'patient_exams','treatment_protocols','alerts','financial_transactions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('
      CREATE POLICY "anon_all_%s" ON %I
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    ', tbl, tbl);
  END LOOP;
END $$;
