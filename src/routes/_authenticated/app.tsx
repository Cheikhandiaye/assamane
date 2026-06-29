import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppRouter,
  beforeLoad: async () => {
    // Vérifier si l'utilisateur est connecté
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
  },
});

function AppRouter() {
  const navigate = useNavigate();
  const { user, role, isLoading } = useCurrentUser();

  useEffect(() => {
    // Attendre que le chargement soit terminé
    if (isLoading) return;

    // Si pas d'utilisateur, rediriger vers auth
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Si pas de rôle, rediriger vers une page d'erreur ou auth
    if (!role) {
      console.warn("AppRouter: Aucun rôle trouvé pour l'utilisateur", user.id);
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Rediriger vers le dashboard correspondant au rôle
    console.log(`AppRouter: Redirection vers /${role} pour l'utilisateur ${user.id}`);

    // Éviter les boucles en vérifiant si on est déjà sur la bonne page
    const currentPath = window.location.pathname;
    const targetPath = `/${role}`;

    if (currentPath === targetPath) {
      console.log("AppRouter: Déjà sur la bonne page, pas de redirection");
      return;
    }

    // Rediriger vers le bon dashboard
    navigate({ to: targetPath, replace: true });

  }, [user, role, isLoading, navigate]);

  // Pendant le chargement, afficher un écran de chargement
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground">Redirection...</p>
      </div>
    </div>
  );
}
