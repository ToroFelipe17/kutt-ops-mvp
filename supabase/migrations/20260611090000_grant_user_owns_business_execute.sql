-- Allow authenticated users to evaluate RLS ownership policies that call this helper.
-- The function remains SECURITY DEFINER and only returns whether auth.uid() owns the business.
GRANT EXECUTE ON FUNCTION public.user_owns_business(UUID) TO authenticated;
