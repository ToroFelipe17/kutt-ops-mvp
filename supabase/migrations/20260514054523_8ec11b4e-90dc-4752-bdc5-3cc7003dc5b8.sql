
-- Enums
CREATE TYPE public.appointment_status AS ENUM ('pendiente','confirmado','llego','pagado','completado','cancelado');
CREATE TYPE public.payment_method AS ENUM ('efectivo','transferencia','debito','credito');
CREATE TYPE public.payment_status AS ENUM ('pendiente','conciliado','parcial');
CREATE TYPE public.message_kind AS ENUM ('confirmacion','recordatorio','pago_recibido','reagendar');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  default_business_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Businesses
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#10b981',
  currency TEXT NOT NULL DEFAULT 'CLP',
  open_hour SMALLINT NOT NULL DEFAULT 10,
  close_hour SMALLINT NOT NULL DEFAULT 21,
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.businesses(owner_id);

-- Staff
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.staff(business_id);

-- Services
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_min INT NOT NULL DEFAULT 30,
  price INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.services(business_id);

-- Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  last_visit_at TIMESTAMPTZ,
  visits_count INT NOT NULL DEFAULT 0,
  total_spent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.clients(business_id);
CREATE INDEX ON public.clients(business_id, name);

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  client_name_snapshot TEXT,
  service_name_snapshot TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_min INT NOT NULL DEFAULT 30,
  price INT NOT NULL DEFAULT 0,
  status public.appointment_status NOT NULL DEFAULT 'pendiente',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.appointments(business_id, starts_at);
CREATE INDEX ON public.appointments(business_id, status);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  method public.payment_method NOT NULL,
  amount INT NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'conciliado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.payments(business_id, created_at);

-- Message templates
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  kind public.message_kind NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, kind)
);

-- Helper: business ownership
CREATE OR REPLACE FUNCTION public.user_owns_business(_business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.businesses WHERE id = _business_id AND owner_id = auth.uid())
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Businesses policies
CREATE POLICY "biz_owner_all" ON public.businesses FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Child tables: gated by business ownership
CREATE POLICY "staff_owner_all" ON public.staff FOR ALL USING (public.user_owns_business(business_id)) WITH CHECK (public.user_owns_business(business_id));
CREATE POLICY "services_owner_all" ON public.services FOR ALL USING (public.user_owns_business(business_id)) WITH CHECK (public.user_owns_business(business_id));
CREATE POLICY "clients_owner_all" ON public.clients FOR ALL USING (public.user_owns_business(business_id)) WITH CHECK (public.user_owns_business(business_id));
CREATE POLICY "appointments_owner_all" ON public.appointments FOR ALL USING (public.user_owns_business(business_id)) WITH CHECK (public.user_owns_business(business_id));
CREATE POLICY "payments_owner_all" ON public.payments FOR ALL USING (public.user_owns_business(business_id)) WITH CHECK (public.user_owns_business(business_id));
CREATE POLICY "templates_owner_all" ON public.message_templates FOR ALL USING (public.user_owns_business(business_id)) WITH CHECK (public.user_owns_business(business_id));

-- Realtime
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
