import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Video, NotebookPen, Clock, CheckCircle, CalendarPlus } from "lucide-react";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/etudiant/parcours")({
  component: ParcoursPage,
});

interface ModuleRow {
  id: string;
  titre: string;
  description: string | null;
  ordre: number;
  parcours_id: string | null;
  statut: "verrouille" | "online" | "carnet" | "attente" | "valide";
  note?: number | null;
  pourcent?: number;
}

interface ParcoursActif { parcours_id: string; nom: string; mission_id: string | null; date_fin: string | null; }

function ParcoursPage() {
  useRoleGuard("etudiant");
  const { user } = useCurrentUser();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actifs, setActifs] = useState<ParcoursActif[]>([]);
  const [dialog, setDialog] = useState<ParcoursActif | null>(null);
  const [form, setForm] = useState({ date_souhaitee: "", justification: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: pe } = await supabase
        .from("parcours_etudiants")
        .select("parcours_id, parcours!inner(nom, mission_id, missions(date_fin))")
        .eq("etudiant_id", user.id);
      const pids = (pe ?? []).map((p) => p.parcours_id);
      setActifs(((pe ?? []) as unknown as Array<{ parcours_id: string; parcours: { nom: string; mission_id: string | null; missions: { date_fin: string | null } | null } }>).map((p) => ({
        parcours_id: p.parcours_id,
        nom: p.parcours.nom,
        mission_id: p.parcours.mission_id,
        date_fin: p.parcours.missions?.date_fin ?? null,
      })));
      if (!pids.length) { setModules([]); setLoading(false); return; }
      const { data: mods } = await supabase
        .from("modules_cours")
        .select("id, titre, description, ordre, parcours_id")
        .in("parcours_id", pids)
        .order("ordre");
      const { data: acces } = await supabase.from("acces_module").select("module_id").eq("etudiant_id", user.id);
      const accesSet = new Set((acces ?? []).map((a) => a.module_id));
      const rows: ModuleRow[] = (mods ?? []).map((m) => ({
        ...m,
        statut: accesSet.has(m.id) ? "carnet" : "verrouille",
        pourcent: 0,
      }));
      setModules(rows);
      setLoading(false);
    })();
  }, [user]);

  async function submitExtension() {
    if (!user || !dialog) return;
    if (!form.date_souhaitee || !form.justification) { toast.error("Tous les champs sont requis"); return; }
    if (!dialog.mission_id) { toast.error("Pas de mission liée"); return; }
    const { error } = await supabase.from("demandes_prolongation").insert({
      demandee_par: user.id,
      mission_id: dialog.mission_id,
      date_souhaitee: form.date_souhaitee,
      justification: form.justification,
    });
    if (error) return toast.error(error.message);
    toast.success("Demande envoyée");
    setDialog(null);
    setForm({ date_souhaitee: "", justification: "" });
  }

  if (loading) return <AssirikShell title="Mes parcours"><p className="text-muted-foreground">Chargement…</p></AssirikShell>;

  return (
    <AssirikShell title="📚 Mes parcours">
      {actifs.length > 0 && (
        <section className="mb-6 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Parcours actifs</h2>
          {actifs.map((p) => {
            const days = p.date_fin ? Math.ceil((new Date(p.date_fin).getTime() - Date.now()) / 86400000) : null;
            return (
              <div key={p.parcours_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
                <div>
                  <p className="font-semibold">{p.nom}</p>
                  <p className="text-xs text-muted-foreground">{p.date_fin ? `Fin : ${p.date_fin} · ${days} j restants` : "Pas de date de fin"}</p>
                </div>
                {days !== null && days < 7 && (
                  <Button size="sm" variant="outline" onClick={() => { setDialog(p); setForm({ date_souhaitee: "", justification: "" }); }}>
                    <CalendarPlus size={14} className="mr-1" />Demander une prolongation
                  </Button>
                )}
                {days !== null && days < 7 && <Badge variant="destructive" className="ml-auto">{days <= 0 ? "Échue" : `${days}j`}</Badge>}
              </div>
            );
          })}
        </section>
      )}
      {modules.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground">
          Aucun parcours assigné pour l'instant. Reviens plus tard ! ✨
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((m) => (
            <Link key={m.id} to="/etudiant/module/$moduleId" params={{ moduleId: m.id }} className="block transition hover:opacity-90">
              <ModuleCard module={m} />
            </Link>
          ))}
        </div>
      )}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Prolongation — {dialog?.nom}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nouvelle date souhaitée</Label><Input type="date" value={form.date_souhaitee} onChange={(e) => setForm({ ...form, date_souhaitee: e.target.value })} /></div>
            <div><Label>Motif</Label><Textarea rows={4} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Annuler</Button>
            <Button onClick={submitExtension}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AssirikShell>
  );
}

function ModuleCard({ module: m }: { module: ModuleRow }) {
  const conf =
    m.statut === "verrouille" ? { icon: <Lock size={16} />, msg: "En attente du cours en présentiel", color: "text-slate-400" } :
    m.statut === "online" ? { icon: <Video size={16} />, msg: `Cours en ligne — ${m.pourcent}% visionné`, color: "text-blue-500" } :
    m.statut === "carnet" ? { icon: <NotebookPen size={16} />, msg: "Carnet à compléter", color: "text-accent" } :
    m.statut === "attente" ? { icon: <Clock size={16} />, msg: "En attente de validation", color: "text-yellow-500" } :
    { icon: <CheckCircle size={16} />, msg: `Validé • Note : ${m.note ?? "—"}/20`, color: "text-green-600" };
  return (
    <div className="flex gap-3 rounded-2xl bg-card p-4 shadow-sm">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
        {String(m.ordre).padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-foreground">{m.titre}</p>
        {m.description && <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>}
        <p className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${conf.color}`}>
          {conf.icon} {conf.msg}
        </p>
      </div>
    </div>
  );
}
