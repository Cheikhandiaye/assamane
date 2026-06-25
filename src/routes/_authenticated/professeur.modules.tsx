import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/professeur/modules")({ component: Page });

function Page() {
  useRoleGuard("professeur");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; (async () => {
    const { data: pp } = await supabase.from("parcours_professeurs").select("parcours_id, modules_assignes").eq("professeur_id", user.id);
    const all = (pp ?? []).flatMap((p: any) => p.modules_assignes ?? []);
    if (!all.length) { setLoading(false); return; }
    const { data } = await supabase.from("modules_cours").select("*, etapes(count), contenus_module(count), parcours(nom)").in("id", all);
    setRows(data ?? []); setLoading(false);
  })(); }, [user?.id]);
  return (
    <AssirikShell title="📦 Mes modules">
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2"><Layers className="text-primary" /><strong>{m.titre}</strong></div>
              <p className="mt-1 text-xs text-muted-foreground">{m.parcours?.nom ?? "Global"}</p>
              <p className="mt-2 text-sm line-clamp-3">{m.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{m.etapes?.[0]?.count ?? 0} étapes · {m.contenus_module?.[0]?.count ?? 0} contenus</p>
            </div>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucun module assigné.</p>}
        </div>
      )}
    </AssirikShell>
  );
}