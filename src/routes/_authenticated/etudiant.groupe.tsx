import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/etudiant/groupe")({
  component: GroupePage,
});

interface GroupeRow {
  id: string;
  nom: string;
  rapporteur_id: string | null;
  membres: { id: string; full_name: string | null }[];
}

function GroupePage() {
  const { user } = useCurrentUser();
  const [groupes, setGroupes] = useState<GroupeRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: gm } = await supabase.from("groupe_membres").select("groupe_id").eq("etudiant_id", user.id);
      const gids = (gm ?? []).map((g) => g.groupe_id);
      if (!gids.length) { setGroupes([]); return; }
      const { data: gs } = await supabase.from("groupes").select("id, nom, rapporteur_id").in("id", gids);
      const result: GroupeRow[] = [];
      for (const g of gs ?? []) {
        const { data: mems } = await supabase.from("groupe_membres").select("etudiant_id").eq("groupe_id", g.id);
        const ids = (mems ?? []).map((m) => m.etudiant_id);
        const profsRes = ids.length
          ? await supabase.from("profiles").select("id, full_name").in("id", ids)
          : { data: [] as { id: string; full_name: string | null }[] };
        result.push({ ...g, membres: (profsRes.data ?? []) });
      }
      setGroupes(result);
    })();
  }, [user]);

  return (
    <AssirikShell title="👥 Mon groupe">
      {groupes.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center">
          <Users size={48} className="mx-auto text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Tu n'es dans aucun groupe pour l'instant.</p>
        </div>
      ) : (
        groupes.map((g) => (
          <div key={g.id} className="rounded-2xl bg-card p-5 shadow-sm">
            <h2 className="text-lg font-bold">{g.nom}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
              {g.membres.map((m) => (
                <div key={m.id} className="rounded-xl bg-secondary p-3 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-white font-bold">
                    {m.full_name?.[0] ?? "?"}
                  </div>
                  <p className="mt-2 text-sm font-medium">{m.full_name}</p>
                  {g.rapporteur_id === m.id && (
                    <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">Rapporteur</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </AssirikShell>
  );
}