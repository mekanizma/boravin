-- Customer-specific storefront cart percentage discount (0–100).
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5, 2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.customers.discount_percent IS
  'Müşteriye özel sepet indirim yüzdesi (0-100)';
