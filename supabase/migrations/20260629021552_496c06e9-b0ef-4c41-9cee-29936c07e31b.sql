
-- =========================================================
-- 1) Policies: notes_carnet / notes_quiz / partenaires
-- =========================================================

-- partenaires: drop redundant public-role policy
DROP POLICY IF EXISTS "Admins can manage partenaires" ON public.partenaires;

-- notes_carnet: recreate scoped to authenticated, with real parcours filter
DROP POLICY IF EXISTS "Admin peut tout voir et modifier" ON public.notes_carnet;
DROP POLICY IF EXISTS "Professeurs peuvent voir et noter" ON public.notes_carnet;
DROP POLICY IF EXISTS "Étudiants peuvent voir leurs notes carnet" ON public.notes_carnet;

CREATE POLICY notes_carnet_admin_all ON public.notes_carnet
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY notes_carnet_prof_scoped ON public.notes_carnet
  FOR ALL TO authenticated
  USING (public.is_prof_of_parcours(parcours_id))
  WITH CHECK (public.is_prof_of_parcours(parcours_id));

CREATE POLICY notes_carnet_student_select ON public.notes_carnet
  FOR SELECT TO authenticated
  USING (auth.uid() = etudiant_id);

-- notes_quiz: same treatment
DROP POLICY IF EXISTS "Admin peut tout voir" ON public.notes_quiz;
DROP POLICY IF EXISTS "Professeurs peuvent voir notes de leurs étudiants" ON public.notes_quiz;
DROP POLICY IF EXISTS "Étudiants peuvent voir leurs notes" ON public.notes_quiz;

CREATE POLICY notes_quiz_admin_all ON public.notes_quiz
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY notes_quiz_prof_select ON public.notes_quiz
  FOR SELECT TO authenticated
  USING (public.is_prof_of_parcours(parcours_id));

CREATE POLICY notes_quiz_student_select ON public.notes_quiz
  FOR SELECT TO authenticated
  USING (auth.uid() = etudiant_id);

-- =========================================================
-- 2) SECURITY DEFINER hardening
-- =========================================================

-- Convert partenaire RPCs to SECURITY INVOKER (rely on RLS + has_role on own user_roles row)
ALTER FUNCTION public.get_all_partenaires() SECURITY INVOKER;
ALTER FUNCTION public.get_partenaire_by_id(uuid) SECURITY INVOKER;
ALTER FUNCTION public.create_partenaire(text, text, text, text, text, text) SECURITY INVOKER;
ALTER FUNCTION public.update_partenaire(uuid, text, text, text, text, text, text) SECURITY INVOKER;
ALTER FUNCTION public.delete_partenaire(uuid) SECURITY INVOKER;

-- Revoke EXECUTE from anon for all sensitive SECURITY DEFINER functions still in public
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_acces_immediat() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_badge_presence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_online_unlock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_handle_validation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_handle_validation_groupe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_session_cloture() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_max_tentatives() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_max_tentatives_groupe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_badges(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_calcul_note_finale_module(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_trigger_calcul_note_finale() FROM PUBLIC, anon, authenticated;

-- =========================================================
-- 3) Function search_path hardening
-- =========================================================

ALTER FUNCTION public.fn_calcul_note_finale_module(uuid, uuid, uuid) SET search_path = public;
ALTER FUNCTION public.fn_trigger_calcul_note_finale() SET search_path = public;
