import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ResetCarnetSchema = z.object({
  etudiant_id: z.string().uuid(),
  parcours_id: z.string().uuid(),
});

export const resetCarnet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResetCarnetSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Supprime toutes les réponses individuelles de l'étudiant sur ce parcours
    const { error: e1 } = await supabaseAdmin
      .from("reponses_etudiant")
      .delete()
      .eq("etudiant_id", data.etudiant_id)
      .eq("parcours_id", data.parcours_id);

    if (e1) throw new Error(e1.message);

    // Supprime le suivi de contenu (vidéos/textes)
    const { error: e2 } = await supabaseAdmin
      .from("suivi_contenu")
      .delete()
      .eq("etudiant_id", data.etudiant_id)
      .eq("parcours_id", data.parcours_id);

    if (e2) throw new Error(e2.message);

    // Supprime les accès modules débloqués
    const { error: e3 } = await supabaseAdmin
      .from("acces_module")
      .delete()
      .eq("etudiant_id", data.etudiant_id)
      .eq("parcours_id", data.parcours_id);

    if (e3) throw new Error(e3.message);

    return { ok: true };
  });
