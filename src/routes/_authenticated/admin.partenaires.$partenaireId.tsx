import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { PartnerLogo } from "@/components/partner-logo";
import {
  Loader2, ArrowLeft, Target, Users,
  Building2, Mail, BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/partenaires/$partenaireId")({
  component: Page,
});
export const ErrorBoundary = RouteErrorBoundary;

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
  const { partenaireId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [partenaire, setPartenaire] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [stats, setStats] = useState({ missions: 0, parcours: 0, etudiants: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from("partenaires").select("*").eq("id", partenaireId).maybeSingle(),
        supabase
          .from("missions")
          .select("id, nom, statut, date_debut, date_fin, description")
          .eq("partenaire_id", partenaireId)
          .order("created_at", { ascending: false }),
      ]);

      setPartenaire(p);
      const missionsData = m ?? [];

      // Enrichit chaque mission avec nb parcours + nb étudiants
      const enriched = await Promise.all(
        missionsData.map(async (ms) => {
          const { data: pcs } = await supabase
            .from("parcours")
            .select("id")
            .eq("mission_id", ms.id);

          const parcoursIds = (pcs ?? []).map((pc) => pc.id);
          let nbEtu = 0;
          if (parcoursIds.length) {
            const { count } = await supabase
              .from("parcours_etudiants")
              .select("*", { count: "exact", head: true })
              .in("parcours_id", parcoursIds);
            nbEtu = count ?? 0;
          }
          return { ...ms, _nb_parcours: parcoursIds.length, _nb_etudiants: nbEtu };
        })
      );

      setMissions(enriched);
      setStats({
        missions: enriched.length,
        parcours: enriched.reduce((s, ms) => s + ms._nb_parcours, 0),
        etudiants: enriched.reduce((s, ms) => s + ms._nb_etudiants, 0),
      });
      setLoading(false);
    })();
  }, [partenaireId]);

  if (loading) {
    return (
      <AssirikShell title="Partenaire">
        <Loader2 className="mx-auto animate-spin text-primary" />
      </AssirikShell>
    );
  }

  if (!partenaire) {
    return (
      <AssirikShell title="Partenaire introuvable">
        <p className="text-muted-foreground">Ce partenaire n'existe pas.</p>
        <Link to="/admin/partenaires">
          <Button variant="outline" className="mt-4"><ArrowLeft size={14} className="mr-1" />Retour</Button>
        </Link>
      </AssirikShell>
    );
  }

  const STATUT_COLOR: Record<string, string> = {
    brouillon: "bg-muted text-muted-foreground",
    active:    "bg-green-100 text-green-700",
    terminee:  "bg-blue-100 text-blue-700",
  };

  return (
    <AssirikShell title={`🏢 ${partenaire.nom}`}>
      {/* Retour */}
      <Link to="/admin/partenaires">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} className="mr-1" /> Tous les partenaires
        </Button>
      </Link>

      {/* Header partenaire */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          <PartnerLogo
            path={partenaire.logo_url}
            alt={partenaire.nom}
            className="h-16 w-16 rounded-xl object-cover"
          />
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              {partenaire.nom}
            </h1>
            {partenaire.contact_email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Mail size={12} /> {partenaire.contact_email}
              </p>
            )}
            {partenaire.adresse && (
              <p className="text-sm text-muted-foreground mt-0.5">📍 {partenaire.adresse}</p>
            )}
          </div>
          <div className="ml-auto flex gap-2 self-start">
            <div
              className="h-6 w-6 rounded-full border border-border"
              style={{ background: partenaire.couleur_primaire ?? "#7C3AED" }}
              title="Couleur primaire"
            />
            <div
              className="h-6 w-6 rounded-full border border-border"
              style={{ background: partenaire.couleur_secondaire ?? "#F97316" }}
              title="Couleur secondaire"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard icon={<Target size={18} />} label="Missions" value={stats.missions} />
        <StatCard icon={<BookOpen size={18} />} label="Parcours" value={stats.parcours} />
        <StatCard icon={<Users size={18} />} label="Étudiants" value={stats.etudiants} />
      </div>

      {/* Missions */}
      <h2 className="mb-3 font-semibold text-foreground">Missions</h2>
      {missions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
          Aucune mission pour ce partenaire.
          <br />
          <Link to="/admin/missions" className="mt-2 inline-block text-primary underline-offset-2 hover:underline">
            Créer une mission →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {missions.map((ms) => (
            <Link
              key={ms.id}
              to="/admin/missions/$missionId"
              params={{ missionId: ms.id }}
              className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-primary shrink-0" />
                  <p className="font-semibold truncate">{ms.nom}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_COLOR[ms.statut] ?? "bg-muted"}`}>
                  {ms.statut}
                </span>
              </div>

              {ms.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{ms.description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {ms.date_debut && <span>📅 {new Date(ms.date_debut).toLocaleDateString("fr-FR")}</span>}
                {ms.date_fin && <span>→ {new Date(ms.date_fin).toLocaleDateString("fr-FR")}</span>}
                <span className="flex items-center gap-1"><BookOpen size={11} />{ms._nb_parcours} parcours</span>
                <span className="flex items-center gap-1"><Users size={11} />{ms._nb_etudiants} étudiant(s)</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AssirikShell>
  );
}
