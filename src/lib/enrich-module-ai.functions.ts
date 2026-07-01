import { createServerFn } from "@tanstack/react-start";
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

type Input = {
  module_id: string;
  titre?: string;
  source_text: string;
  carnet_text?: string;
  categorie?: string;
  replace?: boolean;
};

type Section = { titre: string; contenu: string };
type Question = { question: string; options: string[]; correct: number };

const SYSTEM_PROMPT = `Tu es un expert pédagogique francophone spécialisé dans l'entrepreneuriat.
À partir de la matière brute fournie par l'utilisateur, tu dois PRODUIRE un module de cours COMPLET, riche, structuré et prêt à être utilisé par des étudiants.

Exigences OBLIGATOIRES :
1. "sections" : 4 à 7 sections de cours. Chaque section a un titre clair et un contenu LONG (600 à 1200 mots), rédigé en français, avec paragraphes, exemples concrets africains/sénégalais quand pertinent, définitions, listes à puces (markdown), sous-titres (### ...), et conclusion pratique.
2. "carnet" : 3 à 6 exercices/consignes de carnet inspirés du carnet fourni (si présent) — chaque item a un titre et une consigne détaillée.
3. "quiz" : EXACTEMENT 15 questions à choix multiples. Chaque question a EXACTEMENT 4 options (options[]) et un index "correct" (0..3) désignant la bonne réponse. Les questions doivent couvrir toute la matière, mélanger difficultés, et être auto-corrigibles sans ambiguïté.

RÉPONDS UNIQUEMENT avec un JSON valide, sans texte avant/après, sans balises markdown, correspondant EXACTEMENT à ce schéma :
{
  "titre": string,
  "description": string,
  "sections": [{ "titre": string, "contenu": string }],
  "carnet": [{ "titre": string, "consigne": string }],
  "quiz": [{ "question": string, "options": [string,string,string,string], "correct": 0|1|2|3 }]
}`;

export const enrichModuleAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d as Input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY absent — impossible d'appeler l'IA");
    if (!data.module_id) throw new Error("module_id requis");
    if (!data.source_text || data.source_text.trim().length < 20) {
      throw new Error("Fournis au moins un paragraphe de matière source");
    }

    const userPrompt = [
      data.titre ? `TITRE PROPOSÉ : ${data.titre}` : "",
      data.categorie ? `CATÉGORIE : ${data.categorie}` : "",
      "",
      "=== MATIÈRE SOURCE ===",
      data.source_text.slice(0, 60000),
      data.carnet_text ? "\n=== CARNET SOURCE (exercices à adapter) ===\n" + data.carnet_text.slice(0, 20000) : "",
    ].filter(Boolean).join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("Trop de requêtes — réessaie dans un instant.");
    if (res.status === 402) throw new Error("Crédits IA épuisés — recharge le workspace.");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`IA erreur ${res.status}: ${t.slice(0, 300)}`);
    }
    const payload = await res.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Réponse IA vide");

    let parsed: {
      titre?: string;
      description?: string;
      sections?: Section[];
      carnet?: { titre: string; consigne: string }[];
      quiz?: Question[];
    };
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      throw new Error("Réponse IA non JSON");
    }

    const sections = Array.isArray(parsed.sections) ? parsed.sections.filter((s) => s?.titre && s?.contenu) : [];
    const carnet = Array.isArray(parsed.carnet) ? parsed.carnet.filter((c) => c?.titre && c?.consigne) : [];
    const quiz = Array.isArray(parsed.quiz)
      ? parsed.quiz
          .filter(
            (q) =>
              q?.question &&
              Array.isArray(q.options) &&
              q.options.length === 4 &&
              typeof q.correct === "number" &&
              q.correct >= 0 &&
              q.correct < 4,
          )
          .slice(0, 15)
      : [];

    if (sections.length === 0) throw new Error("L'IA n'a produit aucune section exploitable");
    if (quiz.length < 10) throw new Error(`Quiz insuffisant (${quiz.length} questions valides)`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Optionnel : titre/description du module
    const modPatch: any = {};
    if (parsed.titre) modPatch.titre = parsed.titre;
    if (parsed.description) modPatch.description = parsed.description;
    if (Object.keys(modPatch).length) {
      await supabaseAdmin.from("modules_cours").update(modPatch).eq("id", data.module_id);
    }

    // Remplacement : purger contenus + étapes existantes
    if (data.replace) {
      await supabaseAdmin.from("contenus_module").delete().eq("module_id", data.module_id);
      await supabaseAdmin.from("etapes").delete().eq("module_id", data.module_id);
    }

    // Insérer sections en tant que blocs "texte"
    let ordre = 1;
    const contenusPayload = sections.map((s) => ({
      module_id: data.module_id,
      type: "texte" as const,
      titre: s.titre,
      contenu_texte: s.contenu,
      ordre: ordre++,
    }));

    // Bloc quiz final
    contenusPayload.push({
      module_id: data.module_id,
      type: "quiz" as any,
      titre: "Quiz de validation",
      contenu_texte: null as any,
      quiz_questions: quiz as any,
      quiz_score_min: 70 as any,
      quiz_duree_minutes: 15 as any,
      quiz_penalite_deuxieme_essai: 0.25 as any,
      ordre: ordre++,
    } as any);

    const { error: cErr } = await supabaseAdmin.from("contenus_module").insert(contenusPayload as any);
    if (cErr) throw new Error("Insertion contenus : " + cErr.message);

    // Insérer carnet en tant qu'étapes
    if (carnet.length) {
      let ord = 1;
      const etapesPayload = carnet.map((c) => ({
        module_id: data.module_id,
        titre: c.titre,
        description: c.consigne,
        type: "individuel",
        ordre: ord++,
        champs: [
          { key: "reponse", label: "Ta réponse", type: "textarea", required: true },
        ] as any,
      }));
      const { error: eErr } = await supabaseAdmin.from("etapes").insert(etapesPayload as any);
      if (eErr) throw new Error("Insertion carnet : " + eErr.message);
    }

    return {
      sections_inserees: sections.length,
      carnet_inseres: carnet.length,
      quiz_questions: quiz.length,
    };
  });