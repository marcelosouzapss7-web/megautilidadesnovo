DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'app_role'
  ) THEN
    CREATE TYPE public.app_role AS ENUM ('admin');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT c.conname
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.user_roles'::regclass
      AND c.contype = 'f'
      AND c.confrelid = 'auth.users'::regclass
      AND c.conkey = ARRAY[
        (SELECT a.attnum
         FROM pg_catalog.pg_attribute a
         WHERE a.attrelid = 'public.user_roles'::regclass
           AND a.attname = 'user_id')
      ]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', fk.conname);
  END LOOP;

  ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_primary_admin
  ON public.user_roles (is_primary)
  WHERE is_primary AND role = 'admin'::public.app_role;

-- Carry forward the trusted admin assignment already stored by Supabase Auth.
WITH principal AS (
  SELECT id
  FROM auth.users
  WHERE raw_app_meta_data ->> 'role' = 'admin'
  ORDER BY created_at, id
  LIMIT 1
)
INSERT INTO public.user_roles (user_id, role, is_primary)
SELECT u.id, 'admin'::public.app_role, (u.id = principal.id)
FROM auth.users u
CROSS JOIN principal
WHERE u.raw_app_meta_data ->> 'role' = 'admin'
ON CONFLICT (user_id, role) DO UPDATE
SET is_primary = public.user_roles.is_primary OR EXCLUDED.is_primary;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "own roles" ON public.user_roles;
CREATE POLICY "own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  LOCK TABLE public.user_roles IN EXCLUSIVE MODE;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role) THEN
    RETURN public.has_role(auth.uid(), 'admin'::public.app_role);
  END IF;

  INSERT INTO public.user_roles (user_id, role, is_primary)
  VALUES (auth.uid(), 'admin'::public.app_role, true);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_product_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false);
$$;

CREATE OR REPLACE FUNCTION public.prevent_primary_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = OLD.id
      AND role = 'admin'::public.app_role
      AND is_primary
  ) THEN
    RAISE EXCEPTION 'The primary administrator account cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_primary_admin_role_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_primary THEN
      RAISE EXCEPTION 'The primary administrator role cannot be removed or reassigned';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.is_primary AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NOT NEW.is_primary
  ) THEN
    RAISE EXCEPTION 'The primary administrator role cannot be removed or reassigned';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_primary_admin_account ON auth.users;
CREATE TRIGGER protect_primary_admin_account
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_primary_admin_removal();

DROP TRIGGER IF EXISTS protect_primary_admin_role ON public.user_roles;
CREATE TRIGGER protect_primary_admin_role
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_primary_admin_role_removal();

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_product_admin() TO authenticated;
