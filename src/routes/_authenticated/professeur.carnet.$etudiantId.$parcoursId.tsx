import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CarnetField, type FieldConfig } from "@/components/carnet-field";
import { calculerNoteFinale, formatNote } from "@/lib/note-engine";
import { exportElementToPDF } from "@/lib/exports";
import { Loader2, FileDown, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/professeur/carnet/$etudiantId/$parcoursId")({
  component: Page,
});

interface Etape { id: string; titre: string; description: string | null; type: "individuel" | "groupe"; ordre: number; champs: FieldConfig[]; module_id: string }
interface Module { id: string; titre: string; ordre: number; etapes: Etape[] }
interface Reponse { id: string; etape_id: string; contenu: Record<string, unknown>; statut: string; note: number | null; commentaire_prof: string | null; valide_en_letat: boolean | null }

function Page() {
  useRoleGuard(["professeur", "admin"]);
  const { etudiantId, parcoursId } = Route.useParams();
  const { user } = useCurrentUser();
  const ref = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [etu, setEtu] = useState<{ full_name: string | null; email: string } | null>(null);
  const [parcours, setParcours] = useState<{ nom: string; pondere_individuel: number; pondere_groupe: number } | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [reps, setReps] = useState<Record<string, Reponse>>({});
  const [grpReps, setGrpReps] = useState<Record<string, Reponse>>({});
  const [dialog, setDialog] = useState<{ etape: Etape; rep?: Reponse } | null>(null);
  const [form, setForm] = useState({ note: "", commentaire: "", letat: false });

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: e }, { data: mods }] = await Promise.all([
      supabase.from("parcours").select("nom, pondere_individuel, pondere_groupe").eq("id", parcoursId).maybeSingle(),
      supabase.from("profiles").select("full_name, email").eq("id", etudiantId).maybeSingle(),
      supabase.from("modules_cours").select("id, titre, ordre, etapes(id, titre, description, type, ordre, champs, module_id)").eq("parcours_id", parcoursId).order("ordre"),
    ]);
    setParcours(p as never);
    setEtu(e);
    const sorted = ((mods ?? []) as Module[]).map((m) => ({
      ...m,
      etapes: (m.etapes ?? []).map((et) => ({ ...et, champs: Array.isArray(et.champs) ? (et.champs as FieldConfig[]) : [] })).sort((a, b) => a.ordre - b.ordre),
    }));
    setModules(sorted);
    const etapeIds = sorted.flatMap((m) => m.etapes.map((e) => e.id));
    if (etapeIds.length) {
      const { data: ri } = await supabase.from("reponses_etudiant").select("*").eq("etudiant_id", etudiantId).in("etape_id", etapeIds);
      const map: Record<string, Reponse> = {};
      (ri ?? []).forEach((r) => (map[r.etape_id!] = r as never));
      setReps(map);
      const { data: grp } = await supabase.from("groupe_membres").select("groupe_id, groupes!inner(parcours_id)").eq("etudiant_id", etudiantId);
      const groupeId = (grp ?? []).find((g: { groupes: { parcours_id: string } | null }) => g.groupes?.parcours_id === parcoursId)?.groupe_id;
      if (groupeId) {
        const { data: rg } = await supabase.from("reponses_groupe").select("*").eq("groupe_id", groupeId).in("etape_id", etapeIds);
        const gmap: Record<string, Reponse> = {};
        (rg ?? []).forEach((r) => (gmap[r.etape_id!] = r as never));
        setGrpReps(gmap);
      }
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [etudiantId, parcoursId]);

  const getRep = (e: Etape) => (e.type === "groupe" ? grpReps[e.id] : reps[e.id]);

  const notesInd = Object.values(reps).filter((r) => r.note != null).map((r) => Number(r.note));
  const notesGrp = Object.values(grpReps).filter((r) => r.note != null).map((r) => Number(r.note));
  const noteFinale = parcours ? calculerNoteFinale(notesInd, notesGrp, parcours.pondere_individuel, parcours.pondere_groupe) : null;

  function openDialog(etape: Etape) {
    const rep = getRep(etape);
    setDialog({ etape, rep });
    setForm({ note: rep?.note?.toString() ?? "", commentaire: rep?.commentaire_prof ?? "", letat: rep?.valide_en_letat ?? false });
  }

  async function submitValidation(statut: "valide" | "rejete") {
    if (!dialog || !user) return;
    if (statut === "valide" && !form.note) { toast.error("Note requise"); return; }
    const table = dialog.etape.type === "groupe" ? "reponses_groupe" : "reponses_etudiant";
    const rep = dialog.rep;
    const payload: Record<string, unknown> = {
      statut,
      commentaire_prof: form.commentaire || null,
      valide_par: user.id,
      valide_le: new Date().toISOString(),
      valide_en_letat: form.letat,
    };
    if (statut === "valide") payload.note = parseFloat(form.note);
    if (rep) {
      const { error } = await supabase.from(table).update(payload).eq("id", rep.id);
      if (error) return toast.error(error.message);
    } else if (statut === "valide" && form.letat) {
      const insert: Record<string, unknown> = { ...payload, etape_id: dialog.etape.id, parcours_id: parcoursId, contenu: {} };
      if (table === "reponses_etudiant") insert.etudiant_id = etudiantId;
      const { error } = await supabase.from(table).insert(insert as never);
      if (error) return toast.error(error.message);
    } else {
      toast.error("Aucune soumission existante");
      return;
    }
    toast.success("Décision enregistrée");
    setDialog(null);
    load();
  }

  async function reopen() {
    if (!dialog?.rep || !user) return;
    const table = dialog.etape.type === "groupe" ? "reponses_groupe" : "reponses_etudiant";
    const { error } = await supabase.from(table).update({
      statut: "brouillon",
      rouverte_par: user.id,
      rouverte_le: new Date().toISOString(),
      note: null,
      valide_par: null,
      valide_le: null,
    }).eq("id", dialog.rep.id);
    if (error) return toast.error(error.message);
    toast.success("Soumission réouverte");
    setDialog(null);
    load();
  }

  async function exportPDF() {
    if (!ref.current) return;
    await exportElementToPDF(ref.current, `carnet-${etu?.full_name ?? etudiantId}-${new Date().toISOString().slice(0, 10)}`);
  }

  if (loading) return <AssirikShell title="Carnet"><Loader2 className="mx-auto animate-spin text-primary" /></AssirikShell>;

  return (
    <AssirikShell title={`📓 Carnet — ${etu?.full_name ?? etu?.email ?? ""}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge variant="secondary">Note finale : {formatNote(noteFinale)}</Badge>
        <Button size="sm" variant="outline" onClick={exportPDF}><FileDown size={14} className="mr-1" />Exporter PDF</Button>
      </div>
      <div ref={ref} id="carnet-content" className="space-y-6">
        {modules.map((m) => (
          <section key={m.id} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-lg font-bold">{m.ordre}. {m.titre}</h3>
            <div className="mt-3 space-y-4">
              {m.etapes.map((etape) => {
                const rep = getRep(etape);
                return (
                  <div key={etape.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <strong>{etape.titre}</strong>
                        {etape.description && <p className="text-xs text-muted-foreground">{etape.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={etape.type === "groupe" ? "secondary" : "outline"}>{etape.type}</Badge>
                        {rep?.statut === "valide" && <Badge className="bg-green-600 hover:bg-green-600">Validé {rep.note ?? ""}/20</Badge>}
                        {rep?.statut === "soumis" && <Badge>En attente</Badge>}
                        {rep?.statut === "rejete" && <Badge variant="destructive">Rejeté</Badge>}
                        {!rep && <Badge variant="outline">Non rendu</Badge>}
                        <Button size="sm" variant="outline" onClick={() => openDialog(etape)}>Valider / Annoter</Button>
                      </div>
                    </div>
                    {rep?.commentaire_prof && (
                      <div className="mt-2 rounded border-l-4 border-orange-500 bg-orange-500/10 p-2 text-xs">
                        💬 {rep.commentaire_prof}
                      </div>
                    )}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {etape.champs.map((ch) => (
                        <CarnetField key={ch.key} field={ch} value={rep?.contenu?.[ch.key]} onChange={() => {}} readOnly />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog?.etape.titre}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Note /20</Label><Input type="number" min={0} max={20} step={0.5} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div><Label>Commentaire</Label><Textarea rows={3} value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.letat} onChange={(e) => setForm({ ...form, letat: e.target.checked })} />
              Valider en l'état (même si incomplet)
            </label>
          </div>
          <DialogFooter className="flex flex-wrap gap-2">
            {dialog?.rep?.statut === "valide" && (
              <Button variant="outline" onClick={reopen}><RotateCcw size={14} className="mr-1" />Réouvrir</Button>
            )}
            <Button variant="destructive" onClick={() => submitValidation("rejete")} disabled={!dialog?.rep}>Rejeter</Button>
            <Button onClick={() => submitValidation("valide")}><Check size={14} className="mr-1" />Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AssirikShell>
  );
}