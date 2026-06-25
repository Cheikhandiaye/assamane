import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/sessions")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("sessions_cours").select("*, parcours(nom), profiles:professeur_id(full_name)").order("date_session", { ascending: false }).limit(50);
    setRows(data ?? []); setLoading(false);
  })(); }, []);
  return (
    <AssirikShell title="📅 Sessions">
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase"><tr><th className="p-3">Date</th><th className="p-3">Parcours</th><th className="p-3">Prof</th><th className="p-3">Statut</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3"><CalendarCheck size={14} className="mr-1 inline text-primary" />{r.date_session}</td>
                <td className="p-3">{r.parcours?.nom}</td>
                <td className="p-3">{r.profiles?.full_name}</td>
                <td className="p-3"><Badge variant={r.statut === "ouverte" ? "default" : "secondary"}>{r.statut}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </AssirikShell>
  );
}