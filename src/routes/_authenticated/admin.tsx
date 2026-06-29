import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Loader2, Users, Building2, BookOpen, 
  CheckCircle, Clock, TrendingUp, AlertCircle 
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  useRoleGuard("admin");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (pathname !== "/admin") return;
    if (!user) return;

    const loadStats = async () => {
      setLoading(true);
      try {
        // Charger les statistiques simples
        const [
          { count: partenaires },
          { count: missions },
          { count: parcours },
          { count: etudiants },
          { count: professeurs },
          { count: validations },
        ] = await Promise.all([
          supabase.from("partenaires").select("*", { count: "exact", head: true }),
          supabase.from("missions").select("*", { count: "exact", head: true }),
          supabase.from("parcours").select("*", { count: "exact", head: true }),
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "etudiant"),
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "professeur"),
          supabase.from("reponses_etudiant").select("*", { count: "exact", head: true }).eq("statut", "soumis"),
        ]);

        setStats({
          partenaires: partenaires || 0,
          missions: missions || 0,
          parcours: parcours || 0,
          etudiants: etudiants || 0,
          professeurs: professeurs || 0,
          validations: validations || 0,
        });
      } catch (error: any) {
        console.error("Erreur chargement stats:", error);
        toast.error(error.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [pathname, user]);

  if (pathname !== "/admin") return <Outlet />;

  if (loading) {
    return (
      <AssirikShell title="Administration">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AssirikShell>
    );
  }

  const statsItems = [
    { label: "Partenaires", value: stats?.partenaires || 0, icon: Building2, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Missions", value: stats?.missions || 0, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Parcours", value: stats?.parcours || 0, icon: BookOpen, color: "text-green-500", bg: "bg-green-50" },
    { label: "Étudiants", value: stats?.etudiants || 0, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Professeurs", value: stats?.professeurs || 0, icon: Users, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Validations en attente", value: stats?.validations || 0, icon: Clock, color: "text-red-500", bg: "bg-red-50" },
  ];

  return (
    <AssirikShell title="🛠️ Administration">
      <div className="space-y-6">
        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="border-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.bg}`}>
                      <Icon className={`h-5 w-5 ${item.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Actions rapides */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⚡ Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href="/admin/partenaires">Gérer les partenaires</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/admin/missions">Gérer les missions</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/admin/parcours">Gérer les parcours</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/admin/etudiants">Gérer les étudiants</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/admin/professeurs">Gérer les professeurs</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/admin/validations">Valider les réponses</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AssirikShell>
  );
}
