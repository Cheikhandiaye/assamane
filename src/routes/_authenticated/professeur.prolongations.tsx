import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/professeur/prolongations")({ component: Page });

function Page() {
  useRoleGuard("professeur");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ mission_id: "", date_souhaitee: "", justification: "" });

  async function load() {
    if (!user) return;
    const [{ data: m }, { data: pp }] = await Promise.all([
      supabase.from("demandes_prolongation").select("*, missions(nom)").eq("demandee_par", user.id).order("created_at", { ascending: false }),
      supabase.from("parcours_professeurs").select("parcours!inner(missions(id, nom))").eq("professeur_id", user.id),
    ]);
    setRows(m ?? []);
    const ms = Array.from(new Map((pp ?? []).flatMap((p: any) => p.parcours?.missions ? [[p.parcours.missions.id, p.parcours.missions]] : [])).values());
    setMissions(ms);
    setLoading(false);
  }
  useEffect(() => { load(); }, [user?.id]);

  async function submit() {
    if (!user || !form.mission_id || !form.date_souhaitee || !form.justification) { toast.error("Tous les champs sont requis"); return; }
    const { error } = await supabase.from("demandes_prolongation").insert({ ...form, demandee_par: user.id });
    if (error) return toast.error(error.message);
    toast.success("Demande envoyée"); setOpen(false); setForm({ mission_id: "", date_souhaitee: "", justification: "" }); load();
  }

  return (
    <AssirikShell title="⏱️ Demandes de prolongation">
      <div className="mb-4"><Button onClick={() => setOpen(true)}><Plus size={16} className="mr-2" />Nouvelle demande</Button></div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="space-y-3">
          {rows.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{r.missions?.nom} → {r.date_souhaitee}</strong>
                <Badge variant={r.statut === "en_attente" ? "default" : r.statut === "acceptee" ? "secondary" : "destructive"}>{r.statut}</Badge>
              </div>
              <p className="mt-2 text-sm">{r.justification}</p>
              {r.commentaire_admin && <p className="mt-2 text-xs text-muted-foreground">Admin : {r.commentaire_admin}</p>}
            </div>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucune demande.</p>}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle demande de prolongation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Mission</Label>
              <Select value={form.mission_id} onValueChange={(v) => setForm({ ...form, mission_id: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{missions.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date souhaitée</Label><Input type="date" value={form.date_souhaitee} onChange={(e) => setForm({ ...form, date_souhaitee: e.target.value })} /></div>
            <div><Label>Justification</Label><Textarea rows={4} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button onClick={submit}>Envoyer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AssirikShell>
  );
}