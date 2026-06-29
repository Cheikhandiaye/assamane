import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Lock, 
  Circle, 
  PlayCircle, 
  FileText, 
  ClipboardList, 
  Award,
  AlertCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface EtapeModule {
  id: string;
  type: "texte" | "video" | "quiz" | "carnet";
  titre: string;
  statut: "verrouille" | "en_cours" | "termine" | "bloque";
  progression?: number; // pour la vidéo
  note?: number; // pour le quiz
  tentative?: number; // pour le quiz (1 ou 2)
  temps_restant?: number; // pour le quiz (en secondes)
  action_label?: string;
  action_disabled?: boolean;
  onAction?: () => void;
}

interface EtudiantModuleProgressProps {
  etapes: EtapeModule[];
  moduleTitre: string;
  moduleOrdre: number;
  totalModules: number;
  noteFinale?: number;
  isGroupe?: boolean;
  isRapporteur?: boolean;
}

export function EtudiantModuleProgress({
  etapes,
  moduleTitre,
  moduleOrdre,
  totalModules,
  noteFinale,
  isGroupe = false,
  isRapporteur = true,
}: EtudiantModuleProgressProps) {
  const getIcon = (type: string, statut: string) => {
    if (statut === "termine") return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (statut === "verrouille") return <Lock className="h-5 w-5 text-gray-400" />;
    if (statut === "bloque") return <AlertCircle className="h-5 w-5 text-red-500" />;
    
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

  const getStatutBg = (statut: string) => {
    switch (statut) {
      case "termine": return "border-green-200 bg-green-50/50";
      case "verrouille": return "border-gray-100 bg-gray-50/50 opacity-60";
      case "bloque": return "border-red-200 bg-red-50/50";
      default: return "border-primary/30 bg-primary/5";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "texte": return "Texte à lire";
      case "video": return "Vidéo";
      case "quiz": return "Quiz";
      case "carnet": return "Carnet";
      default: return "";
    }
  };

  const etapesTerminees = etapes.filter((e) => e.statut === "termine").length;
  const totalEtapes = etapes.length;
  const progression = totalEtapes > 0 ? Math.round((etapesTerminees / totalEtapes) * 100) : 0;

  // Vérifier si une étape est bloquée
  const estBloquee = etapes.some((e) => e.statut === "bloque");

  return (
    <Card className={cn("border-primary/10", estBloquee && "border-red-200")}>
      <CardContent className="pt-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <span className="text-sm text-muted-foreground">
              Module {moduleOrdre}/{totalModules}
              {isGroupe && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  Travail de groupe
                </Badge>
              )}
            </span>
            <h3 className="text-lg font-semibold">{moduleTitre}</h3>
          </div>
          <div className="flex items-center gap-3">
            {noteFinale !== undefined && (
              <Badge className="text-sm px-3 py-1" variant={noteFinale >= 70 ? "default" : "destructive"}>
                Note: {noteFinale}%
              </Badge>
            )}
            <span className="text-sm font-medium">{progression}%</span>
          </div>
        </div>

        {/* Barre de progression */}
        <Progress 
          value={progression} 
          className={cn("h-2 mb-4", estBloquee && "bg-red-100")} 
        />

        {/* Message de groupe */}
        {isGroupe && !isRapporteur && (
          <div className="p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Vous êtes en groupe. Seul le rapporteur peut soumettre le carnet.
          </div>
        )}

        {/* Liste des étapes */}
        <div className="space-y-3">
          {etapes.map((etape, index) => {
            const isActionnable = etape.statut === "en_cours" && etape.onAction;
            
            return (
              <div
                key={etape.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  getStatutBg(etape.statut)
                )}
              >
                {/* Icône */}
                <div className="flex-shrink-0">
                  {getIcon(etape.type, etape.statut)}
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {etape.titre}
                    </span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                      {getTypeLabel(etape.type)}
                    </Badge>
                    {etape.tentative && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                        Essai {etape.tentative}/2
                      </Badge>
                    )}
                    {etape.note !== undefined && (
                      <span className={cn(
                        "text-xs font-bold ml-auto",
                        etape.note >= 70 ? "text-green-600" : "text-red-500"
                      )}>
                        {etape.note}%
                      </span>
                    )}
                    {etape.temps_restant !== undefined && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {Math.floor(etape.temps_restant / 60)}:{String(etape.temps_restant % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs", getStatutColor(etape.statut))}>
                      {getStatutLabel(etape.statut)}
                    </span>
                    {etape.progression !== undefined && etape.progression > 0 && etape.progression < 100 && (
                      <span className="text-xs text-muted-foreground">
                        ({etape.progression}%)
                      </span>
                    )}
                    {etape.statut === "en_cours" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                </div>

                {/* Action */}
                {isActionnable && (
                  <Button
                    size="sm"
                    variant={etape.type === "quiz" ? "default" : "outline"}
                    onClick={etape.onAction}
                    disabled={etape.action_disabled}
                    className="flex-shrink-0"
                  >
                    {etape.action_label || "Continuer"}
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}

                {etape.statut === "termine" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled
                    className="flex-shrink-0 text-green-500"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Fait
                  </Button>
                )}

                {etape.statut === "bloque" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 text-red-500 border-red-200"
                    onClick={() => toast.info("Refaire le module pour débloquer")}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refaire
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
