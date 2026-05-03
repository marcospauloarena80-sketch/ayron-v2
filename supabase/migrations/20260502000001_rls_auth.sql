-- ══════════════════════════════════════════════════════════════════════════════
-- RLS hardening: replace permissive anon policies with auth-required policies
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
    -- Drop permissive anon policy
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%s" ON %I', tbl, tbl);

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
