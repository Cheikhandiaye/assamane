import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Rocket,
  LogOut,
  LayoutDashboard,
  Building2,
  Target,
  BookOpen,
  GraduationCap,
  Users,
  Library,
  ClipboardList,
  CalendarCheck,
  CheckSquare,
  Clock,
  Settings,
  Layers,
  Menu,
  X,
  Home,
  NotebookPen,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser, type AppRole } from "@/hooks/use-current-user";
import { NotificationBell } from "@/components/notification-panel";
import { ConnectionIndicator } from "@/components/connection-indicator";
import { OfflineBanner } from "@/components/offline-banner";
import { applyBrand } from "@/lib/branding";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrateur",
  professeur: "Professeur",
  etudiant: "Étudiant",
  partenaire: "Partenaire",
};

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  admin: [
    { label: "Tableau de bord", to: "/admin", icon: LayoutDashboard },
    { label: "Partenaires", to: "/admin/partenaires", icon: Building2 },
    { label: "Missions", to: "/admin/missions", icon: Target },
    { label: "Parcours", to: "/admin/parcours", icon: BookOpen },
    { label: "Professeurs", to: "/admin/professeurs", icon: GraduationCap },
    { label: "Étudiants", to: "/admin/etudiants", icon: Users },
    { label: "Bibliothèque", to: "/admin/bibliotheque", icon: Library },
    { label: "Cahier de texte", to: "/admin/cahier-de-texte", icon: ClipboardList },
    { label: "Sessions", to: "/admin/sessions", icon: CalendarCheck },
    { label: "Validations", to: "/admin/validations", icon: CheckSquare },
    { label: "Prolongations", to: "/admin/prolongations", icon: Clock },
    { label: "Paramètres", to: "/admin/parametres", icon: Settings },
  ],
  professeur: [
    { label: "Mon tableau de bord", to: "/professeur", icon: LayoutDashboard },
    { label: "Partenaires", to: "/professeur/partenaires", icon: Building2 },
    { label: "Mes missions", to: "/professeur/missions", icon: Target },
    { label: "Mes parcours", to: "/professeur/parcours", icon: BookOpen },
    { label: "Mes étudiants", to: "/professeur/etudiants", icon: Users },
    { label: "Validations", to: "/professeur/validations", icon: CheckSquare },
    { label: "Mes modules", to: "/professeur/modules", icon: Layers },
    { label: "Prolongations", to: "/professeur/prolongations", icon: Clock },
  ],
  etudiant: [
    { label: "Accueil", to: "/etudiant", icon: Home },
    { label: "Parcours", to: "/etudiant/parcours", icon: BookOpen },
    { label: "Carnet", to: "/etudiant/carnet", icon: NotebookPen },
    { label: "Groupe", to: "/etudiant/groupe", icon: Users },
    { label: "Badges", to: "/etudiant/badges", icon: Trophy },
  ],
  partenaire: [
    { label: "Tableau de bord", to: "/partenaire", icon: LayoutDashboard },
    { label: "Mes missions", to: "/partenaire/missions", icon: Target },
    { label: "Mes étudiants", to: "/partenaire/etudiants", icon: Users },
  ],
};

export function AssirikShell({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const { fullName, role, user } = useCurrentUser();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [brand, setBrand] = useState<{ nom: string; logo_url: string | null } | null>(null);

  useEffect(() => {
    if (role !== "partenaire" || !user) {
      applyBrand(null);
      setBrand(null);
      return;
    }
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("partenaire_id").eq("id", user.id).maybeSingle();
      if (!prof?.partenaire_id) return;
      const { data: p } = await supabase
        .from("partenaires")
        .select("nom, logo_url, couleur_primaire, couleur_secondaire")
        .eq("id", prof.partenaire_id)
        .maybeSingle();
      if (p) {
        applyBrand({ couleur_primaire: p.couleur_primaire, couleur_secondaire: p.couleur_secondaire });
        setBrand({ nom: p.nom, logo_url: p.logo_url });
      }
    })();
    return () => applyBrand(null);
  }, [role, user?.id]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const items = role ? NAV_BY_ROLE[role] : [];
  const isEtudiant = role === "etudiant";

  function isActive(to: string) {
    if (to === `/${role}`) return pathname === to || pathname === `${to}/`;
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  const SidebarContent = (
    <>
      <Link to="/" className="flex items-center gap-2 px-1">
        {brand?.logo_url ? (
          <img src={brand.logo_url} alt={brand.nom} className="h-7 w-auto" />
        ) : (
          <Rocket size={24} style={{ color: "var(--brand-primary, #7C3AED)" }} />
        )}
        <span className="font-bold text-xl text-white truncate">{brand?.nom ?? "ASSIRIK"}</span>
      </Link>
      <nav className="mt-4 flex flex-col gap-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon size={20} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-4 text-white">
        <p className="truncate text-sm font-medium">{fullName ?? user?.email}</p>
        <p className="text-xs text-slate-400">{role ? ROLE_LABEL[role] : ""}</p>
        <button
          onClick={handleSignOut}
          className="mt-3 flex items-center gap-2 text-sm text-slate-300 hover:text-white"
        >
          <LogOut size={18} /> Se déconnecter
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-secondary">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-60 shrink-0 flex-col gap-2 p-5"
        style={{ backgroundColor: "#1E1B4B" }}
      >
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="flex w-64 flex-col gap-2 p-5 shadow-2xl"
            style={{ backgroundColor: "#1E1B4B" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="self-end rounded-full p-1 text-white hover:bg-white/10"
              onClick={() => setMobileOpen(false)}
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
            {SidebarContent}
          </aside>
          <div className="flex-1 bg-black/40" />
        </div>
      )}

      <div className={cn("flex min-w-0 flex-1 flex-col", isEtudiant && "pb-20 md:pb-0")}>
        <OfflineBanner />
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:px-6">
          <button
            className="md:hidden rounded-lg p-1.5 hover:bg-muted"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg md:text-xl font-bold text-foreground">{title}</h1>
          <ConnectionIndicator />
          <NotificationBell userId={user?.id} />
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>

        {/* Mobile bottom nav for students */}
        {isEtudiant && (
          <nav
            className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-border bg-card md:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-slate-400",
                  )}
                >
                  <Icon size={22} />
                  <span>{item.label}</span>
                  {active && <span className="h-1 w-1 rounded-full bg-primary" />}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}