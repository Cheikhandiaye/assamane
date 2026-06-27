import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

const resetSchema = z.object({
  etudiant_id: z.string().uuid(),
  parcours_id: z.string().uuid(),
});

export const resetCarnet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => resetSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Garde-fou : seul un admin peut réinitialiser un carnet
    await assertAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Réponses individuelles de l'étudiant sur ce parcours
    const { error: e1 } = await supabaseAdmin
      .from("reponses_etudiant")
      .delete()
      .eq("etudiant_id", data.etudiant_id)
      .eq("parcours_id", data.parcours_id);
    if (e1) throw new Error(e1.message);

    // Suivi de contenu (vidéos / textes)
    const { error: e2 } = await supabaseAdmin
      .from("suivi_contenu")
      .delete()
      .eq("etudiant_id", data.etudiant_id)
      .eq("parcours_id", data.parcours_id);
    if (e2) throw new Error(e2.message);

    // Accès aux modules débloqués
    const { error: e3 } = await supabaseAdmin
      .from("acces_module")
      .delete()
      .eq("etudiant_id", data.etudiant_id)
      .eq("parcours_id", data.parcours_id);
    if (e3) throw new Error(e3.message);

    return { ok: true };
  });
