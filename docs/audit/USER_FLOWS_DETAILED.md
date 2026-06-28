# USER_FLOWS_DETAILED — ASSIRIK

> Détail factuel des flux par persona. État actuel, sans recommandation.

---

## 1. ÉTUDIANT

### 1.1 Inscription

| Étape | URL | Composants | Appels / Tables | Conditions |
|---|---|---|---|---|
| Landing | `/` | `routes/index.tsx` | — | toujours public |
| Formulaire signup | `/auth` | `routes/auth.tsx` (`Input`, `Button`) | `supabase.auth.signUp({email,password})` | Si `email_confirm` désactivé : session immédiate. Si activé : email magic link |
| Trigger BDD | — | — | `handle_new_user` → `profiles` + `user_roles` (role=`etudiant`) | automatique |
| Redirection | `/onboarding` | `routes/onboarding.tsx` | — | si profil incomplet (heuristique : `full_name` vide) |

> ALTERNATIVE : un admin peut créer le compte via `/admin/etudiants` → `createUserFn` (compte auto-validé, mot de passe fourni).

### 1.2 Onboarding

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Saisie `full_name` (+ autres champs profil) | `/onboarding` | `routes/onboarding.tsx` | `supabase.from('profiles').update(...)` |
| Redirection finale | `/etudiant` | — | — |

NON IMPLÉMENTÉ : stepper multi-écrans, choix d'avatar, sélection d'intérêts.

### 1.3 Choix du parcours

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Liste des parcours inscrits | `/etudiant/parcours` | `etudiant.parcours.tsx` (cards) | `SELECT * FROM parcours_etudiants JOIN parcours` |
| Détail / entrée parcours | `/etudiant/parcours` (card → bouton) | — | navigation `/etudiant/module/$id` (premier module débloqué) |

> Pas de catalogue libre : l'étudiant n'est inscrit qu'à des parcours décidés par admin/prof (`parcours_etudiants` peuplé via `/admin/parcours` ou `/professeur/parcours`).

### 1.4 Consommation de contenu

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Lecture module | `/etudiant/module/$moduleId` | `etudiant.module.$moduleId.tsx`, `video-embed.tsx`, `text-content.tsx`, `quiz-runner.tsx` | `SELECT contenus_module WHERE module_id=$` |
| Tracking progression | (même page) | `use-content-tracking.ts` | `UPSERT suivi_contenu (etudiant_id, module_id, contenu_id, progress, complete)` |
| Déblocage carnet | trigger BDD | `fn_check_online_unlock` | INSERT `acces_module` + `notifications` quand 100 % vu |

Conditions d'affichage :
- bouton "Marquer terminé" : visible si `progress >= 0.9` (vidéo) ou ouverture (texte)
- onglet quiz : visible si `contenus_module.type='quiz'`

### 1.5 Validation (carnet / quiz)

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Ouverture carnet | `/etudiant/carnet` | `etudiant.carnet.tsx` | `SELECT etapes WHERE module_id IN (acces_module.module_id)` |
| Saisie réponses | (même page) | `carnet-field.tsx` + `use-auto-save.ts` | `UPSERT reponses_etudiant` (statut `brouillon`) toutes les ~200 ms |
| Soumission étape | bouton "Soumettre" | — | `UPDATE reponses_etudiant SET statut='soumis'` (trigger `fn_check_max_tentatives` BEFORE) |
| Réponse groupe | (même page si étape `type=groupe` et étudiant rapporteur) | — | `UPSERT reponses_groupe` |
| Validation prof | `/professeur/validations` côté prof | — | `UPDATE reponses_etudiant SET statut='valide', note=$` → trigger `fn_handle_validation` |
| Déblocage suivant | trigger BDD | `fn_handle_validation` | INSERT `acces_module` du module ordre+1 + `notifications` + `fn_check_badges` |

Conditions :
- bouton Soumettre désactivé si `nb_tentatives >= etapes.max_tentatives`
- mode groupe : soumission visible uniquement pour `groupes.rapporteur_id = auth.uid()`
- offline : `use-offline-sync.ts` met les UPSERT en file localStorage, replay au retour online

### 1.6 Certification

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Indicateur "Parcours complet" | `/etudiant/parcours` | — | RPC `fn_parcours_attestation(etudiant, parcours)` |
| Génération PDF | bouton "Télécharger attestation" | `lib/attestation.ts` (jsPDF + html2canvas) | `fn_parcours_attestation` retourne `{complete, completed_at, deadline, within_deadline}` |

Condition d'affichage : RPC renvoie `complete=true`. Mention "dans les délais" si `within_deadline=true`.

NON IMPLÉMENTÉ : envoi par email, partage public, vérification QR code.

---

## 2. FORMATEUR / PROFESSEUR

### 2.1 Création de cours

> Restriction : un prof ne crée pas un parcours ex nihilo dans l'UI actuelle. Il crée des **modules** réutilisables, l'admin assemble les parcours.

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Liste de mes modules | `/professeur/modules` | `professeur.modules.tsx` | `SELECT modules_cours WHERE created_by = auth.uid()` |
| Créer / éditer un module | (dialog) | `module-contenus-editor.tsx` | `INSERT modules_cours` + `INSERT contenus_module` |
| Affecter module à parcours | `/admin/parcours` (admin only) ou clonage bibliothèque | `parcours-modules-dialog.tsx` | `UPDATE modules_cours.parcours_id` ou RPC `fn_clone_module_to_parcours` |

### 2.2 Ajout de leçons (contenus & étapes)

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Ajout contenu | (dialog module) | `module-contenus-editor.tsx` | `INSERT contenus_module (type, payload, ordre)` |
| Ajout étape (quiz / question carnet) | (même éditeur) | section `etapes` | `INSERT etapes (titre, type, max_tentatives, payload)` |
| Drag & drop ordre | (même) | dnd-kit | `UPDATE ... SET ordre=$` |

### 2.3 Suivi des étudiants

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Liste étudiants suivis | `/professeur/etudiants` | `professeur.etudiants.tsx` | `SELECT parcours_etudiants WHERE parcours_id IN (mes parcours)` |
| Consulter carnet | `/professeur/carnet/$etudiantId/$parcoursId` | `professeur.carnet.$etudiantId.$parcoursId.tsx` | 9 requêtes (modules, étapes, réponses ind+groupe, suivi, badges, infos étudiant) |
| Demandes prolongation | `/professeur/prolongations` | `professeur.prolongations.tsx` | `SELECT demandes_prolongation WHERE statut='en_attente'` |

### 2.4 Gestion des évaluations

| Étape | URL | Composants | Appels |
|---|---|---|---|
| File de validations | `/professeur/validations` | `professeur.validations.tsx` | `SELECT reponses_etudiant WHERE statut='soumis'` (+ jointures) |
| Valider | bouton | — | `UPDATE reponses_etudiant SET statut='valide', note, feedback` |
| Refuser | bouton | — | `UPDATE reponses_etudiant SET statut='refuse', feedback` (réinitialise pour retentative) |
| Présentiel : ouvrir / clôturer session | `/admin/sessions` (partagée avec prof) | `admin.sessions.tsx` | `INSERT sessions_cours` → `UPDATE statut='terminee'` (trigger `fn_session_cloture`) |
| Cocher présence | (même page) | toggle | `UPSERT presences (session_id, etudiant_id, present)` |
| Accès carnet immédiat | (toggle ligne présence) | — | `UPDATE presences.acces_carnet_immediat=true` → trigger `fn_acces_immediat` |

---

## 3. ADMIN

### 3.1 Gestion des utilisateurs (CRUD)

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Liste étudiants | `/admin/etudiants` | `admin.etudiants.tsx` + `user-form-dialog.tsx` | `SELECT profiles JOIN user_roles WHERE role='etudiant'` |
| Liste profs | `/admin/professeurs` | `admin.professeurs.tsx` | idem `role='professeur'` |
| Création | dialog | `user-form-dialog.tsx` | server fn `createUserFn` → `supabaseAdmin.auth.admin.createUser({email_confirm:true})` + upsert profiles + insert user_roles |
| Édition | dialog | idem | `updateUserFn` |
| Suppression | bouton | — | `deleteUserFn` (interdit pour self) |
| Reset carnet | bouton (admin.etudiants) | — | `resetCarnet({etudiant_id, parcours_id})` → DELETE `reponses_etudiant` + `suivi_contenu` + `acces_module` |
| Export CSV | bouton | `lib/exports.ts` (papaparse) | export local |

### 3.2 Gestion des rôles

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Modification rôle | `user-form-dialog.tsx` (champ select) | — | `updateUserFn` → DELETE `user_roles WHERE user_id` puis INSERT nouveau rôle |

Conditions :
- Garde côté serveur : `assertAdmin(context.supabase, context.userId)` exécute `SELECT user_roles WHERE user_id=$ AND role='admin'`
- Garde côté UI : `useRoleGuard('admin')` sur la route

### 3.3 Visualisation des stats globales

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Dashboard | `/admin` | `admin.tsx` | 6 `count head:true` sur partenaires, missions, parcours, profiles + reponses statut='soumis' + demandes_prolongation statut='en_attente' |
| Activités récentes | (carte vide) | — | NON IMPLÉMENTÉ (placeholder texte uniquement) |

NON IMPLÉMENTÉ : graphiques temporels, export rapport global, drill-down par partenaire.

---

## 4. PARTENAIRE

### 4.1 Accès au vivier

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Connexion | `/auth` | — | session ; rôle `partenaire` requis |
| Dashboard | `/partenaire` | `partenaire.tsx` | 3 KPI (missions actives, étudiants, validations en attente) — chaîne `partenaires_id → missions → parcours → parcours_etudiants` |
| Liste missions | `/partenaire/missions` | `partenaire.missions.tsx` | `SELECT missions WHERE partenaire_id = (profile.partenaire_id)` |
| Liste parcours | `/partenaire/parcours` | `partenaire.parcours.tsx` | join missions→parcours |

### 4.2 Consultation des profils étudiants

| Étape | URL | Composants | Appels |
|---|---|---|---|
| Liste étudiants | `/partenaire/etudiants` | `partenaire.etudiants.tsx` | `SELECT profiles via parcours_etudiants WHERE parcours.mission.partenaire_id = profile.partenaire_id` (RLS `can_view_profile`) |
| Détail | NON IMPLÉMENTÉ | — | — |

Conditions :
- RLS `can_view_profile(target)` : retourne true si admin OU partenaire dont l'étudiant est dans une mission liée.
- Aucun bouton d'action (lecture seule).

### 4.3 Export de données

NON IMPLÉMENTÉ — `lib/exports.ts` existe (papaparse) mais aucun bouton sur les vues partenaire ne l'invoque.

---

## 5. Tableau récapitulatif des conditions d'affichage

| UI conditionnelle | Logique | Source |
|---|---|---|
| Sidebar items admin | `role === 'admin'` | `assirik-shell.tsx` |
| Bouton "Soumettre" carnet | `nb_tentatives < max_tentatives` | `etudiant.carnet.tsx` |
| Bouton soumission groupe | `groupe.rapporteur_id === auth.uid()` | idem |
| Bouton "Télécharger attestation" | RPC `fn_parcours_attestation.complete = true` | `etudiant.parcours.tsx` |
| Badge popover (cloche) | `notifications.lu = false` count > 0 | `notification-panel.tsx` |
| Bouton "Reset carnet" | route admin uniquement | `admin.etudiants.tsx` |
| Toggle "Accès carnet immédiat" | session ouverte ET prof = créateur ET présence cochée | `admin.sessions.tsx` |
| Bandeau offline | `navigator.onLine === false` | `offline-banner.tsx` |
| Redirection rôle | hook `useRoleGuard(expected)` redirige vers `/app` | toutes pages rôle |

---

## 6. Arbre de décision global post-login

```
session ?
├─ non → /auth
└─ oui → fetch user_roles
        ├─ aucun rôle → reste sur /app (écran vide — bug UX)
        ├─ admin       → /admin
        ├─ professeur  → /professeur
        ├─ etudiant    → profil complet ?
        │                ├─ non → /onboarding
        │                └─ oui → /etudiant
        └─ partenaire  → /partenaire
```
