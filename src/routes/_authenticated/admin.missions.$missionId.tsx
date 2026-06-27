import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import {
  Loader2, Target, BookOpen, Users, ArrowLeft,
  CalendarDays, Building2, TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/missions/$missionId")({
  component: Page,
});
export const ErrorBoundary = RouteErrorBoundary;

const STATUT_COLOR: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  active:    "bg-green-100 text-green-700",
  terminee:  "bg-blue-100 text-blue-700",
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Page() {
  useRoleGuard("admin");
  const { missionId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [mission, setMission] = useState<any>(null);
  const [parcours, setParcours] = useState<any[]>([]);
  const [stats, setStats] = useState({ etudiants: 0, progression: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: p }] = await Promise.all([
        supabase
          .from("missions")
          .select("*, partenaires(nom, contact_email, couleur_primaire)")
          .eq("id", missionId)
          .maybeSingle(),
        supabase
          .from("parcours")
          .select("id, nom, description, pondere_individuel, pondere_groupe, created_at")
          .eq("mission_id", missionId)
          .order("created_at", { ascending: false }),
      ]);

      setMission(m);
      const parcoursData = p ?? [];

      // Pour chaque parcours, compte étudiants + progression moyenne
      const enriched = await Promise.all(
        parcoursData.map(async (pc) => {
          const { count: nbEtu } = await supabase
            .from("parcours_etudiants")
            .select("*", { count: "exact", head: true })
            .eq("parcours_id", pc.id);

          const { data: suivis } = await supabase
            .from("suivi_contenu")
            .select("complete, etudiant_id")
            .eq("parcours_id", pc.id);

          const total = suivis?.length ?? 0;
          const done = suivis?.filter((s) => s.complete).length ?? 0;
          const progression = total > 0 ? Math.round((done / total) * 100) : 0;

          return { ...pc, _nb_etudiants: nbEtu ?? 0, _progression: progression };
        })
      );

      setParcours(enriched);

      const totalEtu = enriched.reduce((s, pc) => s + pc._nb_etudiants, 0);
      const avgProg = enriched.length
        ? Math.round(enriched.reduce((s, pc) => s + pc._progression, 0) / enriched.length)
        : 0;
      setStats({ etudiants: totalEtu, progression: avgProg });
      setLoading(false);
    })();
  }, [missionId]);

  if (loading) {
    return (
      <AssirikShell title="Mission">
        <Loader2 className="mx-auto animate-spin text-primary" />
      </AssirikShell>
    );
  }

  if (!mission) {
    return (
      <AssirikShell title="Mission introuvable">
        <p className="text-muted-foreground">Cette mission n'existe pas ou vous n'y avez pas accès.</p>
        <Link to="/admin/missions"><Button variant="outline" className="mt-4"><ArrowLeft size={14} className="mr-1" />Retour</Button></Link>
      </AssirikShell>
    );
  }

  return (
    <AssirikShell title={`🎯 ${mission.nom}`}>
      {/* Retour */}
      <Link to="/admin/missions">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} className="mr-1" /> Toutes les missions
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target size={20} className="text-primary" />
              <h1 className="text-lg font-bold">{mission.nom}</h1>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_COLOR[mission.statut] ?? "bg-muted"}`}>
                {mission.statut}
              </span>
            </div>
            {mission.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{mission.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 size={14} />
            <span className="font-medium">{mission.partenaires?.nom ?? "—"}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          {mission.date_debut && (
            <span className="flex items-center gap-1">
              <CalendarDays size={13} />
              Début : {new Date(mission.date_debut).toLocaleDateString("fr-FR")}
            </span>
          )}
          {mission.date_fin && (
            <span className="flex items-center gap-1">
              <CalendarDays size={13} />
              Fin : {new Date(mission.date_fin).toLocaleDateString("fr-FR")}
            </span>
          )}
          {mission.partenaires?.contact_email && (
            <span className="flex items-center gap-1">
              ✉️ {mission.partenaires.contact_email}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<BookOpen size={18} />} label="Parcours" value={parcours.length} />
        <StatCard icon={<Users size={18} />} label="Étudiants" value={stats.etudiants} />
        <StatCard icon={<TrendingUp size={18} />} label="Progression moy." value={`${stats.progression}%`} />
        <StatCard icon={<Target size={14} />} label="Statut" value={mission.statut} />
      </div>

      {/* Parcours liés */}
      <h2 className="mb-3 font-semibold text-foreground">Parcours de cette mission</h2>
      {parcours.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
          Aucun parcours rattaché à cette mission.
          <br />
          <Link to="/admin/parcours" className="mt-2 inline-block text-primary underline-offset-2 hover:underline">
            Créer un parcours →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parcours.map((pc) => (
            <div key={pc.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">{pc.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    Indiv. {pc.pondere_individuel}% · Groupe {pc.pondere_groupe}%
                  </p>
                </div>
              </div>

              {pc.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{pc.description}</p>
              )}

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users size={11} />{pc._nb_etudiants} étudiant(s)</span>
                <span>{pc._progression}% progression</span>
              </div>

              <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pc._progression}%` }}
                />
              </div>

              <Link to="/admin/parcours" className="mt-3 block">
                <Button size="sm" variant="outline" className="w-full">
                  Voir dans les parcours
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </AssirikShell>
  );
}
