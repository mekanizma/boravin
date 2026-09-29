ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "account_type" varchar(32) DEFAULT 'individual' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "company_name" varchar(200);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "company_title" varchar(200);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tax_office" varchar(120);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "tax_number" varchar(32);
