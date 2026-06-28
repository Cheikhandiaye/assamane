
-- Move SECURITY DEFINER bodies to app_private, expose SECURITY INVOKER wrappers in public.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;

-- 1) fn_parcours_attestation
CREATE OR REPLACE FUNCTION app_private.fn_parcours_attestation(_etudiant_id uuid, _parcours_id uuid)
RETURNS TABLE(complete boolean, completed_at timestamp with time zone, deadline date, within_deadline boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tot_ind int; v_val_ind int; v_tot_grp int; v_val_grp int;
  v_grp_id uuid; v_dl date; v_cat timestamptz; v_comp boolean;
BEGIN
  IF NOT (auth.uid() = _etudiant_id OR public.is_admin()) THEN RAISE EXCEPTION 'Forbidden'; END IF;

  SELECT COUNT(*) FILTER (WHERE e.type = 'individuel'),
         COUNT(DISTINCT re.etape_id) FILTER (WHERE e.type = 'individuel' AND re.etudiant_id = _etudiant_id AND re.statut = 'valide')
  INTO v_tot_ind, v_val_ind FROM etapes e JOIN modules_cours mc ON mc.id = e.module_id
  LEFT JOIN reponses_etudiant re ON e.id = re.etape_id WHERE mc.parcours_id = _parcours_id;

  SELECT g.id INTO v_grp_id FROM groupes g JOIN groupe_membres gm ON gm.groupe_id = g.id
  WHERE g.parcours_id = _parcours_id AND gm.etudiant_id = _etudiant_id LIMIT 1;

  SELECT COUNT(*) INTO v_tot_grp FROM etapes e JOIN modules_cours mc ON mc.id = e.module_id
  WHERE mc.parcours_id = _parcours_id AND e.type = 'groupe';

  v_val_grp := v_tot_grp;
  IF v_grp_id IS NOT NULL AND v_tot_grp > 0 THEN
    SELECT COUNT(DISTINCT rg.etape_id) INTO v_val_grp FROM reponses_groupe rg
    JOIN etapes e ON e.id = rg.etape_id JOIN modules_cours mc ON mc.id = e.module_id
    WHERE mc.parcours_id = _parcours_id AND rg.groupe_id = v_grp_id AND rg.statut = 'valide' AND e.type = 'groupe';
  END IF;

  v_comp := (v_tot_ind + v_tot_grp) > 0 AND v_val_ind >= v_tot_ind AND v_val_grp >= v_tot_grp;
  SELECT COALESCE(p.date_fin, m.date_fin) INTO v_dl FROM parcours p LEFT JOIN missions m ON m.id = p.mission_id WHERE p.id = _parcours_id;

  IF v_comp THEN
    SELECT MAX(d) INTO v_cat FROM (
      SELECT MAX(valide_le) d FROM reponses_etudiant WHERE parcours_id = _parcours_id AND etudiant_id = _etudiant_id AND statut = 'valide'
      UNION ALL
      SELECT MAX(valide_le) d FROM reponses_groupe WHERE parcours_id = _parcours_id AND groupe_id = v_grp_id AND statut = 'valide'
    ) s;
  END IF;

  RETURN QUERY SELECT v_comp, v_cat, v_dl, v_comp AND (v_dl IS NULL OR (v_cat IS NOT NULL AND v_cat::date <= v_dl));
END; $$;

REVOKE ALL ON FUNCTION app_private.fn_parcours_attestation(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Replace public function with thin INVOKER wrapper
DROP FUNCTION IF EXISTS public.fn_parcours_attestation(uuid, uuid);
CREATE OR REPLACE FUNCTION public.fn_parcours_attestation(_etudiant_id uuid, _parcours_id uuid)
RETURNS TABLE(complete boolean, completed_at timestamp with time zone, deadline date, within_deadline boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT * FROM app_private.fn_parcours_attestation(_etudiant_id, _parcours_id) $$;

GRANT EXECUTE ON FUNCTION public.fn_parcours_attestation(uuid, uuid) TO authenticated;

-- 2) fn_clone_module_to_parcours
CREATE OR REPLACE FUNCTION app_private.fn_clone_module_to_parcours(_module_id uuid, _parcours_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_module_id uuid;
  v_next_ordre integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT COALESCE(MAX(ordre), 0) + 1 INTO v_next_ordre
  FROM public.modules_cours WHERE parcours_id = _parcours_id;

  INSERT INTO public.modules_cours (parcours_id, titre, description, ordre, est_global, duplique_depuis, created_by)
  SELECT _parcours_id, m.titre, m.description, v_next_ordre, false, m.id, auth.uid()
  FROM public.modules_cours m WHERE m.id = _module_id
  RETURNING id INTO v_new_module_id;

  IF v_new_module_id IS NULL THEN
    RAISE EXCEPTION 'Module source introuvable (%).', _module_id;
  END IF;

  INSERT INTO public.contenus_module
    (module_id, type, titre, contenu_texte, video_url, video_platform, duree_video_secondes, ordre, quiz_questions, quiz_score_min)
  SELECT v_new_module_id, c.type, c.titre, c.contenu_texte, c.video_url, c.video_platform, c.duree_video_secondes, c.ordre, c.quiz_questions, c.quiz_score_min
  FROM public.contenus_module c WHERE c.module_id = _module_id;

  INSERT INTO public.etapes (module_id, titre, description, type, ordre, max_tentatives, champs)
  SELECT v_new_module_id, e.titre, e.description, e.type, e.ordre, e.max_tentatives, e.champs
  FROM public.etapes e WHERE e.module_id = _module_id;

  RETURN v_new_module_id;
END; $$;

REVOKE ALL ON FUNCTION app_private.fn_clone_module_to_parcours(uuid, uuid) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.fn_clone_module_to_parcours(uuid, uuid);
CREATE OR REPLACE FUNCTION public.fn_clone_module_to_parcours(_module_id uuid, _parcours_id uuid)
RETURNS uuid
LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT app_private.fn_clone_module_to_parcours(_module_id, _parcours_id) $$;

GRANT EXECUTE ON FUNCTION public.fn_clone_module_to_parcours(uuid, uuid) TO authenticated;
