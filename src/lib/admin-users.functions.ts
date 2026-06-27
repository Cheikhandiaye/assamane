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
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
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
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const authPatch: any = {};
    if (data.email) {
      authPatch.email = data.email;
      authPatch.email_confirm = true; // garder le compte auto-validé après changement d'email
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
  .inputValidator((d) => deleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("Tu ne peux pas supprimer ton propre compte.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });