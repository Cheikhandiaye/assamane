import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadPartnerLogo } from "@/lib/storage";
import { PartnerLogo } from "@/components/partner-logo";
import { Upload, Loader2 } from "lucide-react";

export interface Partenaire {
  id: string;
  nom: string;
  logo_url: string | null;
  couleur_primaire: string | null;
  couleur_secondaire: string | null;
  adresse: string | null;
  contact_email: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partenaire | null;
  onSaved: () => void;
}

const EMPTY = {
  nom: "",
  logo_url: "",
  couleur_primaire: "#7C3AED",
  couleur_secondaire: "#F97316",
  adresse: "",
  contact_email: "",
};

export function PartenaireFormDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              nom: initial.nom,
              logo_url: initial.logo_url ?? "",
              couleur_primaire: initial.couleur_primaire ?? "#7C3AED",
              couleur_secondaire: initial.couleur_secondaire ?? "#F97316",
              adresse: initial.adresse ?? "",
              contact_email: initial.contact_email ?? "",
            }
          : EMPTY,
      );
    }
  }, [open, initial]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onPickLogo(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Logo > 5 Mo"); return; }
    setUploading(true);
    try {
      const path = await uploadPartnerLogo(file);
      set("logo_url", path);
      toast.success("Logo téléversé");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur d'upload");
    } finally { setUploading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setSaving(true);
    const payload = {
      nom: form.nom.trim(),
      logo_url: form.logo_url.trim() || null,
      couleur_primaire: form.couleur_primaire || null,
      couleur_secondaire: form.couleur_secondaire || null,
      adresse: form.adresse.trim() || null,
      contact_email: form.contact_email.trim() || null,
    };
    const { error } = initial
      ? await supabase.from("partenaires").update(payload).eq("id", initial.id)
      : await supabase.from("partenaires").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(initial ? "Partenaire mis à jour" : "Partenaire créé");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le partenaire" : "Nouveau partenaire"}</DialogTitle>
          <DialogDescription>
            Renseigne les informations du partenaire. Le nom est obligatoire.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom *</Label>
            <Input id="nom" value={form.nom} onChange={(e) => set("nom", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">URL du logo</Label>
            <Input id="logo" value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://… ou téléverser ci-dessous" />
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Téléverser un fichier
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickLogo(e.target.files?.[0] ?? null)} disabled={uploading} />
              </label>
              {form.logo_url && (
                <PartnerLogo path={form.logo_url} alt="Aperçu" className="h-10 w-10 rounded-md object-cover" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cp">Couleur primaire</Label>
              <Input id="cp" type="color" value={form.couleur_primaire} onChange={(e) => set("couleur_primaire", e.target.value)} className="h-10 p-1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs">Couleur secondaire</Label>
              <Input id="cs" type="color" value={form.couleur_secondaire} onChange={(e) => set("couleur_secondaire", e.target.value)} className="h-10 p-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email de contact</Label>
            <Input id="email" type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : initial ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}