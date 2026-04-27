-- ─────────────────────────────────────────────────────────────────────────────
-- 005 — Particionamento da tabela events
-- NOTA: Prisma não gerencia tabelas particionadas nativamente.
-- Esta migration converte events para particionamento declarativo.
-- Executar MANUALMENTE em ambiente de desenvolvimento antes do primeiro seed.
-- Em produção: aplicar como migration customizada via prisma db execute.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Renomear tabela original (criada pelo Prisma)
ALTER TABLE events RENAME TO events_unpartitioned;

-- 2. Criar tabela mãe particionada
CREATE TABLE events (
  id            UUID        NOT NULL DEFAULT gen_random_uuid(),
  clinic_id     UUID        NOT NULL,
  event_type    TEXT        NOT NULL,
  event_version TEXT        NOT NULL DEFAULT '1.0',
  entity_type   TEXT,
  entity_id     UUID,
  actor_id      UUID,
  payload       JSONB       NOT NULL DEFAULT '{}',
  processed     BOOLEAN     NOT NULL DEFAULT FALSE,
  processed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- 3. Migrar dados existentes
INSERT INTO events SELECT * FROM events_unpartitioned;
DROP TABLE events_unpartitioned;

-- 4. Recriar índices na tabela particionada
CREATE INDEX idx_events_clinic_time_p   ON events (clinic_id, created_at DESC);
CREATE INDEX idx_events_type_clinic_p   ON events (clinic_id, event_type, created_at DESC);
CREATE INDEX idx_events_entity_p        ON events (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_events_processed_p     ON events (processed, created_at);

-- 5. Partições iniciais (ajustar conforme data de go-live)
CREATE TABLE events_2025_01 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE events_2025_02 PARTITION OF events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE events_2025_03 PARTITION OF events
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE events_2025_04 PARTITION OF events
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE events_2025_05 PARTITION OF events
  FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE events_2025_06 PARTITION OF events
  FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE events_2025_07 PARTITION OF events
  FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE events_2025_08 PARTITION OF events
  FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE events_2025_09 PARTITION OF events
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE events_2025_10 PARTITION OF events
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE events_2025_11 PARTITION OF events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE events_2025_12 PARTITION OF events
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE events_2026_01 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE events_2026_02 PARTITION OF events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE events_2026_03 PARTITION OF events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE events_2026_04 PARTITION OF events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE events_2026_05 PARTITION OF events
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE events_2026_06 PARTITION OF events
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE events_2026_07 PARTITION OF events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE events_2026_08 PARTITION OF events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE events_2026_09 PARTITION OF events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE events_2026_10 PARTITION OF events
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE events_2026_11 PARTITION OF events
  FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE events_2026_12 PARTITION OF events
  FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Partição default para datas fora do range
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- 6. Reabilitar trigger de imutabilidade na tabela mãe
-- (o trigger precisa ser recriado pois a tabela foi recriada)
-- Executar 003_audit_immutability.sql novamente após este script.
