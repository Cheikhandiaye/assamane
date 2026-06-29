import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Users, User } from "lucide-react";

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
  groupe_membres: GroupeMembre[];
  suivi_groupe_module: Array<{
    module_id: string;
    statut: string;
  }>;
}

interface EtudiantGroupeCardProps {
  groupe: GroupeData;
  userId: string;
}

export function EtudiantGroupeCard({ groupe, userId }: EtudiantGroupeCardProps) {
  const isRapporteur = groupe.rapporteur_id === userId;
  const totalModules = groupe.suivi_groupe_module?.length || 0;
  const modulesValides = groupe.suivi_groupe_module?.filter(
    (m) => m.statut === "valide"
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

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {groupe.nom}
        </CardTitle>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{groupe.groupe_membres?.length || 0} membres</span>
          {isRapporteur && (
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
              Rapporteur
            </span>
          )}
          <span className="ml-auto">Progression: {progression}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex -space-x-2 overflow-hidden">
          {groupe.groupe_membres?.map((membre) => (
            <div key={membre.etudiant_id} className="relative">
              <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-primary/20">
                <AvatarImage src={membre.profiles?.avatar_url || ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {membre.profiles?.full_name ? getInitials(membre.profiles.full_name) : "??"}
                </AvatarFallback>
              </Avatar>
              {membre.etudiant_id === groupe.rapporteur_id && (
                <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-background" />
              )}
            </div>
          ))}
        </div>
        {isRapporteur && (
          <div className="mt-3 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <User className="inline h-3 w-3 mr-1" />
            Vous êtes le rapporteur. Vous seul pouvez soumettre les carnets du groupe.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
