import { useRouter } from "@tanstack/react-router";

export function RouteErrorBoundary({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-semibold text-foreground">
        Une erreur est survenue
      </h2>
      <p className="text-muted-foreground max-w-md text-sm">
        {error?.message || "Cette page a rencontré un problème inattendu."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => router.invalidate()}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Réessayer
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Retour
        </button>
      </div>
    </div>
  );
}
