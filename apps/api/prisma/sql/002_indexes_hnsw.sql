-- ─────────────────────────────────────────────────────────────────────────────
-- 002 — Índices HNSW para busca vetorial (pgvector)
-- Executar APÓS prisma migrate dev
-- ─────────────────────────────────────────────────────────────────────────────

-- Memória semântica de pacientes
CREATE INDEX IF NOT EXISTS idx_patient_cognitive_vector
  ON patients USING hnsw (cognitive_vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Memória cognitiva global
CREATE INDEX IF NOT EXISTS idx_cognitive_memory_embedding
  ON cognitive_memory USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ─────────────────────────────────────────────────────────────────────────────
-- Índices de performance crítica
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_events_clinic_time
  ON events (clinic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type_clinic
  ON events (clinic_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exam_markers_longitudinal
  ON exam_markers (patient_id, standardized_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_decision_proposals_queue
  ON decision_proposals (clinic_id, status, priority, expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_clinic_status
  ON transactions (clinic_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_appointments_slot
  ON appointments (clinic_id, professional_id, start_time, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Partial unique index — soft delete em patients.cpf
-- Garante unicidade apenas para registros não deletados
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS patients_cpf_clinic_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_cpf_clinic_active
  ON patients (cpf, clinic_id)
  WHERE deleted_at IS NULL AND cpf IS NOT NULL;
