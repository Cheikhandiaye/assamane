
-- Fix ambiguity: qualify user_roles.user_id and the parameter reference so they are distinct.
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = is_admin.user_id
      AND ur.role = 'admin'::public.app_role
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

-- Storage: admin update/delete for carnet-attachments
DROP POLICY IF EXISTS "Admin can update carnet attachments" ON storage.objects;
CREATE POLICY "Admin can update carnet attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'carnet-attachments' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'carnet-attachments' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can delete carnet attachments" ON storage.objects;
CREATE POLICY "Admin can delete carnet attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'carnet-attachments' AND public.is_admin(auth.uid()));
