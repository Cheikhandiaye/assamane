// src/components/notification-panel.tsx
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { Link } from "@tanstack/react-router";

interface NotificationBellProps {
  userId: string | undefined;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  // ✅ Utiliser un channel séparé en passant un flag
  const { notifications, unreadCount, markAsRead } = useNotifications(userId);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (!userId) return null;

  const latestNotifications = notifications.slice(0, 5);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {latestNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            latestNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-2 rounded-lg text-sm ${!n.lu ? "bg-primary/5" : ""}`}
              >
                <p className="font-medium">{n.titre}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString("fr-FR")}
                </p>
              </div>
            ))
          )}
        </div>
        <div className="p-2 border-t text-center">
          <Link
            to="/etudiant/notifications"
            className="text-sm text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            Voir toutes les notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
