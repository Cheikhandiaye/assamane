import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CONDITIONS = [
  { v: "premiere_validation", label: "Première validation" },
  { v: "premier_module", label: "Premier module complété" },
  { v: "mi_parcours", label: "Mi-parcours (50%)" },
  { v: "parcours_complet", label: "Parcours complété" },
  { v: "groupe_complet", label: "Tous les modules de groupe" },
  { v: "premiere_session_presentiel", label: "Première présence en présentiel" },
];

export const Route = createFileRoute("/_authenticated/admin/badges")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const blank = { nom: "", description: "", icone: "🏆", couleur: "#F97316", condition_type: "premiere_validation" };
  const [form, setForm] = useState(blank);

  async function load() {
    const { data } = await supabase.from("badges").select("*").order("nom");
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEdit(null); setForm(blank); setOpen(true); }
  function openEdit(b: any) { setEdit(b); setForm({ nom: b.nom, description: b.description ?? "", icone: b.icone ?? "🏆", couleur: b.couleur ?? "#F97316", condition_type: b.condition_type }); setOpen(true); }
  async function save() {
    const op = edit ? supabase.from("badges").update(form).eq("id", edit.id) : supabase.from("badges").insert(form);
    const { error } = await op;
    if (error) return toast.error(error.message);
    setOpen(false); load(); toast.success("Enregistré");
  }
  async function remove(id: string) {
    if (!confirm("Supprimer ?")) return;
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error) return toast.error(error.message); load();
  }

  return (
    <AssirikShell title="🏆 Badges">
      <div className="mb-4 flex justify-end"><Button onClick={openNew}><Plus size={14} className="mr-1" />Nouveau badge</Button></div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full text-2xl" style={{ background: b.couleur + "33" }}>{b.icone}</div>
              <div className="min-w-0 flex-1">
                <strong className="block truncate">{b.nom}</strong>
                <p className="text-xs text-muted-foreground">{CONDITIONS.find((c) => c.v === b.condition_type)?.label ?? b.condition_type}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil size={14} /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 size={14} /></Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
          </div>
        ))}{rows.length === 0 && <p className="text-sm text-muted-foreground"><Trophy className="mr-2 inline" />Aucun badge configuré.</p>}</div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? "Modifier" : "Nouveau"} badge</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Icône (emoji)</Label><Input value={form.icone} onChange={(e) => setForm({ ...form, icone: e.target.value })} /></div>
              <div><Label>Couleur</Label><Input type="color" value={form.couleur} onChange={(e) => setForm({ ...form, couleur: e.target.value })} /></div>
            </div>
            <div><Label>Condition d'obtention</Label>
              <Select value={form.condition_type} onValueChange={(v) => setForm({ ...form, condition_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c.v} value={c.v}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={save}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AssirikShell>
  );
}