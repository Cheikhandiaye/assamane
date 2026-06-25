import { createFileRoute } from "@tanstack/react-router";
import { AssirikShell } from "@/components/assirik-shell";

export const Route = createFileRoute("/_authenticated/partenaire")({
  component: () => (
    <AssirikShell title="🤝 Dashboard Partenaire">
      <div className="bg-card rounded-xl shadow-md p-8">
        <p className="text-muted-foreground">
          Bienvenue ! Tes missions et statistiques s'afficheront ici (lecture seule). 📊
        </p>
      </div>
    </AssirikShell>
  ),
});