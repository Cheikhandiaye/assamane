import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { 
  Trophy, 
  Users, 
  Award, 
  Download,
  TrendingUp,
  Medal,
  Star,
  ChevronRight,
  Crown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

interface EtudiantData {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  total_xp: number;
  niveau: number;
  badges_count: number;
  note_moyenne: number;
  parcours_termines: number;
  progression_globale: number;
}

interface PartenaireLeaderboardProps {
  partenaireId: string;
  parcoursId?: string;
}

export function PartenaireLeaderboard({ partenaireId, parcoursId }: PartenaireLeaderboardProps) {
  const { user } = useCurrentUser();
  const [etudiants, setEtudiants] = useState<EtudiantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"xp" | "note" | "progression">("xp");

  useEffect(() => {
    fetchEtudiants();
  }, [partenaireId, parcoursId]);

  const fetchEtudiants = async () => {
    setLoading(true);
    try {
      // Récupérer les étudiants du partenaire
      let query = supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          user_roles (role),
          parcours_etudiants!inner (
            parcours_id,
            parcours (
              id,
              titre,
              mission_id
            )
          )
        `)
        .eq("user_roles.role", "etudiant")
        .eq("parcours_etudiants.parcours.mission.partenaire_id", partenaireId);

      if (parcoursId) {
        query = query.eq("parcours_etudiants.parcours_id", parcoursId);
      }

      const { data: profiles, error } = await query;

      if (error) throw error;

      // Pour chaque étudiant, récupérer XP, badges, notes
      const etudiantsData = await Promise.all(
        (profiles || []).map(async (p) => {
          // XP
          const { data: xp } = await supabase
            .from("xp_etudiants")
            .select("total_xp, niveau")
            .eq("etudiant_id", p.id)
            .maybeSingle();

          // Badges
          const { count: badgesCount } = await supabase
            .from("badges_etudiants")
            .select("*", { count: "exact", head: true })
            .eq("etudiant_id", p.id);

          // Notes
          const { data: notes } = await supabase
            .from("notes_finales_module")
            .select("note_finale")
            .eq("etudiant_id", p.id);

          const noteMoyenne = notes && notes.length > 0
            ? Math.round(notes.reduce((acc, n) => acc + n.note_finale, 0) / notes.length)
            : 0;

          // Parcours terminés
          const { data: parcours } = await supabase
            .from("parcours_etudiants")
            .select("parcours_id")
            .eq("etudiant_id", p.id);

          const parcoursIds = parcours?.map((p) => p.parcours_id) || [];
          const { data: notesParParcours } = await supabase
            .from("notes_finales_module")
            .select("parcours_id, note_finale")
            .in("etudiant_id", [p.id])
            .in("parcours_id", parcoursIds);

          const parcoursTermines = notesParParcours?.reduce((acc, n) => {
            if (n.note_finale >= 70) {
              acc.add(n.parcours_id);
            }
            return acc;
          }, new Set<string>()).size || 0;

          // Progression globale
          const totalModules = notes?.length || 0;
          const modulesReussis = notes?.filter((n) => n.note_finale >= 70).length || 0;
          const progressionGlobale = totalModules > 0 
            ? Math.round((modulesReussis / totalModules) * 100)
            : 0;

          return {
            id: p.id,
            full_name: p.full_name || "Inconnu",
            email: p.email || "",
            avatar_url: p.avatar_url || null,
            total_xp: xp?.total_xp || 0,
            niveau: xp?.niveau || 1,
            badges_count: badgesCount || 0,
            note_moyenne: noteMoyenne,
            parcours_termines: parcoursTermines,
            progression_globale: progressionGlobale,
          };
        })
      );

      // Trier
      const sorted = [...etudiantsData].sort((a, b) => {
        switch (sortBy) {
          case "xp": return b.total_xp - a.total_xp;
          case "note": return b.note_moyenne - a.note_moyenne;
          case "progression": return b.progression_globale - a.progression_globale;
          default: return b.total_xp - a.total_xp;
        }
      });

      setEtudiants(sorted);
    } catch (error) {
      console.error("Erreur chargement étudiants:", error);
      toast.error("Impossible de charger le classement");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (etudiants.length === 0) {
      toast.error("Aucun étudiant à exporter");
      return;
    }

    const headers = ["Nom", "Email", "XP", "Niveau", "Badges", "Note Moyenne", "Parcours Terminés", "Progression"];
    const rows = etudiants.map((e) => [
      e.full_name,
      e.email,
      e.total_xp,
      e.niveau,
      e.badges_count,
      e.note_moyenne,
      e.parcours_termines,
      `${e.progression_globale}%`
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `classement_etudiants_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Export CSV réussi");
  };

  const getMedal = (index: number) => {
    switch (index) {
      case 0: return <Crown className="h-5 w-5 text-amber-500" />;
      case 1: return <Medal className="h-5 w-5 text-gray-400" />;
      case 2: return <Medal className="h-5 w-5 text-amber-700" />;
      default: return <span className="text-sm text-muted-foreground w-6 text-center">#{index + 1}</span>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement du classement...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Classement des étudiants
          <Badge variant="secondary" className="text-[10px]">
            {etudiants.length} étudiants
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={sortBy === "xp" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy("xp")}
            >
              XP
            </Button>
            <Button
              variant={sortBy === "note" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy("note")}
            >
              Notes
            </Button>
            <Button
              variant={sortBy === "progression" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSortBy("progression")}
            >
              Progression
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={exportCSV}
          >
            <Download className="h-3 w-3 mr-1" />
            Exporter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {etudiants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
            <p>Aucun étudiant inscrit</p>
          </div>
        ) : (
          <div className="space-y-3">
            {etudiants.map((etudiant, index) => (
              <div
                key={etudiant.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-colors
                  ${index < 3 ? "bg-muted/30 border-primary/10" : ""}
                `}
              >
                {/* Position */}
                <div className="flex-shrink-0 w-8 text-center">
                  {getMedal(index)}
                </div>

                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={etudiant.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {etudiant.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {etudiant.full_name}
                    </span>
                    <Badge variant="secondary" className="text-[9px]">
                      Niv. {etudiant.niveau}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3 text-amber-500" />
                      {etudiant.total_xp} XP
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="h-3 w-3 text-primary" />
                      {etudiant.badges_count} badges
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500" />
                      {etudiant.parcours_termines} parcours
                    </span>
                  </div>
                </div>

                {/* Note et progression */}
                <div className="flex-shrink-0 text-right">
                  <span className={`
                    text-sm font-bold
                    ${etudiant.note_moyenne >= 70 ? "text-green-600" : "text-amber-600"}
                  `}>
                    {etudiant.note_moyenne}%
                  </span>
                  <div className="w-24">
                    <Progress value={etudiant.progression_globale} className="h-1.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
