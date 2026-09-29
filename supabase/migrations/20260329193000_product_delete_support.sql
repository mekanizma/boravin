-- Run via Supabase SQL editor or: npm run db:supabase:product-delete
-- Same as drizzle/migrations/0007_product_delete_support.sql

ALTER TABLE "homepage_section_items"
  DROP CONSTRAINT IF EXISTS "homepage_section_items_product_id_products_id_fk";

ALTER TABLE "homepage_section_items"
  ADD CONSTRAINT "homepage_section_items_product_id_products_id_fk"
  FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;

INSERT INTO "permissions" ("id", "code", "name", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'PRODUCT_CREATE', 'PRODUCT_CREATE', now(), now()),
  (gen_random_uuid(), 'PRODUCT_EDIT', 'PRODUCT_EDIT', now(), now()),
  (gen_random_uuid(), 'PRODUCT_DELETE', 'PRODUCT_DELETE', now(), now()),
  (gen_random_uuid(), 'PRODUCT_VIEW', 'PRODUCT_VIEW', now(), now())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN', 'PRODUCT_MANAGER')
  AND p.code IN ('PRODUCT_CREATE', 'PRODUCT_EDIT', 'PRODUCT_DELETE', 'PRODUCT_VIEW')
ON CONFLICT DO NOTHING;
