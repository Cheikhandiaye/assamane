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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Si pas d'userId, arrêter le chargement
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

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

        if (isMounted && data) {
          const typedData = data as AppNotification[];
          setNotifications(typedData);
          setUnreadCount(typedData.filter((n) => !n.lu).length);
        }
      } catch (err) {
        console.error("Erreur chargement notifications:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Erreur de chargement"));
          setNotifications([]);
          setUnreadCount(0);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotifications();

    // Souscription Realtime
    const channel = supabase
      .channel(`notifs_${userId}`)
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
          if (isMounted) {
            setNotifications((prev) => [notif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            
            // Toast selon le type
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
          console.log(`🔔 Notifications Realtime activées pour ${userId}`);
        }
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
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
