-- Allow authenticated app users to access KUTT tables through Supabase Data API.
-- RLS remains enabled and continues enforcing row-level access.

GRANT USAGE ON SCHEMA public TO authenticated;npx supabase migration list

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles,
  public.businesses,
  public.staff,
  public.services,
  public.clients,
  public.appointments,
  public.payments,
  public.message_templates,
  public.cash_movements,
  public.daily_closes
TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;