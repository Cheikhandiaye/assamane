import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// === CRÉER UN GROUPE ===
export const createGroupe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { nom, parcours_id, etudiant_ids, rapporteur_id } = data;

    // Validation manuelle
    if (!nom || nom.trim().length === 0) {
      throw new Error("Le nom du groupe est requis");
    }
    if (!parcours_id) {
      throw new Error("Le parcours est requis");
    }
    if (!etudiant_ids || etudiant_ids.length < 2) {
      throw new Error("Un groupe doit avoir au moins 2 étudiants");
    }
    if (!rapporteur_id) {
      throw new Error("Le rapporteur est requis");
    }

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
        nom: nom.trim(),
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

    // Créer le suivi pour tous les modules du parcours
    const { data: modules } = await supabaseAdmin
      .from("modules_cours")
      .select("id")
      .eq("parcours_id", parcours_id)
      .order("ordre", { ascending: true });

    if (modules && modules.length > 0) {
      const suiviModules = modules.map((module) => ({
        groupe_id: groupe.id,
        module_id: module.id,
        statut: "en_cours",
      }));

      await supabaseAdmin.from("suivi_groupe_module").insert(suiviModules);
    }

    return groupe;
  });

// === METTRE À JOUR LE RAPPORTEUR ===
export const updateGroupeRapporteur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { groupe_id, rapporteur_id } = data;

    if (!groupe_id || !rapporteur_id) {
      throw new Error("Groupe et rapporteur requis");
    }

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

// === AJOUTER UN MEMBRE AU GROUPE ===
export const addMembreToGroupe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { groupe_id, etudiant_id } = data;

    if (!groupe_id || !etudiant_id) {
      throw new Error("Groupe et étudiant requis");
    }

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

// === RETIRER UN MEMBRE DU GROUPE ===
export const removeMembreFromGroupe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { groupe_id, etudiant_id } = data;

    if (!groupe_id || !etudiant_id) {
      throw new Error("Groupe et étudiant requis");
    }

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

// === RÉCUPÉRER LES GROUPES D'UN PROFESSEUR ===
export const getProfessorGroupes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: { context: any }) => {
    const { data: userRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .single();

    if (userRole?.role === "admin") {
      // Admin voit tous les groupes
      const { data, error } = await supabaseAdmin
        .from("groupes")
        .select(`
          *,
          parcours (
            id,
            titre,
            mission_id
          ),
          groupe_membres (
            etudiant_id,
            profiles (
              id,
              full_name,
              avatar_url
            )
          ),
          suivi_groupe_module (
            module_id,
            statut,
            date_debut,
            date_fin
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    }

    // Professeur voit les groupes des parcours qu'il enseigne
    const { data: profParcours } = await supabaseAdmin
      .from("parcours_professeurs")
      .select("parcours_id")
      .eq("professeur_id", context.userId);

    const parcoursIds = (profParcours || []).map(p => p.parcours_id);

    if (!parcoursIds || parcoursIds.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("groupes")
      .select(`
        *,
        parcours (
          id,
          titre,
          mission_id
        ),
        groupe_membres (
          etudiant_id,
          profiles (
            id,
            full_name,
            avatar_url
          )
        ),
        suivi_groupe_module (
          module_id,
          statut,
          date_debut,
          date_fin
        )
      `)
      .in("parcours_id", parcoursIds)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  });

// === RÉCUPÉRER LE GROUPE D'UN ÉTUDIANT ===
export const getStudentGroupe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { parcours_id } = data || {};
    
    let query = supabaseAdmin
      .from("groupes")
      .select(`
        *,
        parcours (
          id,
          titre,
          mission_id
        ),
        groupe_membres (
          etudiant_id,
          profiles (
            id,
            full_name,
            avatar_url
          )
        ),
        suivi_groupe_module (
          module_id,
          statut,
          date_debut,
          date_fin
        )
      `)
      .eq("groupe_membres.etudiant_id", context.userId);

    if (parcours_id) {
      query = query.eq("parcours_id", parcours_id);
    }

    const { data: result, error } = await query;
    if (error) throw error;
    return result?.[0] || null;
  });

// === SOUMETTRE UN CARNET DE GROUPE ===
export const submitGroupeCarnet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }: { context: any; data: any }) => {
    const { groupe_id, module_id, etape_id, parcours_id, contenu } = data;

    if (!groupe_id) {
      throw new Error("Groupe requis");
    }

    // Vérifier que l'utilisateur est le rapporteur du groupe
    const { data: groupe } = await supabaseAdmin
      .from("groupes")
      .select("rapporteur_id")
      .eq("id", groupe_id)
      .single();

    if (groupe?.rapporteur_id !== context.userId) {
      throw new Error("Seul le rapporteur peut soumettre le carnet du groupe");
    }

    // Récupérer tous les membres du groupe
    const { data: membres } = await supabaseAdmin
      .from("groupe_membres")
      .select("etudiant_id")
      .eq("groupe_id", groupe_id);

    if (!membres || membres.length === 0) {
      throw new Error("Le groupe n'a pas de membres");
    }

    // Pour chaque membre, créer/soumettre une réponse de carnet
    const results = [];
    for (const membre of membres) {
      const { data: reponse, error } = await supabaseAdmin
        .from("reponses_groupe")
        .upsert({
          groupe_id,
          etape_id,
          module_id,
          parcours_id,
          contenu,
          statut: "soumis",
        })
        .select()
        .single();

      if (error) throw error;
      results.push(reponse);
    }

    // Mettre à jour le suivi du groupe
    if (module_id) {
      await supabaseAdmin
        .from("suivi_groupe_module")
        .update({ statut: "en_attente_validation" })
        .eq("groupe_id", groupe_id)
        .eq("module_id", module_id);
    }

    return { success: true, count: results.length };
  });
