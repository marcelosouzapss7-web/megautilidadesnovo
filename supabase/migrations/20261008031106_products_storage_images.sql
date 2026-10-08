-- Product images are public to read; only authenticated product admins may write.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS old_price numeric,
  ADD COLUMN IF NOT EXISTS has_sizes boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

UPDATE storage.buckets
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'products';

CREATE POLICY "Public can read product images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'products');

CREATE POLICY "Product admins can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'products'
    AND public.is_product_admin()
    AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
  );

CREATE POLICY "Product admins can remove product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'products'
    AND public.is_product_admin()
    AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
  );
