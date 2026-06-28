# CODE_SMELLS_ET_OPTIMISATIONS — ASSIRIK

> Inventaire factuel des problèmes techniques. Aucune recommandation.

## 1. Fichiers > 300 lignes ("monstres")

| # | Fichier | Lignes |
|---|---|---|
| 1 | `src/components/module-contenus-editor.tsx` | 367 |
| 2 | `src/routes/_authenticated/etudiant.carnet.tsx` | 315 |

Fichiers de 200–299 lignes (sous le seuil mais à surveiller) :

| Fichier | Lignes |
|---|---|
| `src/routes/_authenticated/admin.etudiants.tsx` | 291 |
| `src/components/assirik-shell.tsx` | 261 |
| `src/routes/_authenticated/admin.parcours.tsx` | 232 |
| `src/routes/_authenticated/admin.missions.$missionId.tsx` | 226 |
| `src/components/parcours-inscriptions-dialog.tsx` | 222 |
| `src/routes/_authenticated/admin.partenaires.$partenaireId.tsx` | 209 |
| `src/routes/_authenticated/etudiant.parcours.tsx` | 208 |
| `src/routes/_authenticated/professeur.carnet.$etudiantId.$parcoursId.tsx` | 207 |

## 2. Composants avec appels Supabase directs (pas de service / hook dédié)

Comptage `supabase.` par fichier route (top 15) :

| Fichier | Appels `supabase.*` |
|---|---|
| `professeur.carnet.$etudiantId.$parcoursId.tsx` | 9 |
| `admin.sessions.tsx` | 7 |
| `admin.missions.tsx` | 7 |
| `etudiant.carnet.tsx` | 6 |
| `admin.groupes.tsx` | 6 |
| `professeur.tsx` | 5 |
| `partenaire.tsx` | 5 |
| `etudiant.tsx` | 5 |
| `professeur.parcours.$parcoursId.tsx` | 4 |
| `partenaire.etudiants.tsx` | 4 |
| `etudiant.groupe.tsx` | 4 |
| `admin.notifications.tsx` | 4 |
| `professeur.validations.tsx` | 3 |
| `professeur.prolongations.tsx` | 3 |
| `partenaire.parcours.tsx` | 3 |

Composants UI (hors route) qui contiennent aussi `supabase.*` directement :

- `src/components/assirik-shell.tsx`
- `src/components/etudiant-parcours-dialog.tsx`
- `src/components/module-contenus-editor.tsx`
- `src/components/parcours-form.tsx`
- `src/components/parcours-inscriptions-dialog.tsx`
- `src/components/parcours-modules-dialog.tsx`
- `src/components/partenaire-form.tsx`

→ Pas de couche `services/` ni de `queryOptions` réutilisables. TanStack Query est installé mais quasi non utilisé (les pages préfèrent `useEffect + supabase.from(...).then(setState)`).

## 3. Duplications de code identifiées

| # | Pattern dupliqué | Fichiers concernés |
|---|---|---|
| 1 | Bootstrap dashboard : `useEffect` + `Promise.all` de `supabase.from(...).select('*', {count:'exact', head:true})` | `admin.tsx`, `professeur.tsx`, `partenaire.tsx`, `etudiant.tsx` |
| 2 | Garde `useRoleGuard(role)` + early return `<Outlet />` si pathname !== route racine | `admin.tsx`, `professeur.tsx`, `etudiant.tsx`, `partenaire.tsx` (4 fois quasi identique) |
| 3 | Suppression + insert atomique des `user_roles` | `createUserFn` + `updateUserFn` dans `admin-users.functions.ts` |
| 4 | Lecture `parcours_etudiants` → resolve `parcours_id[]` → fetch `modules_cours` | `etudiant.tsx`, `etudiant.parcours.tsx`, `partenaire.tsx`, `professeur.tsx` |
| 5 | Fetch profil + role via deux requêtes parallèles | `use-current-user.ts`, et ré-implémenté dans certaines routes admin pour récupérer `partenaire_id` |
| 6 | Calcul progression `validees / total` | `etudiant.tsx`, `etudiant.parcours.tsx`, `lib/attestation.ts` (3 implémentations) |
| 7 | Toast d'erreur Supabase `if (error) toast.error(error.message)` | Présent dans la quasi-totalité des dialogs (`parcours-form.tsx`, `partenaire-form.tsx`, `user-form-dialog.tsx`, `parcours-modules-dialog.tsx`, `parcours-inscriptions-dialog.tsx`...) sans helper commun |
| 8 | Pagination locale (slice + setPage) | `admin.etudiants.tsx`, `admin.professeurs.tsx` (hook `use-paginated.ts` existe mais pas systématiquement utilisé) |

## 4. Mélange des responsabilités

| # | Fichier | Problème |
|---|---|---|
| 1 | `etudiant.carnet.tsx` | UI + logique offline + autosave + validation + appels Supabase + génération payload PDF dans un seul composant (315 lignes) |
| 2 | `module-contenus-editor.tsx` | Composant éditeur qui gère lui-même CRUD `contenus_module` + drag-drop + upload média + parsing JSON quiz (367 lignes) |
| 3 | `admin.etudiants.tsx` | Page liste + ouverture dialogs + appels `createUserFn`/`deleteUserFn`/`resetCarnet` + reset état pagination + export CSV |
| 4 | `assirik-shell.tsx` | Layout + nav par rôle + lecture `app_settings` (branding) + abonnement Realtime notifications + responsive drawer |
| 5 | `etudiant.tsx` | Dashboard + calcul progression cross-parcours + agrégation note moyenne + fetch badges count |
| 6 | `admin.partenaires.$partenaireId.tsx` | Page détail + upload logo Storage + form édition inline + suppression cascade |
| 7 | `parcours-inscriptions-dialog.tsx` | Dialog UI + recherche étudiants + create+upsert `parcours_etudiants` + bulk import CSV |

## 5. Performances — risques observables

| # | Page | Symptôme |
|---|---|---|
| 1 | `etudiant.tsx` | 4 requêtes séquentielles imbriquées (`parcours_etudiants` → `modules_cours` → count `etapes`) — risque N+1 si beaucoup de parcours |
| 2 | `partenaire.tsx` | `missions` → `parcours` → `parcours_etudiants` → `reponses_etudiant` chaînés (4 round-trips) à chaque rendu du dashboard |
| 3 | `admin.tsx` | 6 `count head:true` lancés en parallèle à chaque visite (pas de cache Query) |
| 4 | `professeur.carnet.$etudiantId.$parcoursId.tsx` | 9 appels Supabase au mount, pas de mise en cache |
| 5 | Toutes pages | Aucune utilisation de `useSuspenseQuery` ni `queryClient.ensureQueryData` dans les loaders — chaque navigation refait les fetchs |
| 6 | `etudiant.carnet.tsx` | Autosave écrit dans `reponses_etudiant` à chaque debounce (200 ms par défaut dans `use-auto-save.ts`) — volume d'UPDATE potentiellement élevé |
| 7 | `assirik-shell.tsx` | Souscription Realtime `notifications` ouverte pour tous les rôles, même partenaire (qui ne reçoit aucune notif côté triggers) |
| 8 | `admin.parcours.tsx` | Charge tous les parcours sans pagination ni filtre serveur |
| 9 | `admin.bibliotheque.tsx` | Charge `bibliotheque_modules` complet (`payload jsonb` potentiellement lourd) en SELECT * |
| 10 | `etudiant.module.$moduleId.tsx` | `contenus_module` chargé entier (vidéos, textes, quiz) puis filtré côté client |
| 11 | PWA | `vite-plugin-pwa` en `NetworkFirst` → coupures = fallback, mais aucun precache stratégique des routes étudiant |
| 12 | Aucune route ne définit `loader` TanStack Router — tout est `useEffect`, ce qui empêche le SSR / preload |

## 6. Autres observations

- `src/routeTree.gen.ts` est commit (normal mais à exclure des diffs revues).
- Pas de tests automatisés (`vitest`/`playwright` non présents dans `package.json`).
- Pas de typage `Database` partagé : la majorité des appels Supabase retourne `any` faute de typage explicite des `.select()`.
- `console.log` et `console.error` dispersés dans les triggers d'erreur des dialogs.
- Aucune télémétrie applicative (PostHog, Sentry, etc.) — uniquement le reporting Lovable (`lib/lovable-error-reporting.ts`).
