import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { exportCSV } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/admin/professeurs")({ component: ProfsPage });

function ProfsPage() {
  useRoleGuard("admin");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase.from("user_roles").select("user_id, role, profiles!inner(id, full_name, email)").in("role", ["professeur", "etudiant", "admin", "partenaire"]);
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function promote(userId: string, role: "professeur" | "etudiant" | "admin" | "partenaire") {
    const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Rôle mis à jour"); load();
  }

  const profs = rows.filter((r) => r.role === "professeur" && (!q || r.profiles?.full_name?.toLowerCase().includes(q.toLowerCase()) || r.profiles?.email?.toLowerCase().includes(q.toLowerCase())));
  const others = rows.filter((r) => r.role !== "professeur");

  return (
    <AssirikShell title="🎓 Professeurs">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Button variant="outline" onClick={() => exportCSV("professeurs", profs.map((p) => ({ nom: p.profiles?.full_name, email: p.profiles?.email })))}>Exporter CSV</Button>
      </div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-bold">Professeurs ({profs.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profs.map((p) => (
                <div key={p.user_id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2"><GraduationCap className="text-primary" size={18} /><strong>{p.profiles?.full_name ?? "—"}</strong></div>
                  <p className="text-xs text-muted-foreground">{p.profiles?.email}</p>
                </div>
              ))}
              {!profs.length && <p className="text-muted-foreground">Aucun professeur. Promouvoir un utilisateur ci-dessous.</p>}
            </div>
          </section>
          <section>
            <h2 className="mb-3 font-bold">Autres comptes — promouvoir en professeur</h2>
            <div className="grid gap-2">
              {others.map((p) => (
                <div key={p.user_id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <div>
                    <strong>{p.profiles?.full_name ?? p.profiles?.email}</strong>
                    <Badge variant="outline" className="ml-2">{p.role}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => promote(p.user_id, "professeur")}>→ Prof</Button>
                    <Button size="sm" variant="outline" onClick={() => promote(p.user_id, "partenaire")}>→ Partenaire</Button>
                    <Button size="sm" variant="outline" onClick={() => promote(p.user_id, "admin")}><Shield size={12} className="mr-1" />→ Admin</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AssirikShell>
  );
}