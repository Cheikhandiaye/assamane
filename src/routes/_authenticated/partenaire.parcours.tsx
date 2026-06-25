import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Loader2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/partenaire/parcours")({ component: Page });

function Page() {
  useRoleGuard("partenaire");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("partenaire_id").eq("id", user.id).maybeSingle();
      if (!prof?.partenaire_id) { setLoading(false); return; }
      const { data: missions } = await supabase.from("missions").select("id").eq("partenaire_id", prof.partenaire_id);
      const ids = (missions ?? []).map((m) => m.id);
      if (!ids.length) { setLoading(false); return; }
      const { data: pc } = await supabase.from("parcours")
        .select("id, nom, description, missions(nom), parcours_etudiants(etudiant_id)")
        .in("mission_id", ids);
      setRows(pc ?? []); setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <AssirikShell title="📚 Parcours"><Loader2 className="mx-auto animate-spin text-primary" /></AssirikShell>;
  return (
    <AssirikShell title="📚 Parcours">
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucun parcours.</p> : (
        <div className="grid gap-3 md:grid-cols-2">{rows.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2"><BookOpen className="text-primary" /><strong>{p.nom}</strong></div>
            <p className="text-xs text-muted-foreground">Mission : {p.missions?.nom}</p>
            <p className="mt-1 text-sm line-clamp-2">{p.description}</p>
            <p className="mt-2 text-xs text-muted-foreground"><Users size={12} className="mr-1 inline" />{p.parcours_etudiants?.length ?? 0} étudiant·e·s</p>
          </div>
        ))}</div>
      )}
    </AssirikShell>
  );
}