import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Lightbulb, GripVertical } from "lucide-react";
import { toast } from "sonner";

type Priorite = "haute" | "moyenne" | "basse" | "idee";
type Statut = "a_faire" | "en_cours" | "fait";

interface Evolution {
  id: string;
  titre: string;
  detail: string;
  priorite: Priorite;
  statut: Statut;
}

const SETTINGS_KEY = "evolutions_backlog";

// Backlog initial : tout ce qu'on a identifié au fil du développement
const SEED: Evolution[] = [
  { id: "opt-b", titre: "Option B — modules en lien direct (many-to-many)", priorite: "haute", statut: "a_faire",
    detail: "Aujourd'hui un module appartient à un seul parcours (modules_cours.parcours_id) et on le DUPLIQUE dans chaque parcours (option A). Évolution : table de liaison parcours_modules(parcours_id, module_id, ordre) pour qu'un module de la bibliothèque soit RÉFÉRENCÉ par plusieurs parcours sans copie (corrigé une fois = à jour partout). Refactor lourd : migrer les données, réécrire toutes les requêtes lisant modules_cours.parcours_id (consommation étudiant, déblocage, carnet, professeur.modules), et auditer le cloisonnement du suivi par (étudiant, module, parcours)." },
  { id: "attestation", titre: "Attestation de réussite téléchargeable", priorite: "haute", statut: "a_faire",
    detail: "Quand un étudiant termine un parcours dans les délais impartis (date de fin du parcours, par défaut celle de la mission mais modifiable), générer une attestation PDF téléchargeable. Nécessite : une date_fin propre au parcours (modifiable), une règle de complétion 'parcours terminé', et un générateur PDF (logo partenaire + nom étudiant + parcours + date)." },
  { id: "date-parcours", titre: "Date de fin propre au parcours (modifiable)", priorite: "moyenne", statut: "a_faire",
    detail: "Le parcours hérite par défaut de la date de fin de sa mission, mais doit pouvoir être modifié individuellement. Prérequis de l'attestation." },
  { id: "emails", titre: "Emails transactionnels (Resend)", priorite: "moyenne", statut: "a_faire",
    detail: "Notifications par email (badge gagné, étape validée, module débloqué, prolongation approuvée). Architecture validée : Database Webhook sur la table notifications → Edge Function Supabase → Resend. Mis en pause pour rester sans dépendance externe. Tout est dans le projet Supabase de Lovable Cloud." },
  { id: "authoring-prof", titre: "Autoriser les profs à développer du contenu", priorite: "moyenne", statut: "a_faire",
    detail: "Aujourd'hui l'éditeur de contenus est admin-only. La RLS permet déjà au prof d'éditer ses PROPRES modules (created_by). À ouvrir plus tard : éditeur côté prof + décider si un prof peut éditer un module admin qui lui est assigné." },
  { id: "ecran-prof-inscription", titre: "Écran d'inscription côté professeur", priorite: "moyenne", statut: "a_faire",
    detail: "La policy autorise déjà le prof à inscrire ses étudiants (même partenaire que la mission). Mais les dialogues d'inscription vivent en espace admin. Donner au prof son propre écran réutilisant le même dialogue." },
  { id: "pagination-serveur", titre: "Pagination serveur (au-delà de ~1000 lignes)", priorite: "basse", statut: "a_faire",
    detail: "La pagination des listes admin est côté client (tout est chargé puis découpé). Basculer en pagination serveur avec .range() Supabase quand les volumes l'exigeront." },
  { id: "online-gate", titre: "Gating optionnel de la voie online", priorite: "basse", statut: "a_faire",
    detail: "Aujourd'hui un étudiant peut consommer le contenu d'un module pour le débloquer lui-même (voie online), même un module 'en attente présentiel'. Prévoir une option pour forcer le présentiel d'abord sur certains modules." },
  { id: "tests", titre: "Tests automatisés", priorite: "basse", statut: "a_faire",
    detail: "Vitest est installé mais aucun test écrit. À ajouter quand l'app se stabilise." },
  { id: "i18n", titre: "Internationalisation (i18n)", priorite: "idee", statut: "a_faire",
