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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, Users, Mail, Phone, MapPin } from "lucide-react";

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
    contact_telephone: "",  // ← CORRIGÉ : contact_telephone au lieu de contact_phone
    secteur: "",
    ville: "",
  });

  // Fonction de chargement
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
        contact_telephone: formData.contact_telephone?.trim() || null,  // ← CORRIGÉ
        secteur: formData.secteur?.trim() || null,
        ville: formData.ville?.trim() || null,
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
          .insert(payload);

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
      contact_telephone: "",  // ← CORRIGÉ
      secteur: "",
      ville: "",
    });
    setEditingId(null);
  };

  const openEditDialog = (partenaire: any) => {
    setFormData({
      nom: partenaire.nom || "",
      contact_email: partenaire.contact_email || "",
      contact_telephone: partenaire.contact_telephone || "",  // ← CORRIGÉ
      secteur: partenaire.secteur || "",
      ville: partenaire.ville || "",
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
            <DialogContent className="max-w-md">
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
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={formData.contact_telephone}  // ← CORRIGÉ
                    onChange={(e) => setFormData({ ...formData, contact_telephone: e.target.value })}
                    placeholder="+221 77 123 45 67"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secteur">Secteur d'activité</Label>
                  <Input
                    id="secteur"
                    value={formData.secteur}
                    onChange={(e) => setFormData({ ...formData, secteur: e.target.value })}
                    placeholder="Éducation, Finance, Santé..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    placeholder="Dakar, Thiès, Saint-Louis..."
                  />
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
                    <span className="truncate">{p.nom}</span>
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
                  {p.contact_telephone && (  // ← CORRIGÉ
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{p.contact_telephone}</span>  {/* ← CORRIGÉ */}
                    </div>
                  )}
                  {(p.secteur || p.ville) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{[p.secteur, p.ville].filter(Boolean).join(" • ")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t mt-2">
                    <Users className="h-3.5 w-3.5" />
                    <span>Missions: {p.missions_count || 0}</span>
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
