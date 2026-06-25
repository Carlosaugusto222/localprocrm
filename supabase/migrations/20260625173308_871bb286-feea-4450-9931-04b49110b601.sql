
CREATE POLICY "org-assets public read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'org-assets');
CREATE POLICY "org-assets members write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-assets' AND public.is_org_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "org-assets members update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'org-assets' AND public.is_org_member(((storage.foldername(name))[1])::uuid));
CREATE POLICY "org-assets members delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'org-assets' AND public.is_org_member(((storage.foldername(name))[1])::uuid));
