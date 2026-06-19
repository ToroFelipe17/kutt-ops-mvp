-- Phase 2A: separate the business accounting date from the technical creation timestamp.
-- America/Santiago is the current operating timezone for KUTT businesses.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS accounting_date date;

ALTER TABLE public.cash_movements
  ADD COLUMN IF NOT EXISTS accounting_date date;

UPDATE public.payments AS payment
SET accounting_date = (appointment.starts_at AT TIME ZONE 'America/Santiago')::date
FROM public.appointments AS appointment
WHERE payment.appointment_id = appointment.id
  AND payment.accounting_date IS NULL;

UPDATE public.payments
SET accounting_date = (created_at AT TIME ZONE 'America/Santiago')::date
WHERE accounting_date IS NULL;

UPDATE public.cash_movements
SET accounting_date = (created_at AT TIME ZONE 'America/Santiago')::date
WHERE accounting_date IS NULL;

ALTER TABLE public.payments
  ALTER COLUMN accounting_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date),
  ALTER COLUMN accounting_date SET NOT NULL;

ALTER TABLE public.cash_movements
  ALTER COLUMN accounting_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date),
  ALTER COLUMN accounting_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_business_accounting_date
  ON public.payments (business_id, accounting_date);

CREATE INDEX IF NOT EXISTS idx_cash_movements_business_accounting_date
  ON public.cash_movements (business_id, accounting_date);

COMMENT ON COLUMN public.payments.accounting_date IS
  'Business date assigned to the payment; independent from created_at.';

COMMENT ON COLUMN public.cash_movements.accounting_date IS
  'Business date assigned to the movement; independent from created_at.';
