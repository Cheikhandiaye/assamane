import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface CurrentUser {
  user: User | null;
  role: string | null;
  fullName: string | null;
  isLoading: boolean;
}

export function useCurrentUser(): CurrentUser {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        // Récupérer la session
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData?.session?.user || null;
        setUser(currentUser);

        if (currentUser) {
          // Récupérer le rôle via RPC au lieu de REST
          const { data: roleData, error: roleError } = await supabase
            .rpc("get_user_role", { p_user_id: currentUser.id });

          if (roleError) {
            console.warn("Erreur récupération rôle:", roleError);
          } else {
            setRole(roleData);
          }

          // Récupérer le nom via RPC
          const { data: profileData, error: profileError } = await supabase
            .rpc("get_user_profile", { p_user_id: currentUser.id });

          if (profileError) {
            console.warn("Erreur récupération profil:", profileError);
          } else {
            setFullName(profileData?.full_name || null);
          }
        }
      } catch (error) {
        console.error("Erreur useCurrentUser:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, role, fullName, isLoading };
}
