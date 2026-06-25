import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Pencil, Trash2, Plus } from "lucide-react";
import { exportCSV } from "@/lib/exports";
import { UserFormDialog, type UserFormValue } from "@/components/user-form-dialog";
import { useServerFn } from "@tanstack/react-start";
import { deleteUserFn } from "@/lib/admin-users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/etudiants")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserFormValue | null>(null);
  const delU = useServerFn(deleteUserFn);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("user_roles").select("user_id, profiles!inner(id, full_name, email, created_at)").eq("role", "etudiant");
    const list = data ?? [];
    const enriched = await Promise.all(list.map(async (r: any) => {
      const { data: acc } = await supabase.from("acces_module").select("module_id").eq("etudiant_id", r.user_id);
      const moduleIds = (acc ?? []).map((a) => a.module_id);
      let total = 0, done = 0;
      if (moduleIds.length) {
        const { count: t } = await supabase.from("contenus_module").select("*", { count: "exact", head: true }).in("module_id", moduleIds);
        const { count: d } = await supabase.from("suivi_contenu").select("*", { count: "exact", head: true }).eq("etudiant_id", r.user_id).eq("complete", true);
        total = t ?? 0; done = d ?? 0;
      }
      return { ...r, _progression: total ? Math.round((done / total) * 100) : 0 };
    }));
    setRows(enriched); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(userId: string, name?: string) {
    if (!confirm(`Supprimer définitivement ${name ?? "cet étudiant"} ?`)) return;
    try { await delU({ data: { user_id: userId } }); toast.success("Supprimé"); load(); }
    catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  const filtered = rows.filter((r) => !q || r.profiles?.full_name?.toLowerCase().includes(q.toLowerCase()) || r.profiles?.email?.toLowerCase().includes(q.toLowerCase()));

  return (
    <AssirikShell title="👥 Étudiants">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <span className="text-sm text-muted-foreground">{filtered.length} étudiant·e·s</span>
        <Button variant="outline" className="ml-auto" onClick={() => exportCSV("etudiants", filtered.map((r) => ({ nom: r.profiles?.full_name, email: r.profiles?.email, progression_pct: r._progression })))}>Exporter CSV</Button>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} className="mr-1" />Nouvel étudiant</Button>
      </div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase"><tr><th className="p-3">Nom</th><th className="p-3">Email</th><th className="p-3">Inscrit le</th><th className="p-3">Progression</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.user_id} className="border-t border-border">
                  <td className="p-3"><Users size={14} className="mr-1 inline text-primary" />{r.profiles?.full_name ?? "—"}</td>
                  <td className="p-3">{r.profiles?.email}</td>
                  <td className="p-3">{r.profiles?.created_at?.slice(0, 10)}</td>
                  <td className="p-3">{r._progression}%</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" className="mr-2" onClick={() => { setEditing({ user_id: r.user_id, full_name: r.profiles?.full_name, email: r.profiles?.email, role: "etudiant" }); setOpen(true); }}><Pencil size={12} /></Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(r.user_id, r.profiles?.full_name)}><Trash2 size={12} /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <UserFormDialog open={open} onOpenChange={setOpen} initial={editing} defaultRole="etudiant" onSaved={load} />
    </AssirikShell>
  );
}