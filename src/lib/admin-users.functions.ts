import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "admin" | "professeur" | "etudiant" | "partenaire";

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

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  role: z.enum(["admin", "professeur", "etudiant", "partenaire"]),
  partenaire_id: z.string().uuid().nullish(),
});

export const createUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    // Validation manuelle
    if (!data.email) throw new Error("Email requis");
    if (!data.password || data.password.length < 8) throw new Error("Mot de passe minimum 8 caractères");
    if (!data.full_name) throw new Error("Nom complet requis");
    if (!data.role) throw new Error("Rôle requis");

    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Compte auth auto-validé (email_confirm + mot de passe défini) — connexion immédiate.
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;

    // Profil : upsert pour absorber le trigger handle_new_user et garantir la persistance.
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: uid,
          email: data.email,
          full_name: data.full_name,
          partenaire_id: data.partenaire_id ?? null,
        },
        { onConflict: "id" },
      );
    if (pErr) throw new Error(pErr.message);

    // Rôle : on remplace systématiquement le défaut posé par le trigger.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: data.role as Role });
    if (rErr) throw new Error(rErr.message);

    return { id: uid };
  });

const updateSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional().or(z.literal("")),
  role: z.enum(["admin", "professeur", "etudiant", "partenaire"]).optional(),
  partenaire_id: z.string().uuid().nullish(),
});

export const updateUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    // Validation manuelle
    if (!data.user_id) throw new Error("ID utilisateur requis");

    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const authPatch: any = {};
    if (data.email) {
      authPatch.email = data.email;
      authPatch.email_confirm = true;
    }
    if (data.password) authPatch.password = data.password;
    if (Object.keys(authPatch).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, authPatch);
      if (error) throw new Error(error.message);
    }
    
    const profPatch: any = {};
    if (data.full_name !== undefined) profPatch.full_name = data.full_name;
    if (data.email !== undefined) profPatch.email = data.email;
    if (data.partenaire_id !== undefined) profPatch.partenaire_id = data.partenaire_id;
    if (Object.keys(profPatch).length) {
      const { error } = await supabaseAdmin.from("profiles").update(profPatch).eq("id", data.user_id);
      if (error) throw new Error(error.message);
    }
    
    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

const deleteSchema = z.object({ user_id: z.string().uuid() });

export const deleteUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    // Validation manuelle
    if (!data.user_id) throw new Error("ID utilisateur requis");

    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Tu ne peux pas supprimer ton propre compte.");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = data.user_id;

    // =============================================
    // 1. Gérer les dépendances avant suppression
    // =============================================

    // 1.1 Vérifier si l'utilisateur est rapporteur d'un groupe
    const { data: groupesRapporteur, error: g1 } = await supabaseAdmin
      .from("groupes")
      .select("id, groupe_membres(etudiant_id)")
      .eq("rapporteur_id", userId);

    if (g1) throw new Error(`Erreur vérification groupes: ${g1.message}`);

    if (groupesRapporteur && groupesRapporteur.length > 0) {
      for (const groupe of groupesRapporteur) {
        const autresMembres = (groupe.groupe_membres || [])
          .filter((m: any) => m.etudiant_id !== userId)
          .map((m: any) => m.etudiant_id);

        if (autresMembres.length > 0) {
          // Changer le rapporteur vers un autre membre
          const { error: updateError } = await supabaseAdmin
            .from("groupes")
            .update({ rapporteur_id: autresMembres[0] })
            .eq("id", groupe.id);
          
          if (updateError) throw new Error(`Erreur changement rapporteur: ${updateError.message}`);
        } else {
          // Supprimer le groupe (aucun autre membre)
          const { error: deleteError } = await supabaseAdmin
            .from("groupes")
            .delete()
            .eq("id", groupe.id);
          
          if (deleteError) throw new Error(`Erreur suppression groupe: ${deleteError.message}`);
        }
      }
    }

    // 1.2 Retirer l'utilisateur des groupes (membre)
    const { error: g2 } = await supabaseAdmin
      .from("groupe_membres")
      .delete()
      .eq("etudiant_id", userId);
    
    if (g2) throw new Error(`Erreur retrait des groupes: ${g2.message}`);

    // 1.3 Supprimer les inscriptions aux parcours
    const { error: p1 } = await supabaseAdmin
      .from("parcours_etudiants")
      .delete()
      .eq("etudiant_id", userId);
    
    if (p1) throw new Error(`Erreur suppression inscriptions: ${p1.message}`);

    // 1.4 Supprimer de parcours_professeurs (si professeur)
    const { error: p2 } = await supabaseAdmin
      .from("parcours_professeurs")
      .delete()
      .eq("professeur_id", userId);
    
    if (p2) throw new Error(`Erreur suppression parcours profs: ${p2.message}`);

    // 1.5 Supprimer les sessions (si professeur)
    const { error: s1 } = await supabaseAdmin
      .from("sessions_cours")
      .delete()
      .eq("professeur_id", userId);
    
    if (s1) throw new Error(`Erreur suppression sessions: ${s1.message}`);

    // 1.6 Supprimer les réponses
    const { error: r1 } = await supabaseAdmin
      .from("reponses_etudiant")
      .delete()
      .eq("etudiant_id", userId);
    
    if (r1) throw new Error(`Erreur suppression réponses: ${r1.message}`);

    // 1.7 Supprimer les réponses de groupe
    const { error: r2 } = await supabaseAdmin
      .from("reponses_groupe")
      .delete()
      .eq("etudiant_id", userId);
    
    if (r2) throw new Error(`Erreur suppression réponses groupe: ${r2.message}`);

    // 1.8 Supprimer les badges
    const { error: b1 } = await supabaseAdmin
      .from("badges_etudiants")
      .delete()
      .eq("etudiant_id", userId);
    
    if (b1) throw new Error(`Erreur suppression badges: ${b1.message}`);

    // 1.9 Supprimer les notes
    const { error: n1 } = await supabaseAdmin
      .from("notes_quiz")
      .delete()
      .eq("etudiant_id", userId);
    
    if (n1) throw new Error(`Erreur suppression notes quiz: ${n1.message}`);

    const { error: n2 } = await supabaseAdmin
      .from("notes_carnet")
      .delete()
      .eq("etudiant_id", userId);
    
    if (n2) throw new Error(`Erreur suppression notes carnet: ${n2.message}`);

    const { error: n3 } = await supabaseAdmin
      .from("notes_finales_module")
      .delete()
      .eq("etudiant_id", userId);
    
    if (n3) throw new Error(`Erreur suppression notes finales: ${n3.message}`);

    // 1.10 Supprimer les notifications
    const { error: notif } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("destinataire_id", userId);
    
    if (notif) throw new Error(`Erreur suppression notifications: ${notif.message}`);

    // 1.11 Supprimer les connexions (streak)
    const { error: c1 } = await supabaseAdmin
      .from("connexions")
      .delete()
      .eq("etudiant_id", userId);
    
    if (c1) throw new Error(`Erreur suppression connexions: ${c1.message}`);

    // 1.12 Supprimer XP
    const { error: x1 } = await supabaseAdmin
      .from("xp_etudiants")
      .delete()
      .eq("etudiant_id", userId);
    
    if (x1) throw new Error(`Erreur suppression XP: ${x1.message}`);

    // 1.13 Supprimer les accès module
    const { error: a1 } = await supabaseAdmin
      .from("acces_module")
      .delete()
      .eq("etudiant_id", userId);
    
    if (a1) throw new Error(`Erreur suppression accès: ${a1.message}`);

    // 1.14 Supprimer le suivi contenu
    const { error: sc } = await supabaseAdmin
      .from("suivi_contenu")
      .delete()
      .eq("etudiant_id", userId);
    
    if (sc) throw new Error(`Erreur suppression suivi: ${sc.message}`);

    // 1.15 Supprimer les demandes de prolongation
    const { error: d1 } = await supabaseAdmin
      .from("demandes_prolongation")
      .delete()
      .eq("etudiant_id", userId);
    
    if (d1) throw new Error(`Erreur suppression prolongations: ${d1.message}`);

    // 1.16 Supprimer les présences
    const { error: pr } = await supabaseAdmin
      .from("presences")
      .delete()
      .eq("etudiant_id", userId);
    
    if (pr) throw new Error(`Erreur suppression présences: ${pr.message}`);

    // =============================================
    // 2. Supprimer le profil et le rôle
    // =============================================

    // 2.1 Supprimer le rôle
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (roleError) throw new Error(`Erreur suppression rôle: ${roleError.message}`);

    // 2.2 Supprimer le profil
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) throw new Error(`Erreur suppression profil: ${profileError.message}`);

    // =============================================
    // 3. Supprimer de auth.users
    // =============================================
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) throw new Error(`Erreur suppression compte auth: ${authError.message}`);

    return { ok: true, message: "Utilisateur supprimé avec succès" };
  });
