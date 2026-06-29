// =====================================================
// src/routes/_authenticated/app.tsx - VERSION CORRIGÉE
// =====================================================

import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppRouter,
});

function AppRouter() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // 1. Récupérer la session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Erreur session:", sessionError);
          setError(sessionError.message);
          navigate({ to: "/auth", replace: true });
          return;
        }

        if (!sessionData.session) {
          console.log("AppRouter: Pas de session");
          navigate({ to: "/auth", replace: true });
          return;
        }

        const user = sessionData.session.user;
        if (!user) {
          console.log("AppRouter: Pas d'utilisateur");
          navigate({ to: "/auth", replace: true });
          return;
        }

        console.log("AppRouter: Utilisateur connecté", user.id);

        // 2. Récupérer le rôle - UNE SEULE FOIS
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleError) {
          console.error("Erreur récupération rôle:", roleError);
          setError(roleError.message);
          navigate({ to: "/auth", replace: true });
          return;
        }

        if (!roleData?.role) {
          console.warn("AppRouter: Aucun rôle trouvé pour", user.id);
          // Si pas de rôle, on le crée par défaut (étudiant) pour éviter la boucle
          console.log("AppRouter: Attribution du rôle 'etudiant' par défaut");
          
          const { error: insertError } = await supabase
            .from("user_roles")
            .insert({ user_id: user.id, role: "etudiant" });
          
          if (insertError) {
            console.error("Erreur insertion rôle:", insertError);
            setError(insertError.message);
            navigate({ to: "/auth", replace: true });
            return;
          }
          
          // Rediriger vers étudiant
          console.log("AppRouter: Redirection vers /etudiant (rôle créé)");
          navigate({ to: "/etudiant", replace: true });
          return;
        }

        const role = roleData.role;
        console.log("AppRouter: Rôle trouvé:", role);

        // 3. Rediriger
        const targetPath = `/${role}`;
        const currentPath = window.location.pathname;

        console.log(`AppRouter: currentPath=${currentPath}, targetPath=${targetPath}`);

        if (currentPath === targetPath) {
          console.log("AppRouter: Déjà sur la bonne page");
          setLoading(false);
          return;
        }

        console.log(`AppRouter: Redirection vers ${targetPath}`);
        navigate({ to: targetPath, replace: true });

      } catch (err) {
        console.error("AppRouter: Erreur inattendue:", err);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
        navigate({ to: "/auth", replace: true });
      }
    };

    checkAndRedirect();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-red-500">
          <p>Erreur: {error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded"
            onClick={() => window.location.href = "/auth"}
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

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
