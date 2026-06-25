import { createFileRoute } from "@tanstack/react-router";
import { AssirikShell } from "@/components/assirik-shell";

export const Route = createFileRoute("/_authenticated/admin")({
  component: () => (
    <AssirikShell title="🛡️ Dashboard Admin">
      <div className="bg-card rounded-xl shadow-md p-8">
        <p className="text-muted-foreground">
          Bienvenue, super-admin ! L'interface complète arrive à l'étape 2. 🚀
        </p>
      </div>
    </AssirikShell>
  ),
});