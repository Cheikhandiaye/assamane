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

type Row = {
  full_name: string;
  email: string;
  password?: string | null;
};

type Input = {
  partenaire_id: string | null;
  parcours_id: string | null;
  mode?: string | null;
  rows: Row[];
};

function randomPassword() {
  return "Assirik!" + Math.random().toString(36).slice(2, 10);
}

export const importStudentsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => d as Input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const results: {
      email: string;
      status: "created" | "updated" | "error";
      message?: string;
      password?: string;
    }[] = [];

    for (const raw of data.rows || []) {
      const email = String(raw.email || "").trim().toLowerCase();
      const full_name = String(raw.full_name || "").trim();
      if (!email || !full_name) {
        results.push({ email, status: "error", message: "Nom ou email manquant" });
        continue;
      }
      const password = (raw.password && String(raw.password).length >= 8)
        ? String(raw.password)
        : randomPassword();

      try {
        // Vérifier si l'utilisateur existe déjà (par email dans profiles)
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        let uid: string;
        let created = false;

        if (existing?.id) {
          uid = existing.id;
        } else {
          const { data: c, error: e } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name },
          });
          if (e) throw new Error(e.message);
          uid = c.user!.id;
          created = true;
        }

        // upsert profile + partenaire
        const { error: pErr } = await supabaseAdmin
          .from("profiles")
          .upsert(
            {
              id: uid,
              email,
              full_name,
              partenaire_id: data.partenaire_id ?? null,
            },
            { onConflict: "id" },
          );
        if (pErr) throw new Error(pErr.message);

        // rôle etudiant
        await supabaseAdmin.from("user_roles").delete().eq("user_id", uid).eq("role", "etudiant");
        await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "etudiant" });

        // inscription parcours
        if (data.parcours_id) {
          await supabaseAdmin
            .from("parcours_etudiants")
            .upsert(
              {
                etudiant_id: uid,
                parcours_id: data.parcours_id,
                mode: data.mode || "presentiel",
              },
              { onConflict: "parcours_id,etudiant_id" },
            );
        }

        results.push({
          email,
          status: created ? "created" : "updated",
          password: created ? password : undefined,
        });
      } catch (err: any) {
        results.push({ email, status: "error", message: err?.message || String(err) });
      }
    }

    return {
      total: results.length,
      created: results.filter((r) => r.status === "created").length,
      updated: results.filter((r) => r.status === "updated").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };
  });