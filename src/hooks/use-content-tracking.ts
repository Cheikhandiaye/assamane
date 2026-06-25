import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContentTrackingParams {
  userId: string | undefined;
  contenuId: string;
  moduleId: string;
  parcoursId: string;
  type: "video" | "text" | "quiz";
}

export function useContentTracking(params: ContentTrackingParams) {
  const qc = useQueryClient();

  async function upsert(progression: number, complete: boolean) {
    if (!params.userId) return;
    const { error } = await supabase.from("suivi_contenu").upsert(
      {
        etudiant_id: params.userId,
        contenu_id: params.contenuId,
        module_id: params.moduleId,
        parcours_id: params.parcoursId,
        type: params.type,
        progression,
        complete,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "etudiant_id,contenu_id" } as never,
    );
    if (error) throw error;
  }

  const completeMut = useMutation({
    mutationFn: () => upsert(100, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suivi", params.userId] });
      qc.invalidateQueries({ queryKey: ["acces", params.userId] });
    },
  });

  const progressMut = useMutation({
    mutationFn: (pct: number) => upsert(pct, false),
  });

  return {
    markAsCompleted: () => completeMut.mutateAsync(),
    updateProgress: (pct: number) => progressMut.mutateAsync(pct),
    completing: completeMut.isPending,
  };
}