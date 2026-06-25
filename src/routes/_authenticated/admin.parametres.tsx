import { createFileRoute } from "@tanstack/react-router";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { Settings, Trophy, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/parametres")({ component: Page });

function Page() {
  useRoleGuard("admin");
  return (
    <AssirikShell title="⚙️ Paramètres">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5"><Settings className="text-primary" /><h3 className="mt-2 font-bold">Plateforme</h3><p className="text-sm text-muted-foreground">Nom : ASSIRIK · Couleurs : violet/orange · Police : Inter</p></div>
        <div className="rounded-2xl border border-border bg-card p-5"><Trophy className="text-primary" /><h3 className="mt-2 font-bold">Badges</h3><p className="text-sm text-muted-foreground">6 badges seedés (1ère validation, 1er module, mi-parcours, parcours complet, groupe complet, assiduité).</p></div>
        <div className="rounded-2xl border border-border bg-card p-5"><Mail className="text-primary" /><h3 className="mt-2 font-bold">Emails</h3><p className="text-sm text-muted-foreground">Auth gérée par Lovable Cloud — invitations via création de compte.</p></div>
      </div>
    </AssirikShell>
  );
}