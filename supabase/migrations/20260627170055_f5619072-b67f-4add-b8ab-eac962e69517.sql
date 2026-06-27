
-- 1) Private schema for SECURITY DEFINER helpers (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated, service_role;

-- 2) Move SECURITY DEFINER helpers into app_private
CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION app_private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT app_private.has_role(auth.uid(), 'admin'::public.app_role) $$;

CREATE OR REPLACE FUNCTION app_private.is_prof_of_parcours(_parcours_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=_parcours_id AND professeur_id=auth.uid()) $$;

CREATE OR REPLACE FUNCTION app_private.is_student_of_parcours(_parcours_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT EXISTS (SELECT 1 FROM public.parcours_etudiants WHERE parcours_id=_parcours_id AND etudiant_id=auth.uid()) $$;

CREATE OR REPLACE FUNCTION app_private.is_prof_of_mission(_mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.parcours p JOIN public.parcours_professeurs pp ON pp.parcours_id=p.id
  WHERE p.mission_id=_mission_id AND pp.professeur_id=auth.uid()
) $$;

CREATE OR REPLACE FUNCTION app_private.is_student_of_mission(_mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.parcours p JOIN public.parcours_etudiants pe ON pe.parcours_id=p.id
  WHERE p.mission_id=_mission_id AND pe.etudiant_id=auth.uid()
) $$;

CREATE OR REPLACE FUNCTION app_private.is_partenaire_of_mission(_mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.missions m JOIN public.profiles p ON p.partenaire_id=m.partenaire_id
  WHERE m.id=_mission_id AND p.id=auth.uid()
) $$;

CREATE OR REPLACE FUNCTION app_private.can_view_partenaire(_partenaire_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT
    app_private.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.partenaire_id=_partenaire_id)
    OR EXISTS (
      SELECT 1 FROM public.missions m
      JOIN public.parcours pc ON pc.mission_id=m.id
      WHERE m.partenaire_id=_partenaire_id
        AND (
          EXISTS (SELECT 1 FROM public.parcours_professeurs pp WHERE pp.parcours_id=pc.id AND pp.professeur_id=auth.uid())
          OR EXISTS (SELECT 1 FROM public.parcours_etudiants pe WHERE pe.parcours_id=pc.id AND pe.etudiant_id=auth.uid())
        )
    )
$$;

CREATE OR REPLACE FUNCTION app_private.can_view_profile(_target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT
    auth.uid() = _target
    OR app_private.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.parcours_professeurs pp
      WHERE pp.professeur_id=auth.uid()
        AND (
          EXISTS (SELECT 1 FROM public.parcours_etudiants pe WHERE pe.parcours_id=pp.parcours_id AND pe.etudiant_id=_target)
          OR EXISTS (SELECT 1 FROM public.parcours_professeurs pp2 WHERE pp2.parcours_id=pp.parcours_id AND pp2.professeur_id=_target)
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.parcours_etudiants pe
      WHERE pe.etudiant_id=auth.uid()
        AND (
          EXISTS (SELECT 1 FROM public.parcours_professeurs pp WHERE pp.parcours_id=pe.parcours_id AND pp.professeur_id=_target)
          OR EXISTS (SELECT 1 FROM public.parcours_etudiants pe2 WHERE pe2.parcours_id=pe.parcours_id AND pe2.etudiant_id=_target)
        )
    )
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO authenticated, service_role;

-- 3) Replace public helpers with SECURITY INVOKER wrappers so the API surface
-- no longer exposes any SECURITY DEFINER function to signed-in users.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT app_private.has_role(_user_id, _role) $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT app_private.is_admin() $$;

CREATE OR REPLACE FUNCTION public.is_prof_of_parcours(_parcours_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT app_private.is_prof_of_parcours(_parcours_id) $$;

CREATE OR REPLACE FUNCTION public.is_student_of_parcours(_parcours_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT app_private.is_student_of_parcours(_parcours_id) $$;

CREATE OR REPLACE FUNCTION public.is_prof_of_mission(_mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT app_private.is_prof_of_mission(_mission_id) $$;

CREATE OR REPLACE FUNCTION public.is_student_of_mission(_mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT app_private.is_student_of_mission(_mission_id) $$;

CREATE OR REPLACE FUNCTION public.is_partenaire_of_mission(_mission_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT app_private.is_partenaire_of_mission(_mission_id) $$;

CREATE OR REPLACE FUNCTION public.can_view_partenaire(_partenaire_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT app_private.can_view_partenaire(_partenaire_id) $$;

CREATE OR REPLACE FUNCTION public.can_view_profile(_target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT app_private.can_view_profile(_target) $$;

-- Keep EXECUTE for authenticated on the thin wrappers (they are INVOKER, not flagged).
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_prof_of_parcours(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_prof_of_parcours(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_student_of_parcours(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_student_of_parcours(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_prof_of_mission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_prof_of_mission(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_student_of_mission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_student_of_mission(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_partenaire_of_mission(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_partenaire_of_mission(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_view_partenaire(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_partenaire(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.can_view_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid) TO authenticated, service_role;

-- 4) Cahier de texte: allow assigned professors to write their own entries
DROP POLICY IF EXISTS cahier_prof_insert ON public.cahier_de_texte;
DROP POLICY IF EXISTS cahier_prof_update ON public.cahier_de_texte;
DROP POLICY IF EXISTS cahier_prof_delete ON public.cahier_de_texte;

CREATE POLICY cahier_prof_insert ON public.cahier_de_texte
  FOR INSERT TO authenticated
  WITH CHECK (
    professeur_id = auth.uid()
    AND public.is_prof_of_parcours(parcours_id)
  );

CREATE POLICY cahier_prof_update ON public.cahier_de_texte
  FOR UPDATE TO authenticated
  USING (professeur_id = auth.uid() AND public.is_prof_of_parcours(parcours_id))
  WITH CHECK (professeur_id = auth.uid() AND public.is_prof_of_parcours(parcours_id));

CREATE POLICY cahier_prof_delete ON public.cahier_de_texte
  FOR DELETE TO authenticated
  USING (professeur_id = auth.uid() AND public.is_prof_of_parcours(parcours_id));

-- 5) Carnet attachments: restrict prof read to their assigned parcours.
-- Path layout: <etudiant_uid>/<parcours_id>/<file>
DROP POLICY IF EXISTS carnet_attach_prof_read ON storage.objects;
CREATE POLICY carnet_attach_prof_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'carnet-attachments'
    AND public.has_role(auth.uid(), 'professeur'::public.app_role)
    AND public.is_prof_of_parcours( ((storage.foldername(name))[2])::uuid )
  );
