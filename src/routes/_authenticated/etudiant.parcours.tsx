import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Video, NotebookPen, Clock, CheckCircle, CalendarPlus, Award, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateAttestation } from "@/lib/attestation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

// Interface pour les données d'attestation
interface AttestationData {
  parcours_titre: string;
  complete: boolean;
  eligible: boolean;
  note_moyenne: number;
  modules_valides: number;
  modules_total: number;
  taux_reussite: number;
  modules_echoues: any[];
  modules_a_reprendre: any[];
  seuil_requis: number;
  message: string;
  peut_telecharger: boolean;
  peut_refaire_modules: boolean;
  date_generation: string;
}

function ParcoursPage() {
  useRoleGuard("etudiant");
  const { user } = useCurrentUser();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actifs, setActifs] = useState<ParcoursActif[]>([]);
  const [dialog, setDialog] = useState<ParcoursActif | null>(null);
  const [form, setForm] = useState({ date_souhaitee: "", justification: "" });
  const [attestData, setAttestData] = useState<Record<string, AttestationData>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [loadingAttest, setLoadingAttest] = useState<string | null>(null);

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

  // Charger les données d'attestation pour chaque parcours
  useEffect(() => {
    if (!user || actifs.length === 0) return;
    (async () => {
      const entries = await Promise.all(
        actifs.map(async (p) => {
          const { data, error } = await supabase.rpc("fn_parcours_attestation", {
            p_etudiant_id: user.id,
            p_parcours_id: p.parcours_id,
          });
          return [p.parcours_id, data] as const;
        }),
      );
      setAttestData(Object.fromEntries(entries) as Record<string, AttestationData>);
    })();
  }, [user, actifs]);

  async function downloadAttest(parcoursId: string) {
    if (!user) return;
    setDownloading(parcoursId);
    try {
      await generateAttestation(user.id, parcoursId);
      toast.success("Attestation téléchargée avec succès !");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la génération.");
    } finally {
      setDownloading(null);
    }
  }

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
      {/* Parcours actifs avec attestation */}
      {actifs.length > 0 && (
        <section className="mb-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Mes parcours</h2>
          
          {actifs.map((p) => {
            const days = p.date_fin ? Math.ceil((new Date(p.date_fin).getTime() - Date.now()) / 86400000) : null;
            const attest = attestData[p.parcours_id];
            const isEligible = attest?.eligible || false;
            const isComplete = attest?.complete || false;
            const noteMoyenne = attest?.note_moyenne || 0;
            const modulesAReprendre = attest?.modules_a_reprendre || [];
            const tauxReussite = attest?.taux_reussite || 0;

            return (
              <Card key={p.parcours_id} className={`border ${isEligible ? "border-green-200" : isComplete ? "border-amber-200" : "border-primary/10"}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{p.nom}</CardTitle>
                      <CardDescription>
                        {p.date_fin ? `Fin : ${p.date_fin} · ${days !== null && days > 0 ? `${days} jours restants` : "Délai dépassé"}` : "Pas de date de fin"}
                      </CardDescription>
                    </div>
                    <Badge variant={isEligible ? "default" : isComplete ? "secondary" : "outline"}>
                      {isEligible ? "✅ Éligible" : isComplete ? "⚠️ Note insuffisante" : "En cours"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Progression */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{tauxReussite.toFixed(1)}%</span>
                    </div>
                    <Progress value={tauxReussite} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {attest?.modules_valides || 0} / {attest?.modules_total || 0} modules validés
                    </p>
                  </div>

                  {/* Moyenne */}
                  {isComplete && (
                    <div className="flex items-center gap-2">
                      <Badge variant={noteMoyenne >= 10 ? "default" : "destructive"}>
                        Moyenne: {noteMoyenne.toFixed(1)}/20
                      </Badge>
                      {noteMoyenne >= 10 ? (
                        <span className="text-xs text-green-600">✅ Seuil atteint</span>
                      ) : (
                        <span className="text-xs text-red-500">⚠️ {attest?.seuil_requis || 10}/20 requis</span>
                      )}
                    </div>
                  )}

                  {/* Modules à reprendre */}
                  {modulesAReprendre.length > 0 && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-medium text-red-700">Modules à repasser :</p>
                      <ul className="list-disc list-inside text-xs text-red-600 mt-1">
                        {modulesAReprendre.slice(0, 3).map((m: any) => (
                          <li key={m.module_id}>
                            {m.module_titre} - Note: {m.note_finale.toFixed(1)}/20
                          </li>
                        ))}
                        {modulesAReprendre.length > 3 && (
                          <li>+ {modulesAReprendre.length - 3} autres modules</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {attest?.message && (
                    <p className="text-sm text-muted-foreground">{attest.message}</p>
                  )}
                </CardContent>

                <CardFooter className="flex flex-wrap gap-2 pt-2">
                  {/* Bouton téléchargement */}
                  {isEligible ? (
                    <Button 
                      onClick={() => downloadAttest(p.parcours_id)} 
                      disabled={downloading === p.parcours_id}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {downloading === p.parcours_id ? (
                        <Loader2 size={16} className="mr-2 animate-spin" />
                      ) : (
                        <Award size={16} className="mr-2" />
                      )}
                      {downloading === p.parcours_id ? "Génération..." : "Télécharger l'attestation"}
                    </Button>
                  ) : isComplete && modulesAReprendre.length > 0 ? (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        const firstModule = modulesAReprendre[0];
                        if (firstModule) {
                          window.location.href = `/etudiant/module/${firstModule.module_id}`;
                        }
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Repasser les modules échoués
                    </Button>
                  ) : (
                    <Button variant="secondary" className="flex-1" disabled>
                      {isComplete ? "Note insuffisante" : "Parcours non terminé"}
                    </Button>
                  )}

                  {/* Prolongation */}
                  {days !== null && days < 7 && !isComplete && (
                    <Button size="sm" variant="outline" onClick={() => { setDialog(p); setForm({ date_souhaitee: "", justification: "" }); }}>
                      <CalendarPlus size={14} className="mr-1" />Prolongation
                    </Button>
                  )}
                  {days !== null && days < 7 && !isComplete && (
                    <Badge variant="destructive">{days <= 0 ? "Échue" : `${days}j`}</Badge>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </section>
      )}

      {/* Modules */}
      {modules.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground">
          Aucun parcours assigné pour l'instant. Reviens plus tard ! ✨
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Modules</h3>
          {modules.map((m) => (
            <Link key={m.id} to="/etudiant/module/$moduleId" params={{ moduleId: m.id }} className="block transition hover:opacity-90">
              <ModuleCard module={m} />
            </Link>
          ))}
        </div>
      )}

      {/* Dialogue de prolongation */}
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
