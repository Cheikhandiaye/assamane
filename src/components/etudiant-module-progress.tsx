import { Card, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { CheckCircle, Lock, Circle, PlayCircle, FileText, ClipboardList, Award } from "lucide-react";
import { cn } from "~/lib/utils";

interface EtapeModule {
  id: string;
  type: "texte" | "video" | "quiz" | "carnet";
  titre: string;
  statut: "verrouille" | "en_cours" | "termine" | "bloque";
  progression?: number; // pour la vidéo
  note?: number; // pour le quiz
}

interface EtudiantModuleProgressProps {
  etapes: EtapeModule[];
  moduleTitre: string;
  moduleOrdre: number;
  totalModules: number;
}

export function EtudiantModuleProgress({
  etapes,
  moduleTitre,
  moduleOrdre,
  totalModules,
}: EtudiantModuleProgressProps) {
  const getIcon = (type: string, statut: string) => {
    if (statut === "termine") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (statut === "verrouille") return <Lock className="h-5 w-5 text-gray-400" />;
    if (statut === "bloque") return <Lock className="h-5 w-5 text-red-500" />;
    
    switch (type) {
      case "texte": return <FileText className="h-5 w-5 text-blue-500" />;
      case "video": return <PlayCircle className="h-5 w-5 text-purple-500" />;
      case "quiz": return <ClipboardList className="h-5 w-5 text-amber-500" />;
      case "carnet": return <Award className="h-5 w-5 text-green-600" />;
      default: return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case "verrouille": return "Verrouillé";
      case "en_cours": return "En cours";
      case "termine": return "Terminé";
      case "bloque": return "Bloqué";
      default: return "";
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "termine": return "text-green-500";
      case "verrouille": return "text-gray-400";
      case "bloque": return "text-red-500";
      default: return "text-primary";
    }
  };

  const etapesTerminees = etapes.filter((e) => e.statut === "termine").length;
  const totalEtapes = etapes.length;
  const progression = totalEtapes > 0 ? Math.round((etapesTerminees / totalEtapes) * 100) : 0;

  return (
    <Card className="border-primary/10">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-muted-foreground">
              Module {moduleOrdre}/{totalModules}
            </span>
            <h3 className="text-lg font-semibold">{moduleTitre}</h3>
          </div>
          <span className="text-sm font-medium">{progression}%</span>
        </div>

        <Progress value={progression} className="h-2 mb-4" />

        <div className="space-y-3">
          {etapes.map((etape, index) => (
            <div
              key={etape.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                etape.statut === "en_cours" && "border-primary/30 bg-primary/5",
                etape.statut === "termine" && "border-green-200 bg-green-50/50",
                etape.statut === "verrouille" && "border-gray-100 bg-gray-50/50 opacity-60",
                etape.statut === "bloque" && "border-red-200 bg-red-50/50"
              )}
            >
              <div className="flex-shrink-0">
                {getIcon(etape.type, etape.statut)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {etape.titre}
                  </span>
                  {etape.note !== undefined && (
                    <span className="text-xs font-bold text-primary ml-auto">
                      {etape.note}%
                    </span>
                  )}
                </div>
                <span className={cn("text-xs", getStatutColor(etape.statut))}>
                  {getStatutLabel(etape.statut)}
                  {etape.progression !== undefined && etape.progression > 0 && etape.progression < 100 && (
                    <span className="text-muted-foreground ml-1">
                      ({etape.progression}%)
                    </span>
                  )}
                </span>
              </div>
              {etape.statut === "en_cours" && (
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
