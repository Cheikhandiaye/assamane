import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Loader2, Pencil, Trash2, Plus, RotateCcw, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { exportCSV } from "@/lib/exports";
import { UserFormDialog, type UserFormValue } from "@/components/user-form-dialog";
import { ImportStudentsDialog } from "@/components/import-students-dialog";
import { useServerFn } from "@tanstack/react-start";
import { deleteUserFn } from "@/lib/admin-users.functions";
import { resetCarnet } from "@/lib/reset-carnet.functions";
import { toast } from "sonner";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { usePaginated } from "@/hooks/use-paginated";
import { PaginationBar } from "@/components/pagination-bar";
import { fetchUsersByRole } from "@/lib/fetch-users-by-role";

export const Route = createFileRoute("/_authenticated/admin/etudiants")({
  component: Page,
});

export const ErrorBoundary = RouteErrorBoundary;

// ─── Reset carnet dialog ──────────────────────────────────────────────────────
function ResetCarnetPanel({ etudiantId, etudiantNom }: { etudiantId: string; etudiantNom: string }) {
  const [open, setOpen] = useState(false);
  const [parcours, setParcours] = useState<{ id: string; nom: string }[]>([]);
  const [loadingParcours, setLoadingParcours] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const doReset = useServerFn(resetCarnet);

  async function loadParcours() {
    if (open) { setOpen(false); return; }
    setLoadingParcours(true);
    const { data } = await supabase
      .from("parcours_etudiants")
      .select("parcours_id, parcours!inner(id, nom)")
      .eq("etudiant_id", etudiantId);
    setParcours((data ?? []).map((r: any) => ({ id: r.parcours.id, nom: r.parcours.nom })));
    setLoadingParcours(false);
    setOpen(true);
  }

  async function handleReset(parcoursId: string, parcoursNom: string) {
    if (!confirm(`Réinitialiser le carnet de ${etudiantNom} sur "${parcoursNom}" ?\n\nRéponses, suivi de contenu et accès modules seront supprimés. Action irréversible.`)) return;
    setResetting(parcoursId);
    try {
      await doReset({ data: { etudiant_id: etudiantId, parcours_id: parcoursId } });
      toast.success(`Carnet réinitialisé sur "${parcoursNom}"`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la réinitialisation");
    } finally {
      setResetting(null);
    }
  }

  return (
    <div className="inline-block">
      <Button size="sm" variant="outline" onClick={loadParcours} disabled={loadingParcours} className="text-orange-600 border-orange-300 hover:bg-orange-50">
        {loadingParcours ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
        {open ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
      </Button>
      {open && (
        <div className="absolute z-10 mt-1 rounded-lg border border-border bg-card shadow-lg p-2 min-w-[220px]">
          {parcours.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1">Aucun parcours</p>
          ) : (
            parcours.map((p) => (
              <button
                key={p.id}
                onClick={() => handleReset(p.id, p.nom)}
                disabled={resetting === p.id}
                className="w-full text-left text-xs px-3 py-2 rounded hover:bg-destructive/10 hover:text-destructive flex items-center gap-2 transition-colors"
              >
                {resetting === p.id ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                {p.nom}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
function Page() {
  useRoleGuard("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserFormValue | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const delU = useServerFn(deleteUserFn);

  async function load() {
    setLoading(true);
    const etudiants = await fetchUsersByRole("etudiant", true);
    const list = etudiants.map((p) => ({ user_id: p.id, profiles: p }));
    const enriched = await Promise.all(
      list.map(async (r: any) => {
        const { data: acc } = await supabase
          .from("acces_module")
          .select("module_id")
          .eq("etudiant_id", r.user_id);
        const moduleIds = (acc ?? []).map((a) => a.module_id);
        let total = 0, done = 0;
        if (moduleIds.length) {
          const { count: t } = await supabase
            .from("contenus_module")
            .select("*", { count: "exact", head: true })
            .in("module_id", moduleIds);
          const { count: d } = await supabase
            .from("suivi_contenu")
            .select("*", { count: "exact", head: true })
            .eq("etudiant_id", r.user_id)
            .eq("complete", true);
          total = t ?? 0;
          done = d ?? 0;
        }
        return { ...r, _progression: total ? Math.round((done / total) * 100) : 0 };
      })
    );
    setRows(enriched);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(userId: string, name?: string) {
    if (!confirm(`Supprimer définitivement ${name ?? "cet étudiant"} ?`)) return;
    try {
      await delU({ data: { user_id: userId } });
      toast.success("Supprimé");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  }

  const filtered = rows.filter(
    (r) =>
      !q ||
      r.profiles?.full_name?.toLowerCase().includes(q.toLowerCase()) ||
      r.profiles?.email?.toLowerCase().includes(q.toLowerCase())
  );
  const { page, setPage, pageCount, pageItems, total, from, to } = usePaginated(filtered, 20);

  return (
    <AssirikShell title="👥 Étudiants">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">{filtered.length} étudiant·e·s</span>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() =>
            exportCSV(
              "etudiants",
              filtered.map((r) => ({
                nom: r.profiles?.full_name,
                email: r.profiles?.email,
                progression_pct: r._progression,
              }))
            )
          }
        >
          Exporter CSV
        </Button>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={14} className="mr-1" />Nouvel étudiant
        </Button>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload size={14} className="mr-1" />Importer CSV
        </Button>
      </div>

      {loading ? (
        <Loader2 className="mx-auto animate-spin text-primary" />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase">
                <tr>
                  <th className="p-3">Nom</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Inscrit le</th>
                  <th className="p-3">Progression</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.user_id} className="relative border-t border-border">
                    <td className="p-3">
                      <Users size={14} className="mr-1 inline text-primary" />
                      {r.profiles?.full_name ?? "—"}
                    </td>
                    <td className="p-3">{r.profiles?.email}</td>
                    <td className="p-3">{r.profiles?.created_at?.slice(0, 10)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${r._progression}%` }}
                          />
                        </div>
                        <span>{r._progression}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1 relative">
                        <ResetCarnetPanel
                          etudiantId={r.user_id}
                          etudiantNom={r.profiles?.full_name ?? "cet étudiant"}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing({
                              user_id: r.user_id,
                              full_name: r.profiles?.full_name,
                              email: r.profiles?.email,
                              role: "etudiant",
                            });
                            setOpen(true);
                          }}
                        >
                          <Pencil size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(r.user_id, r.profiles?.full_name)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={page}
            pageCount={pageCount}
            total={total}
            from={from}
            to={to}
            onPage={setPage}
          />
        </>
      )}

      <UserFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        defaultRole="etudiant"
        onSaved={load}
      />
      <ImportStudentsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={load}
      />
    </AssirikShell>
  );
}
