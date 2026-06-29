import { createFileRoute, Link } from "@tanstack/react-router";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/etudiant/notifications")({
  component: Page,
});

function Page() {
  useRoleGuard("etudiant");
  const { user } = useCurrentUser();
  
  // Hook avec gestion d'erreur et chargement
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    isLoading,
    error 
  } = useNotifications(user?.id);

  // Debug : afficher les données dans la console
  console.log("🔔 Page Notifications - user:", user?.id);
  console.log("🔔 Page Notifications - isLoading:", isLoading);
  console.log("🔔 Page Notifications - error:", error);
  console.log("🔔 Page Notifications - notifications:", notifications);
  console.log("🔔 Page Notifications - unreadCount:", unreadCount);

  // Vérifier que user existe
  if (!user) {
    return (
      <AssirikShell title="🔔 Notifications">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-16 w-16 text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Utilisateur non trouvé</h2>
          <p className="text-muted-foreground max-w-md">
            Veuillez vous reconnecter pour voir vos notifications.
          </p>
          <Button 
            className="mt-4"
            onClick={() => window.location.href = "/auth"}
          >
            Se connecter
          </Button>
        </div>
      </AssirikShell>
    );
  }

  // Si erreur du hook
  if (error) {
    console.error("🔔 Erreur hook notifications:", error);
    return (
      <AssirikShell title="🔔 Notifications">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Erreur de chargement</h2>
          <p className="text-muted-foreground max-w-md">
            {error.message || "Erreur inconnue"}
          </p>
          <Button 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Réessayer
          </Button>
        </div>
      </AssirikShell>
    );
  }

  // Si chargement
  if (isLoading) {
    return (
      <AssirikShell title="🔔 Notifications">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Chargement des notifications...</p>
        </div>
      </AssirikShell>
    );
  }

  // Sécuriser l'accès aux notifications
  const safeNotifications = notifications || [];
  const safeUnreadCount = unreadCount || 0;

  return (
    <AssirikShell title="🔔 Notifications">
      <div className="space-y-4">
        {/* En-tête */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {safeUnreadCount} non lue{safeUnreadCount > 1 ? "s" : ""}
          </span>
          {safeUnreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={markAllAsRead}>
              <CheckCheck size={14} className="mr-1" />
              Tout marquer lu
            </Button>
          )}
        </div>

        {/* Liste des notifications */}
        {safeNotifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            <Bell className="mx-auto mb-2 h-12 w-12 text-muted-foreground/30" />
            <p>Aucune notification.</p>
            <p className="text-xs">Vous serez notifié des nouvelles activités</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {safeNotifications.map((n) => {
              // Sécuriser chaque notification
              const isLu = n?.lu ?? true;
              const titre = n?.titre || "Notification";
              const message = n?.message || "";
              const created_at = n?.created_at ? new Date(n.created_at) : new Date();
              const lien = n?.lien || null;
              const id = n?.id || `temp-${Math.random()}`;

              return (
                <li 
                  key={id} 
                  className={cn(
                    "rounded-xl border border-border bg-card p-4 transition-colors",
                    !isLu && "border-primary/40 bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{titre}</p>
                      <p className="text-sm text-muted-foreground">{message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {created_at.toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      {lien && (
                        <Button asChild size="sm" variant="outline">
                          <Link to={lien}>Ouvrir</Link>
                        </Button>
                      )}
                      {!isLu && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => markAsRead(id)}
                        >
                          Marquer lu
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AssirikShell>
  );
}
