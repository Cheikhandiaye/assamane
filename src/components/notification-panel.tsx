import { Bell, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useNotifications, type AppNotification } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

const ICONS: Record<string, string> = {
  validation: "✅",
  rejet: "❌",
  badge: "🏆",
  acces_debloque: "🔓",
  alerte_echeance: "⏰",
  info: "ℹ️",
};

export function NotificationBell({ userId }: { userId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
  const navigate = useNavigate();

  function handleClick(n: AppNotification) {
    if (!n.lu) void markAsRead(n.id);
    if (n.lien) {
      setOpen(false);
      navigate({ to: n.lien });
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="flex-1 bg-black/40" />
          <aside
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-[380px] bg-background shadow-2xl flex flex-col"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-bold">Notifications 🔔</h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-muted">
                <X size={18} />
              </button>
            </header>
            {notifications.length > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                className="px-5 py-2 text-left text-xs font-medium text-primary hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">Aucune notification 🤷</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "block w-full border-b border-border px-5 py-3 text-left transition-colors hover:bg-muted/60",
                      !n.lu && "bg-secondary",
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">
                      {ICONS[n.type] ?? "•"} {n.titre}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("fr-FR")}
                    </p>
                  </button>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}