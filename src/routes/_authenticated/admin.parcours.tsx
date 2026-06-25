import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, BookOpen, Search, Target } from "lucide-react";
import { ParcoursFormDialog, type Parcours, type MissionOption } from "@/components/parcours-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/parcours")({
  component: AdminParcoursPage,
});

interface ParcoursRow extends Parcours {
  missions: { id: string; nom: string; partenaires: { nom: string } | null } | null;
}

function AdminParcoursPage() {
  const [items, setItems] = useState<ParcoursRow[]>([]);
  const [missions, setMissions] = useState<MissionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Parcours | null>(null);
  const [deleting, setDeleting] = useState<ParcoursRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [parcoursRes, missionsRes] = await Promise.all([
      supabase
        .from("parcours")
        .select("id, nom, description, mission_id, pondere_individuel, pondere_groupe, missions:mission_id(id, nom, partenaires:partenaire_id(nom))")
        .order("created_at", { ascending: false }),
      supabase.from("missions").select("id, nom").order("nom"),
    ]);
    if (parcoursRes.error) toast.error(parcoursRes.error.message);
    if (missionsRes.error) toast.error(missionsRes.error.message);
    setItems((parcoursRes.data as unknown as ParcoursRow[]) ?? []);
    setMissions((missionsRes.data as MissionOption[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("parcours").delete().eq("id", deleting.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Parcours supprimé");
      load();
    }
    setDeleting(null);
  }

  const filtered = items.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.nom.toLowerCase().includes(q) ||
      (p.missions?.nom ?? "").toLowerCase().includes(q) ||
      (p.missions?.partenaires?.nom ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AssirikShell title="📚 Parcours">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un parcours..."
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          disabled={missions.length === 0}
          title={missions.length === 0 ? "Crée d'abord une mission" : undefined}
        >
          <Plus size={18} /> Nouveau parcours
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center">
          <BookOpen size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Aucun parcours</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0
              ? missions.length === 0
                ? "Crée d'abord une mission pour pouvoir y rattacher un parcours."
                : "Crée ton premier parcours pour commencer."
              : "Aucun résultat pour cette recherche."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">{p.nom}</p>
                  {p.missions && (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Target size={12} /> {p.missions.nom}
                      {p.missions.partenaires && <span className="ml-1">· {p.missions.partenaires.nom}</span>}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Indiv. {Number(p.pondere_individuel ?? 0)}% · Groupe {Number(p.pondere_groupe ?? 0)}%
                  </p>
                </div>
              </div>
              {p.description && (
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditing(p);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil size={14} /> Modifier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleting(p)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ParcoursFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        missions={missions}
        onSaved={load}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce parcours&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera <strong>{deleting?.nom}</strong> ainsi que tous ses modules, groupes, sessions et données liées. Cette opération est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AssirikShell>
  );
}