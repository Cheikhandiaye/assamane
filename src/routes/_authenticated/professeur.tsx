import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, CheckSquare, CalendarCheck, Layers } from "lucide-react";
import { useRoleGuard } from "@/hooks/use-role-guard";

export const Route = createFileRoute("/_authenticated/professeur")({
  component: ProfDashboard,
});

function ProfDashboard() {
  useRoleGuard("professeur");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<{ label: string; value: number; icon: typeof BookOpen }[]>([]);

  // Statistiques du tableau de bord
  useEffect(() => {
    if (pathname !== "/professeur") return;
    if (!user) return;
    (async () => {
      const { data: pp } = await supabase
        .from("parcours_professeurs")
        .select("parcours_id")
        .eq("professeur_id", user.id);
      const parcoursIds = (pp ?? []).map((p) => p.parcours_id);
      const [{ count: nbModules }, { count: nbValidations }, { count: nbSessions }] = await Promise.all([
        supabase.from("modules_cours").select("*", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("reponses_etudiant").select("*", { count: "exact", head: true }).eq("statut", "soumis"),
        supabase.from("sessions_cours").select("*", { count: "exact", head: true }).eq("professeur_id", user.id).eq("statut", "ouverte"),
      ]);
      let nbEtudiants = 0;
      if (parcoursIds.length) {
        const { count } = await supabase.from("parcours_etudiants").select("*", { count: "exact", head: true }).in("parcours_id", parcoursIds);
        nbEtudiants = count ?? 0;
      }
      setStats([
        { label: "Mes parcours", value: parcoursIds.length, icon: BookOpen },
        { label: "Mes étudiants", value: nbEtudiants, icon: Users },
        { label: "Mes modules", value: nbModules ?? 0, icon: Layers },
        { label: "Validations en attente", value: nbValidations ?? 0, icon: CheckSquare },
        { label: "Sessions ouvertes", value: nbSessions ?? 0, icon: CalendarCheck },
      ]);
    })();
  }, [pathname, user]);

  if (pathname !== "/professeur") return <Outlet />;

  return (
    <AssirikShell title="🎓 Tableau de bord Professeur">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-card p-5 shadow-sm">
              <Icon size={20} className="text-primary" />
              <p className="mt-3 text-3xl font-black">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      <p className="mt-8 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        💡 La gestion des groupes se fait désormais depuis chaque parcours : ouvre un parcours dans
        <strong> Mes parcours</strong>, puis clique sur <strong>Gérer les groupes</strong>.
      </p>
    </AssirikShell>
  );
}
