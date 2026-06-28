import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export function EtudiantParcoursDialog({
  etudiantId,
  etudiantNom,
  open,
  onOpenChange,
}: {
  etudiantId: string;
  etudiantNom: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [partenaireId, setPartenaireId] = useState<string | null>(null);
  const [parcours, setParcours] = useState<{ id: string; nom: string }[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!etudiantId) return;
    setLoading(true);

    const { data: prof } = await supabase
      .from("profiles")
      .select("partenaire_id")
      .eq("id", etudiantId)
      .maybeSingle();
    const partId = prof?.partenaire_id ?? null;
    setPartenaireId(partId);

    if (!partId) {
      setParcours([]);
      setEnrolled(new Set());
      setLoading(false);
      return;
    }

    // Parcours des missions de ce partenaire
    const { data: missions } = await supabase.from("missions").select("id").eq("partenaire_id", partId);
    const missionIds = (missions ?? []).map((m) => m.id);
    let pcs: { id: string; nom: string }[] = [];
    if (missionIds.length) {
      const { data } = await supabase.from("parcours").select("id, nom").in("mission_id", missionIds).order("nom");
      pcs = data ?? [];
    }
    setParcours(pcs);

    const { data: ins } = await supabase
      .from("parcours_etudiants")
      .select("parcours_id")
      .eq("etudiant_id", etudiantId);
    setEnrolled(new Set((ins ?? []).map((r) => r.parcours_id)));
    setLoading(false);
  }

  useEffect(() => {
    if (open && etudiantId) load();
  }, [open, etudiantId]);

  async function toggle(parcoursId: string, checked: boolean) {
    setBusy(parcoursId);
    try {
      if (checked) {
        const { error } = await supabase.from("parcours_etudiants").insert({ parcours_id: parcoursId, etudiant_id: etudiantId });
        if (error) throw new Error(error.message);
        setEnrolled((s) => new Set(s).add(parcoursId));
        toast.success("Inscrit");
      } else {
        if (!confirm("Désinscrire de ce parcours ? (les réponses déjà saisies ne sont pas supprimées)")) { setBusy(null); return; }
        const { error } = await supabase.from("parcours_etudiants").delete().eq("parcours_id", parcoursId).eq("etudiant_id", etudiantId);
        if (error) throw new Error(error.message);
        setEnrolled((s) => { const n = new Set(s); n.delete(parcoursId); return n; });
        toast.success("Désinscrit");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Parcours — {etudiantNom}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <Loader2 className="mx-auto my-8 animate-spin text-primary" />
        ) : !partenaireId ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Cet étudiant n'a aucun partenaire de rattachement. Assigne-lui d'abord un partenaire dans sa fiche, puis reviens ici.
          </p>
        ) : parcours.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucun parcours pour le partenaire de cet étudiant.
          </p>
        ) : (
          <ul className="space-y-1">
            {parcours.map((p) => {
              const checked = enrolled.has(p.id);
              return (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy === p.id}
                      onChange={(e) => toggle(p.id, e.target.checked)}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    <BookOpen size={14} className="text-primary" />
                    <span className="truncate">{p.nom}</span>
                  </label>
                  {busy === p.id && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
