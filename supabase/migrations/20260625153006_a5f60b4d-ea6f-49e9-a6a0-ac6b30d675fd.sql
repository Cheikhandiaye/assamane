
-- ============ ENUM + USER_ROLES (sécurité: rôles hors profiles) ============
CREATE TYPE public.app_role AS ENUM ('admin','professeur','etudiant','partenaire');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'admin'::public.app_role) $$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ TABLE 1 : profiles (sans role) ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  partenaire_id uuid,
  onboarding_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 2 : partenaires ============
CREATE TABLE public.partenaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  logo_url text,
  couleur_primaire text DEFAULT '#7C3AED',
  couleur_secondaire text DEFAULT '#F97316',
  adresse text,
  contact_email text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partenaires TO authenticated;
GRANT ALL ON public.partenaires TO service_role;
ALTER TABLE public.partenaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ADD CONSTRAINT fk_partenaire
  FOREIGN KEY (partenaire_id) REFERENCES public.partenaires(id) ON DELETE SET NULL;

-- ============ TABLE 3 : missions ============
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text,
  partenaire_id uuid REFERENCES public.partenaires(id) ON DELETE CASCADE,
  date_debut date,
  date_fin date,
  statut text DEFAULT 'brouillon' CHECK (statut IN ('brouillon','active','terminee')),
  dupliquee_depuis uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 4 : demandes_prolongation ============
CREATE TABLE public.demandes_prolongation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE,
  demandee_par uuid REFERENCES public.profiles(id),
  date_souhaitee date NOT NULL,
  justification text NOT NULL,
  statut text DEFAULT 'en_attente' CHECK (statut IN ('en_attente','acceptee','refusee')),
  traitee_par uuid REFERENCES public.profiles(id),
  date_accordee date,
  commentaire_admin text,
  created_at timestamptz DEFAULT now(),
  traitee_le timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demandes_prolongation TO authenticated;
GRANT ALL ON public.demandes_prolongation TO service_role;
ALTER TABLE public.demandes_prolongation ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 5 : parcours ============
CREATE TABLE public.parcours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text,
  mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE,
  pondere_individuel numeric(4,2) DEFAULT 60.00 CHECK (pondere_individuel>=0 AND pondere_individuel<=100),
  pondere_groupe numeric(4,2) DEFAULT 40.00 CHECK (pondere_groupe>=0 AND pondere_groupe<=100),
  duplique_depuis uuid REFERENCES public.parcours(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT ponderations_sum CHECK (pondere_individuel + pondere_groupe = 100)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcours TO authenticated;
GRANT ALL ON public.parcours TO service_role;
ALTER TABLE public.parcours ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 6 : parcours_professeurs ============
CREATE TABLE public.parcours_professeurs (
  parcours_id uuid REFERENCES public.parcours(id) ON DELETE CASCADE,
  professeur_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  modules_assignes uuid[] DEFAULT '{}',
  PRIMARY KEY (parcours_id, professeur_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcours_professeurs TO authenticated;
GRANT ALL ON public.parcours_professeurs TO service_role;
ALTER TABLE public.parcours_professeurs ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 7 : parcours_etudiants ============
CREATE TABLE public.parcours_etudiants (
  parcours_id uuid REFERENCES public.parcours(id) ON DELETE CASCADE,
  etudiant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode text DEFAULT 'presentiel' CHECK (mode IN ('presentiel','online')),
  modules_hybrides uuid[] DEFAULT '{}',
  date_inscription timestamptz DEFAULT now(),
  PRIMARY KEY (parcours_id, etudiant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcours_etudiants TO authenticated;
GRANT ALL ON public.parcours_etudiants TO service_role;
ALTER TABLE public.parcours_etudiants ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 8 : modules_cours ============
CREATE TABLE public.modules_cours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcours_id uuid REFERENCES public.parcours(id) ON DELETE CASCADE,
  titre text NOT NULL,
  description text,
  ordre integer NOT NULL,
  est_global boolean DEFAULT false,
  duplique_depuis uuid REFERENCES public.modules_cours(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modules_cours TO authenticated;
GRANT ALL ON public.modules_cours TO service_role;
ALTER TABLE public.modules_cours ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 9 : contenus_module ============
CREATE TABLE public.contenus_module (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.modules_cours(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('video_embed','texte')),
  titre text,
  contenu_texte text,
  video_url text,
  video_platform text CHECK (video_platform IN ('youtube','vimeo','dailymotion')),
  duree_video_secondes integer DEFAULT 0,
  ordre integer NOT NULL,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contenus_module TO authenticated;
GRANT ALL ON public.contenus_module TO service_role;
ALTER TABLE public.contenus_module ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 10 : etapes ============
CREATE TABLE public.etapes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.modules_cours(id) ON DELETE CASCADE,
  titre text NOT NULL,
  description text,
  type text DEFAULT 'individuel' CHECK (type IN ('individuel','groupe')),
  ordre integer NOT NULL,
  max_tentatives integer DEFAULT 3,
  champs jsonb DEFAULT '[]'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.etapes TO authenticated;
GRANT ALL ON public.etapes TO service_role;
ALTER TABLE public.etapes ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 11 : suivi_contenu ============
CREATE TABLE public.suivi_contenu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etudiant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  contenu_id uuid REFERENCES public.contenus_module(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules_cours(id) ON DELETE CASCADE,
  parcours_id uuid REFERENCES public.parcours(id) ON DELETE CASCADE,
  temps_ecoute_secondes integer DEFAULT 0,
  duree_totale_secondes integer DEFAULT 0,
  pourcentage_scroll numeric(5,2) DEFAULT 0,
  complete boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (etudiant_id, contenu_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suivi_contenu TO authenticated;
GRANT ALL ON public.suivi_contenu TO service_role;
ALTER TABLE public.suivi_contenu ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 12 : acces_module ============
CREATE TABLE public.acces_module (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etudiant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.modules_cours(id) ON DELETE CASCADE,
  parcours_id uuid REFERENCES public.parcours(id) ON DELETE CASCADE,
  source_acces text NOT NULL CHECK (source_acces IN ('presentiel','online','admin')),
  debloque_le timestamptz DEFAULT now(),
  UNIQUE (etudiant_id, module_id, parcours_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acces_module TO authenticated;
GRANT ALL ON public.acces_module TO service_role;
ALTER TABLE public.acces_module ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 13 : sessions_cours ============
CREATE TABLE public.sessions_cours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcours_id uuid REFERENCES public.parcours(id) ON DELETE CASCADE,
  professeur_id uuid REFERENCES public.profiles(id),
  date_session date NOT NULL,
  statut text DEFAULT 'ouverte' CHECK (statut IN ('ouverte','terminee')),
  modules_dispenses uuid[] DEFAULT '{}',
  chapitres_traites text,
  objectifs_seance text,
  realise text,
  observations text,
  heure_debut time,
  heure_fin time,
  ouverte_le timestamptz DEFAULT now(),
  terminee_le timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions_cours TO authenticated;
GRANT ALL ON public.sessions_cours TO service_role;
ALTER TABLE public.sessions_cours ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX sessions_une_seule_ouverte ON public.sessions_cours (parcours_id, professeur_id) WHERE statut='ouverte';

-- ============ TABLE 14 : presences ============
CREATE TABLE public.presences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions_cours(id) ON DELETE CASCADE,
  etudiant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  present boolean DEFAULT false,
  acces_carnet_immediat boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (session_id, etudiant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presences TO authenticated;
GRANT ALL ON public.presences TO service_role;
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 15 : cahier_de_texte ============
CREATE TABLE public.cahier_de_texte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions_cours(id) ON DELETE CASCADE,
  parcours_id uuid REFERENCES public.parcours(id),
  mission_id uuid REFERENCES public.missions(id),
  partenaire_id uuid REFERENCES public.partenaires(id),
  professeur_id uuid REFERENCES public.profiles(id),
  date_seance date NOT NULL,
  heure_debut time,
  heure_fin time,
  duree_minutes integer,
  modules_traites uuid[] DEFAULT '{}',
  chapitres_traites text,
  objectifs_seance text,
  realise text,
  observations text,
  nb_presents integer DEFAULT 0,
  liste_presents uuid[] DEFAULT '{}',
  liste_absents uuid[] DEFAULT '{}',
  signe_par uuid REFERENCES public.profiles(id),
  signe_le timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cahier_de_texte TO authenticated;
GRANT ALL ON public.cahier_de_texte TO service_role;
ALTER TABLE public.cahier_de_texte ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 16 : groupes ============
CREATE TABLE public.groupes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  parcours_id uuid REFERENCES public.parcours(id) ON DELETE CASCADE,
  rapporteur_id uuid REFERENCES public.profiles(id),
  historique_rapporteurs jsonb DEFAULT '[]',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groupes TO authenticated;
GRANT ALL ON public.groupes TO service_role;
ALTER TABLE public.groupes ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 17 : groupe_membres ============
CREATE TABLE public.groupe_membres (
  groupe_id uuid REFERENCES public.groupes(id) ON DELETE CASCADE,
  etudiant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (groupe_id, etudiant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groupe_membres TO authenticated;
GRANT ALL ON public.groupe_membres TO service_role;
ALTER TABLE public.groupe_membres ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 18 : reponses_etudiant ============
CREATE TABLE public.reponses_etudiant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etape_id uuid REFERENCES public.etapes(id) ON DELETE CASCADE,
  etudiant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  parcours_id uuid REFERENCES public.parcours(id),
  contenu jsonb DEFAULT '{}',
  statut text DEFAULT 'brouillon' CHECK (statut IN ('brouillon','soumis','valide','rejete')),
  nb_tentatives integer DEFAULT 0,
  note numeric(4,2) CHECK (note>=0 AND note<=20),
  commentaire_prof text,
  valide_par uuid REFERENCES public.profiles(id),
  valide_le timestamptz,
  valide_en_letat boolean DEFAULT false,
  rouverte_par uuid REFERENCES public.profiles(id),
  rouverte_le timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (etape_id, etudiant_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reponses_etudiant TO authenticated;
GRANT ALL ON public.reponses_etudiant TO service_role;
ALTER TABLE public.reponses_etudiant ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 19 : reponses_groupe ============
CREATE TABLE public.reponses_groupe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etape_id uuid REFERENCES public.etapes(id) ON DELETE CASCADE,
  groupe_id uuid REFERENCES public.groupes(id) ON DELETE CASCADE,
  parcours_id uuid REFERENCES public.parcours(id),
  contenu jsonb DEFAULT '{}',
  statut text DEFAULT 'brouillon' CHECK (statut IN ('brouillon','soumis','valide','rejete')),
  nb_tentatives integer DEFAULT 0,
  note numeric(4,2) CHECK (note>=0 AND note<=20),
  commentaire_prof text,
  valide_par uuid REFERENCES public.profiles(id),
  valide_le timestamptz,
  valide_en_letat boolean DEFAULT false,
  rouverte_par uuid REFERENCES public.profiles(id),
  rouverte_le timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (etape_id, groupe_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reponses_groupe TO authenticated;
GRANT ALL ON public.reponses_groupe TO service_role;
ALTER TABLE public.reponses_groupe ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 20 : badges ============
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  description text,
  icone text DEFAULT '🏆',
  couleur text DEFAULT '#F97316',
  condition_type text CHECK (condition_type IN ('premier_module','mi_parcours','parcours_complet','premiere_validation','groupe_complet','premiere_session_presentiel'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 21 : badges_etudiants ============
CREATE TABLE public.badges_etudiants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etudiant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES public.badges(id),
  parcours_id uuid REFERENCES public.parcours(id),
  obtenu_le timestamptz DEFAULT now(),
  UNIQUE (etudiant_id, badge_id, parcours_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges_etudiants TO authenticated;
GRANT ALL ON public.badges_etudiants TO service_role;
ALTER TABLE public.badges_etudiants ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 22 : notifications ============
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinataire_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  titre text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('validation','badge','rejet','info','acces_debloque','prolongation_demande','prolongation_reponse','alerte_echeance')),
  lu boolean DEFAULT false,
  lien text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============ TABLE 23 : bibliotheque_modules ============
CREATE TABLE public.bibliotheque_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.modules_cours(id) ON DELETE CASCADE,
  rendu_global_par uuid REFERENCES public.profiles(id),
  rendu_global_le timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bibliotheque_modules TO authenticated;
GRANT ALL ON public.bibliotheque_modules TO service_role;
ALTER TABLE public.bibliotheque_modules ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============
-- PROFILES
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()=id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PARTENAIRES
CREATE POLICY "partenaires_select" ON public.partenaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "partenaires_admin" ON public.partenaires FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- MISSIONS
CREATE POLICY "missions_admin" ON public.missions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "missions_partenaire" ON public.missions FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'partenaire'::public.app_role)
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.partenaire_id=missions.partenaire_id)
);
CREATE POLICY "missions_prof" ON public.missions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours p JOIN public.parcours_professeurs pp ON pp.parcours_id=p.id WHERE p.mission_id=missions.id AND pp.professeur_id=auth.uid())
);
CREATE POLICY "missions_etudiant" ON public.missions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours p JOIN public.parcours_etudiants pe ON pe.parcours_id=p.id WHERE p.mission_id=missions.id AND pe.etudiant_id=auth.uid())
);

-- DEMANDES_PROLONGATION
CREATE POLICY "prolongation_admin" ON public.demandes_prolongation FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "prolongation_prof" ON public.demandes_prolongation FOR ALL TO authenticated USING (demandee_par=auth.uid()) WITH CHECK (demandee_par=auth.uid());

-- PARCOURS
CREATE POLICY "parcours_admin" ON public.parcours FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "parcours_partenaire" ON public.parcours FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'partenaire'::public.app_role)
  AND EXISTS (SELECT 1 FROM public.missions m JOIN public.profiles p ON p.partenaire_id=m.partenaire_id WHERE m.id=parcours.mission_id AND p.id=auth.uid())
);
CREATE POLICY "parcours_prof" ON public.parcours FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=parcours.id AND professeur_id=auth.uid())
);
CREATE POLICY "parcours_etudiant" ON public.parcours FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours_etudiants WHERE parcours_id=parcours.id AND etudiant_id=auth.uid())
);

-- PARCOURS_PROFESSEURS
CREATE POLICY "pp_admin" ON public.parcours_professeurs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pp_prof_own" ON public.parcours_professeurs FOR SELECT TO authenticated USING (professeur_id=auth.uid());

-- PARCOURS_ETUDIANTS
CREATE POLICY "pe_admin" ON public.parcours_etudiants FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pe_etudiant" ON public.parcours_etudiants FOR SELECT TO authenticated USING (etudiant_id=auth.uid());
CREATE POLICY "pe_prof" ON public.parcours_etudiants FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=parcours_etudiants.parcours_id AND professeur_id=auth.uid())
);

-- MODULES_COURS
CREATE POLICY "modules_admin" ON public.modules_cours FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "modules_prof_own" ON public.modules_cours FOR ALL TO authenticated USING (created_by=auth.uid()) WITH CHECK (created_by=auth.uid());
CREATE POLICY "modules_global" ON public.modules_cours FOR SELECT TO authenticated USING (est_global=true);
CREATE POLICY "modules_enrolled" ON public.modules_cours FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours_etudiants WHERE parcours_id=modules_cours.parcours_id AND etudiant_id=auth.uid())
  OR EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=modules_cours.parcours_id AND professeur_id=auth.uid())
);

-- CONTENUS_MODULE
CREATE POLICY "contenus_admin" ON public.contenus_module FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "contenus_prof_owner" ON public.contenus_module FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.modules_cours WHERE id=contenus_module.module_id AND created_by=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.modules_cours WHERE id=contenus_module.module_id AND created_by=auth.uid())
);
CREATE POLICY "contenus_enrolled" ON public.contenus_module FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.modules_cours m JOIN public.parcours_etudiants pe ON pe.parcours_id=m.parcours_id WHERE m.id=contenus_module.module_id AND pe.etudiant_id=auth.uid())
);

-- ETAPES
CREATE POLICY "etapes_admin" ON public.etapes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "etapes_prof_owner" ON public.etapes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.modules_cours WHERE id=etapes.module_id AND created_by=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.modules_cours WHERE id=etapes.module_id AND created_by=auth.uid())
);
CREATE POLICY "etapes_enrolled" ON public.etapes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.modules_cours m JOIN public.parcours_etudiants pe ON pe.parcours_id=m.parcours_id WHERE m.id=etapes.module_id AND pe.etudiant_id=auth.uid())
  OR EXISTS (SELECT 1 FROM public.modules_cours m JOIN public.parcours_professeurs pp ON pp.parcours_id=m.parcours_id WHERE m.id=etapes.module_id AND pp.professeur_id=auth.uid())
);

-- SUIVI_CONTENU
CREATE POLICY "suivi_admin" ON public.suivi_contenu FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "suivi_own" ON public.suivi_contenu FOR ALL TO authenticated USING (etudiant_id=auth.uid()) WITH CHECK (etudiant_id=auth.uid());
CREATE POLICY "suivi_prof" ON public.suivi_contenu FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=suivi_contenu.parcours_id AND professeur_id=auth.uid())
);

-- ACCES_MODULE
CREATE POLICY "acces_admin" ON public.acces_module FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "acces_etudiant" ON public.acces_module FOR SELECT TO authenticated USING (etudiant_id=auth.uid());
CREATE POLICY "acces_prof_select" ON public.acces_module FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=acces_module.parcours_id AND professeur_id=auth.uid())
);
CREATE POLICY "acces_prof_insert" ON public.acces_module FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=acces_module.parcours_id AND professeur_id=auth.uid())
);

-- SESSIONS_COURS
CREATE POLICY "sessions_admin" ON public.sessions_cours FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "sessions_prof_own" ON public.sessions_cours FOR ALL TO authenticated USING (professeur_id=auth.uid()) WITH CHECK (professeur_id=auth.uid());
CREATE POLICY "sessions_prof_parcours" ON public.sessions_cours FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=sessions_cours.parcours_id AND professeur_id=auth.uid())
);

-- PRESENCES
CREATE POLICY "presences_admin" ON public.presences FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "presences_prof" ON public.presences FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sessions_cours WHERE id=presences.session_id AND professeur_id=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.sessions_cours WHERE id=presences.session_id AND professeur_id=auth.uid())
);
CREATE POLICY "presences_etudiant" ON public.presences FOR SELECT TO authenticated USING (etudiant_id=auth.uid());

-- CAHIER_DE_TEXTE
CREATE POLICY "cahier_admin" ON public.cahier_de_texte FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "cahier_prof" ON public.cahier_de_texte FOR SELECT TO authenticated USING (professeur_id=auth.uid());
CREATE POLICY "cahier_partenaire" ON public.cahier_de_texte FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'partenaire'::public.app_role)
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND partenaire_id=cahier_de_texte.partenaire_id)
);

-- GROUPES
CREATE POLICY "groupes_admin" ON public.groupes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "groupes_prof" ON public.groupes FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=groupes.parcours_id AND professeur_id=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=groupes.parcours_id AND professeur_id=auth.uid())
);
CREATE POLICY "groupes_etudiant" ON public.groupes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.groupe_membres WHERE groupe_id=groupes.id AND etudiant_id=auth.uid())
);

-- GROUPE_MEMBRES
CREATE POLICY "gm_admin" ON public.groupe_membres FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "gm_prof" ON public.groupe_membres FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.groupes g JOIN public.parcours_professeurs pp ON pp.parcours_id=g.parcours_id WHERE g.id=groupe_membres.groupe_id AND pp.professeur_id=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.groupes g JOIN public.parcours_professeurs pp ON pp.parcours_id=g.parcours_id WHERE g.id=groupe_membres.groupe_id AND pp.professeur_id=auth.uid())
);
CREATE POLICY "gm_etudiant" ON public.groupe_membres FOR SELECT TO authenticated USING (etudiant_id=auth.uid());

-- REPONSES_ETUDIANT
CREATE POLICY "re_admin" ON public.reponses_etudiant FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "re_own" ON public.reponses_etudiant FOR ALL TO authenticated USING (etudiant_id=auth.uid()) WITH CHECK (etudiant_id=auth.uid());
CREATE POLICY "re_prof_select" ON public.reponses_etudiant FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.etapes e JOIN public.modules_cours m ON m.id=e.module_id JOIN public.parcours_professeurs pp ON pp.parcours_id=m.parcours_id WHERE e.id=reponses_etudiant.etape_id AND pp.professeur_id=auth.uid() AND m.id=ANY(pp.modules_assignes))
);
CREATE POLICY "re_prof_update" ON public.reponses_etudiant FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.etapes e JOIN public.modules_cours m ON m.id=e.module_id JOIN public.parcours_professeurs pp ON pp.parcours_id=m.parcours_id WHERE e.id=reponses_etudiant.etape_id AND pp.professeur_id=auth.uid() AND m.id=ANY(pp.modules_assignes))
);

-- REPONSES_GROUPE
CREATE POLICY "rg_admin" ON public.reponses_groupe FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "rg_rapporteur" ON public.reponses_groupe FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.groupes WHERE id=reponses_groupe.groupe_id AND rapporteur_id=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.groupes WHERE id=reponses_groupe.groupe_id AND rapporteur_id=auth.uid())
);
CREATE POLICY "rg_membres" ON public.reponses_groupe FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.groupe_membres WHERE groupe_id=reponses_groupe.groupe_id AND etudiant_id=auth.uid())
);
CREATE POLICY "rg_prof_update" ON public.reponses_groupe FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.etapes e JOIN public.modules_cours m ON m.id=e.module_id JOIN public.parcours_professeurs pp ON pp.parcours_id=m.parcours_id WHERE e.id=reponses_groupe.etape_id AND pp.professeur_id=auth.uid() AND m.id=ANY(pp.modules_assignes))
);

-- BADGES
CREATE POLICY "badges_select" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "badges_admin" ON public.badges FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- BADGES_ETUDIANTS
CREATE POLICY "be_admin" ON public.badges_etudiants FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "be_own" ON public.badges_etudiants FOR SELECT TO authenticated USING (etudiant_id=auth.uid());
CREATE POLICY "be_prof" ON public.badges_etudiants FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.parcours_professeurs WHERE parcours_id=badges_etudiants.parcours_id AND professeur_id=auth.uid())
);

-- NOTIFICATIONS
CREATE POLICY "notifs_own" ON public.notifications FOR ALL TO authenticated USING (destinataire_id=auth.uid()) WITH CHECK (destinataire_id=auth.uid());
CREATE POLICY "notifs_admin" ON public.notifications FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- BIBLIOTHEQUE_MODULES
CREATE POLICY "biblio_select" ON public.bibliotheque_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "biblio_admin" ON public.bibliotheque_modules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ TRIGGERS DE LOGIQUE MÉTIER ============

-- Trigger A : Déblocage online auto
CREATE OR REPLACE FUNCTION public.fn_check_online_unlock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_total integer; v_completed integer; v_titre text;
BEGIN
  IF NEW.complete=true AND (OLD.complete IS DISTINCT FROM true) THEN
    SELECT COUNT(*) INTO v_total FROM contenus_module WHERE module_id=NEW.module_id;
    SELECT COUNT(*) INTO v_completed FROM suivi_contenu WHERE etudiant_id=NEW.etudiant_id AND module_id=NEW.module_id AND complete=true;
    IF v_total>0 AND v_total=v_completed THEN
      SELECT titre INTO v_titre FROM modules_cours WHERE id=NEW.module_id;
      INSERT INTO acces_module (etudiant_id, module_id, parcours_id, source_acces)
      VALUES (NEW.etudiant_id, NEW.module_id, NEW.parcours_id, 'online') ON CONFLICT DO NOTHING;
      INSERT INTO notifications (destinataire_id, titre, message, type, lien)
      VALUES (NEW.etudiant_id, '🔓 Cours complété !', '🎉 Tu as terminé le cours "'||v_titre||'". Ton carnet est maintenant accessible !', 'acces_debloque', '/etudiant/carnet');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_online_unlock AFTER UPDATE ON public.suivi_contenu FOR EACH ROW EXECUTE FUNCTION public.fn_check_online_unlock();

-- Trigger B : Accès carnet immédiat
CREATE OR REPLACE FUNCTION public.fn_acces_immediat()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_session sessions_cours%ROWTYPE; v_module_id uuid;
BEGIN
  IF NEW.acces_carnet_immediat=true AND (OLD.acces_carnet_immediat IS DISTINCT FROM true) THEN
    SELECT * INTO v_session FROM sessions_cours WHERE id=NEW.session_id;
    FOREACH v_module_id IN ARRAY COALESCE(v_session.modules_dispenses,'{}') LOOP
      INSERT INTO acces_module (etudiant_id, module_id, parcours_id, source_acces)
      VALUES (NEW.etudiant_id, v_module_id, v_session.parcours_id, 'presentiel') ON CONFLICT DO NOTHING;
    END LOOP;
    INSERT INTO notifications (destinataire_id, titre, message, type, lien)
    VALUES (NEW.etudiant_id, '🔓 Accès carnet débloqué !', '📓 Ton professeur t''a donné accès au carnet. À toi de jouer !', 'acces_debloque', '/etudiant/carnet');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_acces_immediat AFTER UPDATE ON public.presences FOR EACH ROW EXECUTE FUNCTION public.fn_acces_immediat();

-- Trigger C : Clôture session
CREATE OR REPLACE FUNCTION public.fn_session_cloture()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_etudiant_id uuid; v_module_id uuid; v_presents uuid[]; v_absents uuid[]; v_nb_presents integer; v_mission_id uuid; v_partenaire_id uuid; v_duree integer;
BEGIN
  IF NEW.statut='terminee' AND OLD.statut='ouverte' THEN
    SELECT p.mission_id, m.partenaire_id INTO v_mission_id, v_partenaire_id
    FROM parcours p JOIN missions m ON m.id=p.mission_id WHERE p.id=NEW.parcours_id;
    IF NEW.heure_debut IS NOT NULL AND NEW.heure_fin IS NOT NULL THEN
      v_duree := EXTRACT(EPOCH FROM (NEW.heure_fin-NEW.heure_debut))::integer/60;
    ELSE v_duree := NULL; END IF;
    SELECT array_agg(etudiant_id) INTO v_presents FROM presences WHERE session_id=NEW.id AND present=true;
    v_presents := COALESCE(v_presents,'{}');
    v_nb_presents := COALESCE(array_length(v_presents,1),0);
    SELECT array_agg(pe.etudiant_id) INTO v_absents FROM parcours_etudiants pe
    WHERE pe.parcours_id=NEW.parcours_id AND (array_length(v_presents,1) IS NULL OR pe.etudiant_id != ALL(v_presents));
    v_absents := COALESCE(v_absents,'{}');
    FOREACH v_etudiant_id IN ARRAY v_presents LOOP
      FOREACH v_module_id IN ARRAY COALESCE(NEW.modules_dispenses,'{}') LOOP
        INSERT INTO acces_module (etudiant_id, module_id, parcours_id, source_acces)
        VALUES (v_etudiant_id, v_module_id, NEW.parcours_id, 'presentiel') ON CONFLICT DO NOTHING;
        INSERT INTO notifications (destinataire_id, titre, message, type, lien)
        VALUES (v_etudiant_id, '🔓 Session terminée !', '📓 Ton prof a clôturé la session. À toi de remplir ton carnet !', 'acces_debloque', '/etudiant/carnet');
      END LOOP;
    END LOOP;
    IF array_length(v_absents,1)>0 AND array_length(COALESCE(NEW.modules_dispenses,'{}'),1)>0 THEN
      UPDATE parcours_etudiants SET modules_hybrides = array_cat(COALESCE(modules_hybrides,'{}'),COALESCE(NEW.modules_dispenses,'{}'))
      WHERE parcours_id=NEW.parcours_id AND etudiant_id=ANY(v_absents) AND mode='presentiel';
    END IF;
    INSERT INTO cahier_de_texte (session_id, parcours_id, mission_id, partenaire_id, professeur_id, date_seance, heure_debut, heure_fin, duree_minutes, modules_traites, chapitres_traites, objectifs_seance, realise, observations, nb_presents, liste_presents, liste_absents, signe_par, signe_le)
    VALUES (NEW.id, NEW.parcours_id, v_mission_id, v_partenaire_id, NEW.professeur_id, NEW.date_session, NEW.heure_debut, NEW.heure_fin, v_duree, COALESCE(NEW.modules_dispenses,'{}'), NEW.chapitres_traites, NEW.objectifs_seance, NEW.realise, NEW.observations, v_nb_presents, v_presents, v_absents, NEW.professeur_id, NOW());
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_session_cloture AFTER UPDATE ON public.sessions_cours FOR EACH ROW EXECUTE FUNCTION public.fn_session_cloture();

-- Fonction badges
CREATE OR REPLACE FUNCTION public.fn_check_badges(p_etudiant_id uuid, p_parcours_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_badge RECORD; v_total integer; v_validees integer; v_module1_id uuid; v_m1_total integer; v_m1_val integer; v_groupe_id uuid; v_grp_total integer; v_grp_val integer; v_premiere integer;
BEGIN
  SELECT COUNT(*) INTO v_total FROM etapes e JOIN modules_cours m ON m.id=e.module_id WHERE m.parcours_id=p_parcours_id;
  SELECT COUNT(*) INTO v_validees FROM reponses_etudiant re JOIN etapes e ON e.id=re.etape_id JOIN modules_cours m ON m.id=e.module_id WHERE m.parcours_id=p_parcours_id AND re.etudiant_id=p_etudiant_id AND re.statut='valide';
  SELECT id INTO v_module1_id FROM modules_cours WHERE parcours_id=p_parcours_id ORDER BY ordre ASC LIMIT 1;
  SELECT g.id INTO v_groupe_id FROM groupes g JOIN groupe_membres gm ON gm.groupe_id=g.id WHERE g.parcours_id=p_parcours_id AND gm.etudiant_id=p_etudiant_id LIMIT 1;
  FOR v_badge IN SELECT * FROM badges LOOP
    IF EXISTS (SELECT 1 FROM badges_etudiants WHERE etudiant_id=p_etudiant_id AND badge_id=v_badge.id AND parcours_id=p_parcours_id) THEN CONTINUE; END IF;
    CASE v_badge.condition_type
      WHEN 'premiere_validation' THEN
        SELECT COUNT(*) INTO v_premiere FROM reponses_etudiant WHERE etudiant_id=p_etudiant_id AND statut='valide';
        IF v_premiere>=1 THEN
          INSERT INTO badges_etudiants (etudiant_id, badge_id, parcours_id) VALUES (p_etudiant_id, v_badge.id, p_parcours_id);
          INSERT INTO notifications (destinataire_id, titre, message, type, lien) VALUES (p_etudiant_id, '🏆 Badge obtenu !', '✨ Badge "'||v_badge.nom||'" débloqué !', 'badge', '/etudiant/badges');
        END IF;
      WHEN 'premier_module' THEN
        IF v_module1_id IS NOT NULL THEN
          SELECT COUNT(*) INTO v_m1_total FROM etapes WHERE module_id=v_module1_id;
          SELECT COUNT(*) INTO v_m1_val FROM reponses_etudiant re JOIN etapes e ON e.id=re.etape_id WHERE e.module_id=v_module1_id AND re.etudiant_id=p_etudiant_id AND re.statut='valide';
          IF v_m1_val=v_m1_total AND v_m1_total>0 THEN
            INSERT INTO badges_etudiants (etudiant_id, badge_id, parcours_id) VALUES (p_etudiant_id, v_badge.id, p_parcours_id);
            INSERT INTO notifications (destinataire_id, titre, message, type, lien) VALUES (p_etudiant_id, '🚀 Badge obtenu !', '🚀 Badge "'||v_badge.nom||'" débloqué !', 'badge', '/etudiant/badges');
          END IF;
        END IF;
      WHEN 'mi_parcours' THEN
        IF v_total>0 AND (v_validees::float/v_total)>=0.5 THEN
          INSERT INTO badges_etudiants (etudiant_id, badge_id, parcours_id) VALUES (p_etudiant_id, v_badge.id, p_parcours_id);
          INSERT INTO notifications (destinataire_id, titre, message, type, lien) VALUES (p_etudiant_id, '⭐ Badge obtenu !', '⭐ Badge "'||v_badge.nom||'" débloqué !', 'badge', '/etudiant/badges');
        END IF;
      WHEN 'parcours_complet' THEN
        IF v_total>0 AND v_validees=v_total THEN
          INSERT INTO badges_etudiants (etudiant_id, badge_id, parcours_id) VALUES (p_etudiant_id, v_badge.id, p_parcours_id);
          INSERT INTO notifications (destinataire_id, titre, message, type, lien) VALUES (p_etudiant_id, '🎓 Badge obtenu !', '🎓 Badge "'||v_badge.nom||'" débloqué !', 'badge', '/etudiant/badges');
        END IF;
      WHEN 'groupe_complet' THEN
        IF v_groupe_id IS NOT NULL THEN
          SELECT COUNT(*) INTO v_grp_total FROM etapes e JOIN modules_cours m ON m.id=e.module_id WHERE m.parcours_id=p_parcours_id AND e.type='groupe';
          SELECT COUNT(*) INTO v_grp_val FROM reponses_groupe rg JOIN etapes e ON e.id=rg.etape_id JOIN modules_cours m ON m.id=e.module_id WHERE m.parcours_id=p_parcours_id AND rg.groupe_id=v_groupe_id AND rg.statut='valide';
          IF v_grp_total>0 AND v_grp_val=v_grp_total THEN
            INSERT INTO badges_etudiants (etudiant_id, badge_id, parcours_id) VALUES (p_etudiant_id, v_badge.id, p_parcours_id);
            INSERT INTO notifications (destinataire_id, titre, message, type, lien) VALUES (p_etudiant_id, '🤝 Badge obtenu !', '🤝 Badge "'||v_badge.nom||'" débloqué !', 'badge', '/etudiant/badges');
          END IF;
        END IF;
      ELSE NULL;
    END CASE;
  END LOOP;
END; $$;

-- Trigger D : Validation individuelle
CREATE OR REPLACE FUNCTION public.fn_handle_validation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_module_id uuid; v_parcours_id uuid; v_ordre integer; v_suivant_id uuid; v_suivant_titre text; v_total_ind integer; v_val_ind integer; v_total_grp integer; v_val_grp integer; v_groupe_id uuid;
BEGIN
  IF NEW.statut='valide' AND OLD.statut IS DISTINCT FROM 'valide' THEN
    SELECT e.module_id, re.parcours_id INTO v_module_id, v_parcours_id FROM etapes e JOIN reponses_etudiant re ON re.etape_id=e.id WHERE e.id=NEW.etape_id AND re.id=NEW.id;
    SELECT g.id INTO v_groupe_id FROM groupes g JOIN groupe_membres gm ON gm.groupe_id=g.id WHERE g.parcours_id=v_parcours_id AND gm.etudiant_id=NEW.etudiant_id LIMIT 1;
    SELECT COUNT(*) INTO v_total_ind FROM etapes WHERE module_id=v_module_id AND type='individuel';
    SELECT COUNT(*) INTO v_val_ind FROM reponses_etudiant re JOIN etapes e ON e.id=re.etape_id WHERE e.module_id=v_module_id AND re.etudiant_id=NEW.etudiant_id AND re.statut='valide' AND e.type='individuel';
    SELECT COUNT(*) INTO v_total_grp FROM etapes WHERE module_id=v_module_id AND type='groupe';
    v_val_grp := v_total_grp;
    IF v_groupe_id IS NOT NULL AND v_total_grp>0 THEN
      SELECT COUNT(*) INTO v_val_grp FROM reponses_groupe rg JOIN etapes e ON e.id=rg.etape_id WHERE e.module_id=v_module_id AND rg.groupe_id=v_groupe_id AND rg.statut='valide' AND e.type='groupe';
    END IF;
    IF v_val_ind=v_total_ind AND v_val_grp=v_total_grp THEN
      SELECT ordre INTO v_ordre FROM modules_cours WHERE id=v_module_id;
      SELECT id, titre INTO v_suivant_id, v_suivant_titre FROM modules_cours WHERE parcours_id=v_parcours_id AND ordre=v_ordre+1 LIMIT 1;
      IF v_suivant_id IS NOT NULL THEN
        INSERT INTO acces_module (etudiant_id, module_id, parcours_id, source_acces) VALUES (NEW.etudiant_id, v_suivant_id, v_parcours_id, 'presentiel') ON CONFLICT DO NOTHING;
        INSERT INTO notifications (destinataire_id, titre, message, type, lien) VALUES (NEW.etudiant_id, '✅ Module validé !', '🎉 Le module "'||v_suivant_titre||'" est maintenant accessible !', 'validation', '/etudiant/carnet');
      ELSE
        INSERT INTO notifications (destinataire_id, titre, message, type, lien) VALUES (NEW.etudiant_id, '🎓 Parcours complété !', '🏆 Félicitations ! Tu as validé tous les modules !', 'validation', '/etudiant/dashboard');
      END IF;
      PERFORM fn_check_badges(NEW.etudiant_id, v_parcours_id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_validation_ind AFTER UPDATE ON public.reponses_etudiant FOR EACH ROW EXECUTE FUNCTION public.fn_handle_validation();

-- Trigger E : Validation groupe
CREATE OR REPLACE FUNCTION public.fn_handle_validation_groupe()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_module_id uuid; v_parcours_id uuid; v_ordre integer; v_suivant_id uuid; v_suivant_titre text; v_total_grp integer; v_val_grp integer; v_membre RECORD; v_total_ind integer; v_val_ind integer;
BEGIN
  IF NEW.statut='valide' AND OLD.statut IS DISTINCT FROM 'valide' THEN
    SELECT e.module_id, rg.parcours_id INTO v_module_id, v_parcours_id FROM etapes e JOIN reponses_groupe rg ON rg.etape_id=e.id WHERE e.id=NEW.etape_id AND rg.id=NEW.id;
    SELECT COUNT(*) INTO v_total_grp FROM etapes WHERE module_id=v_module_id AND type='groupe';
    SELECT COUNT(*) INTO v_val_grp FROM reponses_groupe rg JOIN etapes e ON e.id=rg.etape_id WHERE e.module_id=v_module_id AND rg.groupe_id=NEW.groupe_id AND rg.statut='valide' AND e.type='groupe';
    IF v_val_grp=v_total_grp THEN
      SELECT ordre INTO v_ordre FROM modules_cours WHERE id=v_module_id;
      SELECT id, titre INTO v_suivant_id, v_suivant_titre FROM modules_cours WHERE parcours_id=v_parcours_id AND ordre=v_ordre+1 LIMIT 1;
      FOR v_membre IN SELECT etudiant_id FROM groupe_membres WHERE groupe_id=NEW.groupe_id LOOP
        SELECT COUNT(*) INTO v_total_ind FROM etapes WHERE module_id=v_module_id AND type='individuel';
        SELECT COUNT(*) INTO v_val_ind FROM reponses_etudiant re JOIN etapes e ON e.id=re.etape_id WHERE e.module_id=v_module_id AND re.etudiant_id=v_membre.etudiant_id AND re.statut='valide' AND e.type='individuel';
        IF v_val_ind=v_total_ind AND v_suivant_id IS NOT NULL THEN
          INSERT INTO acces_module (etudiant_id, module_id, parcours_id, source_acces) VALUES (v_membre.etudiant_id, v_suivant_id, v_parcours_id, 'presentiel') ON CONFLICT DO NOTHING;
          INSERT INTO notifications (destinataire_id, titre, message, type, lien) VALUES (v_membre.etudiant_id, '✅ Module validé en groupe !', '🎉 Le module suivant "'||v_suivant_titre||'" est accessible !', 'validation', '/etudiant/carnet');
        END IF;
        PERFORM fn_check_badges(v_membre.etudiant_id, v_parcours_id);
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_validation_grp AFTER UPDATE ON public.reponses_groupe FOR EACH ROW EXECUTE FUNCTION public.fn_handle_validation_groupe();

-- Trigger F : Badge première présence
CREATE OR REPLACE FUNCTION public.fn_badge_presence()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_parcours_id uuid; v_badge_id uuid;
BEGIN
  IF NEW.present=true AND (OLD.present IS DISTINCT FROM true) THEN
    SELECT s.parcours_id INTO v_parcours_id FROM sessions_cours s WHERE s.id=NEW.session_id;
    SELECT id INTO v_badge_id FROM badges WHERE condition_type='premiere_session_presentiel' LIMIT 1;
    IF v_badge_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM badges_etudiants WHERE etudiant_id=NEW.etudiant_id AND badge_id=v_badge_id AND parcours_id=v_parcours_id) THEN
      INSERT INTO badges_etudiants (etudiant_id, badge_id, parcours_id) VALUES (NEW.etudiant_id, v_badge_id, v_parcours_id);
      INSERT INTO notifications (destinataire_id, titre, message, type, lien) VALUES (NEW.etudiant_id, '📅 Badge obtenu !', '📅 Badge "Assidu" débloqué ! Continue comme ça !', 'badge', '/etudiant/badges');
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trigger_badge_presence AFTER UPDATE ON public.presences FOR EACH ROW EXECUTE FUNCTION public.fn_badge_presence();

-- ============ HANDLE NEW USER : crée profile + rôle 'etudiant' par défaut ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'etudiant'::public.app_role);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SEED : 6 badges ============
INSERT INTO public.badges (nom, description, icone, couleur, condition_type) VALUES
('Premier Pas', 'Tu as validé ton premier module ! 🚀', '🚀', '#F97316', 'premier_module'),
('À Mi-Chemin', 'Tu as validé 50% des modules. Continue ! ⭐', '⭐', '#7C3AED', 'mi_parcours'),
('Diplômé ASSIRIK', 'Tu as complété le parcours ! 🎓', '🎓', '#F59E0B', 'parcours_complet'),
('Première Étoile', 'Ta première validation reçue ! ✨', '✨', '#3B82F6', 'premiere_validation'),
('Esprit d''Équipe', 'Tous les livrables groupe validés ! 🤝', '🤝', '#22C55E', 'groupe_complet'),
('Assidu', 'Présent à ta première session ! 📅', '📅', '#EC4899', 'premiere_session_presentiel');
