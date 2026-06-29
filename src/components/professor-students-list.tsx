import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Award, Star } from "lucide-react";

interface Student {
  etudiant_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  parcours_id: string;
  parcours_titre: string;
  progression: number;
  note_moyenne: number;
  modules_valides: number;
  modules_total: number;
  badges_count: number;
  statut: string;
}

interface ProfessorStudentsListProps {
  students: Student[];
}

export function ProfessorStudentsList({ students }: ProfessorStudentsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedParcours, setSelectedParcours] = useState<string>("all");

  // Filtrer
  const filteredStudents = students.filter((s) => {
    const matchName = s.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchParcours = selectedParcours === "all" || s.parcours_id === selectedParcours;
    return matchName && matchParcours;
  });

  // Extraire les parcours uniques pour le filtre
  const parcoursList = Array.from(
    new Map(students.map((s) => [s.parcours_id, s.parcours_titre]))
  ).map(([id, titre]) => ({ id, titre }));

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
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Étudiants ({students.length})
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-8 h-9 w-48"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedParcours}
              onChange={(e) => setSelectedParcours(e.target.value)}
            >
              <option value="all">Tous les parcours</option>
              {parcoursList.map((p) => (
                <option key={p.id} value={p.id}>{p.titre}</option>
              ))}
            </select>
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
            {filteredStudents.map((student) => (
              <div
                key={`${student.etudiant_id}-${student.parcours_id}`}
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/20 transition-colors"
              >
                {/* Avatar et infos */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(student.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{student.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                  </div>
                </div>

                {/* Parcours et progression */}
                <div className="flex-1 min-w-[150px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {student.parcours_titre}
                    </span>
                    <Badge className={getStatutColor(student.statut)}>
                      {student.statut}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={student.progression} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium">{student.progression}%</span>
                  </div>
                </div>

                {/* Notes et badges */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-primary">{student.note_moyenne.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">Moyenne</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">
                      {student.modules_valides}/{student.modules_total}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Modules</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Award className="h-4 w-4 text-amber-500" />
                      <p className="font-bold">{student.badges_count}</p>
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
                    // Navigation vers le carnet de l'étudiant
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
  );
}
