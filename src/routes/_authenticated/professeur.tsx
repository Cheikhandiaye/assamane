import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Users, BookOpen, CheckCircle, AlertCircle, 
  TrendingUp, Clock, Search, ChevronRight, Award, Building2, Target
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

// Composant pour un groupe d'étudiants (par partenaire/mission)
function StudentGroupCard({ partenaire, mission, students }: any) {
  const [expanded, setExpanded] = useState(true);
  const avgProgression = students.length > 0 
    ? Math.round(students.reduce((acc: number, s: any) => acc + (s.progression || 0), 0) / students.length)
    : 0;

  return (
    <Card className="border-primary/5 overflow-hidden">
      <CardHeader 
        className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">{partenaire}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>{mission}</span>
                <Badge variant="secondary" className="ml-2">
                  {students.length} étudiant{students.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-right">
              <span className="font-medium">{avgProgression}%</span>
              <span className="text-muted-foreground text-xs ml-1">moy.</span>
            </div>
            <div className="w-24">
              <Progress value={avgProgression} className="h-2" />
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {expanded ? "−" : "+"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="pt-4">
          <div className="space-y-3">
            {students.map((student: any) => (
              <div
                key={`${student.etudiant_id}-${student.parcours_id}`}
                className="flex flex-col md:flex-row md:items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/20 transition-colors"
              >
                {/* Avatar et infos */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {student.full_name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{student.full_name || "Inconnu"}</p>
                    <p className="text-xs text-muted-foreground truncate">{student.email || ""}</p>
                  </div>
                </div>

                {/* Parcours et progression */}
                <div className="flex-1 min-w-[120px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {student.parcours_titre || "Parcours"}
                    </span>
                    <Badge className={
                      student.statut === "Terminé" ? "bg-green-100 text-green-700 border-green-200" :
                      student.statut === "En difficulté" ? "bg-red-100 text-red-700 border-red-200" :
                      "bg-blue-100 text-blue-700 border-blue-200"
                    }>
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
                  <div className="text-center min-w-[50px]">
                    <p className="font-bold text-primary">{student.note_moyenne?.toFixed(1) || "0.0"}</p>
                    <p className="text-[10px] text-muted-foreground">Moyenne</p>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <p className="font-bold">
                      {student.modules_valides || 0}/{student.modules_total || 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Modules</p>
                  </div>
                  <div className="text-center min-w-[50px]">
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
        </CardContent>
      )}
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
        } else {
          setStats(statsData);
        }

        // Charger la liste des étudiants avec partenaire/mission
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

  // Filtrer les étudiants par recherche
  const filteredStudents = students.filter((s: any) =>
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.partenaire_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.mission_nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper les étudiants par partenaire puis par mission
  const groupedStudents: Record<string, Record<string, any[]>> = {};
  
  filteredStudents.forEach((student: any) => {
    const partenaireKey = student.partenaire_nom || "Sans partenaire";
    const missionKey = student.mission_nom || "Sans mission";
    
    if (!groupedStudents[partenaireKey]) {
      groupedStudents[partenaireKey] = {};
    }
    if (!groupedStudents[partenaireKey][missionKey]) {
      groupedStudents[partenaireKey][missionKey] = [];
    }
    groupedStudents[partenaireKey][missionKey].push(student);
  });

  const statsItems = stats ? [
    { label: "Étudiants", value: stats.total_etudiants || 0, icon: <Users className="h-5 w-5 text-blue-500" />, color: { bg: "bg-blue-50" } },
    { label: "Parcours", value: stats.total_parcours || 0, icon: <BookOpen className="h-5 w-5 text-purple-500" />, color: { bg: "bg-purple-50" } },
    { label: "Validations en attente", value: stats.validations_attente || 0, icon: <Clock className="h-5 w-5 text-amber-500" />, color: { bg: "bg-amber-50" } },
    { label: "Taux de réussite", value: `${stats.taux_reussite_global || 0}%`, icon: <TrendingUp className="h-5 w-5 text-green-500" />, color: { bg: "bg-green-50" } },
    { label: "Moyenne globale", value: `${stats.moyenne_globale || 0}/20`, icon: <CheckCircle className="h-5 w-5 text-primary" />, color: { bg: "bg-primary/10" } },
    { label: "En difficulté", value: stats.etudiants_difficulte || 0, icon: <AlertCircle className="h-5 w-5 text-red-500" />, color: { bg: "bg-red-50" } },
  ] : [];

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

        {/* Recherche */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un étudiant, partenaire ou mission..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {filteredStudents.length} étudiant{filteredStudents.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Groupes par partenaire/mission */}
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p>Aucun étudiant trouvé</p>
              <p className="text-sm">Ajustez votre recherche ou vérifiez vos parcours</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedStudents).map(([partenaire, missions]) => (
              <div key={partenaire}>
                {Object.entries(missions).map(([mission, studentsList]) => (
                  <StudentGroupCard
                    key={`${partenaire}-${mission}`}
                    partenaire={partenaire}
                    mission={mission}
                    students={studentsList}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </AssirikShell>
  );
}
