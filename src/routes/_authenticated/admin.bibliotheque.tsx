import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Library, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/bibliotheque")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [mods, setMods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("modules_cours").select("*, etapes(count), contenus_module(count)").eq("est_global", true).order("ordre");
    setMods(data ?? []); setLoading(false);
  })(); }, []);

  return (
    <AssirikShell title="📚 Bibliothèque de modules">
      <p className="mb-4 text-sm text-muted-foreground">Modules pédagogiques globaux, dupliquables sur n'importe quel parcours.</p>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mods.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2"><Library className="text-primary" size={20} /><h3 className="font-bold">{m.titre}</h3></div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{m.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{m.etapes?.[0]?.count ?? 0} étapes · {m.contenus_module?.[0]?.count ?? 0} contenus</p>
            </div>
          ))}
        </div>
      )}
    </AssirikShell>
  );
}