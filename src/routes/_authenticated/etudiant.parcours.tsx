import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Video, NotebookPen, Clock, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/etudiant/parcours")({
  component: ParcoursPage,
});

interface ModuleRow {
  id: string;
  titre: string;
  description: string | null;
  ordre: number;
  parcours_id: string;
  statut: "verrouille" | "online" | "carnet" | "attente" | "valide";
  note?: number | null;
  pourcent?: number;
}

function ParcoursPage() {
  const { user } = useCurrentUser();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: pe } = await supabase.from("parcours_etudiants").select("parcours_id").eq("etudiant_id", user.id);
      const pids = (pe ?? []).map((p) => p.parcours_id);
      if (!pids.length) { setModules([]); setLoading(false); return; }
      const { data: mods } = await supabase
        .from("modules_cours")
        .select("id, titre, description, ordre, parcours_id")
        .in("parcours_id", pids)
        .order("ordre");
      const { data: acces } = await supabase.from("acces_module").select("module_id").eq("etudiant_id", user.id);
      const accesSet = new Set((acces ?? []).map((a) => a.module_id));
      const rows: ModuleRow[] = (mods ?? []).map((m) => ({
        ...m,
        statut: accesSet.has(m.id) ? "carnet" : "verrouille",
        pourcent: 0,
      }));
      setModules(rows);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <AssirikShell title="Mes parcours"><p className="text-muted-foreground">Chargement…</p></AssirikShell>;

  return (
    <AssirikShell title="📚 Mes parcours">
      {modules.length === 0 ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground">
          Aucun parcours assigné pour l'instant. Reviens plus tard ! ✨
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((m) => <ModuleCard key={m.id} module={m} />)}
        </div>
      )}
    </AssirikShell>
  );
}

function ModuleCard({ module: m }: { module: ModuleRow }) {
  const conf =
    m.statut === "verrouille" ? { icon: <Lock size={16} />, msg: "En attente du cours en présentiel", color: "text-slate-400" } :
    m.statut === "online" ? { icon: <Video size={16} />, msg: `Cours en ligne — ${m.pourcent}% visionné`, color: "text-blue-500" } :
    m.statut === "carnet" ? { icon: <NotebookPen size={16} />, msg: "Carnet à compléter", color: "text-accent" } :
    m.statut === "attente" ? { icon: <Clock size={16} />, msg: "En attente de validation", color: "text-yellow-500" } :
    { icon: <CheckCircle size={16} />, msg: `Validé • Note : ${m.note ?? "—"}/20`, color: "text-green-600" };
  return (
    <div className="flex gap-3 rounded-2xl bg-card p-4 shadow-sm">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 font-bold text-primary">
        {String(m.ordre).padStart(2, "0")}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-foreground">{m.titre}</p>
        {m.description && <p className="line-clamp-2 text-xs text-muted-foreground">{m.description}</p>}
        <p className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${conf.color}`}>
          {conf.icon} {conf.msg}
        </p>
      </div>
    </div>
  );
}