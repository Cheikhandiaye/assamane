import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, CheckSquare, CalendarCheck, Layers, UsersRound, Plus } from "lucide-react";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  getProfessorGroupes,
  createGroupe,
  updateGroupeRapporteur,
  addMembreToGroupe,
  removeMembreFromGroupe,
} from "@/lib/groupe.functions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/_authenticated/professeur")({
  component: ProfDashboard,
});

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
  created_at: string;
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

interface ParcoursOption {
  id: string;
  nom: string;
}

function ProfDashboard() {
  useRoleGuard("professeur");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<{ label: string; value: number; icon: typeof BookOpen }[]>([]);
  
  // États pour les groupes
  const [groupes, setGroupes] = useState<GroupeData[]>([]);
  const [loadingGroupes, setLoadingGroupes] = useState(true);
  const [parcoursOptions, setParcoursOptions] = useState<ParcoursOption[]>([]);
  const [etudiantsOptions, setEtudiantsOptions] = useState<{ id: string; full_name: string }[]>([]);
  
  // États pour le formulaire de création de groupe
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGroupeNom, setNewGroupeNom] = useState("");
  const [newGroupeParcoursId, setNewGroupeParcoursId] = useState("");
  const [newGroupeRapporteurId, setNewGroupeRapporteurId] = useState("");
  const [selectedEtudiants, setSelectedEtudiants] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // États pour la gestion des membres
  const [gestionGroupeId, setGestionGroupeId] = useState<string | null>(null);
  const [gestionDialogOpen, setGestionDialogOpen] = useState(false);
  const [gestionEtudiants, setGestionEtudiants] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedRemoveEtudiant, setSelectedRemoveEtudiant] = useState<string>("");

  const fetchGroupes = async () => {
    setLoadingGroupes(true);
    try {
      const data = await getProfessorGroupes({});
      setGroupes(data || []);
    } catch (error) {
      console.error("Erreur chargement groupes:", error);
      toast.error("Impossible de charger les groupes");
    } finally {
      setLoadingGroupes(false);
    }
  };

  const fetchParcoursOptions = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("parcours_professeurs")
        .select("parcours_id, parcours(id, nom)")
        .eq("professeur_id", user.id);
      
      if (data) {
        const options = data
          .map((p) => p.parcours)
          .filter((p): p is { id: string; nom: string } => p !== null);
        setParcoursOptions(options);
      }
    } catch (error) {
      console.error("Erreur chargement parcours:", error);
    }
  };

  const fetchEtudiantsForParcours = async (parcoursId: string) => {
    if (!parcoursId) return;
    try {
      const { data } = await supabase
        .from("parcours_etudiants")
        .select("etudiant_id, profiles(id, full_name)")
        .eq("parcours_id", parcoursId);
      
      if (data) {
        const etudiants = data
          .map((p) => p.profiles)
          .filter((p): p is { id: string; full_name: string } => p !== null);
        setEtudiantsOptions(etudiants);
      }
    } catch (error) {
      console.error("Erreur chargement étudiants:", error);
    }
  };

  // Charger les groupes et parcours au montage
  useEffect(() => {
    if (pathname === "/professeur") {
      fetchGroupes();
      fetchParcoursOptions();
    }
  }, [pathname, user]);

  // Charger les étudiants quand le parcours change
  useEffect(() => {
    if (newGroupeParcoursId) {
      fetchEtudiantsForParcours(newGroupeParcoursId);
    } else {
      setEtudiantsOptions([]);
    }
  }, [newGroupeParcoursId]);

  // Stats existantes
  useEffect(() => {
    if (pathname !== "/professeur") return;
    if (!user) return;
    (async () => {
      const { data: pp } = await supabase.from("parcours_professeurs").select("parcours_id").eq("professeur_id", user.id);
      const parcoursIds = (pp ?? []).map((p) => p.parcours_id);
      const [{ count: nbModules }, { count: nbValidations }, { count: nbSessions }] = await Promise.all([
        supabase.from("modules_cours").select("*", { count: "exact", head: true }).eq("created_by", user.id),
        supabase.from("reponses_etudiant").select("*", { count: "exact", head: true }).eq("statut", "soumis"),
        supabase.from("sessions_cours").select("*", { count: "exact", head: true }).eq("professeur_id", user.id).eq("statut", "ouverte"),
      ]);
      let nbEtudiants = 0;
      if (parcoursIds.length) {
        const { count } = await supabase.from("parcours_etudiants").select("*", { count: "exact", head: true }).in("parcours_id", parcoursIds);
        nbEtudiants = count ?? 0;
      }
      setStats([
        { label: "Mes parcours", value: parcoursIds.length, icon: BookOpen },
        { label: "Mes étudiants", value: nbEtudiants, icon: Users },
        { label: "Mes modules", value: nbModules ?? 0, icon: Layers },
        { label: "Validations en attente", value: nbValidations ?? 0, icon: CheckSquare },
        { label: "Sessions ouvertes", value: nbSessions ?? 0, icon: CalendarCheck },
      ]);
    })();
  }, [pathname, user]);

  // === Fonctions de gestion des groupes ===

  const handleCreateGroupe = async () => {
    if (!newGroupeNom.trim()) {
      toast.error("Veuillez donner un nom au groupe");
      return;
    }
    if (!newGroupeParcoursId) {
      toast.error("Veuillez sélectionner un parcours");
      return;
    }
    if (selectedEtudiants.length < 2) {
      toast.error("Un groupe doit avoir au moins 2 étudiants");
      return;
    }
    if (!newGroupeRapporteurId) {
      toast.error("Veuillez désigner un rapporteur");
      return;
    }

    setIsSubmitting(true);
    try {
      await createGroupe({
        data: {
          nom: newGroupeNom.trim(),
          parcours_id: newGroupeParcoursId,
          etudiant_ids: selectedEtudiants,
          rapporteur_id: newGroupeRapporteurId,
        },
      });
      
      toast.success("Groupe créé avec succès !");
      setDialogOpen(false);
      setNewGroupeNom("");
      setNewGroupeParcoursId("");
      setNewGroupeRapporteurId("");
      setSelectedEtudiants([]);
      await fetchGroupes();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du groupe");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMembre = async (groupeId: string, etudiantId: string) => {
    try {
      await removeMembreFromGroupe({ data: { groupe_id: groupeId, etudiant_id: etudiantId } });
      toast.success("Étudiant retiré du groupe");
      await fetchGroupes();
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    }
  };

  const handleAddMembre = async (groupeId: string, etudiantId: string) => {
    if (!etudiantId) {
      toast.error("Veuillez sélectionner un étudiant");
      return;
    }
    try {
      await addMembreToGroupe({ data: { groupe_id: groupeId, etudiant_id: etudiantId } });
      toast.success("Étudiant ajouté au groupe");
      setGestionDialogOpen(false);
      await fetchGroupes();
    } catch (error: any) {
      toast.error(error.message || "Erreur");
    }
  };

  const handleChangeRapporteur = async (groupeId: string, rapporteurId: string) => {
    try {
      await updateGroupeRapporteur({ data: { groupe_id: groupeId, rapporteur_id: rapporteurId } });
      toast.success("Rapporteur mis à jour");
      await fetchGroupes();
    } catch (error: any) {
      toast.error(error.message || "Erreur");
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

  const getProgressionGroupe = (groupe: GroupeData) => {
    const total = groupe.suivi_groupe_module?.length || 0;
    const valides = groupe.suivi_groupe_module?.filter((m) => m.statut === "valide").length || 0;
    return total > 0 ? Math.round((valides / total) * 100) : 0;
  };

  if (pathname !== "/professeur") return <Outlet />;

  return (
    <AssirikShell title="🎓 Tableau de bord Professeur">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-card p-5 shadow-sm">
              <Icon size={20} className="text-primary" />
              <p className="mt-3 text-3xl font-black">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Section Groupes */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            Groupes
          </h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Créer un groupe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un groupe</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom du groupe</Label>
                  <Input
                    id="nom"
                    placeholder="Ex: Équipe Alpha"
                    value={newGroupeNom}
                    onChange={(e) => setNewGroupeNom(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parcours">Parcours</Label>
                  <Select
                    value={newGroupeParcoursId}
                    onValueChange={(value) => {
                      setNewGroupeParcoursId(value);
                      setNewGroupeRapporteurId("");
                      setSelectedEtudiants([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un parcours" />
                    </SelectTrigger>
                    <SelectContent>
                      {parcoursOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newGroupeParcoursId && (
                  <>
                    <div className="space-y-2">
                      <Label>Étudiants (sélectionnez au moins 2)</Label>
                      <ScrollArea className="h-48 border rounded-md p-2">
                        {etudiantsOptions.map((e) => (
                          <div key={e.id} className="flex items-center gap-2 py-1">
                            <input
                              type="checkbox"
                              id={`etudiant-${e.id}`}
                              checked={selectedEtudiants.includes(e.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEtudiants([...selectedEtudiants, e.currentTarget.value]);
                                } else {
                                  setSelectedEtudiants(selectedEtudiants.filter((id) => id !== e.currentTarget.value));
                                  if (newGroupeRapporteurId === e.currentTarget.value) {
                                    setNewGroupeRapporteurId("");
                                  }
                                }
                              }}
                            />
                            <Label htmlFor={`etudiant-${e.id}`} className="text-sm cursor-pointer">
                              {e.full_name}
                            </Label>
                          </div>
                        ))}
                      </ScrollArea>
                      <p className="text-xs text-muted-foreground">
                        {selectedEtudiants.length} étudiant(s) sélectionné(s)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rapporteur">Rapporteur du groupe</Label>
                      <Select
                        value={newGroupeRapporteurId}
                        onValueChange={setNewGroupeRapporteurId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le rapporteur" />
                        </SelectTrigger>
                        <SelectContent>
                          {etudiantsOptions
                            .filter((e) => selectedEtudiants.includes(e.id))
                            .map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.full_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <Button
                  className="w-full mt-4"
                  onClick={handleCreateGroupe}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Création..." : "Créer le groupe"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loadingGroupes ? (
          <div className="text-center py-8 text-muted-foreground">Chargement des groupes...</div>
        ) : groupes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            <UsersRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p>Aucun groupe créé pour vos parcours.</p>
            <p className="text-sm">Créez votre premier groupe pour commencer le travail collaboratif.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupes.map((g) => {
              const progression = getProgressionGroupe(g);
              const isRapporteur = g.rapporteur_id === user?.id;
              
              return (
                <Card key={g.id} className="border-primary/10">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {g.nom}
                          <Badge variant="outline" className="text-xs">
                            {g.groupe_membres?.length || 0} membres
                          </Badge>
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {g.parcours?.nom || "Parcours inconnu"}
                        </p>
                      </div>
                      <Badge variant={progression >= 80 ? "default" : "secondary"}>
                        {progression}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {g.groupe_membres?.map((m) => (
                        <div key={m.etudiant_id} className="flex items-center gap-1 bg-muted/50 rounded-full pl-1 pr-2 py-0.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={m.profiles?.avatar_url || ""} />
                            <AvatarFallback className="text-[10px] bg-primary/10">
                              {m.profiles?.full_name ? getInitials(m.profiles.full_name) : "??"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">
                            {m.profiles?.full_name?.split(" ")[0] || "Inconnu"}
                            {m.etudiant_id === g.rapporteur_id && (
                              <span className="text-amber-500 ml-0.5">★</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setGestionGroupeId(g.id);
                          setGestionDialogOpen(true);
                          setGestionEtudiants(
                            etudiantsOptions.filter(
                              (e) => !g.groupe_membres?.some((m) => m.etudiant_id === e.id)
                            )
                          );
                          setSelectedRemoveEtudiant("");
                        }}
                      >
                        Gérer
                      </Button>
                      {g.groupe_membres && g.groupe_membres.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const currentRapporteur = g.rapporteur_id;
                            const autreMembre = g.groupe_membres.find(
                              (m) => m.etudiant_id !== currentRapporteur
                            );
                            if (autreMembre) {
                              await handleChangeRapporteur(g.id, autreMembre.etudiant_id);
                            }
                          }}
                        >
                          Changer rapporteur
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de gestion des membres */}
      <Dialog open={gestionDialogOpen} onOpenChange={setGestionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gérer les membres</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ajouter un étudiant</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedRemoveEtudiant}
                  onValueChange={setSelectedRemoveEtudiant}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner un étudiant" />
                  </SelectTrigger>
                  <SelectContent>
                    {gestionEtudiants.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => {
                    if (gestionGroupeId && selectedRemoveEtudiant) {
                      handleAddMembre(gestionGroupeId, selectedRemoveEtudiant);
                    }
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Membres actuels</Label>
              {groupes
                .find((g) => g.id === gestionGroupeId)
                ?.groupe_membres?.map((m) => (
                  <div key={m.etudiant_id} className="flex items-center justify-between py-1 border-b last:border-0">
                    <span className="text-sm">
                      {m.profiles?.full_name || "Inconnu"}
                      {m.etudiant_id === groupes.find((g) => g.id === gestionGroupeId)?.rapporteur_id && (
                        <Badge variant="outline" className="ml-2 text-xs">Rapporteur</Badge>
                      )}
                    </span>
                    {m.etudiant_id !== groupes.find((g) => g.id === gestionGroupeId)?.rapporteur_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 h-6 w-6 p-0"
                        onClick={() => {
                          if (gestionGroupeId) {
                            handleRemoveMembre(gestionGroupeId, m.etudiant_id);
                          }
                        }}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AssirikShell>
  );
}
