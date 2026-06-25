import { createFileRoute, Link } from "@tanstack/react-router";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/etudiant/notifications")({ component: Page });

function Page() {
  useRoleGuard("etudiant");
  const { user } = useCurrentUser();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id);

  return (
    <AssirikShell title="🔔 Notifications">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</span>
        {unreadCount > 0 && <Button size="sm" variant="outline" onClick={markAllAsRead}><CheckCheck size={14} className="mr-1" />Tout marquer lu</Button>}
      </div>
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-2 text-muted-foreground" /> Aucune notification.
        </div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li key={n.id} className={cn("rounded-xl border border-border bg-card p-4", !n.lu && "border-primary/40 bg-primary/5")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{n.titre}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {n.lien && <Button asChild size="sm" variant="outline"><Link to={n.lien}>Ouvrir</Link></Button>}
                  {!n.lu && <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)}>Marquer lu</Button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AssirikShell>
  );
}