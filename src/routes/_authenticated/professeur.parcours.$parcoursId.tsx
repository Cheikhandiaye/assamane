import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Loader2, NotebookPen, Users, CalendarCheck, UsersRound } from "lucide-react";
import { ParcoursGroupesDialog } from "@/components/parcours-groupes-dialog";

export const Route = createFileRoute("/_authenticated/professeur/parcours/$parcoursId")({
  component: Page,
});

interface Module { id: string; titre: string; ordre: number; etapes: { id: string; titre: string; type: string; ordre: number }[] }
interface EtuRow { etudiant_id: string; mode: string; profiles: { full_name: string | null; email: string } | null; _progression: number }

function Page() {
  useRoleGuard(["professeur", "admin"]);
  const { parcoursId } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [parcours, setParcours] = useState<{ nom: string; description: string | null } | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [etudiants, setEtudiants] = useState<EtuRow[]>([]);
  const [sessions, setSessions] = useState<{ id: string; date_session: string; statut: string | null }[]>([]);
  const [groupesOpen, setGroupesOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: mods }, { data: etu }, { data: sess }] = await Promise.all([
        supabase.from("parcours").select("nom, description").eq("id", parcoursId).maybeSingle(),
        supabase.from("modules_cours").select("id, titre, ordre, etapes(id, titre, type, ordre)").eq("parcours_id", parcoursId).order("ordre"),
        supabase.from("parcours_etudiants").select("etudiant_id, mode, profiles:etudiant_id(full_name, email)").eq("parcours_id", parcoursId),
        supabase.from("sessions_cours").select("id, date_session, statut").eq("parcours_id", parcoursId).order("date_session", { ascending: false }).limit(20),
      ]);
      setParcours(p ?? null);
      const sortedMods = ((mods ?? []) as Module[]).map((m) => ({
        ...m,
        etapes: (m.etapes ?? []).sort((a, b) => a.ordre - b.ordre),
      }));
      setModules(sortedMods);

      const totalContents = await supabase
        .from("contenus_module")
        .select("module_id", { count: "exact", head: false })
        .in("module_id", sortedMods.map((m) => m.id));
      const totalCount = totalContents.data?.length ?? 0;

      const rows: EtuRow[] = [];
      for (const e of (etu ?? []) as Array<{ etudiant_id: string; mode: string; profiles: { full_name: string | null; email: string } | null }>) {
        const { count } = await supabase
          .from("suivi_contenu")
          .select("*", { count: "exact", head: true })
          .eq("etudiant_id", e.etudiant_id)
          .eq("parcours_id", parcoursId)
          .eq("complete", true);
        rows.push({ ...e, _progression: totalCount ? Math.round(((count ?? 0) / totalCount) * 100) : 0 });
      }
      setEtudiants(rows);
      setSessions(sess ?? []);
      setLoading(false);
    })();
  }, [parcoursId]);

  if (loading) {
    return <AssirikShell title="Parcours"><Loader2 className="mx-auto animate-spin text-primary" /></AssirikShell>;
  }

  const etudiantsOptions = etudiants.map((e) => ({
    id: e.etudiant_id,
    full_name: e.profiles?.full_name ?? e.profiles?.email ?? "Étudiant",
  }));

  return (
    <AssirikShell title={`📘 ${parcours?.nom ?? "Parcours"}`}>
      <div className="space-y-6">
        {parcours?.description && (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{parcours.description}</p>
        )}

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><BookOpen size={18} className="text-primary" />Modules & étapes</h2>
          <div className="space-y-2">
            {modules.map((m) => (
              <div key={m.id} className="rounded-xl border border-border bg-card p-4">
                <strong>{m.ordre}. {m.titre}</strong>
                <ul className="mt-2 space-y-1 text-sm">
                  {m.etapes.map((e) => (
                    <li key={e.id} className="flex items-center gap-2">
                      <Badge variant={e.type === "groupe" ? "secondary" : "outline"} className="text-[10px]">{e.type}</Badge>
                      <span>{e.titre}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!modules.length && <p className="text-sm text-muted-foreground">Aucun module.</p>}
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Users size={18} className="text-primary" />Étudiants inscrits ({etudiants.length})</h2>
            <Button size="sm" variant="outline" onClick={() => setGroupesOpen(true)}>
              <UsersRound size={14} className="mr-1" />Gérer les groupes
            </Button>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase">
                <tr><th className="p-3">Nom</th><th className="p-3">Email</th><th className="p-3">Mode</th><th className="p-3">Progression</th><th className="p-3">Action</th></tr>
              </thead>
              <tbody>
                {etudiants.map((e) => (
                  <tr key={e.etudiant_id} className="border-t border-border">
                    <td className="p-3">{e.profiles?.full_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{e.profiles?.email}</td>
                    <td className="p-3"><Badge variant="outline">{e.mode}</Badge></td>
                    <td className="p-3">{e._progression}%</td>
                    <td className="p-3">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/professeur/carnet/$etudiantId/$parcoursId" params={{ etudiantId: e.etudiant_id, parcoursId }}>
                          <NotebookPen size={14} className="mr-1" />Voir le carnet
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {!etudiants.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Aucun étudiant.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><CalendarCheck size={18} className="text-primary" />Sessions récentes</h2>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2 text-sm">
                <span>{s.date_session}</span>
                <Badge variant={s.statut === "ouverte" ? "default" : "secondary"}>{s.statut}</Badge>
              </div>
            ))}
            {!sessions.length && <p className="text-sm text-muted-foreground">Aucune session.</p>}
          </div>
        </section>
      </div>

      <ParcoursGroupesDialog
        parcoursId={parcoursId}
        parcoursNom={parcours?.nom ?? "Parcours"}
        etudiants={etudiantsOptions}
        open={groupesOpen}
        onOpenChange={setGroupesOpen}
      />
    </AssirikShell>
  );
}
