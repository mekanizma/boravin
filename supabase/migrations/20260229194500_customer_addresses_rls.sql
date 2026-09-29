-- Run via Supabase Dashboard → SQL (or: npm run db:migrate:deploy from repo root)
-- Same as drizzle/migrations/0006_supabase_customer_addresses.sql

CREATE INDEX IF NOT EXISTS "addresses_customer_id_idx" ON "addresses" USING btree ("customer_id");

CREATE UNIQUE INDEX IF NOT EXISTS "addresses_one_default_per_customer_idx"
  ON "addresses" USING btree ("customer_id")
  WHERE "is_default" = true;

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_own" ON "customers";
DROP POLICY IF EXISTS "customers_update_own" ON "customers";
DROP POLICY IF EXISTS "addresses_select_own" ON "addresses";
DROP POLICY IF EXISTS "addresses_insert_own" ON "addresses";
DROP POLICY IF EXISTS "addresses_update_own" ON "addresses";
DROP POLICY IF EXISTS "addresses_delete_own" ON "addresses";

CREATE POLICY "customers_select_own" ON "customers"
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "customers_update_own" ON "customers"
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "addresses_select_own" ON "addresses"
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "addresses_insert_own" ON "addresses"
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "addresses_update_own" ON "addresses"
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "addresses_delete_own" ON "addresses"
  FOR DELETE TO authenticated
  USING (customer_id = auth.uid());

GRANT SELECT, UPDATE ON TABLE "customers" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "addresses" TO authenticated;
