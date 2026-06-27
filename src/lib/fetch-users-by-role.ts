import { supabase } from "@/integrations/supabase/client";

export type RoleUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at?: string;
};

// Contourne l'absence de clé étrangère directe entre user_roles et profiles :
// deux requêtes séparées (l'admin a le droit de lire les deux tables, c'est prouvé)
// fusionnées en JS, au lieu de l'embed PostgREST qui échoue.
export async function fetchUsersByRole(
  role: "etudiant" | "professeur" | "partenaire" | "admin",
  withCreatedAt = false,
): Promise<RoleUser[]> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", role);
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return [];
  const cols = withCreatedAt ? "id, full_name, email, created_at" : "id, full_name, email";
  const { data: profs } = await supabase.from("profiles").select(cols).in("id", ids);
  return (profs ?? []) as RoleUser[];
}
