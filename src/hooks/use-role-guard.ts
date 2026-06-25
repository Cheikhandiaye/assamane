import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useCurrentUser, type AppRole } from "./use-current-user";

/** Redirige vers /app si l'utilisateur n'a pas le rôle attendu (ou l'un des rôles attendus). */
export function useRoleGuard(expected: AppRole | AppRole[]) {
  const { role, loading } = useCurrentUser();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const list = Array.isArray(expected) ? expected : [expected];
    if (!role || !list.includes(role)) {
      router.navigate({ to: "/app", replace: true });
    }
  }, [role, loading]);
  return { role, loading, allowed: role ? (Array.isArray(expected) ? expected.includes(role) : role === expected) : false };
}