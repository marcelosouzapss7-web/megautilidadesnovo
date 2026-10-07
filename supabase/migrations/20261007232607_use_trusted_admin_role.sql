CREATE OR REPLACE FUNCTION public.is_product_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_product_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_product_admin() TO authenticated;
