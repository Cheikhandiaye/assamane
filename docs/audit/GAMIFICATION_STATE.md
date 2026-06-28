# GAMIFICATION_STATE — ASSIRIK

> Diagnostic factuel de l'existant gamification.

## 1. Mécaniques en place

| Mécanique | Implémentée ? | Tables / colonnes | Surface UI |
|---|---|---|---|
| Points / XP | NON IMPLÉMENTÉ | — | — |
| Badges | OUI | `badges`, `badges_etudiants` | `/etudiant/badges`, `/admin/badges` |
| Niveaux | NON IMPLÉMENTÉ | — | — |
| Classement / leaderboard | NON IMPLÉMENTÉ | — | — |
| Streak / série quotidienne | NON IMPLÉMENTÉ | — | — |
| Quêtes / défis ponctuels | NON IMPLÉMENTÉ | — | — |
| Progression visuelle | OUI (partiel) | calcul ad hoc dans `etudiant.tsx` (anneau conique) | `/etudiant` dashboard |
| Notifications de récompense | OUI | `notifications` (`type='badge'`) | popover `notification-panel.tsx` |
| Confettis / feedback | DISPONIBLE NON UTILISÉ | dépendance `canvas-confetti` installée, aucun `import` côté app | — |
| Attestation finale | OUI | RPC `fn_parcours_attestation` + `lib/attestation.ts` | bouton dans `/etudiant/parcours` |

## 2. Catalogue des badges (`badges.condition_type`)

| Code condition | Trigger SQL | Critère |
|---|---|---|
| `premiere_validation` | `fn_check_badges` (sur `fn_handle_validation`) | ≥ 1 `reponses_etudiant.statut='valide'` |
| `premier_module` | idem | 100 % étapes validées du module d'ordre 1 du parcours |
| `mi_parcours` | idem | ≥ 50 % étapes parcours validées |
| `parcours_complet` | idem | 100 % étapes parcours validées |
| `groupe_complet` | idem | 100 % étapes groupe validées par le groupe de l'étudiant |
| `premiere_session_presentiel` | `fn_badge_presence` (sur `presences.present=true`) | 1ère présence cochée |

## 3. Triggers d'attribution

```sql
-- fn_handle_validation : appelle fn_check_badges(etudiant, parcours) à chaque validation d'étape individuelle
-- fn_handle_validation_groupe : idem pour chaque membre quand groupe valide
-- fn_badge_presence : sur UPDATE presences (present false→true)
-- fn_check_badges : itère sur tous les badges, vérifie condition, INSERT badges_etudiants + notification
```

Toutes les attributions :
- ne déclenchent **pas** de notification push,
- ne donnent **pas** de points (système de points absent),
- déclenchent une `notifications` (type=`badge`) lue via `use-notifications.ts` (Realtime).

## 4. Taux d'utilisation

NON MESURABLE depuis le code (aucune télémétrie applicative ni table d'agrégat). Requête possible (à exécuter côté BDD) :

```sql
SELECT b.nom, COUNT(*) AS nb_obtentions
FROM badges_etudiants be JOIN badges b ON b.id = be.badge_id
GROUP BY b.nom ORDER BY nb_obtentions DESC;
```

## 5. Problèmes identifiés (factuels)

1. **Aucun système de points** — l'engagement passe uniquement par les badges binaires, pas de progression continue.
2. **Pas de niveaux** — le profil étudiant n'a pas de "rank" / titre.
3. **Pas de leaderboard** — `groupes` existent mais aucune comparaison inter-groupes ni inter-étudiants.
4. **Pas de streak** — la connexion quotidienne n'est pas tracée (`last_login_at` absent de `profiles`).
5. **Pas de quêtes temporaires** — les badges sont statiques (catalogue fixe), pas de "défi du mois".
6. **Feedback visuel minimal** — `canvas-confetti` est dans `package.json` mais aucun `import` dans `src/` ; aucun toast spécifique sur obtention badge (la notif Realtime arrive en popover discret).
7. **Conditions opaques** — le catalogue badges n'est pas exposé "à débloquer" : l'étudiant ne voit que les badges déjà obtenus dans `/etudiant/badges`.
8. **Pas de gratification présentielle granulaire** — un seul badge présence (`premiere_session_presentiel`), pas de seuils (5, 10, 20 séances).
9. **Pas de hiérarchie de rareté** — `badges` n'a pas de colonne `rarete`/`tier`.
10. **Pas de partage social** — l'attestation PDF est téléchargeable mais aucun bouton partage / lien public.
11. **Pas de récompense côté professeur/partenaire** — gamification 100 % côté étudiant.
12. **Notifications de badge non distinguées** des notifications de validation/déblocage : même composant, même style.

## 6. Schéma `badges` actuel

```sql
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  nom text NOT NULL,
  icone text,                  -- emoji ou nom Lucide
  condition_type text NOT NULL,-- enum text (cf §2)
  criteria jsonb,              -- réservé, peu utilisé
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.badges_etudiants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etudiant_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE,
  parcours_id uuid REFERENCES public.parcours(id) ON DELETE CASCADE,
  date_obtention timestamptz DEFAULT now(),
  UNIQUE (etudiant_id, badge_id, parcours_id)
);
```
