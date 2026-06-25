import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Loader2 } from "lucide-react";
import { exportCSV } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/admin/etudiants")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => { (async () => {
    const { data } = await supabase.from("user_roles").select("user_id, profiles!inner(id, full_name, email, created_at)").eq("role", "etudiant");
    setRows(data ?? []); setLoading(false);
  })(); }, []);

  const filtered = rows.filter((r) => !q || r.profiles?.full_name?.toLowerCase().includes(q.toLowerCase()) || r.profiles?.email?.toLowerCase().includes(q.toLowerCase()));

  return (
    <AssirikShell title="👥 Étudiants">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <span className="text-sm text-muted-foreground">{filtered.length} étudiant·e·s</span>
        <Button variant="outline" className="ml-auto" onClick={() => exportCSV("etudiants", filtered.map((r) => ({ nom: r.profiles?.full_name, email: r.profiles?.email })))}>Exporter CSV</Button>
      </div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase"><tr><th className="p-3">Nom</th><th className="p-3">Email</th><th className="p-3">Inscrit le</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="p-3"><Users size={14} className="mr-1 inline text-primary" />{r.profiles?.full_name ?? "—"}</td>
                  <td className="p-3">{r.profiles?.email}</td>
                  <td className="p-3">{r.profiles?.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AssirikShell>
  );
}