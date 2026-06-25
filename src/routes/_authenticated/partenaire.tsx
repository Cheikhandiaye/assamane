import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Target, Users, CheckSquare } from "lucide-react";
import { useRoleGuard } from "@/hooks/use-role-guard";

export const Route = createFileRoute("/_authenticated/partenaire")({
  component: PartenaireDashboard,
});

function PartenaireDashboard() {
  useRoleGuard("partenaire");
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<{ label: string; value: number; icon: typeof Target }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("partenaire_id").eq("id", user.id).maybeSingle();
      const partenaireId = (profile as { partenaire_id?: string } | null)?.partenaire_id;
      if (!partenaireId) {
        setStats([{ label: "Missions", value: 0, icon: Target }]);
        return;
      }
      const { data: missions } = await supabase.from("missions").select("id").eq("partenaire_id", partenaireId).eq("statut", "active");
      const missionIds = (missions ?? []).map((m) => m.id);
      let nbEtudiants = 0;
      let nbVal = 0;
      if (missionIds.length) {
        const { data: parcs } = await supabase.from("parcours").select("id").in("mission_id", missionIds);
        const pIds = (parcs ?? []).map((p) => p.id);
        if (pIds.length) {
          const { count: studs } = await supabase.from("parcours_etudiants").select("*", { count: "exact", head: true }).in("parcours_id", pIds);
          nbEtudiants = studs ?? 0;
          const { count: val } = await supabase.from("reponses_etudiant").select("*", { count: "exact", head: true }).in("parcours_id", pIds).eq("statut", "soumis");
          nbVal = val ?? 0;
        }
      }
      setStats([
        { label: "Missions actives", value: missionIds.length, icon: Target },
        { label: "Étudiants", value: nbEtudiants, icon: Users },
        { label: "Validations en attente", value: nbVal, icon: CheckSquare },
      ]);
    })();
  }, [user]);

  return (
    <AssirikShell title="🤝 Tableau de bord Partenaire">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-card p-6 shadow-sm">
              <Icon size={22} className="text-primary" />
              <p className="mt-3 text-3xl font-black">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>
    </AssirikShell>
  );
}