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
import { Library, Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/bibliotheque")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [mods, setMods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [form, setForm] = useState({ titre: "", description: "", ordre: 1 });

  async function load() {
    const { data } = await supabase.from("modules_cours").select("*, etapes(count), contenus_module(count)").eq("est_global", true).order("ordre");
    setMods(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEdit(null); setForm({ titre: "", description: "", ordre: (mods.length || 0) + 1 }); setOpen(true); }
  function openEdit(m: any) { setEdit(m); setForm({ titre: m.titre, description: m.description ?? "", ordre: m.ordre }); setOpen(true); }

  async function save() {
    if (!form.titre) return toast.error("Titre requis");
    const payload = { titre: form.titre, description: form.description || null, ordre: form.ordre, est_global: true, parcours_id: null };
    const { error } = edit ? await supabase.from("modules_cours").update(payload).eq("id", edit.id) : await supabase.from("modules_cours").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Module modifié" : "Module créé"); setOpen(false); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("modules_cours").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Supprimé"); load();
  }

  return (
    <AssirikShell title="📚 Bibliothèque de modules">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Modules pédagogiques globaux, dupliquables sur n'importe quel parcours.</p>
        <Button onClick={openNew}><Plus size={14} className="mr-1" />Ajouter un module global</Button>
      </div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mods.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2"><Library className="text-primary" size={20} /><h3 className="font-bold">{m.titre}</h3></div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{m.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{m.etapes?.[0]?.count ?? 0} étapes · {m.contenus_module?.[0]?.count ?? 0} contenus</p>
              <div className="mt-3 flex gap-2">
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
          {!mods.length && <p className="text-muted-foreground">Aucun module global pour l'instant.</p>}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? "Modifier" : "Nouveau module global"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Titre *</Label><Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Ordre</Label><Input type="number" value={form.ordre} onChange={(e) => setForm({ ...form, ordre: parseInt(e.target.value) || 1 })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={save}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AssirikShell>
  );
}