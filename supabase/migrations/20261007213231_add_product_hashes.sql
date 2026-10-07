ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_hash text,
  ADD COLUMN IF NOT EXISTS offer_hash text;
