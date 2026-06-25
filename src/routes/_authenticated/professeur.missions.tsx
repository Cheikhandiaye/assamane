import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/professeur/missions")({ component: Page });

function Page() {
  useRoleGuard("professeur");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; (async () => {
    const { data } = await supabase.from("parcours_professeurs").select("parcours!inner(id, nom, missions(id, nom, statut, partenaires(nom)))").eq("professeur_id", user.id);
    setRows(data ?? []); setLoading(false);
  })(); }, [user?.id]);
  return (
    <AssirikShell title="🎯 Mes missions">
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r: any) => (
            <div key={r.parcours?.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2"><Target className="text-primary" /><strong>{r.parcours?.missions?.nom}</strong></div>
              <p className="mt-1 text-xs text-muted-foreground">{r.parcours?.missions?.partenaires?.nom}</p>
              <p className="mt-2 text-sm">Parcours : {r.parcours?.nom}</p>
              <Badge className="mt-2" variant="outline">{r.parcours?.missions?.statut}</Badge>
            </div>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucune mission assignée.</p>}
        </div>
      )}
    </AssirikShell>
  );
}