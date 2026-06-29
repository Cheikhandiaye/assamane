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
  Users,
  Star,
  Flame,
  Trophy,
  ChevronRight,
  AlertCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    if (pathname !== "/etudiant") return;
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Récupérer les parcours inscrits
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

        if (e1) throw new Error(`Erreur parcours: ${e1.message}`);
        setParcoursInscrits(inscrits || []);

        // 2. Récupérer les badges
        const { count, error: e2 } = await supabase
          .from("badges_etudiants")
          .select("*", { count: "exact", head: true })
          .eq("etudiant_id", user.id);
        
        if (e2) throw new Error(`Erreur badges: ${e2.message}`);
        setBadgesCount(count || 0);

        // 3. Récupérer XP
        const { data: xp, error: e3 } = await supabase
          .from("xp_etudiants")
          .select("total_xp, niveau")
          .eq("etudiant_id", user.id)
          .maybeSingle();
        
        if (e3) throw new Error(`Erreur XP: ${e3.message}`);
        setXpData(xp || { total_xp: 0, niveau: 1 });

        // 4. Récupérer les notes
        const { data: notesData, error: e4 } = await supabase
          .from("notes_finales_module")
          .select("module_id, parcours_id, note_finale")
          .eq("etudiant_id", user.id);
        
        if (e4) throw new Error(`Erreur notes: ${e4.message}`);
        setNotes(notesData || []);

        // 5. Récupérer le streak (connexions)
        const { data: connexion, error: e5 } = await supabase
          .from("connexions")
          .select("streak")
          .eq("etudiant_id", user.id)
          .order("date", { ascending: false })
          .limit(1);
        
        if (e5) throw new Error(`Erreur streak: ${e5.message}`);
        setStreak(connexion?.[0]?.streak || 0);

        // 6. Récupérer le classement
        try {
          const { data: top } = await supabase
            .from("xp_etudiants")
            .select(`
              etudiant_id,
              total_xp,
              niveau,
              profiles!inner (
                id,
                full_name,
                avatar_url
              )
            `)
            .order("total_xp", { ascending: false })
            .limit(5);
          
          setLeaderboard(top || []);
        } catch (e) {
          // Non bloquant
          console.warn("Leaderboard non disponible");
        }

      } catch (err: any) {
        console.error("Erreur chargement dashboard:", err);
        setError(err.message || "Erreur de chargement");
        toast.error("Erreur lors du chargement du tableau de bord");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pathname, user]);

  if (pathname !== "/etudiant") return <Outlet />;

  // === AFFICHAGE DES ERREURS ===
  if (error) {
    return (
      <AssirikShell title="📚 Tableau de bord">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Oups ! Une erreur est survenue</h2>
          <p className="text-muted-foreground max-w-md mb-4">{error}</p>
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
    ? Math.round(notes.reduce((acc, n) => acc + (n.note_finale || 0), 0) / notes.length)
    : 0;

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
          <Badge variant="outline" className="text-sm px-3 py-1">
            {xpData?.total_xp || 0} XP
          </Badge>
        </div>

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
                {parcoursInscrits.map((p) => {
                  const modulesNotes = notes.filter(
                    (n) => n.parcours_id === p.parcours_id
                  );
                  const modulesValides = modulesNotes.filter(
                    (n) => (n.note_finale || 0) >= 70
                  ).length;
                  const totalModules = modulesNotes.length || 1;
                  const progression = Math.round((modulesValides / totalModules) * 100);
                  
                  return (
                    <Card key={p.parcours_id} className="border-primary/5 hover:border-primary/20 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{p.parcours?.titre || "Parcours"}</p>
                            <p className="text-xs text-muted-foreground">
                              {modulesValides}/{totalModules} modules validés
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
                            onClick={() => {
                              toast.info("Navigation vers le prochain module");
                            }}
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
                {leaderboard.slice(0, 5).map((item, index) => (
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
