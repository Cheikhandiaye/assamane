import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, X, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";
import { fetchUsersByRole, fetchStudentsByPartner } from "@/lib/fetch-users-by-role";

type Person = { id: string; full_name: string | null; email: string | null };

function label(p: Person) {
  return p.full_name?.trim() || p.email || p.id.slice(0, 8);
}

export function ParcoursInscriptionsDialog({
  parcoursId,
  parcoursNom,
  open,
  onOpenChange,
}: {
  parcoursId: string | null;
  parcoursNom: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hasPartner, setHasPartner] = useState(true);
  const [etuInscrits, setEtuInscrits] = useState<Person[]>([]);
  const [profInscrits, setProfInscrits] = useState<Person[]>([]);
  const [tousEtu, setTousEtu] = useState<Person[]>([]);
  const [tousProf, setTousProf] = useState<Person[]>([]);
  const [selEtu, setSelEtu] = useState("");
  const [selProf, setSelProf] = useState("");

  async function load() {
    if (!parcoursId) return;
    setLoading(true);

    // Partenaire du parcours (via sa mission)
    const { data: pcRow } = await supabase
      .from("parcours")
      .select("missions:mission_id(partenaire_id)")
      .eq("id", parcoursId)
      .maybeSingle();
    const partId = (pcRow as any)?.missions?.partenaire_id ?? null;
    setHasPartner(!!partId);

    const [insE, insP, allP, allE] = await Promise.all([
      supabase.from("parcours_etudiants").select("profiles:etudiant_id(id, full_name, email)").eq("parcours_id", parcoursId),
      supabase.from("parcours_professeurs").select("profiles:professeur_id(id, full_name, email)").eq("parcours_id", parcoursId),
      fetchUsersByRole("professeur"),
      partId ? fetchStudentsByPartner(partId) : fetchUsersByRole("etudiant"),
    ]);

    const pick = (res: any): Person[] =>
      (res.data ?? []).map((r: any) => r.profiles).filter(Boolean);
    setEtuInscrits(pick(insE));
    setProfInscrits(pick(insP));
    setTousProf(allP as Person[]);
    setTousEtu(allE as Person[]);
    setLoading(false);
  }

  useEffect(() => {
    if (open && parcoursId) {
      setSelEtu("");
      setSelProf("");
      load();
    }
  }, [open, parcoursId]);

  const inscritsEtuIds = new Set(etuInscrits.map((p) => p.id));
  const inscritsProfIds = new Set(profInscrits.map((p) => p.id));
  const dispoEtu = tousEtu.filter((p) => !inscritsEtuIds.has(p.id));
  const dispoProf = tousProf.filter((p) => !inscritsProfIds.has(p.id));

  async function addEtu() {
    if (!selEtu || !parcoursId) return;
    setBusy(true);
    const { error } = await supabase.from("parcours_etudiants").insert({ parcours_id: parcoursId, etudiant_id: selEtu });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Étudiant inscrit");
    setSelEtu("");
    load();
  }

  async function removeEtu(id: string) {
    if (!parcoursId) return;
    if (!confirm("Désinscrire cet étudiant du parcours ? (ses réponses déjà saisies ne sont pas supprimées)")) return;
    const { error } = await supabase.from("parcours_etudiants").delete().eq("parcours_id", parcoursId).eq("etudiant_id", id);
    if (error) return toast.error(error.message);
    toast.success("Étudiant désinscrit");
    load();
  }

  async function addProf() {
    if (!selProf || !parcoursId) return;
    setBusy(true);
    const { error } = await supabase.from("parcours_professeurs").insert({ parcours_id: parcoursId, professeur_id: selProf });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Formateur affecté");
    setSelProf("");
    load();
  }

  async function removeProf(id: string) {
    if (!parcoursId) return;
    if (!confirm("Retirer ce formateur du parcours ?")) return;
    const { error } = await supabase.from("parcours_professeurs").delete().eq("parcours_id", parcoursId).eq("professeur_id", id);
    if (error) return toast.error(error.message);
    toast.success("Formateur retiré");
    load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inscriptions — {parcoursNom}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <Loader2 className="mx-auto my-8 animate-spin text-primary" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* ─── Étudiants ─── */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Users size={16} className="text-primary" />
                Étudiants <span className="text-muted-foreground">({etuInscrits.length})</span>
              </h3>

              {!hasPartner && (
                <p className="mb-2 text-xs text-amber-600">
                  Ce parcours n'est rattaché à aucun partenaire : tous les étudiants sont proposés.
                </p>
              )}

              <div className="mb-3 flex gap-2">
                <Select value={selEtu} onValueChange={setSelEtu}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={dispoEtu.length ? "Ajouter un étudiant…" : "Aucun étudiant disponible"} />
                  </SelectTrigger>
                  <SelectContent>
                    {dispoEtu.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{label(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addEtu} disabled={!selEtu || busy}>
                  <UserPlus size={14} />
                </Button>
              </div>

              <ul className="space-y-1">
                {etuInscrits.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Aucun étudiant inscrit
                  </li>
                ) : (
                  etuInscrits.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="truncate">{label(p)}</span>
                      <button onClick={() => removeEtu(p.id)} className="text-muted-foreground hover:text-destructive" title="Désinscrire">
                        <X size={14} />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>

            {/* ─── Formateurs ─── */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <GraduationCap size={16} className="text-primary" />
                Formateurs <span className="text-muted-foreground">({profInscrits.length})</span>
              </h3>

              <div className="mb-3 flex gap-2">
                <Select value={selProf} onValueChange={setSelProf}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={dispoProf.length ? "Affecter un formateur…" : "Tous déjà affectés"} />
                  </SelectTrigger>
                  <SelectContent>
                    {dispoProf.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{label(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addProf} disabled={!selProf || busy}>
                  <UserPlus size={14} />
                </Button>
              </div>

              <ul className="space-y-1">
                {profInscrits.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Aucun formateur affecté
                  </li>
                ) : (
                  profInscrits.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="truncate">{label(p)}</span>
                      <button onClick={() => removeProf(p.id)} className="text-muted-foreground hover:text-destructive" title="Retirer">
                        <X size={14} />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
