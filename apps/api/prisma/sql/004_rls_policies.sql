-- ─────────────────────────────────────────────────────────────────────────────
-- 004 — Row Level Security (RLS)
-- Isolamento multi-tenant garantido no banco de dados
-- O PrismaModule injeta: SET LOCAL app.current_clinic_id = '<uuid>'
-- no início de cada transação via middleware
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilitar RLS nas tabelas sensíveis
ALTER TABLE patients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_markers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_proposals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cognitive_memory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_data_points ENABLE ROW LEVEL SECURITY;

-- Função helper para extrair clinic_id da sessão PostgreSQL
CREATE OR REPLACE FUNCTION current_clinic_id() RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_clinic_id', true)::uuid;
EXCEPTION
  WHEN others THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Policies de isolamento (using clinic_id)
-- SUPERUSER e roles de serviço bypass RLS via BYPASSRLS

CREATE POLICY clinic_isolation_patients ON patients
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_appointments ON appointments
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_clinical_records ON clinical_records
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_exams ON exams
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_transactions ON transactions
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_events ON events
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_decision_proposals ON decision_proposals
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_cognitive_memory ON cognitive_memory
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_documents ON documents
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_inventory ON inventory_items
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_form_responses ON form_responses
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_notifications ON notification_logs
  USING (clinic_id = current_clinic_id());

CREATE POLICY clinic_isolation_wearable ON wearable_data_points
  USING (clinic_id = current_clinic_id());

-- audit_logs: acesso apenas ao próprio clinic_id (ou NULL para sistema)
CREATE POLICY clinic_isolation_audit_logs ON audit_logs
  USING (clinic_id = current_clinic_id() OR clinic_id IS NULL);
