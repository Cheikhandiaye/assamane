import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import {
  getProfessorGroupes,
  createGroupe,
  updateGroupeRapporteur,
  addMembreToGroupe,
  removeMembreFromGroupe,
} from "@/lib/groupe.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UsersRound, Plus, UserMinus, UserPlus, Star, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
    titre: string;
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
  titre: string;
}

export function ProfesseurGroupesList() {
  const { user } = useCurrentUser();
  
  // États pour les groupes
  const [groupes, setGroupes] = useState<GroupeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [parcoursOptions, setParcoursOptions] = useState<ParcoursOption[]>([]);
  const [etudiantsOptions, setEtudiantsOptions] = useState<{ id: string; full_name: string }[]>([]);
  
  // États pour le formulaire de création de groupe
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupeNom, setNewGroupeNom] = useState("");
  const [newGroupeParcoursId, setNewGroupeParcoursId] = useState("");
  const [newGroupeRapporteurId, setNewGroupeRapporteurId] = useState("");
  const [selectedEtudiants, setSelectedEtudiants] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // États pour la gestion des membres
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [manageGroupeId, setManageGroupeId] = useState<string | null>(null);
  const [availableEtudiants, setAvailableEtudiants] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedAddEtudiant, setSelectedAddEtudiant] = useState<string>("");

  // Charger les groupes
  const fetchGroupes = async () => {
    setLoading(true);
    try {
      const data = await getProfessorGroupes({});
      setGroupes(data || []);
    } catch (error) {
      console.error("Erreur chargement groupes:", error);
      toast.error("Impossible de charger les groupes");
    } finally {
      setLoading(false);
    }
  };

  // Charger les parcours du professeur
  const fetchParcoursOptions = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("parcours_professeurs")
        .select("parcours_id, parcours(id, titre)")
        .eq("professeur_id", user.id);
      
      if (data) {
        const options = data
          .map((p) => p.parcours)
          .filter((p): p is { id: string; titre: string } => p !== null);
        setParcoursOptions(options);
      }
    } catch (error) {
      console.error("Erreur chargement parcours:", error);
    }
  };

  // Charger les étudiants d'un parcours
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

  // Charger les étudiants disponibles pour un groupe (non déjà membres)
  const fetchAvailableEtudiants = async (groupeId: string, parcoursId: string) => {
    try {
      // Récupérer les membres du groupe
      const { data: membres } = await supabase
        .from("groupe_membres")
        .select("etudiant_id")
        .eq("groupe_id", groupeId);

      const membresIds = membres?.map((m) => m.etudiant_id) || [];

      // Récupérer tous les étudiants du parcours
      const { data } = await supabase
        .from("parcours_etudiants")
        .select("etudiant_id, profiles(id, full_name)")
        .eq("parcours_id", parcoursId);

      if (data) {
        const disponibles = data
          .map((p) => p.profiles)
          .filter((p): p is { id: string; full_name: string } => 
            p !== null && !membresIds.includes(p.id)
          );
        setAvailableEtudiants(disponibles);
      }
    } catch (error) {
      console.error("Erreur chargement étudiants disponibles:", error);
    }
  };

  // Charger les données initiales
  useEffect(() => {
    fetchGroupes();
    fetchParcoursOptions();
  }, []);

  // Charger les étudiants quand le parcours change
  useEffect(() => {
    if (newGroupeParcoursId) {
      fetchEtudiantsForParcours(newGroupeParcoursId);
    } else {
      setEtudiantsOptions([]);
    }
  }, [newGroupeParcoursId]);

  // === Actions des groupes ===

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
      setCreateDialogOpen(false);
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
      // Rafraîchir les disponibles si la boîte de dialogue est ouverte
      const groupe = groupes.find((g) => g.id === groupeId);
      if (groupe) {
        await fetchAvailableEtudiants(groupeId, groupe.parcours_id);
      }
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
      setSelectedAddEtudiant("");
      await fetchGroupes();
      // Rafraîchir les disponibles
      const groupe = groupes.find((g) => g.id === groupeId);
      if (groupe) {
        await fetchAvailableEtudiants(groupeId, groupe.parcours_id);
      }
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

  const handleOpenManageDialog = async (groupe: GroupeData) => {
    setManageGroupeId(groupe.id);
    await fetchAvailableEtudiants(groupe.id, groupe.parcours_id);
    setSelectedAddEtudiant("");
    setManageDialogOpen(true);
  };

  // === Utilitaires d'affichage ===

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

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "valide": return "text-green-500";
      case "bloque": return "text-red-500";
      case "en_attente_validation": return "text-amber-500";
      default: return "text-blue-500";
    }
  };

  // === Rendu ===

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <UsersRound className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3 animate-pulse" />
        <p>Chargement des groupes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton de création */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            Groupes d'étudiants
            <Badge variant="secondary" className="ml-2">
              {groupes.length}
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            Gérez les groupes pour le travail collaboratif
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau groupe
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
                  placeholder="Ex: Équipe Alpha, Groupe 1, Projet A..."
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
                        {p.titre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newGroupeParcoursId && etudiantsOptions.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Étudiants (sélectionnez au moins 2)</Label>
                    <ScrollArea className="h-48 border rounded-md p-2">
                      {etudiantsOptions.map((e) => (
                        <label
                          key={e.id}
                          className="flex items-center gap-3 py-1.5 px-2 hover:bg-muted/50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEtudiants.includes(e.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEtudiants([...selectedEtudiants, e.id]);
                              } else {
                                setSelectedEtudiants(selectedEtudiants.filter((id) => id !== e.id));
                                if (newGroupeRapporteurId === e.id) {
                                  setNewGroupeRapporteurId("");
                                }
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{e.full_name}</span>
                        </label>
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
                              {e.full_name} ★
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Le rapporteur est le seul autorisé à soumettre les carnets du groupe
                    </p>
                  </div>
                </>
              )}

              {newGroupeParcoursId && etudiantsOptions.length === 0 && (
                <div className="text-center py-4 text-muted-foreground border rounded-lg">
                  <p>Aucun étudiant inscrit dans ce parcours</p>
                  <p className="text-sm">Inscrivez d'abord des étudiants au parcours</p>
                </div>
              )}

              <Button
                className="w-full mt-4"
                onClick={handleCreateGroupe}
                disabled={isSubmitting || !newGroupeParcoursId || etudiantsOptions.length === 0}
              >
                {isSubmitting ? "Création en cours..." : "Créer le groupe"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des groupes */}
      {groupes.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <UsersRound className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Aucun groupe</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Créez votre premier groupe pour permettre aux étudiants de travailler en équipe sur leurs projets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groupes.map((g) => {
            const progression = getProgressionGroupe(g);
            const isRapporteur = g.rapporteur_id === user?.id;
            
            return (
              <Card key={g.id} className="border-primary/5 hover:border-primary/20 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {g.nom}
                        <Badge variant="outline" className="text-xs font-normal">
                          {g.groupe_membres?.length || 0} membres
                        </Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {g.parcours?.titre || "Parcours inconnu"}
                        <span className="mx-1.5">•</span>
                        {g.suivi_groupe_module?.length || 0} modules
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant={progression >= 80 ? "default" : progression >= 50 ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {progression}%
                      </Badge>
                      {isRapporteur && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                          ★ Rapporteur
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Membres du groupe */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {g.groupe_membres?.map((m) => (
                      <div
                        key={m.etudiant_id}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full pl-0.5 pr-2.5 py-0.5 text-xs",
                          m.etudiant_id === g.rapporteur_id
                            ? "bg-amber-50 border border-amber-200"
                            : "bg-muted/50 border border-transparent"
                        )}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={m.profiles?.avatar_url || ""} />
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {m.profiles?.full_name ? getInitials(m.profiles.full_name) : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[80px]">
                          {m.profiles?.full_name?.split(" ")[0] || "Inconnu"}
                        </span>
                        {m.etudiant_id === g.rapporteur_id && (
                          <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleOpenManageDialog(g)}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Gérer
                    </Button>
                    
                    {g.groupe_membres && g.groupe_membres.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={async () => {
                          // Changer le rapporteur vers le prochain membre
                          const currentRapporteur = g.rapporteur_id;
                          const autreMembre = g.groupe_membres.find(
                            (m) => m.etudiant_id !== currentRapporteur
                          );
                          if (autreMembre) {
                            await handleChangeRapporteur(g.id, autreMembre.etudiant_id);
                          }
                        }}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Changer rapporteur
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 ml-auto"
                      onClick={() => {
                        // Navigation vers la vue du groupe (à implémenter plus tard)
                        toast.info("Vue détaillée du groupe en cours de développement");
                      }}
                    >
                      Voir plus
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogue de gestion des membres */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gérer les membres du groupe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Ajouter un membre */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Ajouter un étudiant</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedAddEtudiant}
                  onValueChange={setSelectedAddEtudiant}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choisir un étudiant" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEtudiants.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Aucun étudiant disponible
                      </div>
                    ) : (
                      availableEtudiants.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={() => {
                    if (manageGroupeId && selectedAddEtudiant) {
                      handleAddMembre(manageGroupeId, selectedAddEtudiant);
                    }
                  }}
                  disabled={!selectedAddEtudiant}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Liste des membres actuels */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Membres actuels</Label>
              <ScrollArea className="max-h-48">
                {groupes
                  .find((g) => g.id === manageGroupeId)
                  ?.groupe_membres?.map((m) => (
                    <div
                      key={m.etudiant_id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={m.profiles?.avatar_url || ""} />
                          <AvatarFallback className="text-[9px]">
                            {m.profiles?.full_name ? getInitials(m.profiles.full_name) : "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {m.profiles?.full_name || "Inconnu"}
                        </span>
                        {m.etudiant_id === groupes.find((g) => g.id === manageGroupeId)?.rapporteur_id && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">
                            Rapporteur
                          </Badge>
                        )}
                      </div>
                      {m.etudiant_id !== groupes.find((g) => g.id === manageGroupeId)?.rapporteur_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            if (manageGroupeId) {
                              handleRemoveMembre(manageGroupeId, m.etudiant_id);
                            }
                          }}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
