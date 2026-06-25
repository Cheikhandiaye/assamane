import { createFileRoute } from "@tanstack/react-router";
import { AssirikShell } from "@/components/assirik-shell";

export const Route = createFileRoute("/_authenticated/professeur")({
  component: () => (
    <AssirikShell title="🎓 Dashboard Professeur">
      <div className="bg-card rounded-xl shadow-md p-8">
        <p className="text-muted-foreground">
          Bienvenue ! Tes modules, sessions et validations apparaîtront ici. ✨
        </p>
      </div>
    </AssirikShell>
  ),
});