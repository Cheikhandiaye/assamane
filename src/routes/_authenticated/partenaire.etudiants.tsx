import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCSV } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/partenaire/etudiants")({ component: Page });

function Page() {
  useRoleGuard("partenaire");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!user) return; (async () => {
    const { data: prof } = await supabase.from("profiles").select("partenaire_id").eq("id", user.id).maybeSingle();
    if (!prof?.partenaire_id) { setLoading(false); return; }
    const { data: missions } = await supabase.from("missions").select("id").eq("partenaire_id", prof.partenaire_id);
    const mids = (missions ?? []).map((m: any) => m.id);
    if (!mids.length) { setLoading(false); return; }
    const { data: parcours } = await supabase.from("parcours").select("id, nom").in("mission_id", mids);
    const pids = (parcours ?? []).map((p: any) => p.id);
    if (!pids.length) { setLoading(false); return; }
    const { data } = await supabase.from("parcours_etudiants").select("mode, parcours(nom), profiles:etudiant_id(full_name, email)").in("parcours_id", pids);
    setRows(data ?? []); setLoading(false);
  })(); }, [user?.id]);
  return (
    <AssirikShell title="👥 Étudiants engagés">
      <div className="mb-3"><Button variant="outline" onClick={() => exportCSV("etudiants-partenaire", rows.map((r: any) => ({ nom: r.profiles?.full_name, email: r.profiles?.email, parcours: r.parcours?.nom })))}>Exporter CSV</Button></div>
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