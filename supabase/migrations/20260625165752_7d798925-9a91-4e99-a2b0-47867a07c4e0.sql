
-- Seed pédagogique : 8 modules globaux ASSIRIK avec étapes et contenus
DO $$
DECLARE
  v_admin_id uuid;
  v_module_id uuid;
  v_modules text[] := ARRAY[
    'Découverte de l''entrepreneuriat|Comprendre ce qu''est entreprendre, les profils d''entrepreneurs et les opportunités au Sénégal',
    'Idéation et créativité|Générer, sélectionner et structurer une idée d''entreprise',
    'Étude de marché|Identifier sa cible, analyser la concurrence et valider la demande',
    'Proposition de valeur|Définir clairement ce qui rend ton offre unique',
    'Business Model Canvas|Modéliser ton activité avec le canevas en 9 blocs',
    'Plan financier|Estimer coûts, revenus, seuil de rentabilité et besoin de financement',
    'Stratégie marketing et vente|Construire ton plan de communication et de commercialisation',
    'Pitch et présentation|Présenter ton projet de façon convaincante en 3 minutes'
  ];
  v_item text;
  v_parts text[];
  v_idx integer := 1;
BEGIN
  SELECT user_id INTO v_admin_id FROM public.user_roles WHERE role = 'admin' ORDER BY created_at LIMIT 1;

  FOREACH v_item IN ARRAY v_modules LOOP
    v_parts := string_to_array(v_item, '|');
    -- évite les doublons à la ré-exécution
    IF NOT EXISTS (SELECT 1 FROM public.modules_cours WHERE est_global = true AND titre = v_parts[1]) THEN
      INSERT INTO public.modules_cours (titre, description, ordre, est_global, created_by)
      VALUES (v_parts[1], v_parts[2], v_idx, true, v_admin_id)
      RETURNING id INTO v_module_id;

      -- 1 contenu texte introductif
      INSERT INTO public.contenus_module (module_id, type, titre, contenu_texte, ordre)
      VALUES (v_module_id, 'texte', 'Introduction : ' || v_parts[1],
              '<h2>Bienvenue dans le module « ' || v_parts[1] || ' »</h2><p>' || v_parts[2] || '.</p><p>Lis attentivement cette introduction puis remplis ton carnet.</p>',
              1);

      -- 2 étapes (individuelle + groupe) avec champs dynamiques
      INSERT INTO public.etapes (module_id, titre, description, type, ordre, champs)
      VALUES
        (v_module_id, 'Réflexion individuelle', 'Réponds avec tes propres mots aux questions ci-dessous.', 'individuel', 1,
         '[{"key":"comprehension","label":"Qu''as-tu retenu de ce module ?","type":"textarea","required":true},{"key":"application","label":"Comment vas-tu appliquer cela à ton projet ?","type":"textarea","required":true}]'::jsonb),
        (v_module_id, 'Travail de groupe', 'À remplir par le rapporteur du groupe.', 'groupe', 2,
         '[{"key":"synthese","label":"Synthèse du groupe","type":"textarea","required":true},{"key":"livrable","label":"Livrable / décision du groupe","type":"textarea","required":true}]'::jsonb);
    END IF;
    v_idx := v_idx + 1;
  END LOOP;
END $$;
