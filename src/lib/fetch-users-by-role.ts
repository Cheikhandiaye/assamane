import { supabase } from "@/integrations/supabase/client";

export type RoleUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at?: string;
};

// Contourne l'absence de FK directe user_roles <-> profiles :
// deux requêtes séparées fusionnées en JS.
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

// Étudiants rattachés à un partenaire donné (rôle etudiant ET profiles.partenaire_id = X).
export async function fetchStudentsByPartner(partenaireId: string): Promise<RoleUser[]> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "etudiant");
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids)
    .eq("partenaire_id", partenaireId);
  return (profs ?? []) as RoleUser[];
}
