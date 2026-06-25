import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/validations")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("reponses_etudiant").select("id, statut, created_at, etapes(titre), profiles:etudiant_id(full_name, email)").eq("statut", "soumis").order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []); setLoading(false);
  })(); }, []);
  return (
    <AssirikShell title="✅ Validations en attente">
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex items-center gap-2"><CheckSquare size={16} className="text-primary" /><strong>{r.profiles?.full_name ?? r.profiles?.email}</strong> · {r.etapes?.titre}</div>
              <Badge>En attente</Badge>
            </div>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucune validation en attente.</p>}
        </div>
      )}
    </AssirikShell>
  );
}