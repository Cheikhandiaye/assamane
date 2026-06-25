import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Building2, Mail, MapPin, Search } from "lucide-react";
import { PartenaireFormDialog, type Partenaire } from "@/components/partenaire-form";
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

export const Route = createFileRoute("/_authenticated/admin/partenaires")({
  component: AdminPartenairesPage,
});

function AdminPartenairesPage() {
  const [items, setItems] = useState<Partenaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partenaire | null>(null);
  const [deleting, setDeleting] = useState<Partenaire | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partenaires")
      .select("id, nom, logo_url, couleur_primaire, couleur_secondaire, adresse, contact_email")
      .order("nom", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as Partenaire[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("partenaires").delete().eq("id", deleting.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Partenaire supprimé");
      load();
    }
    setDeleting(null);
  }

  const filtered = items.filter((p) =>
    p.nom.toLowerCase().includes(query.toLowerCase()) ||
    (p.contact_email ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AssirikShell title="🏢 Partenaires">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un partenaire..."
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus size={18} /> Nouveau partenaire
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center">
          <Building2 size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Aucun partenaire</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0 ? "Crée ton premier partenaire pour commencer." : "Aucun résultat pour cette recherche."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white text-lg font-bold"
                  style={{ backgroundColor: p.couleur_primaire ?? "#7C3AED" }}
                >
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.nom} className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    p.nom.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">{p.nom}</p>
                  {p.contact_email && (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail size={12} /> {p.contact_email}
                    </p>
                  )}
                  {p.adresse && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin size={12} /> {p.adresse}
                    </p>
                  )}
                </div>
              </div>
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

      <PartenaireFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSaved={load}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce partenaire&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera <strong>{deleting?.nom}</strong> ainsi que toutes ses missions et parcours liés. Cette opération est irréversible.
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