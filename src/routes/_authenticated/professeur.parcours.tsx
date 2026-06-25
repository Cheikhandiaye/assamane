import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/professeur/parcours")({ component: Page });

function Page() {
  useRoleGuard("professeur");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; (async () => {
    const { data } = await supabase.from("parcours_professeurs").select("modules_assignes, parcours!inner(id, nom, description, missions(nom, partenaires(nom)))").eq("professeur_id", user.id);
    setRows(data ?? []); setLoading(false);
  })(); }, [user?.id]);
  return (
    <AssirikShell title="📘 Mes parcours">
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r: any) => (
            <Link key={r.parcours?.id} to="/professeur/parcours/$parcoursId" params={{ parcoursId: r.parcours?.id }} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm">
              <div className="flex items-center gap-2"><BookOpen className="text-primary" /><strong>{r.parcours?.nom}</strong></div>
              <p className="mt-1 text-xs text-muted-foreground">{r.parcours?.missions?.nom} · {r.parcours?.missions?.partenaires?.nom}</p>
              <p className="mt-2 text-sm line-clamp-3">{r.parcours?.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{r.modules_assignes?.length ?? 0} modules assignés</p>
            </Link>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucun parcours.</p>}
        </div>
      )}
    </AssirikShell>
  );
}