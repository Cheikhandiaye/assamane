import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Award, 
  Star,
  Flame,
  Trophy,
  ChevronRight,
  AlertCircle,
  Loader2,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { getStudentGroupe } from "@/lib/groupe.functions";
import { getStudentXP, recordConnexion, getLeaderboard } from "@/lib/xp.functions";
import { getStudentNotes } from "@/lib/notes.functions";

export const Route = createFileRoute("/_authenticated/etudiant")({
  component: EtudiantDashboard,
});

function EtudiantDashboard() {
  useRoleGuard("etudiant");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parcoursInscrits, setParcoursInscrits] = useState<any[]>([]);
  const [badgesCount, setBadgesCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xpData, setXpData] = useState<{ total_xp: number; niveau: number } | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [groupe, setGroupe] = useState<any>(null);

  useEffect(() => {
    if (pathname !== "/etudiant") return;
    if (!user) {
      console.log("Pas d'utilisateur");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log("Début chargement pour user:", user.id);

        // 1. Récupérer le groupe de l'étudiant
        try {
          const groupeData = await getStudentGroupe({});
          console.log("Groupe:", groupeData);
          setGroupe(groupeData);
        } catch (e) {
          console.warn("Erreur groupe (non bloquante):", e);
        }

        // 2. Récupérer XP et niveau
        try {
          const xpResult = await getStudentXP({});
          console.log("XP:", xpResult);
          if (xpResult && xpResult.length > 0) {
            setXpData(xpResult[0]);
          }
        } catch (e) {
          console.warn("Erreur XP (non bloquante):", e);
        }

        // 3. Enregistrer la connexion (streak)
        try {
          const connexionResult = await recordConnexion({});
          console.log("Connexion:", connexionResult);
          setStreak(connexionResult.streak || 0);
        } catch (e) {
          console.warn("Erreur streak (non bloquante):", e);
        }

        // 4. Récupérer les notes
        try {
          const notesData = await getStudentNotes({});
          console.log("Notes:", notesData);
          setNotes(notesData || []);
        } catch (e) {
          console.warn("Erreur notes (non bloquante):", e);
        }

        // 5. Récupérer le classement
        try {
          const leaderboardData = await getLeaderboard({});
          console.log("Leaderboard:", leaderboardData);
          setLeaderboard(leaderboardData || []);
        } catch (e) {
          console.warn("Erreur leaderboard (non bloquante):", e);
        }

        // 6. Récupérer les parcours inscrits (requête directe)
        try {
          const { data: inscrits, error: e1 } = await supabase
            .from("parcours_etudiants")
            .select(`
              parcours_id,
              parcours (
                id,
                titre,
                mission_id
              )
            `)
            .eq("etudiant_id", user.id);

          if (e1) throw e1;
          console.log("Parcours inscrits:", inscrits);
          setParcoursInscrits(inscrits || []);
        } catch (e) {
          console.warn("Erreur parcours (non bloquante):", e);
        }

        // 7. Compter les badges (requête directe)
        try {
          const { count, error: e2 } = await supabase
            .from("badges_etudiants")
            .select("*", { count: "exact", head: true })
            .eq("etudiant_id", user.id);
          
          if (e2) throw e2;
          setBadgesCount(count || 0);
        } catch (e) {
          console.warn("Erreur badges (non bloquante):", e);
        }

      } catch (err: any) {
        console.error("Erreur fatale:", err);
        setError(err.message || "Erreur de chargement");
        toast.error("Erreur lors du chargement du tableau de bord");
      } finally {
        setLoading(false);
        console.log("Chargement terminé");
      }
    };

    fetchData();
  }, [pathname, user]);

  // Si la route n'est pas /etudiant, afficher le Outlet
  if (pathname !== "/etudiant") return <Outlet />;

  // === AFFICHAGE DES ERREURS ===
  if (error) {
    return (
      <AssirikShell title="📚 Tableau de bord">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Oups ! Une erreur est survenue</h2>
          <p className="text-muted-foreground max-w-md mb-4">{error}</p>
          <p className="text-sm text-muted-foreground mb-4">Vérifiez la console pour plus de détails</p>
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
      <AssirikShell title="📚 Tableau de bord">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Chargement de votre tableau de bord...</p>
        </div>
      </AssirikShell>
    );
  }

  // === AFFICHAGE NORMAL ===
  const moyenneGenerale = notes.length > 0
    ? Math.round(notes.reduce((acc: number, n: any) => acc + (n.note_finale || 0), 0) / notes.length)
    : 0;

  // Nombre de modules validés pour le calcul de progression
  const modulesValides = notes.filter((n) => (n.note_finale || 0) >= 70).length;
  const totalModules = notes.length || 1;
  const progressionGlobale = Math.round((modulesValides / totalModules) * 100);

  return (
    <AssirikShell title="📚 Tableau de bord Étudiant">
      <div className="space-y-6">
        {/* En-tête avec profil et XP */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-primary/20">
              <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">
                Bonjour {user?.user_metadata?.full_name || "Étudiant"} 👋
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Niveau {xpData?.niveau || 1}
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {streak} jours
                </span>
                <span className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-primary" />
                  {badgesCount} badges
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-amber-500" />
                  {moyenneGenerale}% de moyenne
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {xpData?.total_xp || 0} XP
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {progressionGlobale}%
            </Badge>
          </div>
        </div>

        {/* GROUPE - Version simplifiée */}
        {groupe && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {groupe.nom || "Groupe"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {groupe.groupe_membres?.length || 0} membres
                {groupe.rapporteur_id === user?.id && (
                  <Badge variant="secondary" className="ml-2">Rapporteur</Badge>
                )}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {groupe.groupe_membres?.slice(0, 5).map((m: any) => (
                  <Badge key={m.etudiant_id} variant="outline" className="text-xs">
                    {m.profiles?.full_name || "Inconnu"}
                    {m.etudiant_id === groupe.rapporteur_id && " ★"}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parcours */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Mes parcours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {parcoursInscrits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Vous n'êtes inscrit à aucun parcours.</p>
                <p className="text-sm">Contactez votre formateur pour vous inscrire.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {parcoursInscrits.map((p: any) => {
                  const parcoursNotes = notes.filter(
                    (n: any) => n.parcours_id === p.parcours_id
                  );
                  const valides = parcoursNotes.filter(
                    (n: any) => (n.note_finale || 0) >= 70
                  ).length;
                  const total = parcoursNotes.length || 1;
                  const progression = Math.round((valides / total) * 100);
                  
                  return (
                    <Card key={p.parcours_id} className="border-primary/5 hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{p.parcours?.titre || "Parcours"}</p>
                            <p className="text-xs text-muted-foreground">
                              {valides}/{total} modules validés
                            </p>
                          </div>
                          <Badge variant={progression >= 80 ? "default" : "secondary"}>
                            {progression}%
                          </Badge>
                        </div>
                        <Progress value={progression} className="h-1.5 mt-2" />
                        {progression < 100 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-3 w-full text-xs"
                            onClick={() => toast.info("Navigation vers le module")}
                          >
                            Continuer
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                        {progression >= 100 && (
                          <Badge variant="default" className="mt-3 w-full justify-center text-xs">
                            ✅ Parcours terminé
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Classement */}
        {leaderboard.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Classement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((item: any, index: number) => (
                  <div
                    key={item.etudiant_id}
                    className={`
                      flex items-center gap-3 p-2 rounded-lg
                      ${item.etudiant_id === user?.id ? "bg-primary/10 border border-primary/20" : ""}
                    `}
                  >
                    <span className={`
                      font-bold w-6 text-center text-sm
                      ${index === 0 ? "text-amber-500" : ""}
                      ${index === 1 ? "text-gray-400" : ""}
                      ${index === 2 ? "text-amber-700" : ""}
                    `}>
                      #{index + 1}
                    </span>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={item.profiles?.avatar_url || ""} />
                      <AvatarFallback className="text-[9px]">
                        {item.profiles?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm truncate">
                      {item.profiles?.full_name || "Inconnu"}
                      {item.etudiant_id === user?.id && (
                        <Badge variant="secondary" className="ml-2 text-[9px]">Vous</Badge>
                      )}
                    </span>
                    <span className="text-sm font-medium">
                      {item.total_xp} XP
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Niv. {item.niveau}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AssirikShell>
  );
}
