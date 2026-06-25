import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/missions")({ component: MissionsPage });

interface Mission { id: string; nom: string; description: string | null; partenaire_id: string | null; date_debut: string | null; date_fin: string | null; statut: string; partenaires?: { nom: string } | null }

function MissionsPage() {
  useRoleGuard("admin");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Mission[]>([]);
  const [partenaires, setPartenaires] = useState<{ id: string; nom: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Mission | null>(null);
  const [form, setForm] = useState({ nom: "", description: "", partenaire_id: "", date_debut: "", date_fin: "", statut: "brouillon" });

  async function load() {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("missions").select("*, partenaires(nom)").order("created_at", { ascending: false }),
      supabase.from("partenaires").select("id, nom").order("nom"),
    ]);
    setItems((m as Mission[]) ?? []);
    setPartenaires(p ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEdit(null); setForm({ nom: "", description: "", partenaire_id: "", date_debut: "", date_fin: "", statut: "brouillon" }); setOpen(true); }
  function openEdit(m: Mission) { setEdit(m); setForm({ nom: m.nom, description: m.description ?? "", partenaire_id: m.partenaire_id ?? "", date_debut: m.date_debut ?? "", date_fin: m.date_fin ?? "", statut: m.statut }); setOpen(true); }

  async function save() {
    if (!form.nom || !form.partenaire_id) { toast.error("Nom et partenaire requis"); return; }
    const payload = { nom: form.nom, description: form.description || null, partenaire_id: form.partenaire_id, date_debut: form.date_debut || null, date_fin: form.date_fin || null, statut: form.statut };
    const { error } = edit ? await supabase.from("missions").update(payload).eq("id", edit.id) : await supabase.from("missions").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Mission modifiée" : "Mission créée");
    setOpen(false); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Mission supprimée"); load();
  }

  return (
    <AssirikShell title="🎯 Missions">
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew}><Plus size={16} className="mr-2" />Nouvelle mission</Button>
      </div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2"><Target className="text-primary" size={20} /><h3 className="font-bold">{m.nom}</h3></div>
                <Badge variant={m.statut === "active" ? "default" : m.statut === "terminee" ? "secondary" : "outline"}>{m.statut}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{m.partenaires?.nom}</p>
              <p className="mt-2 text-sm line-clamp-2">{m.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">{m.date_debut} → {m.date_fin}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(m)}><Pencil size={14} className="mr-1" />Modifier</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 size={14} /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Supprimer ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => remove(m.id)}>Supprimer</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {!items.length && <p className="text-muted-foreground">Aucune mission. Crée la première.</p>}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? "Modifier la mission" : "Nouvelle mission"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
            <div><Label>Partenaire *</Label>
              <Select value={form.partenaire_id} onValueChange={(v) => setForm({ ...form, partenaire_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{partenaires.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Début</Label><Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} /></div>
              <div><Label>Fin</Label><Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} /></div>
            </div>
            <div><Label>Statut</Label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="terminee">Terminée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={save}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AssirikShell>
  );
}