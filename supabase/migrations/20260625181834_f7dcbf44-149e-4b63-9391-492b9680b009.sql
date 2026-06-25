
-- 1) Tighten cahier_de_texte prof policy + add student select
DROP POLICY IF EXISTS cahier_prof ON public.cahier_de_texte;
CREATE POLICY cahier_prof ON public.cahier_de_texte
  FOR SELECT TO authenticated
  USING (
    professeur_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.parcours_professeurs pp
      WHERE pp.parcours_id = cahier_de_texte.parcours_id
        AND pp.professeur_id = auth.uid()
    )
  );

CREATE POLICY cahier_etudiant ON public.cahier_de_texte
  FOR SELECT TO authenticated
  USING (
    auth.uid() = ANY (COALESCE(liste_presents, '{}'::uuid[]))
    OR auth.uid() = ANY (COALESCE(liste_absents, '{}'::uuid[]))
  );

-- 2) Add prof SELECT for reponses_groupe (mirror rg_prof_update)
CREATE POLICY rg_prof_select ON public.reponses_groupe
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.etapes e
      JOIN public.modules_cours m ON m.id = e.module_id
      JOIN public.parcours_professeurs pp ON pp.parcours_id = m.parcours_id
      WHERE e.id = reponses_groupe.etape_id
        AND pp.professeur_id = auth.uid()
        AND m.id = ANY (pp.modules_assignes)
    )
  );

-- 3) Revoke public/anon EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.can_view_partenaire(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_partenaire_of_mission(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_prof_of_mission(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_prof_of_parcours(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_student_of_mission(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_student_of_parcours(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_check_badges(uuid, uuid) FROM PUBLIC, anon, authenticated;
