
-- Fix infinite recursion between parcours and missions RLS policies
-- Use SECURITY DEFINER helpers to break the cycle

CREATE OR REPLACE FUNCTION public.is_prof_of_parcours(_parcours_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM parcours_professeurs WHERE parcours_id=_parcours_id AND professeur_id=auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_student_of_parcours(_parcours_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM parcours_etudiants WHERE parcours_id=_parcours_id AND etudiant_id=auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_partenaire_of_mission(_mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM missions m JOIN profiles p ON p.partenaire_id=m.partenaire_id
    WHERE m.id=_mission_id AND p.id=auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_student_of_mission(_mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM parcours p JOIN parcours_etudiants pe ON pe.parcours_id=p.id
    WHERE p.mission_id=_mission_id AND pe.etudiant_id=auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_prof_of_mission(_mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM parcours p JOIN parcours_professeurs pp ON pp.parcours_id=p.id
    WHERE p.mission_id=_mission_id AND pp.professeur_id=auth.uid()
  )
$$;

-- parcours policies
DROP POLICY IF EXISTS parcours_etudiant ON public.parcours;
DROP POLICY IF EXISTS parcours_prof ON public.parcours;
DROP POLICY IF EXISTS parcours_partenaire ON public.parcours;

CREATE POLICY parcours_etudiant ON public.parcours FOR SELECT TO authenticated USING (public.is_student_of_parcours(id));
CREATE POLICY parcours_prof ON public.parcours FOR SELECT TO authenticated USING (public.is_prof_of_parcours(id));
CREATE POLICY parcours_partenaire ON public.parcours FOR SELECT TO authenticated USING (has_role(auth.uid(),'partenaire'::app_role) AND public.is_partenaire_of_mission(mission_id));

-- missions policies
DROP POLICY IF EXISTS missions_etudiant ON public.missions;
DROP POLICY IF EXISTS missions_prof ON public.missions;
DROP POLICY IF EXISTS missions_partenaire ON public.missions;

CREATE POLICY missions_etudiant ON public.missions FOR SELECT TO authenticated USING (public.is_student_of_mission(id));
CREATE POLICY missions_prof ON public.missions FOR SELECT TO authenticated USING (public.is_prof_of_mission(id));
CREATE POLICY missions_partenaire ON public.missions FOR SELECT TO authenticated USING (has_role(auth.uid(),'partenaire'::app_role) AND EXISTS (SELECT 1 FROM profiles p WHERE p.id=auth.uid() AND p.partenaire_id=missions.partenaire_id));
