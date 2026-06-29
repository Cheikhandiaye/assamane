import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { EtudiantGroupeCard } from "@/components/etudiant-groupe-card";
import { EtudiantModuleProgress } from "@/components/etudiant-module-progress";
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
import { getStudentGroupe } from "@/lib/groupe.functions";
import { getStudentXP, recordConnexion, getLeaderboard } from "@/lib/xp.functions";
import { getStudentNotes } from "@/lib/notes.functions";

export const Route = createFileRoute("/_authenticated/etudiant")({
  component: EtudiantDashboard,
});

interface GroupeData {
  id: string;
  nom: string;
  rapporteur_id: string | null;
  parcours_id: string | null;
  parcours: {
    id: string;
    titre: string;  // ← CORRIGÉ : titre au lieu de nom
  } | null;
  groupe_membres: Array<{
    etudiant_id: string;
    profiles: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
  suivi_groupe_module: Array<{
    module_id: string;
    statut: string;
    date_debut: string;
    date_fin: string | null;
  }>;
}

interface XPData {
  id: string;
  total_xp: number | null;
  niveau: number | null;
}

interface NoteModule {
  module_id: string;
  parcours_id: string;
  note_finale: number | null;
  modules_cours: {
    titre: string;
    ordre: number;
  } | null;
}

function EtudiantDashboard() {
  useRoleGuard("etudiant");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();

  // États
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupe, setGroupe] = useState<GroupeData | null>(null);
  const [xpData, setXpData] = useState<XPData | null>(null);
  const [streak, setStreak] = useState(0);
  const [notes, setNotes] = useState<NoteModule[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [parcoursInscrits, setParcoursInscrits] = useState<any[]>([]);
  const [badgesCount, setBadgesCount] = useState(0);
  const [moduleActuel, setModuleActuel] = useState<{
    id: string;
    titre: string;
    ordre: number;
    total: number;
    etapes: any[];
  } | null>(null);

  // Charger toutes les données
  useEffect(() => {
    if (pathname !== "/etudiant") return;
    if (!user) return;

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 1. Récupérer le groupe de l'étudiant
        const groupeData = await getStudentGroupe({});
        setGroupe(groupeData as GroupeData | null);

        // 2. Récupérer XP et niveau
        const xpData = await getStudentXP({});
        if (xpData && xpData.length > 0) {
          setXpData(xpData[0]);
        }

        // 3. Enregistrer la connexion (streak)
        const connexionResult = await recordConnexion({});
        setStreak(connexionResult.streak || 0);

        // 4. Récupérer les notes
        const notesData = await getStudentNotes({});
        setNotes(notesData || []);

        // 5. Récupérer le classement
        const leaderboardData = await getLeaderboard({});
        setLeaderboard(leaderboardData || []);

        // 6. Récupérer les parcours inscrits
        const { data: inscrits } = await supabase
          .from("parcours_etudiants")
          .select(`
            parcours_id,
            parcours (
              id,
              titre,
              mission_id,
              modules_cours (
                id,
                titre,
                ordre
              )
            )
          `)
          .eq("etudiant_id", user.id);

        if (inscrits) {
          setParcoursInscrits(inscrits);
          
          // Trouver le premier parcours non terminé
          const parcoursEnCours = inscrits.find((p) => {
            const modules = p.parcours?.modules_cours || [];
            const modulesValides = modules.filter((m) => {
              // Vérifier si le module est validé via les notes
              return notesData?.some((n) => 
                n.module_id === m.id && (n.note_finale ?? 0) >= 70
              );
            });
            return modulesValides.length < modules.length;
          });

          if (parcoursEnCours && parcoursEnCours.parcours) {
            const modules = parcoursEnCours.parcours.modules_cours || [];
            const modulesValides = notesData?.filter(
              (n) => (n.note_finale ?? 0) >= 70
            ).map((n) => n.module_id) || [];
            
            // Trouver le prochain module non validé
            const prochainModule = modules.find(
              (m) => !modulesValides.includes(m.id)
            );

            if (prochainModule) {
              // Récupérer les étapes du module
              const { data: etapes } = await supabase
                .from("etapes")
                .select("*")
                .eq("module_id", prochainModule.id)
                .order("ordre", { ascending: true });

              // Récupérer le statut des étapes
              const etapesAvecStatut = await Promise.all(
                (etapes || []).map(async (e) => {
                  // Vérifier si l'étape est complétée
                  const { data: reponse } = await supabase
                    .from("reponses_etudiant")
                    .select("statut, note")
                    .eq("etudiant_id", user.id)
                    .eq("etape_id", e.id)
                    .maybeSingle();

                  let statut: "verrouille" | "en_cours" | "termine" | "bloque" = "verrouille";
                  
                  if (reponse?.statut === "valide") {
                    statut = "termine";
                  } else if (reponse?.statut === "soumis") {
                    statut = "en_cours";
                  } else if (reponse?.statut === "refuse") {
                    statut = "bloque";
                  } else {
                    // Par défaut, débloquer la première étape
                    statut = e.ordre === 1 ? "en_cours" : "verrouille";
                  }

                  return {
                    ...e,
                    statut,
                    note: reponse?.note,
                  };
                })
              );

              setModuleActuel({
                id: prochainModule.id,
                titre: prochainModule.titre,
                ordre: modules.findIndex((m) => m.id === prochainModule.id) + 1,
                total: modules.length,
                etapes: etapesAvecStatut,
              });
            }
          }
        }

        // 7. Compter les badges
        const { count } = await supabase
          .from("badges_etudiants")
          .select("*", { count: "exact", head: true })
          .eq("etudiant_id", user.id);
        setBadgesCount(count || 0);

      } catch (err: any) {
        console.error("Erreur chargement dashboard:", err);
        setError(err.message || "Erreur de chargement");
        toast.error("Erreur lors du chargement du tableau de bord");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
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
    ? Math.round(notes.reduce((acc, n) => acc + (n.note_finale ?? 0), 0) / notes.length)
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

        {/* Groupe ou Parcours */}
        {groupe ? (
          <EtudiantGroupeCard 
            groupe={groupe}
            userId={user?.id || ""}
            moduleActuel={moduleActuel ? {
              id: moduleActuel.id,
              titre: moduleActuel.titre,
              ordre: moduleActuel.ordre,
              total: moduleActuel.total
            } : undefined}
          />
        ) : (
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
                    const modules = p.parcours?.modules_cours || [];
                    const modulesValides = notes.filter(
                      (n) => (n.note_finale ?? 0) >= 70
                    ).map((n) => n.module_id);
                    const progression = modules.length > 0 
                      ? Math.round((modules.filter((m: any) => modulesValides.includes(m.id)).length / modules.length) * 100)
                      : 0;
                    
                    return (
                      <Card key={p.parcours_id} className="border-primary/5 hover:border-primary/20 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{p.parcours?.titre || "Parcours"}</p>
                              <p className="text-xs text-muted-foreground">
                                {modulesValides.length}/{modules.length} modules
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
                              className="mt-2 w-full text-xs"
                              onClick={() => {
                                const firstModule = modules.find(
                                  (m: any) => !modulesValides.includes(m.id)
                                );
                                if (firstModule) {
                                  toast.info(`Navigation vers: ${firstModule.titre}`);
                                }
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
        )}

        {/* Module en cours */}
        {moduleActuel && (
          <EtudiantModuleProgress
            etapes={moduleActuel.etapes}
            moduleTitre={moduleActuel.titre}
            moduleOrdre={moduleActuel.ordre}
            totalModules={moduleActuel.total}
            noteFinale={notes.find(
              (n) => n.module_id === moduleActuel.id
            )?.note_finale ?? undefined}
            isGroupe={!!groupe}
            isRapporteur={groupe?.rapporteur_id === user?.id}
          />
        )}

        {/* Classement */}
        {leaderboard.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Classement
                <Badge variant="secondary" className="text-[10px]">
                  Top {leaderboard.length}
                </Badge>
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
