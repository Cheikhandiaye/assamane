import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Parcours {
  id: string;
  nom: string;
  description: string | null;
  mission_id: string | null;
  pondere_individuel: number | null;
  pondere_groupe: number | null;
  date_fin?: string | null;
}

export interface MissionOption {
  id: string;
  nom: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Parcours | null;
  missions: MissionOption[];
  onSaved: () => void;
}

const EMPTY = {
  nom: "",
  description: "",
  mission_id: "",
  pondere_individuel: 60,
  pondere_groupe: 40,
  date_fin: "",
};

export function ParcoursFormDialog({ open, onOpenChange, initial, missions, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        nom: initial.nom,
        description: initial.description ?? "",
        mission_id: initial.mission_id ?? "",
        pondere_individuel: Number(initial.pondere_individuel ?? 60),
        pondere_groupe: Number(initial.pondere_groupe ?? 40),
        date_fin: "",
      });
      // Charge la date de fin propre du parcours depuis la base
      supabase
        .from("parcours")
        .select("date_fin")
        .eq("id", initial.id)
        .maybeSingle()
        .then(({ data }) => setForm((f) => ({ ...f, date_fin: data?.date_fin ?? "" })));
    } else {
      setForm(EMPTY);
    }
  }, [open, initial]);

  function setIndiv(v: number) {
    const indiv = Math.max(0, Math.min(100, v));
    setForm((f) => ({ ...f, pondere_individuel: indiv, pondere_groupe: 100 - indiv }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return toast.error("Le nom est requis");
    if (!form.mission_id) return toast.error("Choisis une mission");
    if (form.pondere_individuel + form.pondere_groupe !== 100)
      return toast.error("La somme des pondérations doit égaler 100");
    setSaving(true);
    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      mission_id: form.mission_id,
      pondere_individuel: form.pondere_individuel,
      pondere_groupe: form.pondere_groupe,
      date_fin: form.date_fin || null,
    };
    const { error } = initial
      ? await supabase.from("parcours").update(payload).eq("id", initial.id)
      : await supabase.from("parcours").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Parcours mis à jour" : "Parcours créé");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le parcours" : "Nouveau parcours"}</DialogTitle>
          <DialogDescription>
            Le parcours est rattaché à une mission. La pondération individuelle + groupe doit faire 100.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mission">Mission *</Label>
            <Select value={form.mission_id} onValueChange={(v) => setForm((f) => ({ ...f, mission_id: v }))}>
              <SelectTrigger id="mission"><SelectValue placeholder="Choisir une mission" /></SelectTrigger>
              <SelectContent>
                {missions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Aucune mission disponible</div>
                ) : (
                  missions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nom}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="datefin">Date de fin du parcours</Label>
            <Input id="datefin" type="date" value={form.date_fin} onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Si vide, la date de fin de la mission s'applique. Sert de délai pour l'attestation de réussite.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pi">Pondération individuelle (%)</Label>
              <Input id="pi" type="number" min={0} max={100} value={form.pondere_individuel} onChange={(e) => setIndiv(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg">Pondération groupe (%)</Label>
              <Input id="pg" type="number" value={form.pondere_groupe} readOnly />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
            <Button type="submit" disabled={saving}>{saving ? "Enregistrement..." : initial ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
