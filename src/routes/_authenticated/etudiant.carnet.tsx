import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, NotebookPen, CheckCircle2, Lock, Send, Save, FileDown } from "lucide-react";
import { useRef } from "react";
import { exportElementToPDF } from "@/lib/exports";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/etudiant/carnet")({
  component: CarnetPage,
});

interface Champ { key: string; label: string; type: "text" | "textarea" | "number"; required?: boolean }
interface Etape { id: string; titre: string; description: string | null; type: "individuel" | "groupe"; ordre: number; champs: Champ[]; max_tentatives: number }
interface ModuleAcces { module_id: string; titre: string; description: string | null; ordre: number; etapes: Etape[] }
interface Reponse { id: string; contenu: Record<string, string>; statut: string; nb_tentatives: number; commentaire_prof: string | null; note: number | null }

function CarnetPage() {
  useRoleGuard("etudiant");
  const { user } = useCurrentUser();
  const carnetRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<ModuleAcces[]>([]);
  const [reponses, setReponses] = useState<Record<string, Reponse>>({});
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: acces } = await supabase
        .from("acces_module")
        .select("module_id, modules_cours!inner(id, titre, description, ordre, etapes(id, titre, description, type, ordre, champs, max_tentatives))")
        .eq("etudiant_id", user.id);
      const mods: ModuleAcces[] = (acces ?? []).map((a: any) => ({
        module_id: a.module_id,
        titre: a.modules_cours.titre,
        description: a.modules_cours.description,
        ordre: a.modules_cours.ordre,
        etapes: (a.modules_cours.etapes ?? [])
          .map((e: any) => ({ ...e, champs: Array.isArray(e.champs) ? e.champs : [] }))
          .sort((a: Etape, b: Etape) => a.ordre - b.ordre),
      })).sort((a, b) => a.ordre - b.ordre);
      setModules(mods);

      const etapeIds = mods.flatMap((m) => m.etapes.map((e) => e.id));
      if (etapeIds.length) {
        const { data: reps } = await supabase
          .from("reponses_etudiant")
          .select("id, etape_id, contenu, statut, nb_tentatives, commentaire_prof, note")
          .eq("etudiant_id", user.id)
          .in("etape_id", etapeIds);
        const map: Record<string, Reponse> = {};
        (reps ?? []).forEach((r: any) => { map[r.etape_id] = r as Reponse; });
        setReponses(map);
      }
      if (mods.length && !selectedModule) setSelectedModule(mods[0].module_id);
      setLoading(false);
    })();
  }, [user?.id]);

  function setDraft(etapeId: string, key: string, value: string) {
    setDrafts((d) => ({ ...d, [etapeId]: { ...(d[etapeId] ?? {}), [key]: value } }));
  }

  function getValue(etape: Etape, key: string): string {
    return drafts[etape.id]?.[key] ?? (reponses[etape.id]?.contenu?.[key] as string | undefined) ?? "";
  }

  async function save(etape: Etape, parcoursId: string | null, submit: boolean) {
    if (!user) return;
    setSaving(etape.id);
    const existing = reponses[etape.id];
    const contenu: Record<string, string> = {};
    for (const ch of etape.champs) contenu[ch.key] = getValue(etape, ch.key);
    if (submit) {
      for (const ch of etape.champs) {
        if (ch.required && !contenu[ch.key]?.trim()) {
          toast.error(`Champ requis : ${ch.label}`);
          setSaving(null);
          return;
        }
      }
    }
    const payload: any = { contenu, statut: submit ? "soumis" : "brouillon" };
    if (submit && existing) payload.nb_tentatives = (existing.nb_tentatives ?? 0) + 1;
    let result;
    if (existing) {
      result = await supabase.from("reponses_etudiant").update(payload).eq("id", existing.id).select().single();
    } else {
      const moduleId = await getModuleId(etape.id);
      let pid = parcoursId;
      if (!pid && moduleId) {
        const { data: mod } = await supabase.from("modules_cours").select("parcours_id").eq("id", moduleId).maybeSingle();
        pid = mod?.parcours_id ?? null;
      }
      result = await supabase.from("reponses_etudiant").insert({ ...payload, etape_id: etape.id, etudiant_id: user.id, parcours_id: pid }).select().single();
    }
    setSaving(null);
    if (result.error) { toast.error(result.error.message); return; }
    setReponses((r) => ({ ...r, [etape.id]: result.data as Reponse }));
    setDrafts((d) => { const c = { ...d }; delete c[etape.id]; return c; });
    toast.success(submit ? "Réponse soumise au professeur ✓" : "Brouillon enregistré");
  }

  async function getModuleId(etapeId: string): Promise<string | null> {
    const { data } = await supabase.from("etapes").select("module_id").eq("id", etapeId).maybeSingle();
    return data?.module_id ?? null;
  }

  const current = modules.find((m) => m.module_id === selectedModule);

  return (
    <AssirikShell title="📓 Mon carnet">
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
      ) : modules.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center">
          <Lock size={48} className="mx-auto text-muted-foreground" />
          <h2 className="mt-4 text-xl font-bold">Aucun module débloqué</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Assiste à une séance ou termine un cours en ligne pour débloquer ton carnet.
          </p>
        </div>
      ) : (
        <>
        <div className="mb-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={async () => { if (carnetRef.current) await exportElementToPDF(carnetRef.current, `carnet-${new Date().toISOString().slice(0,10)}`); }}>
            <FileDown size={14} className="mr-1" />Exporter PDF
          </Button>
        </div>
        <div id="carnet-content" ref={carnetRef} className="grid gap-6 md:grid-cols-[280px_1fr]">
          <aside className="space-y-2">
            {modules.map((m) => (
              <button
                key={m.module_id}
                onClick={() => setSelectedModule(m.module_id)}
                className={`w-full rounded-xl border p-3 text-left transition ${selectedModule === m.module_id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"}`}
              >
                <div className="flex items-center gap-2">
                  <NotebookPen size={16} className="text-primary" />
                  <span className="font-semibold text-sm">{m.titre}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.description}</p>
              </button>
            ))}
          </aside>

          <div className="space-y-6">
            {current?.etapes.map((etape) => {
              const rep = reponses[etape.id];
              const locked = rep?.statut === "valide" || rep?.statut === "soumis";
              return (
                <div key={etape.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold">{etape.titre}</h3>
                      {etape.description && <p className="text-sm text-muted-foreground">{etape.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={etape.type === "groupe" ? "secondary" : "outline"}>
                        {etape.type === "groupe" ? "Groupe" : "Individuel"}
                      </Badge>
                      {rep?.statut === "valide" && <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 size={12} className="mr-1" />Validé {rep.note ?? ""}/20</Badge>}
                      {rep?.statut === "soumis" && <Badge variant="default">En attente prof</Badge>}
                      {rep?.statut === "rejete" && <Badge variant="destructive">À reprendre</Badge>}
                    </div>
                  </div>

                  {rep?.commentaire_prof && (
                    <div className="mt-3 rounded-lg border-l-4 border-orange-500 bg-orange-500/10 p-3 text-sm">
                      <strong>Commentaire prof :</strong> {rep.commentaire_prof}
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    {etape.champs.map((ch) => (
                      <div key={ch.key} className="space-y-1.5">
                        <Label>{ch.label}{ch.required && <span className="text-destructive"> *</span>}</Label>
                        {ch.type === "textarea" ? (
                          <Textarea
                            value={getValue(etape, ch.key)}
                            onChange={(e) => setDraft(etape.id, ch.key, e.target.value)}
                            disabled={locked}
                            rows={4}
                          />
                        ) : (
                          <Input
                            type={ch.type}
                            value={getValue(etape, ch.key)}
                            onChange={(e) => setDraft(etape.id, ch.key, e.target.value)}
                            disabled={locked}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {!locked && etape.type === "individuel" && (
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" onClick={() => save(etape, null, false)} disabled={saving === etape.id}>
                        <Save size={16} className="mr-2" /> Brouillon
                      </Button>
                      <Button onClick={() => save(etape, null, true)} disabled={saving === etape.id}>
                        <Send size={16} className="mr-2" /> Soumettre
                      </Button>
                    </div>
                  )}
                  {etape.type === "groupe" && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      💡 Seul le rapporteur du groupe peut soumettre cette étape (voir page Groupe).
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </>
      )}
    </AssirikShell>
  );
}