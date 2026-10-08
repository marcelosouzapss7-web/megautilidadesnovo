CREATE POLICY "admin upload product images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin delete product images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admin read product images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'::public.app_role));