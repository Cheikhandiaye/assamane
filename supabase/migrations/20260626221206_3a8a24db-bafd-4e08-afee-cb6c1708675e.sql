
-- partner-logos : lecture par tout authentifié (via URL signée), écriture admin
CREATE POLICY "partner_logos_read_auth" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'partner-logos');
CREATE POLICY "partner_logos_admin_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'partner-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "partner_logos_admin_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'partner-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "partner_logos_admin_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'partner-logos' AND public.has_role(auth.uid(), 'admin'));

-- carnet-attachments : path = "<user_id>/<parcours_id>/<filename>"
CREATE POLICY "carnet_attach_owner_all" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'carnet-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'carnet-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "carnet_attach_admin_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'carnet-attachments' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "carnet_attach_prof_read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'carnet-attachments'
  AND public.has_role(auth.uid(), 'professeur')
);
