import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { useRoleGuard } from "@/hooks/use-role-guard";

export const Route = createFileRoute("/_authenticated/etudiant/badges")({
  component: BadgesPage,
});

interface Badge {
  id: string;
  nom: string;
  icone: string | null;
  couleur: string | null;
  description: string | null;
  obtenu_le?: string;
}

function BadgesPage() {
  useRoleGuard("etudiant");
  const { user } = useCurrentUser();
  const [obtenus, setObtenus] = useState<Badge[]>([]);
  const [verrouilles, setVerrouilles] = useState<Badge[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: all }, { data: mine }] = await Promise.all([
        supabase.from("badges").select("*"),
        supabase.from("badges_etudiants").select("badge_id, obtenu_le").eq("etudiant_id", user.id),
      ]);
      const mineMap = new Map((mine ?? []).map((m) => [m.badge_id, m.obtenu_le as string]));
      const o: Badge[] = [], v: Badge[] = [];
      for (const b of ((all ?? []) as Badge[])) {
        if (mineMap.has(b.id)) o.push({ ...b, obtenu_le: mineMap.get(b.id) });
        else v.push(b);
      }
      setObtenus(o); setVerrouilles(v);
    })();
  }, [user]);

  return (
    <AssirikShell title="🏆 Mes badges">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Obtenus ({obtenus.length})</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {obtenus.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Pas encore de badge — valide ta première étape ! ✨</p>}
        {obtenus.map((b) => (
          <div key={b.id} className="rounded-2xl p-4 text-center shadow-sm text-white" style={{ backgroundColor: b.couleur ?? "#7C3AED" }}>
            <div className="text-3xl">{b.icone ?? "🏆"}</div>
            <p className="mt-2 text-sm font-bold">{b.nom}</p>
            {b.obtenu_le && <p className="text-[10px] opacity-80">Obtenu le {new Date(b.obtenu_le).toLocaleDateString("fr-FR")}</p>}
          </div>
        ))}
      </div>
      <h2 className="mt-6 mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">À débloquer ({verrouilles.length})</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {verrouilles.map((b) => (
          <div key={b.id} className="rounded-2xl bg-secondary p-4 text-center text-muted-foreground">
            <div className="text-3xl opacity-50 grayscale">{b.icone ?? "🔒"}</div>
            <p className="mt-2 text-sm font-bold">{b.nom}</p>
            <p className="text-[10px] italic">{b.description}</p>
          </div>
        ))}
      </div>
    </AssirikShell>
  );
}