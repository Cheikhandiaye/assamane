import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarCheck, Loader2, Plus, X, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/sessions")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [parcours, setParcours] = useState<{ id: string; nom: string }[]>([]);
  const [profs, setProfs] = useState<{ id: string; full_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ parcours_id: "", professeur_id: "", date_session: "", heure_debut: "", heure_fin: "" });
  const [presOpen, setPresOpen] = useState(false);
  const [presSession, setPresSession] = useState<any>(null);
  const [presRows, setPresRows] = useState<{ etudiant_id: string; full_name: string | null; present: boolean }[]>([]);

  async function openPresences(s: any) {
    setPresSession(s); setPresOpen(true); setPresRows([]);
    const { data: insc } = await supabase.from("parcours_etudiants").select("etudiant_id, profiles:etudiant_id(full_name)").eq("parcours_id", s.parcours_id);
    const { data: pres } = await supabase.from("presences").select("etudiant_id, present").eq("session_id", s.id);
    const map = new Map((pres ?? []).map((p) => [p.etudiant_id, p.present]));
    setPresRows((insc ?? []).map((i: any) => ({ etudiant_id: i.etudiant_id, full_name: i.profiles?.full_name ?? null, present: map.get(i.etudiant_id) ?? false })));
  }

  async function togglePresence(etudiant_id: string, present: boolean) {
    if (!presSession) return;
    await supabase.from("presences").upsert({ session_id: presSession.id, etudiant_id, present }, { onConflict: "session_id,etudiant_id" });
    setPresRows((p) => p.map((r) => (r.etudiant_id === etudiant_id ? { ...r, present } : r)));
  }

  async function load() {
    const [{ data }, { data: pc }, { data: pf }] = await Promise.all([
      supabase.from("sessions_cours").select("*, parcours(nom), profiles:professeur_id(full_name)").order("date_session", { ascending: false }).limit(50),
      supabase.from("parcours").select("id, nom").order("nom"),
      supabase.from("profiles").select("id, full_name, user_roles!inner(role)").eq("user_roles.role", "professeur"),
    ]);
    setRows(data ?? []); setParcours(pc ?? []); setProfs((pf as { id: string; full_name: string | null }[]) ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.parcours_id || !form.professeur_id || !form.date_session) return toast.error("Champs requis manquants");
    const { error } = await supabase.from("sessions_cours").insert({ ...form, heure_debut: form.heure_debut || null, heure_fin: form.heure_fin || null, statut: "ouverte", ouverte_le: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Session créée"); setOpen(false); setForm({ parcours_id: "", professeur_id: "", date_session: "", heure_debut: "", heure_fin: "" }); load();
  }

  async function cloturer(id: string) {
    const { error } = await supabase.from("sessions_cours").update({ statut: "terminee", terminee_le: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Session clôturée"); load();
  }

  return (
    <AssirikShell title="📅 Sessions">
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus size={14} className="mr-1" />Créer une session</Button></div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase"><tr><th className="p-3">Date</th><th className="p-3">Parcours</th><th className="p-3">Prof</th><th className="p-3">Statut</th><th className="p-3"></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3"><CalendarCheck size={14} className="mr-1 inline text-primary" />{r.date_session}</td>
                <td className="p-3">{r.parcours?.nom}</td>
                <td className="p-3">{r.profiles?.full_name}</td>
                <td className="p-3"><Badge variant={r.statut === "ouverte" ? "default" : "secondary"}>{r.statut}</Badge></td>
                <td className="p-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openPresences(r)}><Users size={12} className="mr-1" />Présences</Button>
                  {r.statut === "ouverte" && <Button size="sm" variant="outline" onClick={() => cloturer(r.id)}><X size={12} className="mr-1" />Clôturer</Button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Parcours</Label>
              <Select value={form.parcours_id} onValueChange={(v) => setForm({ ...form, parcours_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{parcours.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Professeur</Label>
              <Select value={form.professeur_id} onValueChange={(v) => setForm({ ...form, professeur_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{profs.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.date_session} onChange={(e) => setForm({ ...form, date_session: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Heure début</Label><Input type="time" value={form.heure_debut} onChange={(e) => setForm({ ...form, heure_debut: e.target.value })} /></div>
              <div><Label>Heure fin</Label><Input type="time" value={form.heure_fin} onChange={(e) => setForm({ ...form, heure_fin: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={create}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={presOpen} onOpenChange={setPresOpen}>
        <DialogContent className="max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>Présences — {presSession?.date_session}</DialogTitle></DialogHeader>
          {presRows.length === 0 ? <p className="text-sm text-muted-foreground">Aucun étudiant inscrit au parcours.</p> : (
            <ul className="divide-y divide-border">{presRows.map((r) => (
              <li key={r.etudiant_id} className="flex items-center justify-between py-2">
                <span className="text-sm">{r.full_name ?? r.etudiant_id.slice(0, 8)}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant={r.present ? "default" : "outline"} onClick={() => togglePresence(r.etudiant_id, true)}>Présent</Button>
                  <Button size="sm" variant={!r.present ? "default" : "outline"} onClick={() => togglePresence(r.etudiant_id, false)}>Absent</Button>
                </div>
              </li>
            ))}</ul>
          )}
          <DialogFooter><Button onClick={() => setPresOpen(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AssirikShell>
  );
}