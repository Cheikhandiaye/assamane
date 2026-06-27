
-- 1) app_settings: restrict to authenticated only (no anon)
DROP POLICY IF EXISTS settings_read_all ON public.app_settings;
CREATE POLICY settings_read_auth ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- 2) groupe_membres: allow students to see peers in their own groups only
DROP POLICY IF EXISTS gm_etudiant ON public.groupe_membres;
CREATE POLICY gm_etudiant_peers ON public.groupe_membres
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groupe_membres gm2
      WHERE gm2.groupe_id = groupe_membres.groupe_id
        AND gm2.etudiant_id = auth.uid()
    )
  );

-- 3) Revoke EXECUTE on internal trigger / helper SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.fn_acces_immediat() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_handle_validation_groupe() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_online_unlock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_handle_validation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_badge_presence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_badges(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_session_cloture() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_max_tentatives() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_max_tentatives_groupe() FROM PUBLIC, anon, authenticated;
