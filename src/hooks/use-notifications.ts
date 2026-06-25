import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  destinataire_id: string;
  titre: string;
  message: string;
  type: string;
  lien: string | null;
  lu: boolean;
  created_at: string;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from("notifications")
      .select("*")
      .eq("destinataire_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!active || !data) return;
        setNotifications(data as AppNotification[]);
        setUnreadCount((data as AppNotification[]).filter((n) => !n.lu).length);
      });

    const channel = supabase
      .channel(`notifs_${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `destinataire_id=eq.${userId}` },
        (payload) => {
          const notif = payload.new as AppNotification;
          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((prev) => prev + 1);
          (notif.type === "rejet" ? toast.error : toast.success)(notif.titre, { description: notif.message });
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ lu: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }
  async function markAllAsRead() {
    if (!userId) return;
    await supabase.from("notifications").update({ lu: true }).eq("destinataire_id", userId).eq("lu", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    setUnreadCount(0);
  }

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}