CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  logo_url text,
  payment_logo_url text,
  pix_logo_url text,
  hero_image_url text,
  footer_text text,
  brand_name text NOT NULL DEFAULT 'Mega Utilidades',
  logo_display text NOT NULL DEFAULT 'both',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS brand_name text NOT NULL DEFAULT 'Mega Utilidades',
  ADD COLUMN IF NOT EXISTS logo_display text NOT NULL DEFAULT 'both';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.site_settings'::regclass
      AND conname = 'site_settings_logo_display_check'
  ) THEN
    ALTER TABLE public.site_settings
      ADD CONSTRAINT site_settings_logo_display_check
      CHECK (logo_display IN ('text', 'image', 'both'));
  END IF;
END $$;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site settings"
  ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Product admins can manage site settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.is_product_admin())
  WITH CHECK (public.is_product_admin());

INSERT INTO public.site_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'brand-assets') THEN
    RAISE EXCEPTION 'The brand-assets storage bucket must exist before applying this migration';
  END IF;
END $$;

UPDATE storage.buckets
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg']
WHERE id = 'brand-assets';

CREATE POLICY "Public can read brand assets"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'brand-assets');
CREATE POLICY "Product admins can upload brand assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND public.is_product_admin()
    AND name ~ '^brand/[0-9a-f-]{36}\.(png|jpg|jpeg)$'
  );
CREATE POLICY "Product admins can remove brand assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_product_admin());
