import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Library, Loader2, Plus, Pencil, Trash2, ListChecks, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ModuleContenusEditor } from "@/components/module-contenus-editor";
import { AiModuleImportDialog } from "@/components/ai-module-import-dialog";

export const Route = createFileRoute("/_authenticated/admin/bibliotheque")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [mods, setMods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [form, setForm] = useState({ titre: "", description: "", ordre: 1, categorie: "" });
  const [editingContenus, setEditingContenus] = useState<{ id: string; titre: string } | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("modules_cours")
      .select("*, etapes(count), contenus_module(count)")
      .eq("est_global", true)
      .order("categorie", { nullsFirst: false })
      .order("ordre");
    setMods(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEdit(null); setForm({ titre: "", description: "", ordre: (mods.length || 0) + 1, categorie: "" }); setOpen(true); }
  function openEdit(m: any) { setEdit(m); setForm({ titre: m.titre, description: m.description ?? "", ordre: m.ordre, categorie: m.categorie ?? "" }); setOpen(true); }

  async function save() {
    if (!form.titre) return toast.error("Titre requis");
    const payload = {
      titre: form.titre,
      description: form.description || null,
      ordre: form.ordre,
      categorie: form.categorie.trim() || null,
      est_global: true,
      parcours_id: null,
    };
    const { error } = edit
      ? await supabase.from("modules_cours").update(payload).eq("id", edit.id)
      : await supabase.from("modules_cours").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Module modifié" : "Module créé"); setOpen(false); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("modules_cours").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé"); load();
  }

  // Catégories existantes (pour l'autocomplétion) + regroupement de l'affichage
  const categories = Array.from(new Set(mods.map((m) => m.categorie).filter(Boolean))).sort();
  const groups: [string, any[]][] = (() => {
    const g: Record<string, any[]> = {};
    for (const m of mods) {
      const k = (m.categorie && String(m.categorie).trim()) || "Sans catégorie";
      (g[k] ??= []).push(m);
    }
    return Object.entries(g).sort(([a], [b]) =>
      a === "Sans catégorie" ? 1 : b === "Sans catégorie" ? -1 : a.localeCompare(b)
    );
  })();

  return (
    <AssirikShell title="📚 Bibliothèque de modules">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Modules pédagogiques globaux, catégorisés et duplicables sur n'importe quel parcours.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Sparkles size={14} className="mr-1" />Importer & enrichir par IA
          </Button>
          <Button onClick={openNew}><Plus size={14} className="mr-1" />Ajouter un module global</Button>
        </div>
      </div>

      {loading ? (
        <Loader2 className="mx-auto animate-spin text-primary" />
      ) : mods.length === 0 ? (
        <p className="text-muted-foreground">Aucun module global pour l'instant.</p>
      ) : (
        <div className="space-y-8">
          {groups.map(([cat, list]) => (
            <section key={cat}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {cat} <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{list.length}</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((m) => (
                  <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2"><Library className="text-primary" size={20} /><h3 className="font-bold">{m.titre}</h3></div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{m.description}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{m.etapes?.[0]?.count ?? 0} étapes · {m.contenus_module?.[0]?.count ?? 0} contenus</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="text-primary" onClick={() => setEditingContenus({ id: m.id, titre: m.titre })}>
                        <ListChecks size={12} className="mr-1" />Contenus
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(m)}><Pencil size={12} className="mr-1" />Modifier</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-destructive"><Trash2 size={12} /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Supprimer ce module ?</AlertDialogTitle></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => remove(m.id)}>Supprimer</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? "Modifier" : "Nouveau module global"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titre *</Label><Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></div>
            <div>
              <Label>Catégorie</Label>
              <Input
                list="categories-list"
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                placeholder="Ex : Entrepreneuriat, Marketing…"
              />
              <datalist id="categories-list">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Ordre</Label><Input type="number" value={form.ordre} onChange={(e) => setForm({ ...form, ordre: parseInt(e.target.value) || 1 })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={save}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ModuleContenusEditor
        moduleId={editingContenus?.id ?? null}
        moduleTitre={editingContenus?.titre ?? ""}
        open={!!editingContenus}
        onOpenChange={(o) => !o && setEditingContenus(null)}
        onChanged={load}
      />

      <AiModuleImportDialog open={aiOpen} onOpenChange={setAiOpen} onDone={load} />
    </AssirikShell>
  );
}
