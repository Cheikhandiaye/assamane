
-- 1) Drop legacy broad professor policies on reponses_etudiant (keep scoped re_prof_update)
DROP POLICY IF EXISTS "Professeurs peuvent commenter les réponses" ON public.reponses_etudiant;
DROP POLICY IF EXISTS "Professeurs peuvent valider et noter les réponses" ON public.reponses_etudiant;
DROP POLICY IF EXISTS "Professeurs peuvent voir les réponses de leurs étudiants" ON public.reponses_etudiant;

-- 2) Lock down SECURITY DEFINER functions: revoke from PUBLIC/anon/authenticated,
--    then grant EXECUTE only to roles that need it.

-- Trigger functions / internal helpers — no direct callers
REVOKE EXECUTE ON FUNCTION public.fn_acces_immediat() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_badge_presence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_max_tentatives() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_max_tentatives_groupe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_online_unlock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_handle_validation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_handle_validation_groupe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_session_cloture() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_badges(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_calcul_note_finale_module(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Admin / introspection helpers — not called from client RPC
REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_profile(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;

-- Functions actually invoked from the client by signed-in users: revoke anon/PUBLIC only
REVOKE EXECUTE ON FUNCTION public.fn_parcours_attestation(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_professor_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_professor_students(uuid) FROM PUBLIC, anon;
