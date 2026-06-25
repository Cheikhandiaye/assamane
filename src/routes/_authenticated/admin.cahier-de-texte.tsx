import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";
import { exportPDF, exportCSV } from "@/lib/exports";

export const Route = createFileRoute("/_authenticated/admin/cahier-de-texte")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("cahier_de_texte").select("*, parcours(nom), profiles:professeur_id(full_name), partenaires(nom)").order("date_seance", { ascending: false });
    setRows(data ?? []); setLoading(false);
  })(); }, []);

  function pdfAll() {
    exportPDF("cahier-de-texte", "Cahier de texte ASSIRIK", rows.map((r) => ({
      title: `${r.date_seance} — ${r.parcours?.nom ?? ""}`,
      lines: [
        `Partenaire : ${r.partenaires?.nom ?? "—"}`,
        `Professeur : ${r.profiles?.full_name ?? "—"}`,
        `Horaire : ${r.heure_debut ?? "—"} → ${r.heure_fin ?? "—"} (${r.duree_minutes ?? 0} min)`,
        `Présents : ${r.nb_presents ?? 0}`,
        `Chapitres : ${r.chapitres_traites ?? "—"}`,
        `Objectifs : ${r.objectifs_seance ?? "—"}`,
        `Réalisé : ${r.realise ?? "—"}`,
        `Observations : ${r.observations ?? "—"}`,
      ],
    })));
  }

  return (
    <AssirikShell title="📝 Cahier de texte">
      <div className="mb-4 flex gap-2">
        <Button onClick={pdfAll}><FileDown size={16} className="mr-2" />Export PDF</Button>
        <Button variant="outline" onClick={() => exportCSV("cahier-de-texte", rows.map((r) => ({ date: r.date_seance, parcours: r.parcours?.nom, prof: r.profiles?.full_name, presents: r.nb_presents, duree: r.duree_minutes })))}>CSV</Button>
      </div>
      {loading ? <Loader2 className="mx-auto animate-spin text-primary" /> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{r.date_seance} — {r.parcours?.nom}</strong>
                <span className="text-xs text-muted-foreground">{r.profiles?.full_name} · {r.nb_presents ?? 0} présent·e·s</span>
              </div>
              <p className="mt-2 text-sm"><strong>Réalisé :</strong> {r.realise ?? "—"}</p>
            </div>
          ))}
          {!rows.length && <p className="text-muted-foreground">Aucun cahier signé pour le moment.</p>}
        </div>
      )}
    </AssirikShell>
  );
}