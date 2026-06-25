import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/admin/prolongations")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, { date_accordee: string; commentaire_admin: string }>>({});

  async function load() {
    const { data } = await supabase.from("demandes_prolongation").select("*, missions(nom), profiles:demandee_par(full_name)").order("created_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function decide(id: string, statut: "acceptee" | "refusee") {
    const e = edits[id] ?? { date_accordee: "", commentaire_admin: "" };
    const { error } = await supabase.from("demandes_prolongation").update({
      statut, traitee_par: user?.id, traitee_le: new Date().toISOString(),
      date_accordee: statut === "acceptee" ? (e.date_accordee || null) : null,
      commentaire_admin: e.commentaire_admin || null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    if (statut === "acceptee" && e.date_accordee) {
      const row = rows.find((r) => r.id === id);
      if (row?.mission_id) {
        await supabase.from("missions").update({ date_fin: e.date_accordee }).eq("id", row.mission_id);
      }
    }
    toast.success("Décision enregistrée"); load();
  }

  return (
    <AssirikShell title="⏱️ Prolongations">
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><strong>{r.missions?.nom}</strong> — demandé par {r.profiles?.full_name}</div>
                <Badge variant={r.statut === "en_attente" ? "default" : r.statut === "acceptee" ? "secondary" : "destructive"}>{r.statut}</Badge>
              </div>
              <p className="mt-2 text-sm"><strong>Date souhaitée :</strong> {r.date_souhaitee} · <strong>Motif :</strong> {r.justification}</p>
              {r.statut === "en_attente" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                  <div><Label>Date accordée</Label><Input type="date" onChange={(e) => setEdits({ ...edits, [r.id]: { ...(edits[r.id] ?? { commentaire_admin: "" }), date_accordee: e.target.value } })} /></div>
                  <div><Label>Commentaire</Label><Input onChange={(e) => setEdits({ ...edits, [r.id]: { ...(edits[r.id] ?? { date_accordee: "" }), commentaire_admin: e.target.value } })} /></div>
                  <Button onClick={() => decide(r.id, "acceptee")}><Check size={14} className="mr-1" />Accepter</Button>
                  <Button variant="destructive" onClick={() => decide(r.id, "refusee")}><X size={14} className="mr-1" />Refuser</Button>
                </div>
              )}
            </div>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucune demande.</p>}
        </div>
      )}
    </AssirikShell>
  );
}