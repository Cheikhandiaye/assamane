import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { PartnerLogo } from "@/components/partner-logo";
import { uploadPartnerLogo, deletePartnerLogo } from "@/lib/storage";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, Target, Users,
  Building2, Mail, BookOpen, Pencil, Trash2,
  Upload, X, Save
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/partenaires/$partenaireId")({
  component: Page,
});
export const ErrorBoundary = RouteErrorBoundary;

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Page() {
  useRoleGuard("admin");
  const navigate = useNavigate();
  const { partenaireId } = Route.useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [partenaire, setPartenaire] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [stats, setStats] = useState({ missions: 0, parcours: 0, etudiants: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    logo_url: "",
    couleur_primaire: "#7C3AED",
    couleur_secondaire: "#F97316",
    adresse: "",
    contact_email: "",
  });

  useEffect(() => {
    (async () => {
      const { data: pData, error: pError } = await supabase
        .rpc("get_partenaire_by_id", { p_id: partenaireId });

      if (pError) {
        toast.error("Erreur de chargement du partenaire");
        setLoading(false);
        return;
      }

      const p = pData?.[0] || null;
      setPartenaire(p);

      if (p) {
        setFormData({
          nom: p.nom || "",
          logo_url: p.logo_url || "",
          couleur_primaire: p.couleur_primaire || "#7C3AED",
          couleur_secondaire: p.couleur_secondaire || "#F97316",
          adresse: p.adresse || "",
          contact_email: p.contact_email || "",
        });
      }

      const { data: mData } = await supabase
        .from("missions")
        .select("id, nom, statut, date_debut, date_fin, description")
        .eq("partenaire_id", partenaireId)
        .order("created_at", { ascending: false });

      const missionsData = mData ?? [];

      const enriched = await Promise.all(
        missionsData.map(async (ms) => {
          const { data: pcs } = await supabase
            .from("parcours")
            .select("id")
            .eq("mission_id", ms.id);

          const parcoursIds = (pcs ?? []).map((pc) => pc.id);
          let nbEtu = 0;
          if (parcoursIds.length) {
            const { count } = await supabase
              .from("parcours_etudiants")
              .select("*", { count: "exact", head: true })
              .in("parcours_id", parcoursIds);
            nbEtu = count ?? 0;
          }
          return { ...ms, _nb_parcours: parcoursIds.length, _nb_etudiants: nbEtu };
        })
      );

      setMissions(enriched);
      setStats({
        missions: enriched.length,
        parcours: enriched.reduce((s, ms) => s + ms._nb_parcours, 0),
        etudiants: enriched.reduce((s, ms) => s + ms._nb_etudiants, 0),
      });
      setLoading(false);
    })();
  }, [partenaireId]);

  // === GESTION DU LOGO ===
  async function onPickLogo(file: File | null) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo > 5 Mo");
      return;
    }
    setUploading(true);
    try {
      const path = await uploadPartnerLogo(file);
      setFormData({ ...formData, logo_url: path });
      toast.success("Logo téléversé");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur d'upload");
    } finally {
      setUploading(false);
    }
  }

  async function onRemoveLogo() {
    if (!formData.logo_url) return;
    try {
      await deletePartnerLogo(formData.logo_url);
      setFormData({ ...formData, logo_url: "" });
      toast.success("Logo supprimé");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de la suppression");
    }
  }

  // === SAUVEGARDE ===
  async function handleSave() {
    if (!formData.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_partenaire", {
        p_id: partenaireId,
        p_nom: formData.nom.trim(),
        p_contact_email: formData.contact_email.trim() || null,
        p_adresse: formData.adresse.trim() || null,
        p_logo_url: formData.logo_url.trim() || null,
        p_couleur_primaire: formData.couleur_primaire || null,
        p_couleur_secondaire: formData.couleur_secondaire || null,
      });

      if (error) throw error;
      toast.success("Partenaire mis à jour");
      setIsEditing(false);

      const { data: pData } = await supabase
        .rpc("get_partenaire_by_id", { p_id: partenaireId });
      setPartenaire(pData?.[0] || null);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  // === SUPPRESSION ===
  async function handleDelete() {
    if (!confirm(`Supprimer définitivement le partenaire "${partenaire?.nom}" ?`)) return;
    try {
      await supabase.rpc("delete_partenaire", { p_id: partenaireId });
      toast.success("Partenaire supprimé");
      navigate({ to: "/admin/partenaires" });
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  }

  if (loading) {
    return (
      <AssirikShell title="Partenaire">
        <Loader2 className="mx-auto animate-spin text-primary" />
      </AssirikShell>
    );
  }

  if (!partenaire) {
    return (
      <AssirikShell title="Partenaire introuvable">
        <p className="text-muted-foreground">Ce partenaire n'existe pas.</p>
        <Link to="/admin/partenaires">
          <Button variant="outline" className="mt-4"><ArrowLeft size={14} className="mr-1" />Retour</Button>
        </Link>
      </AssirikShell>
    );
  }

  const STATUT_COLOR: Record<string, string> = {
    brouillon: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-700",
    terminee: "bg-blue-100 text-blue-700",
  };

  return (
    <AssirikShell title={`🏢 ${partenaire.nom}`}>
      {/* Retour et actions */}
      <div className="flex items-center justify-between mb-4">
        <Link to="/admin/partenaires">
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} className="mr-1" /> Tous les partenaires
          </Button>
        </Link>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Enregistrer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil size={14} className="mr-1" /> Modifier
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 size={14} className="mr-1" /> Supprimer
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Header partenaire - MODE ÉDITION OU AFFICHAGE */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        {isEditing ? (
          // MODE ÉDITION AVEC UPLOAD
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nom">Nom *</Label>
                <Input
                  id="edit-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email de contact</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-adresse">Adresse</Label>
              <Textarea
                id="edit-adresse"
                value={formData.adresse}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                rows={2}
              />
            </div>

            {/* UPLOAD DU LOGO */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent transition-colors">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? "Téléversement..." : "Téléverser un fichier"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickLogo(e.target.files?.[0] ?? null)}
                    disabled={uploading}
                  />
                </label>
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://… ou téléverser"
                  className="flex-1 min-w-[200px]"
                />
              </div>
              {formData.logo_url && (
                <div className="flex items-center gap-3 p-2 rounded-md border bg-muted/30">
                  <PartnerLogo path={formData.logo_url} alt="Aperçu" className="h-12 w-12 rounded-md object-cover" />
                  <span className="text-xs text-muted-foreground flex-1 truncate">{formData.logo_url}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={onRemoveLogo}
                  >
                    <X size={14} />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Formats acceptés: PNG, JPG, WEBP, SVG (max 5 Mo)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cp">Couleur primaire</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-cp"
                    type="color"
                    value={formData.couleur_primaire}
                    onChange={(e) => setFormData({ ...formData, couleur_primaire: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.couleur_primaire}
                    onChange={(e) => setFormData({ ...formData, couleur_primaire: e.target.value })}
                    className="flex-1"
                    placeholder="#7C3AED"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cs">Couleur secondaire</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-cs"
                    type="color"
                    value={formData.couleur_secondaire}
                    onChange={(e) => setFormData({ ...formData, couleur_secondaire: e.target.value })}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={formData.couleur_secondaire}
                    onChange={(e) => setFormData({ ...formData, couleur_secondaire: e.target.value })}
                    className="flex-1"
                    placeholder="#F97316"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // MODE AFFICHAGE
          <div className="flex items-center gap-4">
            <PartnerLogo
              path={partenaire.logo_url}
              alt={partenaire.nom}
              className="h-16 w-16 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Building2 size={18} className="text-primary" />
                {partenaire.nom}
              </h1>
              {partenaire.contact_email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Mail size={12} /> {partenaire.contact_email}
                </p>
              )}
              {partenaire.adresse && (
                <p className="text-sm text-muted-foreground mt-0.5">📍 {partenaire.adresse}</p>
              )}
            </div>
            <div className="flex gap-2 self-start">
              <div
                className="h-6 w-6 rounded-full border border-border"
                style={{ background: partenaire.couleur_primaire ?? "#7C3AED" }}
                title="Couleur primaire"
              />
              <div
                className="h-6 w-6 rounded-full border border-border"
                style={{ background: partenaire.couleur_secondaire ?? "#F97316" }}
                title="Couleur secondaire"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard icon={<Target size={18} />} label="Missions" value={stats.missions} />
        <StatCard icon={<BookOpen size={18} />} label="Parcours" value={stats.parcours} />
        <StatCard icon={<Users size={18} />} label="Étudiants" value={stats.etudiants} />
      </div>

      {/* Missions */}
      <h2 className="mb-3 font-semibold text-foreground">Missions</h2>
      {missions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
          Aucune mission pour ce partenaire.
          <br />
          <Link to="/admin/missions" className="mt-2 inline-block text-primary underline-offset-2 hover:underline">
            Créer une mission →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {missions.map((ms) => (
            <Link
              key={ms.id}
              to="/admin/missions/$missionId"
              params={{ missionId: ms.id }}
              className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-primary shrink-0" />
                  <p className="font-semibold truncate">{ms.nom}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_COLOR[ms.statut] ?? "bg-muted"}`}>
                  {ms.statut}
                </span>
              </div>

              {ms.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{ms.description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {ms.date_debut && <span>📅 {new Date(ms.date_debut).toLocaleDateString("fr-FR")}</span>}
                {ms.date_fin && <span>→ {new Date(ms.date_fin).toLocaleDateString("fr-FR")}</span>}
                <span className="flex items-center gap-1"><BookOpen size={11} />{ms._nb_parcours} parcours</span>
                <span className="flex items-center gap-1"><Users size={11} />{ms._nb_etudiants} étudiant(s)</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AssirikShell>
  );
}
