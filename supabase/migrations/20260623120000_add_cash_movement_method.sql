ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS method public.payment_method NOT NULL DEFAULT 'efectivo';

CREATE INDEX IF NOT EXISTS idx_cash_movements_business_accounting_date_method
  ON public.cash_movements (business_id, accounting_date, method);

COMMENT ON COLUMN public.cash_movements.method IS
  'Payment method for manual cash movements. Existing historical movements default to efectivo because the app previously treated them as physical cash.';
