import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; // ← AJOUTER CET IMPORT
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Users, BookOpen, CheckCircle, AlertCircle, 
  TrendingUp, Clock, Search, ChevronRight, Award 
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/professeur")({
  component: ProfesseurDashboard,
});

// Composant pour les statistiques
function StatsCard({ icon, label, value, color }: any) {
  return (
    <Card className="border-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color.bg}`}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfesseurDashboard() {
  useRoleGuard("professeur");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (pathname !== "/professeur") return;
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Charger les statistiques
        const { data: statsData, error: statsError } = await supabase
          .rpc("get_professor_stats", { p_professeur_id: user.id });

        if (statsError) {
          console.error("Erreur stats:", statsError);
          // Ne pas bloquer si les stats ne fonctionnent pas
        } else {
          setStats(statsData);
        }

        // Charger la liste des étudiants
        const { data: studentsData, error: studentsError } = await supabase
          .rpc("get_professor_students", { p_professeur_id: user.id });

        if (studentsError) {
          console.error("Erreur students:", studentsError);
          toast.error("Erreur de chargement des étudiants");
        } else {
          setStudents(studentsData || []);
        }
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

  const filteredStudents = students.filter((s: any) =>
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statsItems = stats ? [
    { label: "Étudiants", value: stats.total_etudiants || 0, icon: <Users className="h-5 w-5 text-blue-500" />, color: { bg: "bg-blue-50" } },
    { label: "Parcours", value: stats.total_parcours || 0, icon: <BookOpen className="h-5 w-5 text-purple-500" />, color: { bg: "bg-purple-50" } },
    { label: "Validations en attente", value: stats.validations_attente || 0, icon: <Clock className="h-5 w-5 text-amber-500" />, color: { bg: "bg-amber-50" } },
    { label: "Taux de réussite", value: `${stats.taux_reussite_global || 0}%`, icon: <TrendingUp className="h-5 w-5 text-green-500" />, color: { bg: "bg-green-50" } },
    { label: "Moyenne globale", value: `${stats.moyenne_globale || 0}/20`, icon: <CheckCircle className="h-5 w-5 text-primary" />, color: { bg: "bg-primary/10" } },
    { label: "En difficulté", value: stats.etudiants_difficulte || 0, icon: <AlertCircle className="h-5 w-5 text-red-500" />, color: { bg: "bg-red-50" } },
  ] : [];

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "Terminé": return "bg-green-100 text-green-700 border-green-200";
      case "En difficulté": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AssirikShell title="📊 Tableau de bord Professeur">
      <div className="space-y-6">
        {/* Statistiques */}
        {statsItems.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {statsItems.map((item, index) => (
              <StatsCard key={index} {...item} />
            ))}
          </div>
        )}

        {/* Liste des étudiants */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Étudiants ({students.length})
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8 h-9 w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun étudiant trouvé
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStudents.map((student: any) => (
                  <div
                    key={`${student.etudiant_id}-${student.parcours_id}`}
                    className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/20 transition-colors"
                  >
                    {/* Avatar et infos */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={student.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(student.full_name || "Étudiant")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{student.full_name || "Inconnu"}</p>
                        <p className="text-xs text-muted-foreground truncate">{student.email || ""}</p>
                      </div>
                    </div>

                    {/* Parcours et progression */}
                    <div className="flex-1 min-w-[150px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">
                          {student.parcours_titre || "Parcours"}
                        </span>
                        <Badge className={getStatutColor(student.statut || "En cours")}>
                          {student.statut || "En cours"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={student.progression || 0} className="h-1.5 flex-1" />
                        <span className="text-xs font-medium">{student.progression || 0}%</span>
                      </div>
                    </div>

                    {/* Notes et badges */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-primary">{student.note_moyenne?.toFixed(1) || "0.0"}</p>
                        <p className="text-[10px] text-muted-foreground">Moyenne</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold">
                          {student.modules_valides || 0}/{student.modules_total || 0}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Modules</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Award className="h-4 w-4 text-amber-500" />
                          <p className="font-bold">{student.badges_count || 0}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Badges</p>
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => {
                        window.location.href = `/professeur/carnet/${student.etudiant_id}/${student.parcours_id}`;
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AssirikShell>
  );
}
