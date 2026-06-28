import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Layers } from "lucide-react";
import { toast } from "sonner";

type ParcoursModule = {
  id: string;
  titre: string;
  ordre: number;
  contenus_module: { count: number }[];
  etapes: { count: number }[];
};

type LibModule = { id: string; titre: string; categorie: string | null };

export function ParcoursModulesDialog({
  parcoursId,
  parcoursNom,
  open,
  onOpenChange,
  onChanged,
}: {
  parcoursId: string | null;
  parcoursNom: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modules, setModules] = useState<ParcoursModule[]>([]);
  const [library, setLibrary] = useState<LibModule[]>([]);
  const [selected, setSelected] = useState("");

  async function load() {
    if (!parcoursId) return;
    setLoading(true);
    const [inP, lib] = await Promise.all([
      supabase
        .from("modules_cours")
        .select("id, titre, ordre, contenus_module(count), etapes(count)")
        .eq("parcours_id", parcoursId)
        .order("ordre"),
      supabase
        .from("modules_cours")
        .select("id, titre, categorie")
        .eq("est_global", true)
        .order("categorie", { nullsFirst: false })
        .order("ordre"),
    ]);
    setModules((inP.data ?? []) as ParcoursModule[]);
    setLibrary((lib.data ?? []) as LibModule[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open && parcoursId) {
      setSelected("");
      load();
    }
  }, [open, parcoursId]);

  async function addFromLibrary() {
    if (!selected || !parcoursId) return;
    setBusy(true);
    const { error } = await supabase.rpc("fn_clone_module_to_parcours", {
      _module_id: selected,
      _parcours_id: parcoursId,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Module ajouté au parcours");
    setSelected("");
    await load();
    onChanged?.();
  }

  async function removeModule(id: string, titre: string) {
    if (!confirm(`Retirer « ${titre} » du parcours ?\n\nSes contenus, étapes et le suivi associé seront supprimés. Action irréversible.`)) return;
    const { error } = await supabase.from("modules_cours").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Module retiré");
    await load();
    onChanged?.();
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= modules.length) return;
    const a = modules[idx];
    const b = modules[j];
    await supabase.from("modules_cours").update({ ordre: b.ordre }).eq("id", a.id);
    await supabase.from("modules_cours").update({ ordre: a.ordre }).eq("id", b.id);
    await load();
  }

  function libLabel(m: LibModule) {
    return m.categorie ? `${m.categorie} — ${m.titre}` : m.titre;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modules — {parcoursNom}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <Loader2 className="mx-auto my-8 animate-spin text-primary" />
        ) : (
          <div className="space-y-5">
            {/* Ajouter depuis la bibliothèque */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Layers size={15} className="text-primary" />
                Ajouter un module depuis la bibliothèque
              </h3>
              <div className="flex gap-2">
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={library.length ? "Choisir un module…" : "Bibliothèque vide"} />
                  </SelectTrigger>
                  <SelectContent>
                    {library.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{libLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addFromLibrary} disabled={!selected || busy}>
                  {busy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                  Ajouter
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Le module est copié dans ce parcours (avec ses contenus et ses étapes). La bibliothèque reste inchangée.
              </p>
            </div>

            {/* Modules actuels du parcours */}
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Modules du parcours <span className="text-muted-foreground">({modules.length})</span>
              </h3>
              {modules.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  Aucun module. Ajoute-en depuis la bibliothèque ci-dessus.
                </p>
              ) : (
                <ul className="space-y-2">
                  {modules.map((m, idx) => (
                    <li key={m.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.titre}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.contenus_module?.[0]?.count ?? 0} contenus · {m.etapes?.[0]?.count ?? 0} étapes
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}><ChevronUp size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === modules.length - 1}><ChevronDown size={14} /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeModule(m.id, m.titre)}><Trash2 size={14} /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
