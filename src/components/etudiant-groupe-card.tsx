import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Star, User, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface GroupeMembre {
  etudiant_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface GroupeData {
  id: string;
  nom: string;
  rapporteur_id: string;
  parcours_id: string;
  parcours: {
    id: string;
    nom: string;
  };
  groupe_membres: GroupeMembre[];
  suivi_groupe_module: Array<{
    module_id: string;
    statut: string;
    date_debut: string;
    date_fin: string | null;
  }>;
}

interface EtudiantGroupeCardProps {
  groupe: GroupeData;
  userId: string;
  moduleActuel?: {
    id: string;
    titre: string;
    ordre: number;
    total: number;
  };
}

export function EtudiantGroupeCard({ groupe, userId, moduleActuel }: EtudiantGroupeCardProps) {
  const isRapporteur = groupe.rapporteur_id === userId;
  const totalModules = groupe.suivi_groupe_module?.length || 0;
  const modulesValides = groupe.suivi_groupe_module?.filter(
    (m) => m.statut === "valide"
  ).length || 0;
  const modulesBloques = groupe.suivi_groupe_module?.filter(
    (m) => m.statut === "bloque"
  ).length || 0;
  const progression = totalModules > 0 ? Math.round((modulesValides / totalModules) * 100) : 0;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case "valide": return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "bloque": return <AlertCircle className="h-3 w-3 text-red-500" />;
      case "en_attente_validation": return <Clock className="h-3 w-3 text-amber-500" />;
      default: return <Clock className="h-3 w-3 text-blue-500" />;
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case "valide": return "Validé";
      case "bloque": return "Bloqué";
      case "en_attente_validation": return "En attente";
      default: return "En cours";
    }
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {groupe.nom}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {groupe.parcours?.nom || "Parcours"}
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {progression}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progression */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression du groupe</span>
            <span className="font-medium">{modulesValides}/{totalModules} modules</span>
          </div>
          <Progress value={progression} className="h-2" />
          {modulesBloques > 0 && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {modulesBloques} module(s) bloqué(s) - tous les membres doivent refaire le module
            </p>
          )}
        </div>

        {/* Module actuel */}
        {moduleActuel && (
          <div className="rounded-lg bg-primary/5 p-3 border border-primary/10">
            <p className="text-xs text-muted-foreground">Module en cours</p>
            <p className="font-medium">
              {moduleActuel.titre}
              <span className="text-sm text-muted-foreground font-normal ml-2">
                ({moduleActuel.ordre}/{moduleActuel.total})
              </span>
            </p>
          </div>
        )}

        {/* Membres */}
        <div>
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Membres ({groupe.groupe_membres?.length || 0})
          </p>
          <div className="flex flex-wrap gap-2">
            {groupe.groupe_membres?.map((membre) => (
              <div
                key={membre.etudiant_id}
                className={`
                  flex items-center gap-1.5 rounded-full pl-0.5 pr-2.5 py-0.5 text-xs
                  ${membre.etudiant_id === groupe.rapporteur_id 
                    ? "bg-amber-50 border border-amber-200" 
                    : "bg-muted/50 border border-transparent"
                  }
                  ${membre.etudiant_id === userId ? "ring-2 ring-primary/30" : ""}
                `}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={membre.profiles?.avatar_url || ""} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {membre.profiles?.full_name ? getInitials(membre.profiles.full_name) : "??"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[80px]">
                  {membre.profiles?.full_name?.split(" ")[0] || "Inconnu"}
                </span>
                {membre.etudiant_id === groupe.rapporteur_id && (
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                )}
                {membre.etudiant_id === userId && (
                  <Badge variant="secondary" className="text-[8px] h-4 px-1">Vous</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Statut rapporteur */}
        {isRapporteur && (
          <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700 flex items-center gap-2">
            <User className="h-4 w-4 text-amber-500" />
            Vous êtes le rapporteur. Vous seul pouvez soumettre les carnets du groupe.
          </div>
        )}

        {/* Suivi des modules */}
        <div>
          <p className="text-sm font-medium mb-2">Avancement des modules</p>
          <div className="space-y-1">
            {groupe.suivi_groupe_module?.slice(0, 5).map((m) => (
              <div key={m.module_id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  {getStatutIcon(m.statut)}
                  <span className="truncate max-w-[150px]">Module #{m.module_id.slice(0, 8)}</span>
                </span>
                <Badge 
                  variant="outline" 
                  className={`
                    text-[9px] h-5 px-1.5
                    ${m.statut === "valide" ? "border-green-200 text-green-600" : ""}
                    ${m.statut === "bloque" ? "border-red-200 text-red-600" : ""}
                    ${m.statut === "en_attente_validation" ? "border-amber-200 text-amber-600" : ""}
                  `}
                >
                  {getStatutLabel(m.statut)}
                </Badge>
              </div>
            ))}
            {(groupe.suivi_groupe_module?.length || 0) > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{(groupe.suivi_groupe_module?.length || 0) - 5} autres modules
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
