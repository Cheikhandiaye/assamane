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
import type { Json } from "@/integrations/supabase/types";

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
    detail: "Tout est en français hardcodé. À prévoir seulement en cas d'expansion non-francophone." },
];

const PRIO_STYLE: Record<Priorite, string> = {
  haute: "bg-red-100 text-red-700",
  moyenne: "bg-amber-100 text-amber-700",
  basse: "bg-blue-100 text-blue-700",
  idee: "bg-violet-100 text-violet-700",
};
const PRIO_LABEL: Record<Priorite, string> = { haute: "Haute", moyenne: "Moyenne", basse: "Basse", idee: "Idée" };
const STATUT_LABEL: Record<Statut, string> = { a_faire: "À faire", en_cours: "En cours", fait: "Fait" };

export const Route = createFileRoute("/_authenticated/admin/evolutions")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [items, setItems] = useState<Evolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle();
    const stored = (data?.value as any)?.items;
    setItems(Array.isArray(stored) && stored.length ? stored : SEED);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function persist(next: Evolution[]) {
    setItems(next);
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      { key: SETTINGS_KEY, value: { items: next as unknown as Json }, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) toast.error(error.message);
  }

  function addItem() {
    persist([
      { id: crypto.randomUUID(), titre: "", detail: "", priorite: "moyenne", statut: "a_faire" },
      ...items,
    ]);
  }
  function update(id: string, changes: Partial<Evolution>) {
    persist(items.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }
  function remove(id: string) {
    if (!confirm("Supprimer cette note ?")) return;
    persist(items.filter((it) => it.id !== id));
  }

  // Tri : à faire / en cours en haut, fait en bas ; puis par priorité
  const order: Priorite[] = ["haute", "moyenne", "basse", "idee"];
  const sorted = [...items].sort((a, b) => {
    if ((a.statut === "fait") !== (b.statut === "fait")) return a.statut === "fait" ? 1 : -1;
    return order.indexOf(a.priorite) - order.indexOf(b.priorite);
  });

  return (
    <AssirikShell title="💡 Notes pour évolution de l'outil">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Lightbulb size={15} className="text-amber-500" />
          Backlog des évolutions. Tout est enregistré automatiquement.
        </p>
        {saving && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
        <Button className="ml-auto" onClick={addItem}><Plus size={14} className="mr-1" />Nouvelle note</Button>
      </div>

      {loading ? (
        <Loader2 className="mx-auto animate-spin text-primary" />
      ) : (
        <div className="space-y-3">
          {sorted.map((it) => (
            <div key={it.id} className={`rounded-xl border border-border bg-card p-4 ${it.statut === "fait" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <GripVertical size={14} className="text-muted-foreground" />
                <Input
                  value={it.titre}
                  onChange={(e) => update(it.id, { titre: e.target.value })}
                  placeholder="Titre de l'évolution"
                  className="flex-1 min-w-[200px] font-medium"
                />
                <Select value={it.priorite} onValueChange={(v) => update(it.id, { priorite: v as Priorite })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["haute", "moyenne", "basse", "idee"] as Priorite[]).map((p) => (
                      <SelectItem key={p} value={p}>{PRIO_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={it.statut} onValueChange={(v) => update(it.id, { statut: v as Statut })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["a_faire", "en_cours", "fait"] as Statut[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUT_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIO_STYLE[it.priorite]}`}>
                  {PRIO_LABEL[it.priorite]}
                </span>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(it.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
              <Textarea
                rows={2}
                value={it.detail}
                onChange={(e) => update(it.id, { detail: e.target.value })}
                placeholder="Détail / contexte technique…"
                className="mt-2 text-sm"
              />
            </div>
          ))}
          {sorted.length === 0 && <p className="text-muted-foreground">Aucune note pour l'instant.</p>}
        </div>
      )}
    </AssirikShell>
  );
}
