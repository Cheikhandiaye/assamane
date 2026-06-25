import { createFileRoute } from "@tanstack/react-router";
import { AssirikShell } from "@/components/assirik-shell";
import { NotebookPen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/etudiant/carnet")({
  component: () => (
    <AssirikShell title="📓 Mon carnet">
      <div className="rounded-2xl bg-card p-8 text-center">
        <NotebookPen size={48} className="mx-auto text-primary" />
        <h2 className="mt-4 text-xl font-bold">Ton carnet d'entrepreneur</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sélectionne un module débloqué dans <strong>Parcours</strong> pour remplir ton carnet et soumettre tes réponses à ton professeur.
        </p>
      </div>
    </AssirikShell>
  ),
});