-- Phase 2C.1A: prepare auditable payment annulment without deleting history.
-- Frontend usage is intentionally deferred until the live schema is applied and verified.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS annulled_at timestamptz;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS annulment_reason text;

CREATE INDEX IF NOT EXISTS idx_payments_business_accounting_annulled
  ON public.payments (business_id, accounting_date, annulled_at);

COMMENT ON COLUMN public.payments.annulled_at IS
  'Marks a payment as annulled without deleting historical payment data. Annulled payments should not count as active sales.';

COMMENT ON COLUMN public.payments.annulment_reason IS
  'Optional reason or note explaining why the payment was annulled.';
