-- ─────────────────────────────────────────────────────────────────────────────
-- 003 — Imutabilidade da tabela audit_logs via trigger PostgreSQL
-- Garante compliance jurídico independente da camada de aplicação
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_audit_logs_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'audit_logs is append-only. UPDATE and DELETE are not permitted. (operation=%, row_id=%)',
    TG_OP,
    OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tgr_audit_logs_immutable ON audit_logs;

CREATE TRIGGER tgr_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION fn_audit_logs_immutable();

-- ─────────────────────────────────────────────────────────────────────────────
-- Imutabilidade de events (event store append-only)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_events_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'events is append-only. DELETE is not permitted. (row_id=%)', OLD.id;
  END IF;
  -- Permite UPDATE apenas no campo processed/processed_at (worker de processamento)
  IF OLD.id != NEW.id OR OLD.clinic_id != NEW.clinic_id OR OLD.event_type != NEW.event_type
     OR OLD.payload::text != NEW.payload::text THEN
    RAISE EXCEPTION 'events payload is immutable. Only processed/processed_at may be updated. (row_id=%)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tgr_events_immutable ON events;

CREATE TRIGGER tgr_events_immutable
  BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION fn_events_immutable();
