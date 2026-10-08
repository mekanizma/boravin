ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "discount_percent" numeric(5, 2) DEFAULT '0' NOT NULL;
