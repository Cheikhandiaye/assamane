import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { ProfessorStatsCard } from "@/components/professor-stats-card";
import { ProfessorStudentsList } from "@/components/professor-students-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/professeur")({
  component: ProfesseurDashboard,
});

function ProfesseurDashboard() {
  useRoleGuard("professeur");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    if (pathname !== "/professeur") return;
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Charger les statistiques
        const { data: statsData, error: statsError } = await supabase
          .rpc("get_professor_stats", { p_professeur_id: user.id });

        if (statsError) throw statsError;
        setStats(statsData);

        // Charger la liste des étudiants
        const { data: studentsData, error: studentsError } = await supabase
          .rpc("get_professor_students", { p_professeur_id: user.id });

        if (studentsError) throw studentsError;
        setStudents(studentsData || []);
      } catch (error: any) {
        console.error("Erreur chargement dashboard:", error);
        toast.error(error.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [pathname, user]);

  if (pathname !== "/professeur") return <Outlet />;

  if (loading) {
    return (
      <AssirikShell title="Tableau de bord Professeur">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AssirikShell>
    );
  }

  return (
    <AssirikShell title="📊 Tableau de bord Professeur">
      <div className="space-y-6">
        {/* Statistiques */}
        {stats && <ProfessorStatsCard stats={stats} />}

        {/* Liste des étudiants */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="difficulte">En difficulté</TabsTrigger>
            <TabsTrigger value="terminé">Terminé</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <ProfessorStudentsList students={students} />
          </TabsContent>
          <TabsContent value="difficulte">
            <ProfessorStudentsList 
              students={students.filter((s: any) => s.statut === "En difficulté")} 
            />
          </TabsContent>
          <TabsContent value="terminé">
            <ProfessorStudentsList 
              students={students.filter((s: any) => s.statut === "Terminé")} 
            />
          </TabsContent>
        </Tabs>
      </div>
    </AssirikShell>
  );
}
