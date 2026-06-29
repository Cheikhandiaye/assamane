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
  CheckCircle, Clock, TrendingUp, AlertCircle,
  LayoutDashboard
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboard,
});

function AdminDashboard() {
  useRoleGuard("admin");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    partenaires: number;
    missions: number;
    parcours: number;
    etudiants: number;
    professeurs: number;
    validations: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si ce n'est pas la page admin, ne rien faire
    if (pathname !== "/admin") return;
    
    // Si pas d'utilisateur, ne rien faire
    if (!user) {
      console.log("AdminDashboard: Pas d'utilisateur");
      setLoading(false);
      return;
    }

    console.log("AdminDashboard: Chargement pour user", user.id);

    const loadStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("AdminDashboard: Début du chargement des stats");
        
        // Récupérer les statistiques une par une pour mieux diagnostiquer
        const [partenairesResult, missionsResult, parcoursResult, etudiantsResult, professeursResult, validationsResult] = await Promise.all([
          supabase.from("partenaires").select("*", { count: "exact", head: true }),
          supabase.from("missions").select("*", { count: "exact", head: true }),
          supabase.from("parcours").select("*", { count: "exact", head: true }),
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "etudiant"),
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "professeur"),
          supabase.from("reponses_etudiant").select("*", { count: "exact", head: true }).eq("statut", "soumis"),
        ]);

        console.log("AdminDashboard: Statistiques reçues", {
          partenaires: partenairesResult.count,
          missions: missionsResult.count,
          parcours: parcoursResult.count,
          etudiants: etudiantsResult.count,
          professeurs: professeursResult.count,
          validations: validationsResult.count,
        });

        // Vérifier les erreurs individuelles
        if (partenairesResult.error) console.warn("Erreur partenaires:", partenairesResult.error);
        if (missionsResult.error) console.warn("Erreur missions:", missionsResult.error);
        if (parcoursResult.error) console.warn("Erreur parcours:", parcoursResult.error);
        if (etudiantsResult.error) console.warn("Erreur etudiants:", etudiantsResult.error);
        if (professeursResult.error) console.warn("Erreur professeurs:", professeursResult.error);
        if (validationsResult.error) console.warn("Erreur validations:", validationsResult.error);

        setStats({
          partenaires: partenairesResult.count || 0,
          missions: missionsResult.count || 0,
          parcours: parcoursResult.count || 0,
          etudiants: etudiantsResult.count || 0,
          professeurs: professeursResult.count || 0,
          validations: validationsResult.count || 0,
        });

        console.log("AdminDashboard: Stats mises à jour");

      } catch (error: any) {
        console.error("AdminDashboard: Erreur fatale", error);
        setError(error.message || "Erreur de chargement");
        toast.error("Erreur de chargement du tableau de bord");
      } finally {
        setLoading(false);
        console.log("AdminDashboard: Chargement terminé");
      }
    };

    loadStats();
  }, [pathname, user]);

  // Si la route n'est pas /admin, afficher le Outlet
  if (pathname !== "/admin") return <Outlet />;

  // === AFFICHAGE DE L'ERREUR ===
  if (error) {
    return (
      <AssirikShell title="🛠️ Administration">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-muted-foreground max-w-md mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </AssirikShell>
    );
  }

  // === CHARGEMENT ===
  if (loading) {
    return (
      <AssirikShell title="🛠️ Administration">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Préparation de ton espace…</p>
        </div>
      </AssirikShell>
    );
  }

  // === AFFICHAGE NORMAL ===
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
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="border-primary/5 hover:shadow-md transition-shadow">
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
