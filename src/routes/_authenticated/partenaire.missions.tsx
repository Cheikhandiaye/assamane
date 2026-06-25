import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { useBrand } from "@/lib/branding";
import { Target, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/partenaire/missions")({ component: Page });

function Page() {
  useRoleGuard("partenaire");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useBrand(brand);
  useEffect(() => { if (!user) return; (async () => {
    const { data: prof } = await supabase.from("profiles").select("partenaire_id, partenaires(*)").eq("id", user.id).maybeSingle();
    setBrand(prof?.partenaires);
    if (!prof?.partenaire_id) { setLoading(false); return; }
    const { data } = await supabase.from("missions").select("*, parcours(count)").eq("partenaire_id", prof.partenaire_id).order("created_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  })(); }, [user?.id]);
  return (
    <AssirikShell title="🎯 Mes missions">
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m: any) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Target className="text-primary" /><strong>{m.nom}</strong></div><Badge>{m.statut}</Badge></div>
              <p className="mt-2 text-sm line-clamp-3">{m.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">{m.parcours?.[0]?.count ?? 0} parcours · {m.date_debut} → {m.date_fin}</p>
            </div>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucune mission.</p>}
        </div>
      )}
    </AssirikShell>
  );
}