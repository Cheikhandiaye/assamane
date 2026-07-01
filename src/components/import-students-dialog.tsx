import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Download, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { importStudentsFn } from "@/lib/import-students.functions";

type Row = { full_name: string; email: string; password?: string };

function downloadTemplate() {
  const rows = [
    ["full_name", "email", "password"],
    ["Awa Diop", "awa.diop@example.com", ""],
    ["Mamadou Fall", "mamadou.fall@example.com", "MotDePasse1!"],
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modele-import-etudiants.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportStudentsDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}) {
  const runImport = useServerFn(importStudentsFn);
  const [partenaires, setPartenaires] = useState<{ id: string; nom: string }[]>([]);
  const [parcours, setParcours] = useState<{ id: string; nom: string }[]>([]);
  const [partenaireId, setPartenaireId] = useState<string>("");
  const [parcoursId, setParcoursId] = useState<string>("");
  const [mode, setMode] = useState<string>("presentiel");
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: parts }, { data: parcs }] = await Promise.all([
        supabase.from("partenaires").select("id, nom").order("nom"),
        supabase.from("parcours").select("id, nom").order("nom"),
      ]);
      setPartenaires(parts ?? []);
      setParcours(parcs ?? []);
    })();
    setRows([]); setFileName(""); setReport(null);
  }, [open]);

  function handleFile(f: File) {
    setFileName(f.name);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed: Row[] = (res.data || [])
          .map((r: any) => ({
            full_name: String(r.full_name || r.nom || r.name || "").trim(),
            email: String(r.email || r.mail || "").trim(),
            password: String(r.password || r.motdepasse || "").trim() || undefined,
          }))
          .filter((r) => r.email && r.full_name);
        if (!parsed.length) toast.error("Aucune ligne valide (colonnes attendues : full_name, email, [password])");
        setRows(parsed);
      },
      error: (e) => toast.error("Erreur parsing : " + e.message),
    });
  }

  const canRun = rows.length > 0 && !!partenaireId && !!parcoursId && !busy;

  async function launch() {
    if (!canRun) return;
    setBusy(true);
    setReport(null);
    try {
      const r = await runImport({
        data: {
          partenaire_id: partenaireId,
          parcours_id: parcoursId,
          mode,
          rows,
        },
      });
      setReport(r);
      toast.success(`Import : ${r.created} créés, ${r.updated} mis à jour, ${r.errors} erreurs`);
      if (r.errors === 0) onImported();
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur import");
    } finally {
      setBusy(false);
    }
  }

  const passwords = useMemo(
    () => (report?.results ?? []).filter((r: any) => r.password),
    [report],
  );

  function downloadPasswords() {
    if (!passwords.length) return;
    const csv = "email,password\n" + passwords.map((r: any) => `${r.email},${r.password}`).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mots-de-passe-generes.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-primary" />
            Importer une liste d'étudiants
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-3 flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium">Modèle CSV</p>
              <p className="text-xs text-muted-foreground">Colonnes : <code>full_name, email, password</code> (password optionnel).</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate}><Download size={14} className="mr-1" />Télécharger</Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Partenaire *</Label>
              <Select value={partenaireId} onValueChange={setPartenaireId}>
                <SelectTrigger><SelectValue placeholder="Choisir un partenaire" /></SelectTrigger>
                <SelectContent>
                  {partenaires.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parcours *</Label>
              <Select value={parcoursId} onValueChange={setParcoursId}>
                <SelectTrigger><SelectValue placeholder="Choisir un parcours" /></SelectTrigger>
                <SelectContent>
                  {parcours.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presentiel">Présentiel</SelectItem>
                  <SelectItem value="hybride">Hybride</SelectItem>
                  <SelectItem value="online">En ligne</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fichier CSV *</Label>
              <Input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {fileName && (
                <p className="text-xs text-muted-foreground mt-1">{fileName} · {rows.length} ligne(s) valide(s)</p>
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <div className="max-h-40 overflow-auto rounded border text-xs">
              <table className="w-full">
                <thead className="bg-muted"><tr><th className="p-2 text-left">Nom</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">MDP fourni ?</th></tr></thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t"><td className="p-2">{r.full_name}</td><td className="p-2">{r.email}</td><td className="p-2">{r.password ? "oui" : "auto-généré"}</td></tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && <p className="p-2 text-muted-foreground">… +{rows.length - 50} autres</p>}
            </div>
          )}

          {report && (
            <div className="rounded-lg border p-3 text-sm space-y-2">
              <p><strong>Résultat :</strong> {report.created} créés · {report.updated} mis à jour · {report.errors} erreurs</p>
              {passwords.length > 0 && (
                <Button size="sm" variant="outline" onClick={downloadPasswords}>
                  <Download size={12} className="mr-1" />Télécharger les mots de passe générés ({passwords.length})
                </Button>
              )}
              {report.errors > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-destructive">Voir erreurs</summary>
                  <ul className="mt-1 space-y-1">
                    {(report.results ?? []).filter((r: any) => r.status === "error").map((r: any, i: number) => (
                      <li key={i}>• <strong>{r.email}</strong> — {r.message}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={launch} disabled={!canRun}>
            {busy ? <Loader2 className="animate-spin mr-1" size={14} /> : <Upload size={14} className="mr-1" />}
            Lancer l'import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}