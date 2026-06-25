
-- Helper: can current user view a given profile?
CREATE OR REPLACE FUNCTION public.can_view_profile(_target uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    auth.uid() = _target
    OR public.is_admin()
    -- prof can view students/profs sharing a parcours they teach
    OR EXISTS (
      SELECT 1 FROM public.parcours_professeurs pp
      WHERE pp.professeur_id = auth.uid()
        AND (
          EXISTS (SELECT 1 FROM public.parcours_etudiants pe
                  WHERE pe.parcours_id = pp.parcours_id AND pe.etudiant_id = _target)
          OR EXISTS (SELECT 1 FROM public.parcours_professeurs pp2
                  WHERE pp2.parcours_id = pp.parcours_id AND pp2.professeur_id = _target)
        )
    )
    -- student can view profs and co-students of their parcours
    OR EXISTS (
      SELECT 1 FROM public.parcours_etudiants pe
      WHERE pe.etudiant_id = auth.uid()
        AND (
          EXISTS (SELECT 1 FROM public.parcours_professeurs pp
                  WHERE pp.parcours_id = pe.parcours_id AND pp.professeur_id = _target)
          OR EXISTS (SELECT 1 FROM public.parcours_etudiants pe2
                  WHERE pe2.parcours_id = pe.parcours_id AND pe2.etudiant_id = _target)
        )
    )
$$;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_scoped ON public.profiles
  FOR SELECT TO authenticated
  USING (public.can_view_profile(id));

-- Helper: can current user view a given partenaire?
CREATE OR REPLACE FUNCTION public.can_view_partenaire(_partenaire_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p
               WHERE p.id = auth.uid() AND p.partenaire_id = _partenaire_id)
    OR EXISTS (
      SELECT 1 FROM public.missions m
      JOIN public.parcours pc ON pc.mission_id = m.id
      WHERE m.partenaire_id = _partenaire_id
        AND (
          EXISTS (SELECT 1 FROM public.parcours_professeurs pp
                  WHERE pp.parcours_id = pc.id AND pp.professeur_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.parcours_etudiants pe
                  WHERE pe.parcours_id = pc.id AND pe.etudiant_id = auth.uid())
        )
    )
$$;

DROP POLICY IF EXISTS partenaires_select ON public.partenaires;
CREATE POLICY partenaires_select_scoped ON public.partenaires
  FOR SELECT TO authenticated
  USING (public.can_view_partenaire(id));
