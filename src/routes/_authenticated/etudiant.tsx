import { createFileRoute } from "@tanstack/react-router";
import { AssirikShell } from "@/components/assirik-shell";

export const Route = createFileRoute("/_authenticated/etudiant")({
  component: () => (
    <AssirikShell title="🚀 Dashboard Étudiant">
      <div className="bg-card rounded-xl shadow-md p-8">
        <p className="text-muted-foreground">
          Prêt·e à entreprendre ? Tes parcours et badges arrivent à l'étape 2. 🎉
        </p>
      </div>
    </AssirikShell>
  ),
});