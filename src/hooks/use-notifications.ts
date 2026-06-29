// src/hooks/use-notifications.ts
import { useEffect, useState, useRef } from "react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!userId) {
      setIsLoading(false);
      return;
    }

    const loadNotifications = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
          .from("notifications")
          .select("*")
          .eq("destinataire_id", userId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;

        if (isMountedRef.current && data) {
          const typedData = data as AppNotification[];
          setNotifications(typedData);
          setUnreadCount(typedData.filter((n) => !n.lu).length);
        }
      } catch (err) {
        console.error("Erreur chargement notifications:", err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error("Erreur de chargement"));
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadNotifications();

    // Supprimer l'ancien channel s'il existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Créer un nouveau channel UNIQUE pour cet utilisateur
    const channelId = `notifs-${userId}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "notifications", 
          filter: `destinataire_id=eq.${userId}` 
        },
        (payload) => {
          const notif = payload.new as AppNotification;
          if (isMountedRef.current) {
            setNotifications((prev) => [notif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            
            if (notif.type === "rejet") {
              toast.error(notif.titre, { description: notif.message });
            } else {
              toast.success(notif.titre, { description: notif.message });
            }
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`🔔 Notifications Realtime activées pour ${userId} (${channelId})`);
        }
      });

    channelRef.current = channel;

    return () => {
      isMountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  async function markAsRead(id: string) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ lu: true })
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) => 
        prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("Erreur marquage lu:", err);
      toast.error("Erreur lors du marquage");
    }
  }

  async function markAllAsRead() {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ lu: true })
        .eq("destinataire_id", userId)
        .eq("lu", false);

      if (error) throw error;

      setNotifications((prev) => 
        prev.map((n) => ({ ...n, lu: true }))
      );
      setUnreadCount(0);
      toast.success("Toutes les notifications ont été marquées comme lues");
    } catch (err) {
      console.error("Erreur marquage tout lu:", err);
      toast.error("Erreur lors du marquage");
    }
  }

  return { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    isLoading,
    error 
  };
}
