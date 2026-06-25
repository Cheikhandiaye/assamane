import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyBrand } from "@/lib/branding";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/parametres")({ component: Page });

interface Settings { nom: string; logo_url: string; couleur_primaire: string; couleur_secondaire: string }
const DEFAULT: Settings = { nom: "ASSIRIK", logo_url: "", couleur_primaire: "#7C3AED", couleur_secondaire: "#F97316" };

function Page() {
  useRoleGuard("admin");
  const { user } = useCurrentUser();
  const [form, setForm] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "platform").maybeSingle();
      if (data?.value && typeof data.value === "object") setForm({ ...DEFAULT, ...(data.value as unknown as Settings) });
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({ key: "platform", value: form as unknown as never, updated_by: user?.id ?? null } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    applyBrand({ couleur_primaire: form.couleur_primaire, couleur_secondaire: form.couleur_secondaire });
    toast.success("Paramètres enregistrés");
  }

  if (loading) return <AssirikShell title="Paramètres"><Loader2 className="mx-auto animate-spin text-primary" /></AssirikShell>;

  return (
    <AssirikShell title="⚙️ Paramètres">
      <div className="max-w-xl space-y-4 rounded-2xl border border-border bg-card p-6">
        <div><Label>Nom de la plateforme</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
        <div><Label>URL du logo</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Couleur primaire</Label><Input type="color" value={form.couleur_primaire} onChange={(e) => setForm({ ...form, couleur_primaire: e.target.value })} /></div>
          <div><Label>Couleur secondaire</Label><Input type="color" value={form.couleur_secondaire} onChange={(e) => setForm({ ...form, couleur_secondaire: e.target.value })} /></div>
        </div>
        <Button onClick={save} disabled={saving}><Save size={14} className="mr-1" />{saving ? "…" : "Enregistrer"}</Button>
      </div>
    </AssirikShell>
  );
}