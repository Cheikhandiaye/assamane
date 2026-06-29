import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, Users, Mail, MapPin, Palette, Link, Calendar } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/partenaires")({
  component: AdminPartenaires,
});

function AdminPartenaires() {
  useRoleGuard("admin");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useCurrentUser();

  const [partenaires, setPartenaires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    contact_email: "",
    adresse: "",
    logo_url: "",
    couleur_primaire: "#7C3AED",
    couleur_secondaire: "#F97316",
  });

  // Chargement
  const loadPartenaires = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("partenaires")
        .select("*")
        .order("nom", { ascending: true });

      if (error) throw error;
      setPartenaires(data || []);
    } catch (error: any) {
      console.error("Erreur chargement partenaires:", error);
      toast.error(error.message || "Erreur de chargement des partenaires");
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarde
  const savePartenaire = async () => {
    if (!formData.nom.trim()) {
      toast.error("Le nom du partenaire est requis");
      return;
    }

    try {
      const payload = {
        nom: formData.nom.trim(),
        contact_email: formData.contact_email?.trim() || null,
        adresse: formData.adresse?.trim() || null,
        logo_url: formData.logo_url?.trim() || null,
        couleur_primaire: formData.couleur_primaire || "#7C3AED",
        couleur_secondaire: formData.couleur_secondaire || "#F97316",
      };

      if (editingId) {
        const { error } = await supabase
          .from("partenaires")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Partenaire mis à jour");
      } else {
        const { error } = await supabase
          .from("partenaires")
          .insert({
            ...payload,
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success("Partenaire créé");
      }

      setDialogOpen(false);
      resetForm();
      await loadPartenaires();
    } catch (error: any) {
      console.error("Erreur sauvegarde:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    }
  };

  // Suppression
  const deletePartenaire = async (id: string) => {
    if (!confirm("Supprimer définitivement ce partenaire ?")) return;

    try {
      const { error } = await supabase
        .from("partenaires")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Partenaire supprimé");
      await loadPartenaires();
    } catch (error: any) {
      console.error("Erreur suppression:", error);
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      contact_email: "",
      adresse: "",
      logo_url: "",
      couleur_primaire: "#7C3AED",
      couleur_secondaire: "#F97316",
    });
    setEditingId(null);
  };

  const openEditDialog = (partenaire: any) => {
    setFormData({
      nom: partenaire.nom || "",
      contact_email: partenaire.contact_email || "",
      adresse: partenaire.adresse || "",
      logo_url: partenaire.logo_url || "",
      couleur_primaire: partenaire.couleur_primaire || "#7C3AED",
      couleur_secondaire: partenaire.couleur_secondaire || "#F97316",
    });
    setEditingId(partenaire.id);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (pathname === "/admin/partenaires") {
      loadPartenaires();
    }
  }, [pathname]);

  if (pathname !== "/admin/partenaires") return <Outlet />;

  return (
    <AssirikShell title="🏢 Gestion des Partenaires">
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Partenaires
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez les organisations partenaires du CERIP
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau partenaire
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Modifier le partenaire" : "Créer un partenaire"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="Ex: Université Cheikh Anta Diop"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email de contact</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contact@organisation.sn"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Textarea
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    placeholder="Adresse complète de l'organisation"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">URL du logo</Label>
                  <Input
                    id="logo"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://exemple.com/logo.png"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="couleur_primaire">Couleur primaire</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="couleur_primaire"
                        type="color"
                        value={formData.couleur_primaire}
                        onChange={(e) => setFormData({ ...formData, couleur_primaire: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.couleur_primaire}
                        onChange={(e) => setFormData({ ...formData, couleur_primaire: e.target.value })}
                        placeholder="#7C3AED"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="couleur_secondaire">Couleur secondaire</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="couleur_secondaire"
                        type="color"
                        value={formData.couleur_secondaire}
                        onChange={(e) => setFormData({ ...formData, couleur_secondaire: e.target.value })}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        value={formData.couleur_secondaire}
                        onChange={(e) => setFormData({ ...formData, couleur_secondaire: e.target.value })}
                        placeholder="#F97316"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <Button className="w-full" onClick={savePartenaire}>
                  {editingId ? "Mettre à jour" : "Créer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Liste des partenaires */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Chargement des partenaires...
          </div>
        ) : partenaires.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucun partenaire enregistré</p>
            <p className="text-sm text-muted-foreground">
              Créez votre premier partenaire pour commencer
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partenaires.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-start justify-between">
                    <div className="flex items-center gap-2 truncate">
                      {p.couleur_primaire && (
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: p.couleur_primaire }}
                        />
                      )}
                      <span className="truncate">{p.nom}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deletePartenaire(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  {p.contact_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{p.contact_email}</span>
                    </div>
                  )}
                  {p.adresse && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{p.adresse}</span>
                    </div>
                  )}
                  {p.logo_url && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Link className="h-3.5 w-3.5" />
                      <span className="truncate text-xs">Logo présent</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t mt-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Créé le {new Date(p.created_at).toLocaleDateString()}
                      {p.created_by && ` par ${p.created_by.slice(0, 8)}...`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AssirikShell>
  );
}
