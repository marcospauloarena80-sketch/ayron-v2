-- ══════════════════════════════════════════════════════════════════════════════
-- RLS hardening: replace permissive anon policies with auth-required policies
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Access model: authenticated = full access to all rows
-- Rationale: Ayron is a single-clinic app where all staff share access to all
-- patient and financial data. Row-level isolation per professional is not
-- required at this stage. If per-professional isolation is needed in the
-- future, policies will need to be replaced (not amended) with ownership
-- checks on professional_id = (SELECT id FROM professionals WHERE auth_user_id = auth.uid()).
-- LGPD compliance is handled at the application layer, not RLS.
-- ══════════════════════════════════════════════════════════════════════════════

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
    -- Drop old permissive anon policy
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%s" ON %I', tbl, tbl);

    -- Drop new policies if they already exist (idempotent re-run safety)
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_write_%s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON %I', tbl, tbl);

    -- Read: any authenticated user
    EXECUTE format('
      CREATE POLICY "auth_read_%s" ON %I
      FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
    ', tbl, tbl);

    -- Write: any authenticated user
    EXECUTE format('
      CREATE POLICY "auth_write_%s" ON %I
      FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
    ', tbl, tbl);

    EXECUTE format('
      CREATE POLICY "auth_update_%s" ON %I
      FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
    ', tbl, tbl);

    EXECUTE format('
      CREATE POLICY "auth_delete_%s" ON %I
      FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
    ', tbl, tbl);
  END LOOP;
END $$;
