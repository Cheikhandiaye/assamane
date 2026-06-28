# ARCHITECTURE_TECHNIQUE — ASSIRIK

> Cartographie brute de l'existant au 2026-06-28. Aucune interprétation.

## 1. Arborescence

```
/
├── public/                         # Assets statiques servis tels quels
│   ├── icon.svg                    # Icône PWA SVG
│   └── manifest.webmanifest        # Manifeste PWA
├── supabase/
│   ├── config.toml                 # Config projet (auto-générée Lovable Cloud)
│   └── migrations/                 # 12 migrations SQL horodatées
├── src/
│   ├── components/                 # Composants React partagés
│   │   ├── ui/                     # Primitives shadcn/ui (49 fichiers)
│   │   ├── assirik-shell.tsx       # Layout principal (sidebar + topbar + role nav)
│   │   ├── carnet-field.tsx        # Champ dynamique du carnet étudiant (offline)
│   │   ├── connection-indicator.tsx
│   │   ├── etudiant-parcours-dialog.tsx
│   │   ├── module-contenus-editor.tsx
│   │   ├── notification-panel.tsx
│   │   ├── offline-banner.tsx
│   │   ├── pagination-bar.tsx
│   │   ├── parcours-form.tsx
│   │   ├── parcours-inscriptions-dialog.tsx
│   │   ├── parcours-modules-dialog.tsx
│   │   ├── partenaire-form.tsx
│   │   ├── partner-logo.tsx
│   │   ├── quiz-runner.tsx
│   │   ├── route-error-boundary.tsx
│   │   ├── tap-to-select.tsx
│   │   ├── text-content.tsx
│   │   ├── user-form-dialog.tsx
│   │   └── video-embed.tsx
│   ├── hooks/
│   │   ├── use-auto-save.ts            # Debounce + persist localStorage du carnet
│   │   ├── use-content-tracking.ts     # Suivi % vidéo/lecture
│   │   ├── use-current-user.ts         # Session + rôle + nom courant
│   │   ├── use-mobile.tsx              # Breakpoint helper
│   │   ├── use-notifications.ts        # Realtime notifications
│   │   ├── use-offline-sync.ts         # Replay file outbox -> Supabase
│   │   ├── use-paginated.ts            # Pagination générique
│   │   └── use-role-guard.ts           # Redirection si rôle non autorisé
│   ├── integrations/supabase/
│   │   ├── auth-attacher.ts            # Middleware client (attache Bearer)
│   │   ├── auth-middleware.ts          # Middleware serveur (requireSupabaseAuth)
│   │   ├── client.server.ts            # supabaseAdmin (service role)
│   │   ├── client.ts                   # supabase (publishable key)
│   │   └── types.ts                    # Types auto-générés
│   ├── lib/
│   │   ├── admin-users.functions.ts    # CRUD comptes (createServerFn)
│   │   ├── attestation.ts              # Génération attestation PDF
│   │   ├── branding.ts                 # Lecture app_settings
│   │   ├── error-capture.ts
│   │   ├── error-page.ts
│   │   ├── exports.ts                  # Export CSV (papaparse)
│   │   ├── fetch-users-by-role.ts
│   │   ├── lovable-error-reporting.ts
│   │   ├── note-engine.ts              # Calcul note pondérée (60/40)
│   │   ├── pwa.ts                      # Enregistrement service worker
│   │   ├── reset-carnet.functions.ts   # Reset carnet (admin)
│   │   ├── storage.ts                  # Helpers Supabase Storage
│   │   └── utils.ts                    # cn() + helpers
│   ├── routes/
│   │   ├── __root.tsx                  # Shell HTML + PWA
│   │   ├── _authenticated/             # Layout protégé (route.tsx = gate)
│   │   │   └── ...                     # 41 routes (cf. §3)
│   │   ├── auth.tsx                    # Login / signup
│   │   ├── auth.reset-password.tsx
│   │   ├── index.tsx                   # Landing
│   │   └── onboarding.tsx              # Onboarding post-signup
│   ├── routeTree.gen.ts                # AUTO-GÉNÉRÉ
│   ├── router.tsx                      # createRouter + QueryClient
│   ├── server.ts                       # Entry SSR
│   ├── start.ts                        # createStart + middleware (attachSupabaseAuth)
│   └── styles.css                      # Tailwind v4 + tokens design
├── package.json
├── vite.config.ts                      # Vite + TanStack Router + PWA
└── tsconfig.json
```

## 2. Routes API / Server Functions

Aucune route HTTP publique sous `src/routes/api/`. Toute la logique back passe par `createServerFn`.

| Fichier | Symbole | Méthode | Middleware | Rôle effectif |
|---|---|---|---|---|
| `src/lib/admin-users.functions.ts` | `createUserFn` | POST | `requireSupabaseAuth` | Admin — crée user Auth + profil + rôle (auto-validé) |
| `src/lib/admin-users.functions.ts` | `updateUserFn` | POST | `requireSupabaseAuth` | Admin — patch email/password/role/profil |
| `src/lib/admin-users.functions.ts` | `deleteUserFn` | POST | `requireSupabaseAuth` | Admin — supprime compte Auth |
| `src/lib/reset-carnet.functions.ts` | `resetCarnet` | POST | `requireSupabaseAuth` | Admin — purge réponses + suivi + accès d'un parcours |

Middleware client (`src/start.ts`) : `attachSupabaseAuth` → attache le Bearer Supabase à chaque appel `createServerFn`.

## 3. Pages frontend

Routage file-based (TanStack Router). Toutes les routes sous `_authenticated/` sont protégées par `route.tsx` (redirection `/auth` si non connecté). En interne, chaque page de rôle appelle `useRoleGuard(role)`.

### Public

| Route | Fichier | Rôle |
|---|---|---|
| `/` | `routes/index.tsx` | Landing publique |
| `/auth` | `routes/auth.tsx` | Login / signup |
| `/auth/reset-password` | `routes/auth.reset-password.tsx` | Reset MDP |
| `/onboarding` | `routes/onboarding.tsx` | Onboarding post-signup |
| `/app` | `_authenticated/app.tsx` | Router par rôle (redirige) |
| `/profil` | `_authenticated/profil.tsx` | Profil courant |

### Admin (`admin`)

| Route | Fichier |
|---|---|
| `/admin` | `admin.tsx` (dashboard 6 stats) |
| `/admin/partenaires` | `admin.partenaires.tsx` |
| `/admin/partenaires/$id` | `admin.partenaires.$partenaireId.tsx` |
| `/admin/missions` | `admin.missions.tsx` |
| `/admin/missions/$id` | `admin.missions.$missionId.tsx` |
| `/admin/parcours` | `admin.parcours.tsx` |
| `/admin/professeurs` | `admin.professeurs.tsx` |
| `/admin/etudiants` | `admin.etudiants.tsx` |
| `/admin/groupes` | `admin.groupes.tsx` |
| `/admin/sessions` | `admin.sessions.tsx` |
| `/admin/cahier-de-texte` | `admin.cahier-de-texte.tsx` |
| `/admin/bibliotheque` | `admin.bibliotheque.tsx` |
| `/admin/badges` | `admin.badges.tsx` |
| `/admin/validations` | `admin.validations.tsx` |
| `/admin/prolongations` | `admin.prolongations.tsx` |
| `/admin/notifications` | `admin.notifications.tsx` |
| `/admin/evolutions` | `admin.evolutions.tsx` |
| `/admin/parametres` | `admin.parametres.tsx` |

### Professeur (`professeur`)

| Route | Fichier |
|---|---|
| `/professeur` | `professeur.tsx` |
| `/professeur/parcours` | `professeur.parcours.tsx` |
| `/professeur/parcours/$id` | `professeur.parcours.$parcoursId.tsx` |
| `/professeur/modules` | `professeur.modules.tsx` |
| `/professeur/missions` | `professeur.missions.tsx` |
| `/professeur/etudiants` | `professeur.etudiants.tsx` |
| `/professeur/partenaires` | `professeur.partenaires.tsx` |
| `/professeur/validations` | `professeur.validations.tsx` |
| `/professeur/prolongations` | `professeur.prolongations.tsx` |
| `/professeur/carnet/$etudiantId/$parcoursId` | `professeur.carnet.$etudiantId.$parcoursId.tsx` |

### Étudiant (`etudiant`)

| Route | Fichier |
|---|---|
| `/etudiant` | `etudiant.tsx` |
| `/etudiant/parcours` | `etudiant.parcours.tsx` |
| `/etudiant/module/$id` | `etudiant.module.$moduleId.tsx` |
| `/etudiant/carnet` | `etudiant.carnet.tsx` |
| `/etudiant/groupe` | `etudiant.groupe.tsx` |
| `/etudiant/sessions` | `etudiant.sessions.tsx` |
| `/etudiant/badges` | `etudiant.badges.tsx` |
| `/etudiant/notifications` | `etudiant.notifications.tsx` |

### Partenaire (`partenaire`)

| Route | Fichier |
|---|---|
| `/partenaire` | `partenaire.tsx` |
| `/partenaire/missions` | `partenaire.missions.tsx` |
| `/partenaire/parcours` | `partenaire.parcours.tsx` |
| `/partenaire/etudiants` | `partenaire.etudiants.tsx` |

## 4. Schéma de base de données

Backend : Postgres (Lovable Cloud / Supabase). 25 tables `public` + schéma `app_private` pour SECURITY DEFINER. RLS activée partout.

### Tables

| Table | Colonnes notables | Policies | Relations |
|---|---|---|---|
| `profiles` | id (PK→auth.users), email, full_name, partenaire_id, avatar_url | 3 | →partenaires |
| `user_roles` | user_id, role (enum `app_role`) | 2 | →auth.users |
| `app_settings` | key, value (jsonb) | 2 | — |
| `partenaires` | nom, contact_email, contact_phone, logo_path, secteur, ville | 2 | — |
| `missions` | partenaire_id, titre, deadline, statut, mode | 4 | →partenaires |
| `parcours` | mission_id, titre, ponderation_ind, ponderation_grp | 4 | →missions |
| `parcours_etudiants` | parcours_id, etudiant_id, mode, modules_hybrides[] | 5 | composite |
| `parcours_professeurs` | parcours_id, professeur_id | 2 | composite |
| `modules_cours` | parcours_id, titre, ordre, created_by | 4 | →parcours |
| `contenus_module` | module_id, type (video/text/quiz), payload, ordre | 3 | →modules_cours |
| `etapes` | module_id, titre, type (individuel/groupe), max_tentatives, payload | 3 | →modules_cours |
| `reponses_etudiant` | etape_id, etudiant_id, parcours_id, contenu, note, statut, nb_tentatives | 4 | →etapes |
| `reponses_groupe` | etape_id, groupe_id, parcours_id, contenu, note, statut, nb_tentatives | 5 | →etapes/groupes |
| `groupes` | parcours_id, nom, rapporteur_id | 3 | →parcours |
| `groupe_membres` | groupe_id, etudiant_id | 3 | composite |
| `acces_module` | etudiant_id, module_id, parcours_id, source_acces | 4 | UNIQUE(etudiant_id, module_id) |
| `suivi_contenu` | etudiant_id, module_id, contenu_id, parcours_id, complete, progress | 3 | composite |
| `sessions_cours` | parcours_id, professeur_id, date_session, heure_*, modules_dispenses[], statut, observations | 3 | →parcours |
| `presences` | session_id, etudiant_id, present, acces_carnet_immediat | 3 | →sessions_cours |
| `cahier_de_texte` | session_id, parcours_id, mission_id, professeur_id, date_seance, contenus, signe_par, signe_le | 7 | snapshot session |
| `bibliotheque_modules` | titre, payload (jsonb) | 2 | template |
| `badges` | code, nom, icone, condition_type, criteria | 2 | — |
| `badges_etudiants` | etudiant_id, badge_id, parcours_id, date_obtention | 3 | composite |
| `demandes_prolongation` | etudiant_id, parcours_id, motif, statut, validee_par | 2 | →parcours |
| `notifications` | destinataire_id, titre, message, type, lien, lu | 2 | →profiles |

### Enums

- `app_role` : `admin | professeur | etudiant | partenaire`
- `source_acces` : `presentiel | online`
- Statuts (text inline) : `ouverte/terminee`, `soumis/valide/refuse`, `active/cloturee`, `en_attente/acceptee/refusee`

### Fonctions SECURITY DEFINER (schéma `app_private`, wrappers `public` INVOKER)

- `has_role(uuid, app_role)`, `is_admin()`
- `is_prof_of_parcours(uuid)`, `is_student_of_parcours(uuid)`
- `is_prof_of_mission(uuid)`, `is_student_of_mission(uuid)`, `is_partenaire_of_mission(uuid)`
- `can_view_profile(uuid)`, `can_view_partenaire(uuid)`, `can_prof_enroll(uuid,uuid)`
- `fn_parcours_attestation(uuid,uuid)`, `fn_clone_module_to_parcours(uuid,uuid)`

### Triggers

- `handle_new_user` (auth.users INSERT) → profile + user_roles `etudiant`
- `fn_handle_validation` (reponses_etudiant UPDATE) → débloque module suivant + badges
- `fn_handle_validation_groupe` (reponses_groupe UPDATE) → idem groupe
- `fn_check_online_unlock` (suivi_contenu UPDATE) → déblocage carnet à 100 %
- `fn_acces_immediat` (presences UPDATE) → accès carnet immédiat si flag
- `fn_session_cloture` (sessions_cours UPDATE) → snapshot cahier_de_texte
- `fn_badge_presence` (presences UPDATE) → badge "Assidu"
- `fn_check_badges(uuid,uuid)` — appelée par triggers de validation
- `fn_check_max_tentatives` / `fn_check_max_tentatives_groupe` (BEFORE UPDATE)

## 5. Stack technique

| Catégorie | Techno | Version |
|---|---|---|
| Build | Vite | 7.x |
| Framework | TanStack Start | ^1.167.50 |
| Router | @tanstack/react-router | ^1.168.25 |
| UI | React | ^19.2.0 |
| State serveur | @tanstack/react-query | ^5.83.0 |
| Styling | Tailwind CSS | ^4.2.1 |
| Composants | shadcn/ui (Radix) | Radix 1.x–2.x |
| Icônes | lucide-react | ^0.575 |
| Formulaires | react-hook-form + zod | ^7.71 / ^3.24 |
| Charts | recharts | ^3.9 |
| DnD | @dnd-kit/core + sortable | ^6.3 / ^10 |
| Carrousel | embla-carousel-react | ^8.6 |
| Toast | sonner + react-hot-toast | ^2 |
| PDF | jspdf + html2canvas | ^4.2 / ^1.4 |
| Rich text | react-quill | ^2.0 |
| CSV | papaparse | ^5.5 |
| Vidéo | react-player | ^3.4 |
| Confetti | canvas-confetti | ^1.9 |
| PWA | vite-plugin-pwa + workbox-window | ^1.3 / ^7.4 |
| Backend | Supabase | ^2.108 |
| Langage | TypeScript strict | — |

## 6. Dépendances critiques

| Domaine | Package | Implémentation |
|---|---|---|
| Auth | `@supabase/supabase-js` | `integrations/supabase/client.ts` + `auth-middleware.ts` |
| Auth admin | service role | `integrations/supabase/client.server.ts` |
| Upload fichiers | Supabase Storage | buckets `carnet-attachments`, `partner-logos` — `lib/storage.ts` |
| Notifications | Supabase Realtime | `hooks/use-notifications.ts` + table `notifications` |
| Paiement | NON IMPLÉMENTÉ | — |
| WebSocket | Supabase Realtime | hook notifications uniquement |
| PDF | jspdf + html2canvas | `lib/attestation.ts` |
| Offline sync | localStorage outbox custom | `hooks/use-offline-sync.ts` + `use-auto-save.ts` |
| Email transactionnel | NON IMPLÉMENTÉ (Supabase Auth par défaut pour magic links) | — |
| Push notifications | NON IMPLÉMENTÉ | — |
