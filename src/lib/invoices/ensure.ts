import { sql } from "drizzle-orm";
import { db, isPglite } from "@/lib/db";

let ensured = false;

/** Creates invoice tables/enums if missing (PGlite / local bootstrap). */
export async function ensureInvoiceTables() {
  if (ensured) return;
  if (!isPglite()) {
    ensured = true;
    return;
  }
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE invoice_type AS ENUM('invoice', 'receipt', 'proforma');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE invoice_status AS ENUM('draft', 'issued', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      invoice_number varchar(40) NOT NULL,
      type invoice_type DEFAULT 'invoice' NOT NULL,
      status invoice_status DEFAULT 'draft' NOT NULL,
      order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
      customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
      currency varchar(3) DEFAULT 'TRY' NOT NULL,
      issue_date timestamp with time zone DEFAULT now() NOT NULL,
      due_date timestamp with time zone,
      seller_name varchar(200) NOT NULL,
      seller_tax_office varchar(120),
      seller_tax_number varchar(40),
      seller_address text,
      seller_phone varchar(40),
      seller_email varchar(255),
      buyer_name varchar(200) NOT NULL,
      buyer_tax_office varchar(120),
      buyer_tax_number varchar(40),
      buyer_address text,
      buyer_phone varchar(40),
      buyer_email varchar(255),
      subtotal numeric(12, 2) DEFAULT '0' NOT NULL,
      discount_total numeric(12, 2) DEFAULT '0' NOT NULL,
      tax_total numeric(12, 2) DEFAULT '0' NOT NULL,
      grand_total numeric(12, 2) DEFAULT '0' NOT NULL,
      notes text,
      payment_method varchar(64),
      payment_status varchar(32) DEFAULT 'unpaid',
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      issued_at timestamp with time zone,
      cancelled_at timestamp with time zone,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id uuid REFERENCES products(id) ON DELETE SET NULL,
      description varchar(255) NOT NULL,
      sku varchar(64),
      quantity numeric(12, 3) NOT NULL,
      unit_price numeric(12, 2) NOT NULL,
      tax_rate numeric(5, 2) DEFAULT '0' NOT NULL,
      discount numeric(12, 2) DEFAULT '0' NOT NULL,
      line_subtotal numeric(12, 2) NOT NULL,
      line_tax numeric(12, 2) NOT NULL,
      line_total numeric(12, 2) NOT NULL,
      sort_order integer DEFAULT 0 NOT NULL
    )
  `);
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS invoices_number_idx ON invoices (invoice_number)`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices (status)`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS invoices_type_idx ON invoices (type)`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS invoices_order_idx ON invoices (order_id)`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS invoices_customer_idx ON invoices (customer_id)`,
  );
  await db.execute(sql`
    ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS paid_amount numeric(12, 2) DEFAULT '0' NOT NULL
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS invoices_payment_status_idx ON invoices (payment_status)`,
  );
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      amount numeric(12, 2) NOT NULL,
      method varchar(64),
      paid_at timestamp with time zone DEFAULT now() NOT NULL,
      note text,
      created_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON invoice_payments (invoice_id)`,
  );
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS invoice_payments_paid_at_idx ON invoice_payments (paid_at)`,
  );
  ensured = true;
}
