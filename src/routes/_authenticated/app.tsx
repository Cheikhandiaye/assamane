import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Rocket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app")({
  component: RoleRedirect,
});

function RoleRedirect() {
  const { role, loading } = useCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !role) return;
    const target =
      role === "admin" ? "/admin"
      : role === "professeur" ? "/professeur"
      : role === "partenaire" ? "/partenaire"
      : "/etudiant";
    navigate({ to: target, replace: true });
  }, [role, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary">
      <div className="text-center">
        <Rocket size={48} className="text-primary mx-auto animate-pulse" />
        <p className="mt-4 text-muted-foreground">Préparation de ton espace…</p>
      </div>
    </div>
  );
}