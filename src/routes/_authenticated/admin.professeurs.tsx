import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { exportCSV } from "@/lib/exports";
import { UserFormDialog, type UserFormValue } from "@/components/user-form-dialog";
import { useServerFn } from "@tanstack/react-start";
import { deleteUserFn } from "@/lib/admin-users.functions";
import { fetchUsersByRole } from "@/lib/fetch-users-by-role";

export const Route = createFileRoute("/_authenticated/admin/professeurs")({ component: ProfsPage });

function ProfsPage() {
  useRoleGuard("admin");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserFormValue | null>(null);
  const delU = useServerFn(deleteUserFn);

  async function load() {
    const { data } = await supabase.from("user_roles").select("user_id, role, profiles!inner(id, full_name, email)").eq("role", "professeur");
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function remove(userId: string, name?: string) {
    if (!confirm(`Supprimer définitivement ${name ?? "ce compte"} ?`)) return;
    try { await delU({ data: { user_id: userId } }); toast.success("Supprimé"); load(); }
    catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  const profs = rows.filter((r) => !q || r.profiles?.full_name?.toLowerCase().includes(q.toLowerCase()) || r.profiles?.email?.toLowerCase().includes(q.toLowerCase()));

  return (
    <AssirikShell title="🎓 Professeurs">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Button variant="outline" onClick={() => exportCSV("professeurs", profs.map((p) => ({ nom: p.profiles?.full_name, email: p.profiles?.email })))}>Exporter CSV</Button>
        <Button className="ml-auto" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={14} className="mr-1" />Nouveau professeur</Button>
      </div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profs.map((p) => (
            <div key={p.user_id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2"><GraduationCap className="text-primary" size={18} /><strong>{p.profiles?.full_name ?? "—"}</strong></div>
              <p className="text-xs text-muted-foreground">{p.profiles?.email}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setEditing({ user_id: p.user_id, full_name: p.profiles?.full_name, email: p.profiles?.email, role: "professeur" }); setOpen(true); }}><Pencil size={12} className="mr-1" />Modifier</Button>
                <Button size="sm" variant="destructive" onClick={() => remove(p.user_id, p.profiles?.full_name)}><Trash2 size={12} className="mr-1" />Supprimer</Button>
              </div>
            </div>
          ))}
          {!profs.length && <p className="text-muted-foreground">Aucun professeur pour le moment.</p>}
        </div>
      )}
      <UserFormDialog open={open} onOpenChange={setOpen} initial={editing} defaultRole="professeur" onSaved={load} />
    </AssirikShell>
  );
}
