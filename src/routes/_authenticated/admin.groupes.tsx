import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { fetchUsersByRole } from "@/lib/fetch-users-by-role";

export const Route = createFileRoute("/_authenticated/admin/groupes")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [parcours, setParcours] = useState<{ id: string; nom: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: "", parcours_id: "" });
  const [memberOpen, setMemberOpen] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, { etudiant_id: string; full_name: string | null }[]>>({});
  const [picked, setPicked] = useState("");

  async function load() {
    const [{ data: g }, { data: pc }] = await Promise.all([
      supabase.from("groupes").select("id, nom, parcours_id, parcours(nom), groupe_membres(etudiant_id, profiles:etudiant_id(full_name))").order("created_at", { ascending: false }),
      supabase.from("parcours").select("id, nom").order("nom"),
    ]);
    const st = await fetchUsersByRole("etudiant");
    setRows(g ?? []);
    setParcours(pc ?? []);
    setStudents(st.map((p) => ({ id: p.id, full_name: p.full_name })));
    const m: any = {};
    (g ?? []).forEach((row: any) => { m[row.id] = (row.groupe_membres ?? []).map((mm: any) => ({ etudiant_id: mm.etudiant_id, full_name: mm.profiles?.full_name })); });
    setMembers(m);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.nom || !form.parcours_id) return toast.error("Champs requis");
    const { error } = await supabase.from("groupes").insert(form);
    if (error) return toast.error(error.message);
    setOpen(false); setForm({ nom: "", parcours_id: "" }); load(); toast.success("Groupe créé");
  }
  async function remove(id: string) {
    if (!confirm("Supprimer ?")) return;
    const { error } = await supabase.from("groupes").delete().eq("id", id);
    if (error) return toast.error(error.message); load(); toast.success("Supprimé");
  }
  async function addMember(groupe_id: string) {
    if (!picked) return;
    const { error } = await supabase.from("groupe_membres").insert({ groupe_id, etudiant_id: picked });
    if (error) return toast.error(error.message);
    setPicked(""); load();
  }
  async function removeMember(groupe_id: string, etudiant_id: string) {
    await supabase.from("groupe_membres").delete().eq("groupe_id", groupe_id).eq("etudiant_id", etudiant_id);
    load();
  }

  return (
    <AssirikShell title="👥 Groupes">
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={14} className="mr-1" />Nouveau groupe</Button></div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-3 md:grid-cols-2">{rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2"><Users className="text-primary" /><strong>{r.nom}</strong>
              <Button size="icon" variant="ghost" className="ml-auto" onClick={() => remove(r.id)}><Trash2 size={14} /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Parcours : {r.parcours?.nom}</p>
            <ul className="mt-2 space-y-1 text-sm">{(members[r.id] ?? []).map((m) => (
              <li key={m.etudiant_id} className="flex items-center justify-between">
                <span>{m.full_name ?? m.etudiant_id.slice(0, 8)}</span>
                <Button size="icon" variant="ghost" onClick={() => removeMember(r.id, m.etudiant_id)}><Trash2 size={12} /></Button>
              </li>
            ))}</ul>
            {memberOpen === r.id ? (
              <div className="mt-2 flex gap-2">
                <Select value={picked} onValueChange={setPicked}>
                  <SelectTrigger><SelectValue placeholder="Étudiant" /></SelectTrigger>
                  <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name ?? s.id}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" onClick={() => addMember(r.id)}>Ajouter</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setMemberOpen(r.id)}><UserPlus size={12} className="mr-1" />Ajouter membre</Button>
            )}
          </div>
        ))}{rows.length === 0 && <p className="text-sm text-muted-foreground">Aucun groupe.</p>}</div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau groupe</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
            <div><Label>Parcours</Label>
              <Select value={form.parcours_id} onValueChange={(v) => setForm({ ...form, parcours_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{parcours.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={create}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AssirikShell>
  );
}
