import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { PartenaireLeaderboard } from "@/components/partenaire-leaderboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  BookOpen, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Award,
  Download,
  ChevronRight,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/partenaire")({
  component: PartenaireDashboard,
});

function PartenaireDashboard() {
  useRoleGuard("partenaire");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [partenaireId, setPartenaireId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    missionsActives: 0,
    etudiants: 0,
    validationsEnAttente: 0,
    noteMoyenne: 0,
    tauxCompletion: 0,
    badgesTotal: 0,
  });
  const [missions, setMissions] = useState<any[]>([]);
  const [etudiantsRecents, setEtudiantsRecents] = useState<any[]>([]);

  useEffect(() => {
    if (pathname !== "/partenaire") return;
    if (!user) return;

    const fetchPartenaireData = async () => {
      setLoading(true);
      try {
        // Récupérer l'ID du partenaire
        const { data: profile } = await supabase
          .from("profiles")
          .select("partenaire_id")
          .eq("id", user.id)
          .single();

        if (!profile?.partenaire_id) {
          toast.error("Profil partenaire incomplet");
          setLoading(false);
          return;
        }

        setPartenaireId(profile.partenaire_id);

        // Récupérer les missions
        const { data: missionsData } = await supabase
          .from("missions")
          .select(`
            *,
            parcours (
              id,
              nom,
              parcours_etudiants (
                etudiant_id,
                profiles (
                  id,
                  full_name,
                  email
                )
              )
            )
          `)
          .eq("partenaire_id", profile.partenaire_id)
          .eq("statut", "active");

        setMissions(missionsData || []);

        // Calculer les stats
        let totalEtudiants = 0;
        let totalNotes = 0;
        let totalModules = 0;
        let totalBadges = 0;
        let validationsAttente = 0;

        for (const mission of missionsData || []) {
          for (const parcours of mission.parcours || []) {
            const etudiants = parcours.parcours_etudiants || [];
            totalEtudiants += etudiants.length;

            // Récupérer les notes des étudiants de ce parcours
            for (const pe of etudiants) {
              const { data: notes } = await supabase
                .from("notes_finales_module")
                .select("note_finale")
                .eq("etudiant_id", pe.etudiant_id)
                .eq("parcours_id", parcours.id);

              if (notes && notes.length > 0) {
                const moyenne = notes.reduce((acc, n) => acc + (n.note_finale ?? 0), 0) / notes.length;
                totalNotes += moyenne;
                totalModules += notes.length;
              }

              // Compter les badges
              const { count } = await supabase
                .from("badges_etudiants")
                .select("*", { count: "exact", head: true })
                .eq("etudiant_id", pe.etudiant_id);
              totalBadges += count || 0;

              // Validations en attente
              const { count: validationCount } = await supabase
                .from("reponses_etudiant")
                .select("*", { count: "exact", head: true })
                .eq("etudiant_id", pe.etudiant_id)
                .eq("statut", "soumis");
              validationsAttente += validationCount || 0;
            }
          }
        }

        // Récupérer les étudiants récents
        const { data: recents } = await supabase
          .from("parcours_etudiants")
          .select(`
            etudiant_id,
            created_at,
            profiles (
              id,
              full_name,
              avatar_url
            )
          `)
          .in("parcours_id", (missionsData || []).flatMap(
            (m) => m.parcours?.map((p: any) => p.id) || []
          ))
          .order("created_at", { ascending: false })
          .limit(5);

        setEtudiantsRecents(recents || []);

        setStats({
          missionsActives: missionsData?.length || 0,
          etudiants: totalEtudiants,
          validationsEnAttente: validationsAttente,
          noteMoyenne: totalModules > 0 ? Math.round(totalNotes / totalModules) : 0,
          tauxCompletion: totalEtudiants > 0 ? Math.round((totalModules / (totalEtudiants * 10)) * 100) : 0,
          badgesTotal: totalBadges,
        });

      } catch (error) {
        console.error("Erreur chargement données partenaire:", error);
        toast.error("Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchPartenaireData();
  }, [pathname, user]);

  if (pathname !== "/partenaire") return <Outlet />;

  return (
    <AssirikShell title="🏢 Tableau de bord Partenaire">
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-pulse">Chargement de votre tableau de bord...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.missionsActives}</p>
                  <p className="text-xs text-muted-foreground">Missions actives</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.etudiants}</p>
                  <p className="text-xs text-muted-foreground">Étudiants</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.validationsEnAttente}</p>
                  <p className="text-xs text-muted-foreground">Validations en attente</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Award className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.badgesTotal}</p>
                  <p className="text-xs text-muted-foreground">Badges attribués</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes et progression */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Performance globale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Note moyenne</span>
                      <span className="font-bold">{stats.noteMoyenne}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(stats.noteMoyenne, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taux de complétion</span>
                      <span className="font-bold">{Math.min(stats.tauxCompletion, 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.min(stats.tauxCompletion, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Derniers inscrits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {etudiantsRecents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun étudiant récent</p>
                ) : (
                  <div className="space-y-2">
                    {etudiantsRecents.map((e) => (
                      <div key={e.etudiant_id} className="flex items-center gap-3 py-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                          {e.profiles?.full_name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{e.profiles?.full_name || "Inconnu"}</p>
                          <p className="text-xs text-muted-foreground">
                            Inscrit le {new Date(e.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Missions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Missions en cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {missions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune mission active</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {missions.map((mission) => (
                    <Card key={mission.id} className="border-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{mission.titre}</p>
                            <p className="text-xs text-muted-foreground">
                              {mission.parcours?.length || 0} parcours
                            </p>
                          </div>
                          <Badge variant="default" className="text-[10px]">
                            Active
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>📅 {new Date(mission.deadline).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{mission.mode || "En ligne"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          {partenaireId && (
            <PartenaireLeaderboard partenaireId={partenaireId} />
          )}
        </div>
      )}
    </AssirikShell>
  );
}
