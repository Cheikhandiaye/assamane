import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, CheckCircle, BarChart3 } from "lucide-react";
import { formatNote } from "@/lib/note-engine";
import { useRoleGuard } from "@/hooks/use-role-guard";

export const Route = createFileRoute("/_authenticated/etudiant")({
  component: EtudiantDashboard,
});

function EtudiantDashboard() {
  useRoleGuard("etudiant");
  const { fullName, user } = useCurrentUser();
  const [etapesValidees, setEtapesValidees] = useState(0);
  const [nbBadges, setNbBadges] = useState(0);
  const [moyenne, setMoyenne] = useState<number | null>(null);
  const [progression, setProgression] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: valides }, { count: badges }] = await Promise.all([
        supabase.from("reponses_etudiant").select("note").eq("etudiant_id", user.id).eq("statut", "valide"),
        supabase.from("badges_etudiants").select("*", { count: "exact", head: true }).eq("etudiant_id", user.id),
      ]);
      const notes = (valides ?? []).map((r) => Number(r.note)).filter((n) => !Number.isNaN(n));
      setEtapesValidees(valides?.length ?? 0);
      setNbBadges(badges ?? 0);
      setMoyenne(notes.length ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 100) / 100 : null);

      const { data: pe } = await supabase.from("parcours_etudiants").select("parcours_id").eq("etudiant_id", user.id);
      const pids = (pe ?? []).map((p) => p.parcours_id);
      if (pids.length) {
        const { data: modules } = await supabase.from("modules_cours").select("id").in("parcours_id", pids);
        const mids = (modules ?? []).map((m) => m.id);
        const { count: totalEtapes } = await supabase.from("etapes").select("*", { count: "exact", head: true }).in("module_id", mids.length ? mids : ["00000000-0000-0000-0000-000000000000"]);
        setProgression(totalEtapes ? Math.round(((valides?.length ?? 0) / totalEtapes) * 100) : 0);
      }
    })();
  }, [user]);

  const prenom = fullName?.split(" ")[0] ?? "👋";

  return (
    <AssirikShell title={`Salut ${prenom} 👋`}>
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-stretch">
        <div className="grid h-44 w-44 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--color-primary) ${progression}%, var(--color-secondary) 0)`,
          }}
        >
          <div className="grid h-36 w-36 place-items-center rounded-full bg-card text-center">
            <div>
              <p className="text-3xl font-black text-primary">{progression}%</p>
              <p className="text-[11px] text-muted-foreground">progression</p>
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
          <Card icon={<CheckCircle size={20} />} label="Étapes validées" value={String(etapesValidees)} />
          <Card icon={<Trophy size={20} />} label="Badges" value={String(nbBadges)} />
          <Card icon={<BarChart3 size={20} />} label="Note moyenne" value={formatNote(moyenne)} />
        </div>
      </div>

      <Link
        to="/etudiant/parcours"
        className="mt-6 block rounded-2xl bg-accent px-6 py-4 text-center font-bold text-accent-foreground shadow-sm hover:opacity-90"
      >
        ▶ Voir mes parcours
      </Link>
    </AssirikShell>
  );
}

function Card({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="text-primary">{icon}</div>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}