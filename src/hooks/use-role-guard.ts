import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "./use-current-user";

export function useRoleGuard(allowedRoles: string | string[]) {
  const navigate = useNavigate();
  const { user, role, isLoading } = useCurrentUser();

  useEffect(() => {
    // Attendre la fin du chargement
    if (isLoading) return;

    // Si pas d'utilisateur, rediriger vers login
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Si pas de rôle, rediriger vers login
    if (!role) {
      navigate({ to: "/auth", replace: true });
      return;
    }

    // Vérifier si le rôle est autorisé
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(role)) {
      console.warn(`useRoleGuard: Rôle ${role} non autorisé pour cette page`);
      navigate({ to: "/app", replace: true });
    }
  }, [user, role, isLoading, navigate, allowedRoles]);
}
