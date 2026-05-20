
-- Comisión por barbero
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS commission_pct numeric(5,2) NOT NULL DEFAULT 50;

-- Notas en payment + montos parciales (paid_amount queda implícito en amount; agregamos notes)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes text;

-- Gastos / egresos del día (caja)
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('ingreso','egreso')),
  amount integer NOT NULL,
  concept text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_movements_owner_all" ON public.cash_movements
  FOR ALL USING (public.user_owns_business(business_id))
  WITH CHECK (public.user_owns_business(business_id));
CREATE INDEX IF NOT EXISTS idx_cash_movements_biz_date ON public.cash_movements(business_id, created_at DESC);

-- Cierres diarios
CREATE TABLE IF NOT EXISTS public.daily_closes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  close_date date NOT NULL,
  total_sales integer NOT NULL DEFAULT 0,
  total_cash integer NOT NULL DEFAULT 0,
  total_transfer integer NOT NULL DEFAULT 0,
  total_card integer NOT NULL DEFAULT 0,
  total_pending integer NOT NULL DEFAULT 0,
  total_commissions integer NOT NULL DEFAULT 0,
  total_expenses integer NOT NULL DEFAULT 0,
  cash_counted integer,
  cash_diff integer NOT NULL DEFAULT 0,
  iva_estimated integer NOT NULL DEFAULT 0,
  profit_estimated integer NOT NULL DEFAULT 0,
  notes text,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, close_date)
);
ALTER TABLE public.daily_closes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_closes_owner_all" ON public.daily_closes
  FOR ALL USING (public.user_owns_business(business_id))
  WITH CHECK (public.user_owns_business(business_id));

-- Snapshot de comisión al cobrar (para no recalcular si cambia % luego)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS staff_id uuid;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS commission_pct numeric(5,2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS commission_amount integer;
