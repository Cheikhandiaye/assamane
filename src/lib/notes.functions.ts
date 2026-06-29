import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// === NOTES QUIZ ===

export const submitQuizNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { contenu_id, module_id, parcours_id, tentative, answers, temps_utilise } = data as {
      contenu_id: string;
      module_id: string;
      parcours_id: string;
      tentative: number;
      answers: Record<string, number>;
      temps_utilise?: number;
    };
    // Étudiant authentifié uniquement — on ignore tout etudiant_id côté client.
    const etudiant_id = context.userId;

    // Vérifier le nombre de tentatives max (2)
    const { count } = await supabaseAdmin
      .from("notes_quiz")
      .select("*", { count: "exact" })
      .eq("etudiant_id", etudiant_id)
      .eq("module_id", module_id)
      .eq("parcours_id", parcours_id);

    if (count && count >= 2) {
      throw new Error("Nombre maximum de tentatives atteint (2)");
    }

    // Récupérer les questions du quiz côté serveur — jamais de note fournie par le client.
    const { data: contenu, error: contenuError } = await supabaseAdmin
      .from("contenus_module")
      .select("quiz_questions, module_id, type")
      .eq("id", contenu_id)
      .single();

    if (contenuError || !contenu || contenu.type !== "quiz" || contenu.module_id !== module_id) {
      throw new Error("Quiz introuvable");
    }

    const questions = (contenu.quiz_questions as Array<{ correct: number }>) ?? [];
    if (!questions.length) throw new Error("Quiz sans question");

    let correct = 0;
    questions.forEach((q, i) => {
      if (answers && answers[String(i)] === q.correct) correct++;
    });
    let note_finale = Math.round((correct / questions.length) * 100);

    // Pénalité si 2e essai
    if (tentative === 2) {
      const { data: module } = await supabaseAdmin
        .from("modules_cours")
        .select("penalite_deuxieme_essai")
        .eq("id", module_id)
        .single();

      note_finale = note_finale * (1 - (module?.penalite_deuxieme_essai || 0.25));
    }

    const { data: result, error } = await supabaseAdmin
      .from("notes_quiz")
      .insert({
        etudiant_id,
        module_id,
        parcours_id,
        tentative,
        note: note_finale,
        temps_utilise,
      })
      .select()
      .single();

    if (error) throw error;

    // Vérifier si le quiz est réussi
    const { data: module } = await supabaseAdmin
      .from("modules_cours")
      .select("seuil_reussite")
      .eq("id", module_id)
      .single();

    const reussi = note_finale >= (module?.seuil_reussite || 70);

    return { ...result, reussi };
  });

// === NOTES CARNET ===

export const submitCarnetNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { etudiant_id, module_id, parcours_id, note, feedback } = data;

    // Seul un prof ou admin peut noter
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (!["admin", "professeur"].includes(userRole?.role || "")) {
      throw new Error("Seul un professeur ou admin peut noter le carnet");
    }

    const { data: result, error } = await supabaseAdmin
      .from("notes_carnet")
      .upsert({
        etudiant_id,
        module_id,
        parcours_id,
        note,
        feedback,
      })
      .select()
      .single();

    if (error) throw error;

    // Déclencher le calcul de la note finale
    await supabaseAdmin.rpc("fn_calcul_note_finale_module", {
      p_etudiant_id: etudiant_id,
      p_module_id: module_id,
      p_parcours_id: parcours_id,
    });

    return result;
  });

// === GROUPES ===

export const getStudentNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: any }) => {
    const { data, error } = await supabaseAdmin
      .from("notes_finales_module")
      .select("module_id, parcours_id, note_finale, modules_cours(titre, ordre)")
      .eq("etudiant_id", context.userId)
      .order("date_calcul", { ascending: false });

    if (error) throw error;
    return data;
  });

export const createGroupe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { nom, parcours_id, etudiant_ids, rapporteur_id } = data;

    // Seul un prof ou admin peut créer un groupe
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (!["admin", "professeur"].includes(userRole?.role || "")) {
      throw new Error("Seul un professeur ou admin peut créer un groupe");
    }

    // Créer le groupe
    const { data: groupe, error: groupeError } = await supabaseAdmin
      .from("groupes")
      .insert({
        nom,
        parcours_id,
        rapporteur_id,
        created_by: context.userId,
      })
      .select()
      .single();

    if (groupeError) throw groupeError;

    // Ajouter les membres
    const membres = etudiant_ids.map((etudiant_id: string) => ({
      groupe_id: groupe.id,
      etudiant_id,
    }));

    const { error: membresError } = await supabaseAdmin
      .from("groupe_membres")
      .insert(membres);

    if (membresError) throw membresError;

    return groupe;
  });

export const updateGroupeRapporteur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { groupe_id, rapporteur_id } = data;

    // Vérifier que l'utilisateur est prof ou admin
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (!["admin", "professeur"].includes(userRole?.role || "")) {
      throw new Error("Non autorisé");
    }

    const { error } = await supabaseAdmin
      .from("groupes")
      .update({ rapporteur_id })
      .eq("id", groupe_id);

    if (error) throw error;

    return { success: true };
  });

export const addMembreToGroupe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { groupe_id, etudiant_id } = data;

    // Vérifier que l'utilisateur est prof ou admin
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (!["admin", "professeur"].includes(userRole?.role || "")) {
      throw new Error("Non autorisé");
    }

    const { error } = await supabaseAdmin
      .from("groupe_membres")
      .insert({ groupe_id, etudiant_id });

    if (error) throw error;

    return { success: true };
  });

export const removeMembreFromGroupe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { groupe_id, etudiant_id } = data;

    // Vérifier que l'utilisateur est prof ou admin
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (!["admin", "professeur"].includes(userRole?.role || "")) {
      throw new Error("Non autorisé");
    }

    const { error } = await supabaseAdmin
      .from("groupe_membres")
      .delete()
      .eq("groupe_id", groupe_id)
      .eq("etudiant_id", etudiant_id);

    if (error) throw error;

    return { success: true };
  });

// === XP ET GAMIFICATION ===

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

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { parcours_id } = data || {};

    let query = supabaseAdmin
      .from("xp_etudiants")
      .select("etudiant_id, total_xp, niveau, profiles(full_name, avatar_url)")
      .order("total_xp", { ascending: false })
      .limit(10);

    if (parcours_id) {
      query = query.eq("parcours_id", parcours_id);
    }

    const { data: result, error } = await query;
    if (error) throw error;
    return result;
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
        return { streak: newStreak };
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
      return { streak: 1 };
    }
  });
