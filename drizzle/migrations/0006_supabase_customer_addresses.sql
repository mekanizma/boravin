-- Storefront member profile + delivery addresses (Supabase Auth uid = customers.id)
CREATE INDEX IF NOT EXISTS "addresses_customer_id_idx" ON "addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "addresses_one_default_per_customer_idx" ON "addresses" USING btree ("customer_id") WHERE "is_default" = true;--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "customers_select_own" ON "customers";--> statement-breakpoint
DROP POLICY IF EXISTS "customers_update_own" ON "customers";--> statement-breakpoint
DROP POLICY IF EXISTS "addresses_select_own" ON "addresses";--> statement-breakpoint
DROP POLICY IF EXISTS "addresses_insert_own" ON "addresses";--> statement-breakpoint
DROP POLICY IF EXISTS "addresses_update_own" ON "addresses";--> statement-breakpoint
DROP POLICY IF EXISTS "addresses_delete_own" ON "addresses";--> statement-breakpoint
CREATE POLICY "customers_select_own" ON "customers" FOR SELECT TO authenticated USING (id = auth.uid());--> statement-breakpoint
CREATE POLICY "customers_update_own" ON "customers" FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());--> statement-breakpoint
CREATE POLICY "addresses_select_own" ON "addresses" FOR SELECT TO authenticated USING (customer_id = auth.uid());--> statement-breakpoint
CREATE POLICY "addresses_insert_own" ON "addresses" FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());--> statement-breakpoint
CREATE POLICY "addresses_update_own" ON "addresses" FOR UPDATE TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());--> statement-breakpoint
CREATE POLICY "addresses_delete_own" ON "addresses" FOR DELETE TO authenticated USING (customer_id = auth.uid());--> statement-breakpoint
GRANT SELECT, UPDATE ON TABLE "customers" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "addresses" TO authenticated;
