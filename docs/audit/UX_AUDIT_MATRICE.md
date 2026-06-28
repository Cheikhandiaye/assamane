# UX_AUDIT_MATRICE — ASSIRIK

> État des lieux des parcours utilisateurs (faits uniquement).

## 1. Personas et points d'entrée

| Persona | Rôle BDD | URL d'entrée après login | Dashboard fichier | Nav latérale (composant) |
|---|---|---|---|---|
| Administrateur | `admin` | `/admin` | `admin.tsx` | `assirik-shell.tsx` (section admin) |
| Formateur / Professeur | `professeur` | `/professeur` | `professeur.tsx` | `assirik-shell.tsx` (section prof) |
| Étudiant | `etudiant` | `/etudiant` | `etudiant.tsx` | `assirik-shell.tsx` (section etudiant) |
| Partenaire | `partenaire` | `/partenaire` | `partenaire.tsx` | `assirik-shell.tsx` (section partenaire) |

Routeur d'entrée : `_authenticated/app.tsx` lit `useCurrentUser` puis redirige selon `role`. Si rôle manquant : reste sur `/app` (écran vide). Si non connecté : `_authenticated/route.tsx` redirige vers `/auth`.

## 2. Parcours type par persona

### Étudiant
```
/auth (login)
  └─> /app (router rôle)
       └─> /etudiant (dashboard : progression circulaire + 3 KPI + bouton "Voir mes parcours")
            └─> /etudiant/parcours (liste parcours inscrits)
                 └─> /etudiant/module/$id (vidéo / texte / quiz consommés)
                      ├─ suivi_contenu UPDATE -> trigger online_unlock -> notification
                      └─> /etudiant/carnet (autosave + offline ; soumission étape)
                           └─ reponses_etudiant INSERT/UPDATE statut=soumis
                                └─ prof valide -> trigger validation -> module suivant débloqué + badge
            └─> /etudiant/badges
            └─> /etudiant/groupe (si membre d'un groupe)
            └─> /etudiant/sessions (présentiel)
            └─> /etudiant/notifications
```

### Professeur
```
/professeur (dashboard 5 KPI)
  ├─> /professeur/parcours -> /professeur/parcours/$id
  ├─> /professeur/modules (mes modules créés)
  ├─> /professeur/etudiants (étudiants inscrits aux parcours suivis)
  │    └─> /professeur/carnet/$etudiantId/$parcoursId (lecture/correction)
  ├─> /professeur/validations (file d'attente reponses_etudiant statut=soumis)
  ├─> /professeur/prolongations (accepte/refuse demandes)
  └─> /professeur/missions, /professeur/partenaires (lecture)
```

### Admin
```
/admin (6 KPI : partenaires, missions, parcours, profils, validations, prolongations)
  ├─> /admin/partenaires (CRUD) -> /admin/partenaires/$id
  ├─> /admin/missions (CRUD) -> /admin/missions/$id
  ├─> /admin/parcours (CRUD + assignation modules + inscriptions)
  ├─> /admin/professeurs (CRUD comptes via createUserFn)
  ├─> /admin/etudiants (CRUD comptes + reset carnet)
  ├─> /admin/groupes (composition manuelle)
  ├─> /admin/sessions, /admin/cahier-de-texte (consultation)
  ├─> /admin/bibliotheque (modules réutilisables)
  ├─> /admin/badges (CRUD règles)
  ├─> /admin/validations, /admin/prolongations (override prof)
  ├─> /admin/notifications (broadcast)
  ├─> /admin/evolutions (pondérations note finale)
  └─> /admin/parametres (branding logo/couleurs)
```

### Partenaire
```
/partenaire (3 KPI : missions actives, étudiants, validations en attente)
  ├─> /partenaire/missions (liste de SES missions)
  ├─> /partenaire/parcours (parcours rattachés aux missions)
  └─> /partenaire/etudiants (vivier — lecture, pas d'export)
```

## 3. Inventaire des actions critiques

| Persona | Action | Composant déclencheur | Endpoint / table impactée |
|---|---|---|---|
| Étudiant | Soumettre étape | `carnet-field.tsx` + `etudiant.carnet.tsx` | `reponses_etudiant` INSERT/UPDATE |
| Étudiant | Marquer contenu vu | `use-content-tracking.ts` | `suivi_contenu` UPSERT |
| Étudiant | Demander prolongation | NON IMPLÉMENTÉ (table existe, pas de form étudiant) | — |
| Étudiant | Soumettre réponse groupe | `etudiant.carnet.tsx` (mode `reponses_groupe`, rapporteur uniquement) | `reponses_groupe` |
| Étudiant | Télécharger attestation | `lib/attestation.ts` (jsPDF) | RPC `fn_parcours_attestation` |
| Prof | Valider/refuser réponse | `professeur.validations.tsx` | `reponses_etudiant.statut` |
| Prof | Ouvrir / clôturer session | `admin.sessions.tsx` (partagé) | `sessions_cours.statut` + trigger `fn_session_cloture` |
| Prof | Cocher présence | `admin.sessions.tsx` (toggle) | `presences.present` |
| Prof | Accès carnet immédiat | toggle session | `presences.acces_carnet_immediat` |
| Admin | Créer compte | `user-form-dialog.tsx` | `createUserFn` server fn |
| Admin | Reset carnet étudiant | `admin.etudiants.tsx` | `resetCarnet` server fn |
| Admin | Modifier branding | `admin.parametres.tsx` | `app_settings` upsert |
| Admin | Cloner module bibliothèque | `admin.bibliotheque.tsx` | RPC `fn_clone_module_to_parcours` |
| Partenaire | Exporter étudiants | NON IMPLÉMENTÉ (vue lecture seule) | — |

## 4. Points de friction observables

| # | Page | Observation factuelle |
|---|---|---|
| 1 | `/app` | Aucun écran de fallback si rôle inconnu : la page reste blanche, l'utilisateur est bloqué |
| 2 | `/etudiant` | Dashboard mélange progression d'un seul "agrégat global" pour TOUS les parcours — pas de sélecteur de parcours visible |
| 3 | `/etudiant/carnet` | Pas de breadcrumb : l'étudiant ne sait pas dans quel module / étape il est sans scroller |
| 4 | `/etudiant/parcours` | Bouton CTA dashboard "Voir mes parcours" duplique l'item de la sidebar |
| 5 | `/admin/sessions` ↔ `/admin/cahier-de-texte` | Deux entrées sidebar pour deux vues de la même entité (session vs son snapshot post-clôture) |
| 6 | `/admin/validations` ↔ `/professeur/validations` | Même UI, deux URLs (override admin) — pas de marqueur visuel "vue admin" |
| 7 | `/admin/notifications` + `/etudiant/notifications` | Le panneau `notification-panel.tsx` (popover topbar) duplique l'écran liste |
| 8 | `assirik-shell.tsx` | Nav latérale à 9+ items pour admin → scroll vertical sur petits écrans |
| 9 | `/admin/parcours` | Édition d'un parcours nécessite 3 dialogs successifs (form, modules, inscriptions) — pas de page détail |
| 10 | `/etudiant/module/$id` | Vidéo + texte + quiz dans un seul scroll sans onglets — friction sur modules longs |
| 11 | `/admin/groupes` | Création/édition groupe = drag-drop dnd-kit sans aide visuelle, pas d'undo |
| 12 | `/professeur/carnet/...` | Lecture seule : pas de bouton "commenter" inline, le prof doit retourner sur `/validations` |
| 13 | `/partenaire/*` | Aucun bouton d'action — section purement consultative, pas de différenciation visuelle vs étudiant |
| 14 | `/auth` | Un seul écran login/signup combiné — pas de séparation conditions/CGU |
| 15 | Toutes routes étudiant | `useRoleGuard` redirige vers `/app` mais sans toast → l'utilisateur ne comprend pas le rebond |
| 16 | `etudiant.carnet.tsx` | Indicateur "offline" via `offline-banner.tsx` global, mais pas de feedback champ-par-champ sur la persistance |
| 17 | `/etudiant` "Note moyenne" | Calculée sur l'ensemble des réponses validées sans contexte de parcours |

## 5. Hiérarchie visuelle actuelle

| Écran | Élément le plus visible (au-dessus de la ligne de flottaison) | Information critique réellement attendue | Verdict |
|---|---|---|---|
| `/etudiant` dashboard | Cercle de progression 176×176 px conique | Prochaine action / étape à faire | DÉCALÉ — la progression n'est pas actionnable |
| `/etudiant/parcours` | Cartes parcours uniformes | État (verrouillé / en cours / terminé) | Indication présente mais sans hiérarchie de couleur |
| `/admin` dashboard | 6 cartes KPI alignées | Actions urgentes (validations en attente) | KPI en orange/rouge présent mais pas de CTA "traiter maintenant" |
| `/admin/parcours` | Liste plate triée par date création | Parcours actifs vs archivés | Pas de filtre visible par défaut |
| `/professeur` dashboard | 5 KPI alignés horizontalement | File de validations | KPI "Validations en attente" non priorisé visuellement |
| `/partenaire` dashboard | 3 KPI uniformes | Étudiants performants / à l'écoute | Vue purement quantitative, aucun visage |
| `/etudiant/carnet` | Titre étape + champs | Statut de soumission + tentatives restantes | Affichés en bas de page, sous le pli |
| `/auth` | Logo + formulaire | CTA "Se connecter" | Hiérarchie OK |
| `/onboarding` | Titre + champ unique | Étapes restantes / progression | Pas de stepper |

### Tokens visuels utilisés
- Primary : `#7C3AED` (violet) — défini dans `src/styles.css`
- Accent : `#F97316` (orange) — CTAs
- Police : `Inter` (chargée via `__root.tsx`)
- Layout : `assirik-shell.tsx` (sidebar fixe gauche desktop / drawer mobile)
