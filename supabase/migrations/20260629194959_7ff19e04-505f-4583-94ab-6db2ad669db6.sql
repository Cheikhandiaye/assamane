
-- 1. profiles scoped select
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.can_view_profile(id));

-- 2. notes_finales_module
DROP POLICY IF EXISTS "notes_finales_student_read" ON public.notes_finales_module;
CREATE POLICY "notes_finales_student_read" ON public.notes_finales_module
  FOR SELECT TO authenticated
  USING (etudiant_id = auth.uid());

DROP POLICY IF EXISTS "notes_finales_prof_read" ON public.notes_finales_module;
CREATE POLICY "notes_finales_prof_read" ON public.notes_finales_module
  FOR SELECT TO authenticated
  USING (public.is_prof_of_parcours(parcours_id));

-- 3. connexions
DROP POLICY IF EXISTS "connexions_student_all" ON public.connexions;
CREATE POLICY "connexions_student_all" ON public.connexions
  FOR ALL TO authenticated
  USING (etudiant_id = auth.uid())
  WITH CHECK (etudiant_id = auth.uid());

DROP POLICY IF EXISTS "connexions_admin_read" ON public.connexions;
CREATE POLICY "connexions_admin_read" ON public.connexions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. suivi_groupe_module (parcours via groupes)
DROP POLICY IF EXISTS "suivi_groupe_member_read" ON public.suivi_groupe_module;
CREATE POLICY "suivi_groupe_member_read" ON public.suivi_groupe_module
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.groupe_membres gm
    WHERE gm.groupe_id = suivi_groupe_module.groupe_id AND gm.etudiant_id = auth.uid()
  ));

DROP POLICY IF EXISTS "suivi_groupe_prof_read" ON public.suivi_groupe_module;
CREATE POLICY "suivi_groupe_prof_read" ON public.suivi_groupe_module
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.groupes g
    WHERE g.id = suivi_groupe_module.groupe_id
      AND public.is_prof_of_parcours(g.parcours_id)
  ));

DROP POLICY IF EXISTS "suivi_groupe_admin_all" ON public.suivi_groupe_module;
CREATE POLICY "suivi_groupe_admin_all" ON public.suivi_groupe_module
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 5. xp_etudiants
DROP POLICY IF EXISTS "xp_etudiants_student_read" ON public.xp_etudiants;
CREATE POLICY "xp_etudiants_student_read" ON public.xp_etudiants
  FOR SELECT TO authenticated
  USING (etudiant_id = auth.uid());

DROP POLICY IF EXISTS "xp_etudiants_prof_read" ON public.xp_etudiants;
CREATE POLICY "xp_etudiants_prof_read" ON public.xp_etudiants
  FOR SELECT TO authenticated
  USING (
    xp_etudiants.parcours_id IS NOT NULL
    AND public.is_prof_of_parcours(xp_etudiants.parcours_id)
  );

DROP POLICY IF EXISTS "xp_etudiants_admin_all" ON public.xp_etudiants;
CREATE POLICY "xp_etudiants_admin_all" ON public.xp_etudiants
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 6. Storage policy hardening
DROP POLICY IF EXISTS "carnet_attach_prof_read" ON storage.objects;
CREATE POLICY "carnet_attach_prof_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'carnet-attachments'
    AND public.has_role(auth.uid(), 'professeur'::public.app_role)
    AND public.is_prof_of_parcours(((storage.foldername(name))[2])::uuid)
    AND EXISTS (
      SELECT 1 FROM public.parcours_etudiants pe
      WHERE pe.etudiant_id = ((storage.foldername(name))[1])::uuid
        AND pe.parcours_id = ((storage.foldername(name))[2])::uuid
    )
  );

-- 7. Revoke EXECUTE on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.fn_acces_immediat() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_badge_presence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_badges(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_max_tentatives() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_max_tentatives_groupe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_online_unlock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_handle_validation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_handle_validation_groupe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_session_cloture() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_calcul_note_finale_module(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_professor_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_professor_students(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_parcours_attestation(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
