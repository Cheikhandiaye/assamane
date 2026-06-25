import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Loader2, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/etudiant/sessions")({ component: Page });

function Page() {
  useRoleGuard("etudiant");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [presences, setPresences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: pe } = await supabase.from("parcours_etudiants").select("parcours_id").eq("etudiant_id", user.id);
      const ids = (pe ?? []).map((p) => p.parcours_id);
      if (!ids.length) { setLoading(false); return; }
      const { data: sess } = await supabase.from("sessions_cours")
        .select("id, date_session, heure_debut, heure_fin, statut, parcours(nom), profiles:professeur_id(full_name)")
        .in("parcours_id", ids).order("date_session", { ascending: false }).limit(50);
      setRows(sess ?? []);
      const { data: pres } = await supabase.from("presences").select("session_id, present").eq("etudiant_id", user.id);
      setPresences(Object.fromEntries((pres ?? []).map((p) => [p.session_id, p.present])));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <AssirikShell title="📅 Mes sessions"><Loader2 className="mx-auto animate-spin text-primary" /></AssirikShell>;
  return (
    <AssirikShell title="📅 Mes sessions">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune session programmée.</p>
      ) : (
        <ul className="space-y-2">{rows.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarCheck size={16} className="text-primary" />
              <strong>{s.date_session}</strong>
              {s.heure_debut && <span className="text-xs text-muted-foreground">{s.heure_debut.slice(0, 5)}–{s.heure_fin?.slice(0, 5) ?? "…"}</span>}
              <Badge variant={s.statut === "ouverte" ? "default" : "secondary"} className="ml-auto">{s.statut}</Badge>
              {presences[s.id] !== undefined && <Badge variant={presences[s.id] ? "default" : "destructive"}>{presences[s.id] ? "Présent" : "Absent"}</Badge>}
            </div>
            <p className="mt-1 text-sm"><MapPin size={12} className="mr-1 inline text-muted-foreground" />{s.parcours?.nom} · {s.profiles?.full_name}</p>
          </li>
        ))}</ul>
      )}
    </AssirikShell>
  );
}