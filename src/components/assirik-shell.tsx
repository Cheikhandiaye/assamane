import { Link, useRouter } from "@tanstack/react-router";
import { Rocket, LogOut, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import type { ReactNode } from "react";

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrateur",
  professeur: "Professeur",
  etudiant: "Étudiant",
  partenaire: "Partenaire",
};

export function AssirikShell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const { fullName, role, user } = useCurrentUser();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-secondary">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground p-6 gap-6">
        <Link to="/" className="flex items-center gap-2">
          <Rocket size={24} className="text-primary-foreground" style={{ color: "#7C3AED" }} />
          <span className="font-bold text-xl text-sidebar-foreground">ASSIRIK</span>
        </Link>
        <nav className="flex flex-col gap-1 mt-4">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-sidebar-accent text-sidebar-accent-foreground">
            <LayoutDashboard size={20} />
            <span className="font-medium">Tableau de bord</span>
          </div>
        </nav>
        <div className="mt-auto border-t border-sidebar-border pt-4">
          <p className="text-sm font-medium">{fullName ?? user?.email}</p>
          <p className="text-xs opacity-70">{role ? ROLE_LABEL[role] : ""}</p>
          <button
            onClick={handleSignOut}
            className="mt-3 flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-all duration-200"
          >
            <LogOut size={18} /> Se déconnecter
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <button
            onClick={handleSignOut}
            className="md:hidden inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            <LogOut size={18} /> Sortir
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}