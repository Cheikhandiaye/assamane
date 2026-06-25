import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Draft {
  etapeId: string;
  etudiantId: string;
  parcoursId: string;
  contenu: Record<string, unknown>;
  savedAt: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  const syncPendingDrafts = useCallback(async () => {
    if (typeof localStorage === "undefined") return;
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("assirik_draft_"));
    if (!keys.length) return;
    let synced = 0;
    for (const key of keys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "{}") as Draft;
        if (!data.etapeId || !data.etudiantId) continue;
        const { error } = await supabase.from("reponses_etudiant").upsert(
          {
            etape_id: data.etapeId,
            etudiant_id: data.etudiantId,
            parcours_id: data.parcoursId,
            contenu: data.contenu as never,
            statut: "brouillon",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "etape_id,etudiant_id" },
        );
        if (!error) {
          localStorage.removeItem(key);
          synced++;
        }
      } catch {
        /* skip */
      }
    }
    if (synced) toast.success(`✅ ${synced} brouillon(s) synchronisé(s)`);
  }, []);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      void syncPendingDrafts();
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingDrafts]);

  function saveDraftLocally(etapeId: string, etudiantId: string, parcoursId: string, contenu: Record<string, unknown>) {
    const draft: Draft = { etapeId, etudiantId, parcoursId, contenu, savedAt: Date.now() };
    localStorage.setItem(`assirik_draft_${etapeId}_${etudiantId}`, JSON.stringify(draft));
  }

  return { isOnline, saveDraftLocally, syncPendingDrafts };
}