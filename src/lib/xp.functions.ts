import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const addXPSchema = z.object({
  etudiant_id: z.string().uuid(),
  parcours_id: z.string().uuid().optional().nullable(),
  xp_amount: z.number(),
  action: z.string().optional(),
});

const leaderboardSchema = z.object({
  parcours_id: z.string().uuid().optional().nullable(),
  limit: z.number().optional(),
}).optional();

const studentBadgesSchema = z.object({
  etudiant_id: z.string().uuid().optional(),
}).optional();

async function addXPInternal(
  actorUserId: string,
  payload: z.infer<typeof addXPSchema>,
) {
  const { etudiant_id, parcours_id, xp_amount } = payload;

  const { data: userRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", actorUserId)
    .single();

  if (actorUserId !== etudiant_id && !["admin", "professeur"].includes(userRole?.role || "")) {
    throw new Error("Non autorisé");
  }

  let existingQuery = supabaseAdmin
    .from("xp_etudiants")
    .select("total_xp, niveau")
    .eq("etudiant_id", etudiant_id);

  existingQuery = parcours_id
    ? existingQuery.eq("parcours_id", parcours_id)
    : existingQuery.is("parcours_id", null);

  const { data: existing } = await existingQuery.maybeSingle();

  let total_xp = existing?.total_xp || 0;
  let niveau = existing?.niveau || 1;

  total_xp += xp_amount;
  niveau = Math.floor(total_xp / 100) + 1;

  const { data: result, error } = await supabaseAdmin
    .from("xp_etudiants")
    .upsert({
      etudiant_id,
      parcours_id: parcours_id ?? null,
      total_xp,
      niveau,
      date_mise_a_jour: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    ...result,
    xp_gagne: xp_amount,
    niveau_augmente: niveau > (existing?.niveau || 1),
    ancien_niveau: existing?.niveau || 1,
  };
}

// === AJOUTER DE L'XP ===
export const addXP = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => addXPSchema.parse(data))
  .handler(async ({ context, data }: { context: any; data: any }) => {
    return addXPInternal(context.userId, data);
  });

// === ENREGISTRER UNE CONNEXION (Streak) ===

export const getStudentXP = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: any }) => {
    const { data, error } = await supabaseAdmin
      .from("xp_etudiants")
      .select("*")
      .eq("etudiant_id", context.userId)
      .order("total_xp", { ascending: false });

    if (error) throw error;
    return data;
  });

export const recordConnexion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: any }) => {
    const today = new Date().toISOString().split("T")[0];

    // Vérifier si déjà connecté aujourd'hui
    const { data: existing } = await supabaseAdmin
      .from("connexions")
      .select("id, streak, date")
      .eq("etudiant_id", context.userId)
      .order("date", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const lastDate = existing[0].date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastDate === today) {
        return { streak: existing[0].streak, already_recorded: true };
      } else if (lastDate === yesterdayStr) {
        // Continuer le streak
        const newStreak = (existing[0].streak || 0) + 1;
        const { error } = await supabaseAdmin
          .from("connexions")
          .insert({ etudiant_id: context.userId, date: today, streak: newStreak });

        if (error) throw error;

        // Bonus XP pour le streak (5 XP par jour, doublé après 7 jours)
        const xp_bonus = newStreak >= 7 ? 10 : 5;
        await addXPInternal(context.userId, {
          etudiant_id: context.userId,
          parcours_id: null,
          xp_amount: xp_bonus,
          action: "connexion_streak",
        });

        return { streak: newStreak, xp_bonus };
      } else {
        // Reset streak
        const { error } = await supabaseAdmin
          .from("connexions")
          .insert({ etudiant_id: context.userId, date: today, streak: 1 });

        if (error) throw error;
        return { streak: 1 };
      }
    } else {
      // Premier streak
      const { error } = await supabaseAdmin
        .from("connexions")
        .insert({ etudiant_id: context.userId, date: today, streak: 1 });

      if (error) throw error;

      // Bonus XP pour première connexion
      await addXPInternal(context.userId, {
        etudiant_id: context.userId,
        parcours_id: null,
        xp_amount: 5,
        action: "premiere_connexion",
      });

      return { streak: 1, xp_bonus: 5 };
    }
  });

// === RÉCUPÉRER LE LEADERBOARD ===
export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => leaderboardSchema.parse(data))
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { parcours_id, limit } = data || { limit: 10 };

    let query = supabaseAdmin
      .from("xp_etudiants")
      .select(`
        etudiant_id,
        total_xp,
        niveau,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .order("total_xp", { ascending: false })
      .limit(limit || 10);

    if (parcours_id) {
      query = query.eq("parcours_id", parcours_id);
    }

    const { data: result, error } = await query;
    if (error) throw error;
    return result;
  });

// === RÉCUPÉRER LES BADGES ===
export const getStudentBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => studentBadgesSchema.parse(data))
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { etudiant_id } = data || {};

    const targetId = etudiant_id || context.userId;

    const { data: result, error } = await supabaseAdmin
      .from("badges_etudiants")
      .select(`
        *,
        badges (
          id,
          code,
          nom,
          icone,
          condition_type
        )
      `)
      .eq("etudiant_id", targetId)
      .order("date_obtention", { ascending: false });

    if (error) throw error;
    return result;
  });
