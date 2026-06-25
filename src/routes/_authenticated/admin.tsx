import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Target, BookOpen, Users, CheckSquare, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRoleGuard } from "@/hooks/use-role-guard";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboard,
});

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: string;
}

function AdminDashboard() {
  useRoleGuard("admin");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [stats, setStats] = useState<Stat[]>([]);

  useEffect(() => {
    if (pathname !== "/admin") return;
    (async () => {
      const tables = [
        ["partenaires", "Partenaires", Building2, undefined],
        ["missions", "Missions", Target, undefined],
        ["parcours", "Parcours", BookOpen, undefined],
        ["profiles", "Profils", Users, undefined],
      ] as const;
      const counts = await Promise.all(
        tables.map(([t]) => supabase.from(t).select("*", { count: "exact", head: true })),
      );
      const [{ count: pendingValidations }, { count: pendingProlongations }] = await Promise.all([
        supabase.from("reponses_etudiant").select("*", { count: "exact", head: true }).eq("statut", "soumis"),
        supabase.from("demandes_prolongation").select("*", { count: "exact", head: true }).eq("statut", "en_attente"),
      ]);
      setStats([
        ...tables.map(([, label, icon], i) => ({ label, value: counts[i].count ?? 0, icon })),
        { label: "Validations en attente", value: pendingValidations ?? 0, icon: CheckSquare, accent: "bg-orange-500" },
        { label: "Prolongations", value: pendingProlongations ?? 0, icon: Clock, accent: "bg-destructive" },
      ]);
    })();
  }, [pathname]);

  if (pathname !== "/admin") return <Outlet />;

  return (
    <AssirikShell title="🛡️ Tableau de bord Admin">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-card p-5 shadow-sm">
              <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl text-white ${s.accent ?? "bg-primary"}`}>
                <Icon size={20} />
              </div>
              <p className="text-3xl font-black text-foreground">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="text-lg font-bold">Activités récentes</h2>
        <p className="mt-2 text-sm text-muted-foreground">Les sections complètes (Partenaires, Missions, Parcours, etc.) sont accessibles via le menu latéral.</p>
      </div>
    </AssirikShell>
  );
}