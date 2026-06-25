import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "professeur" | "etudiant" | "partenaire";

export interface CurrentUser {
  user: User | null;
  role: AppRole | null;
  fullName: string | null;
  loading: boolean;
}

export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({
    user: null,
    role: null,
    fullName: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load(user: User | null) {
      if (!user) {
        if (!cancelled) setState({ user: null, role: null, fullName: null, loading: false });
        return;
      }
      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setState({
        user,
        role: (roleRow?.role as AppRole | undefined) ?? null,
        fullName: profile?.full_name ?? null,
        loading: false,
      });
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}