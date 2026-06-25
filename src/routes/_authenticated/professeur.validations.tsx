import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/professeur/validations")({ component: Page });

function Page() {
  useRoleGuard("professeur");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vals, setVals] = useState<Record<string, { note: string; commentaire: string }>>({});

  async function load() {
    setLoading(true);
    const { data: ind } = await supabase.from("reponses_etudiant").select("id, statut, contenu, etapes(titre, type, module_id, modules_cours(titre)), profiles:etudiant_id(full_name, email)").eq("statut", "soumis").limit(50);
    const { data: grp } = await supabase.from("reponses_groupe").select("id, statut, contenu, etapes(titre, type, module_id, modules_cours(titre)), groupes(nom)").eq("statut", "soumis").limit(50);
    const merged = [...((ind ?? []).map((r: any) => ({ ...r, _kind: "ind" }))), ...((grp ?? []).map((r: any) => ({ ...r, _kind: "grp" })))];
    setRows(merged); setLoading(false);
  }
  useEffect(() => { if (user) load(); }, [user?.id]);

  async function decide(r: any, statut: "valide" | "rejete") {
    const v = vals[r.id] ?? { note: "", commentaire: "" };
    if (statut === "valide" && !v.note) { toast.error("Note requise"); return; }
    const payload: any = { statut, commentaire_prof: v.commentaire || null, valide_par: user?.id, valide_le: new Date().toISOString() };
    if (statut === "valide") payload.note = parseFloat(v.note);
    const table = r._kind === "ind" ? "reponses_etudiant" : "reponses_groupe";
    const { error } = await supabase.from(table).update(payload).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(statut === "valide" ? "Validé ✓" : "Rejeté");
    load();
  }

  return (
    <AssirikShell title="✅ Validations">
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="space-y-4">
          {rows.map((r: any) => (
            <div key={`${r._kind}-${r.id}`} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <strong>{r.etapes?.modules_cours?.titre} — {r.etapes?.titre}</strong>
                  <p className="text-xs text-muted-foreground">{r._kind === "ind" ? (r.profiles?.full_name ?? r.profiles?.email) : `Groupe ${r.groupes?.nom}`}</p>
                </div>
                <Badge>{r._kind === "ind" ? "Individuel" : "Groupe"}</Badge>
              </div>
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
                {Object.entries(r.contenu ?? {}).map(([k, v]) => (
                  <div key={k} className="mb-2"><strong className="text-xs uppercase text-muted-foreground">{k}</strong><p>{String(v)}</p></div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[100px_1fr_auto_auto] sm:items-end">
                <div><Label>Note /20</Label><Input type="number" min={0} max={20} step={0.5} onChange={(e) => setVals({ ...vals, [r.id]: { ...(vals[r.id] ?? { commentaire: "" }), note: e.target.value } })} /></div>
                <div><Label>Commentaire</Label><Textarea rows={2} onChange={(e) => setVals({ ...vals, [r.id]: { ...(vals[r.id] ?? { note: "" }), commentaire: e.target.value } })} /></div>
                <Button onClick={() => decide(r, "valide")}><Check size={14} className="mr-1" />Valider</Button>
                <Button variant="destructive" onClick={() => decide(r, "rejete")}><X size={14} className="mr-1" />Rejeter</Button>
              </div>
            </div>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucune réponse à valider.</p>}
        </div>
      )}
    </AssirikShell>
  );
}