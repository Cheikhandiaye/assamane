import { useEffect, useState } from "react";
import {
  getProfessorGroupes,
  createGroupe,
  addMembreToGroupe,
  removeMembreFromGroupe,
  updateGroupeRapporteur,
} from "@/lib/groupe.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Star, UserMinus, UserPlus, UsersRound } from "lucide-react";
import { toast } from "sonner";

interface EtudiantOption { id: string; full_name: string }

interface GroupeMembre {
  etudiant_id: string;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
}
interface GroupeData {
  id: string;
  nom: string;
  rapporteur_id: string | null;
  parcours_id: string | null;
  groupe_membres: GroupeMembre[];
}

export function ParcoursGroupesDialog({
  parcoursId,
  parcoursNom,
  etudiants,
  open,
  onOpenChange,
}: {
  parcoursId: string | null;
  parcoursNom: string;
  etudiants: EtudiantOption[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [groupes, setGroupes] = useState<GroupeData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Formulaire de création
  const [nom, setNom] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [rapporteur, setRapporteur] = useState("");

  // Ajout de membre (par groupe)
  const [addChoice, setAddChoice] = useState<Record<string, string>>({});

  async function load() {
    if (!parcoursId) return;
    setLoading(true);
    try {
      const all = (await getProfessorGroupes({})) as GroupeData[];
      setGroupes((all || []).filter((g) => g.parcours_id === parcoursId));
    } catch (e) {
      console.error(e);
      toast.error("Impossible de charger les groupes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && parcoursId) {
      setNom(""); setSelected([]); setRapporteur(""); setAddChoice({});
      load();
    }
  }, [open, parcoursId]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
      if (!next.includes(rapporteur)) setRapporteur("");
      return next;
    });
  }

  async function handleCreate() {
    if (!nom.trim()) return toast.error("Donne un nom au groupe");
    if (selected.length < 2) return toast.error("Au moins 2 étudiants");
    if (!rapporteur) return toast.error("Désigne un rapporteur");
    setSubmitting(true);
    try {
      await createGroupe({
        data: { nom: nom.trim(), parcours_id: parcoursId, etudiant_ids: selected, rapporteur_id: rapporteur },
      });
      toast.success("Groupe créé");
      setNom(""); setSelected([]); setRapporteur("");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdd(groupeId: string) {
    const etu = addChoice[groupeId];
    if (!etu) return;
    try {
      await addMembreToGroupe({ data: { groupe_id: groupeId, etudiant_id: etu } });
      setAddChoice((m) => ({ ...m, [groupeId]: "" }));
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    }
  }

  async function handleRemove(groupeId: string, etudiantId: string) {
    try {
      await removeMembreFromGroupe({ data: { groupe_id: groupeId, etudiant_id: etudiantId } });
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    }
  }

  async function handleRapporteur(groupeId: string, etudiantId: string) {
    try {
      await updateGroupeRapporteur({ data: { groupe_id: groupeId, rapporteur_id: etudiantId } });
      toast.success("Rapporteur mis à jour");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    }
  }

  function nameOf(id: string) {
    return etudiants.find((e) => e.id === id)?.full_name ?? "Étudiant";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound size={18} className="text-primary" />
            Groupes — {parcoursNom}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <Loader2 className="mx-auto my-8 animate-spin text-primary" />
        ) : (
          <div className="space-y-6">
            {/* Création */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Plus size={15} className="text-primary" /> Nouveau groupe
              </h3>

              {etudiants.length < 2 ? (
                <p className="text-sm text-muted-foreground">
                  Il faut au moins 2 étudiants inscrits au parcours pour former un groupe.
                </p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Nom du groupe</Label>
                    <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Équipe Alpha" />
                  </div>

                  <div>
                    <Label className="text-xs">Étudiants (au moins 2)</Label>
                    <ScrollArea className="mt-1 h-40 rounded-md border border-border p-2">
                      {etudiants.map((e) => (
                        <label key={e.id} className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={selected.includes(e.id)}
                            onChange={() => toggle(e.id)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm">{e.full_name}</span>
                        </label>
                      ))}
                    </ScrollArea>
                    <p className="mt-1 text-xs text-muted-foreground">{selected.length} sélectionné(s)</p>
                  </div>

                  {selected.length >= 2 && (
                    <div>
                      <Label className="text-xs">Rapporteur (parmi les sélectionnés)</Label>
                      <Select value={rapporteur} onValueChange={setRapporteur}>
                        <SelectTrigger><SelectValue placeholder="Choisir le rapporteur" /></SelectTrigger>
                        <SelectContent>
                          {selected.map((id) => (
                            <SelectItem key={id} value={id}>{nameOf(id)} ★</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Le rapporteur est le seul autorisé à soumettre les carnets du groupe.
                      </p>
                    </div>
                  )}

                  <Button onClick={handleCreate} disabled={submitting} className="w-full">
                    {submitting ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                    Créer le groupe
                  </Button>
                </div>
              )}
            </div>

            {/* Liste des groupes du parcours */}
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Groupes du parcours <span className="text-muted-foreground">({groupes.length})</span>
              </h3>
              {groupes.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  Aucun groupe pour l'instant.
                </p>
              ) : (
                <div className="space-y-3">
                  {groupes.map((g) => {
                    const memberIds = (g.groupe_membres ?? []).map((m) => m.etudiant_id);
                    const available = etudiants.filter((e) => !memberIds.includes(e.id));
                    return (
                      <div key={g.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-2 flex items-center gap-2">
                          <strong className="text-sm">{g.nom}</strong>
                          <Badge variant="outline" className="text-[10px]">{memberIds.length} membres</Badge>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {(g.groupe_membres ?? []).map((m) => {
                            const isRapp = m.etudiant_id === g.rapporteur_id;
                            return (
                              <span
                                key={m.etudiant_id}
                                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${isRapp ? "border-amber-200 bg-amber-50 text-amber-700" : "border-transparent bg-muted/50"}`}
                              >
                                {isRapp && <Star size={11} className="fill-amber-400 text-amber-500" />}
                                {m.profiles?.full_name ?? nameOf(m.etudiant_id)}
                                {!isRapp && (
                                  <>
                                    <button
                                      title="Désigner rapporteur"
                                      onClick={() => handleRapporteur(g.id, m.etudiant_id)}
                                      className="ml-1 text-amber-500 hover:text-amber-600"
                                    >
                                      <Star size={11} />
                                    </button>
                                    <button
                                      title="Retirer du groupe"
                                      onClick={() => handleRemove(g.id, m.etudiant_id)}
                                      className="text-red-500 hover:text-red-600"
                                    >
                                      <UserMinus size={11} />
                                    </button>
                                  </>
                                )}
                              </span>
                            );
                          })}
                        </div>

                        {available.length > 0 && (
                          <div className="flex gap-2">
                            <Select
                              value={addChoice[g.id] ?? ""}
                              onValueChange={(v) => setAddChoice((m) => ({ ...m, [g.id]: v }))}
                            >
                              <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Ajouter un étudiant" /></SelectTrigger>
                              <SelectContent>
                                {available.map((e) => (
                                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" onClick={() => handleAdd(g.id)} disabled={!addChoice[g.id]}>
                              <UserPlus size={14} />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
