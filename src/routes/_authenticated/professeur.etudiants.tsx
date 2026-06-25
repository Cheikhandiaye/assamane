import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCSV } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/professeur/etudiants")({ component: Page });

function Page() {
  useRoleGuard("professeur");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; (async () => {
    const { data: pp } = await supabase.from("parcours_professeurs").select("parcours_id").eq("professeur_id", user.id);
    const ids = (pp ?? []).map((p: any) => p.parcours_id);
    if (!ids.length) { setLoading(false); return; }
    const { data } = await supabase.from("parcours_etudiants").select("mode, parcours(nom), profiles:etudiant_id(full_name, email)").in("parcours_id", ids);
    setRows(data ?? []); setLoading(false);
  })(); }, [user?.id]);
  return (
    <AssirikShell title="👥 Mes étudiants">
      <div className="mb-3"><Button variant="outline" onClick={() => exportCSV("mes-etudiants", rows.map((r: any) => ({ nom: r.profiles?.full_name, email: r.profiles?.email, parcours: r.parcours?.nom, mode: r.mode })))}>Exporter CSV</Button></div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm"><thead className="bg-muted text-left text-xs uppercase"><tr><th className="p-3">Étudiant</th><th className="p-3">Parcours</th><th className="p-3">Mode</th></tr></thead>
            <tbody>{rows.map((r: any, i: number) => (
              <tr key={i} className="border-t border-border"><td className="p-3"><Users size={14} className="mr-1 inline text-primary" />{r.profiles?.full_name ?? r.profiles?.email}</td><td className="p-3">{r.parcours?.nom}</td><td className="p-3">{r.mode}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </AssirikShell>
  );
}