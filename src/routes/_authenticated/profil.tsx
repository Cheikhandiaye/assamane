import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profil")({
  component: ProfilPage,
});

function ProfilPage() {
  const { user, fullName, role } = useCurrentUser();
  const router = useRouter();
  const [name, setName] = useState(fullName ?? "");
  const [pwd, setPwd] = useState("");

  async function saveProfile() {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    if (error) toast.error(error.message);
    else { toast.success("Profil mis à jour ✅"); router.invalidate(); }
  }
  async function changePassword() {
    if (!pwd) return;
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) toast.error(error.message);
    else { toast.success("Mot de passe changé ✅"); setPwd(""); }
  }

  return (
    <AssirikShell title="👤 Mon profil">
      <div className="max-w-xl space-y-4 rounded-2xl bg-card p-6 shadow-sm">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <input value={user?.email ?? ""} disabled className="mt-1 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Rôle</label>
          <p className="mt-1 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{role}</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nom complet</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
        </div>
        <button onClick={saveProfile} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
          Enregistrer
        </button>
        <hr className="my-4 border-border" />
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nouveau mot de passe</label>
          <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-base" />
        </div>
        <button onClick={changePassword} className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background hover:opacity-90">
          Changer le mot de passe
        </button>
      </div>
    </AssirikShell>
  );
}