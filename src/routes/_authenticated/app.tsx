import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppRouter,
});

function AppRouter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // 1. Récupérer la session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          // Pas de session → rediriger vers auth
          navigate({ to: "/auth", replace: true });
          return;
        }

        const user = sessionData.session.user;
        if (!user) {
          navigate({ to: "/auth", replace: true });
          return;
        }

        // 2. Récupérer le rôle de l'utilisateur (une seule requête)
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) {
          console.error("Erreur récupération rôle:", roleError);
          // En cas d'erreur, déconnecter et rediriger vers auth
          await supabase.auth.signOut();
          navigate({ to: "/auth", replace: true });
          return;
        }

        if (!roleData?.role) {
          console.warn("Aucun rôle trouvé pour l'utilisateur", user.id);
          // Pas de rôle → déconnecter et rediriger
          await supabase.auth.signOut();
          navigate({ to: "/auth", replace: true });
          return;
        }

        // 3. Rediriger vers le dashboard du rôle
        const targetPath = `/${roleData.role}`;
        const currentPath = window.location.pathname;

        if (currentPath === targetPath) {
          // Déjà sur la bonne page → arrêter le chargement
          setLoading(false);
          return;
        }

        // Rediriger vers le bon dashboard
        navigate({ to: targetPath, replace: true });

      } catch (error) {
        console.error("Erreur AppRouter:", error);
        // En cas d'erreur inattendue → auth
        navigate({ to: "/auth", replace: true });
      }
    };

    checkAndRedirect();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Redirection...</p>
        </div>
      </div>
    );
  }

  return null;
}
