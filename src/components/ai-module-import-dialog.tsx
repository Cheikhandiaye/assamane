import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { enrichModuleAI } from "@/lib/enrich-module-ai.functions";

export function AiModuleImportDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone: () => void;
}) {
  const run = useServerFn(enrichModuleAI);
  const [titre, setTitre] = useState("");
  const [categorie, setCategorie] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [carnetText, setCarnetText] = useState("");
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setTitre(""); setCategorie(""); setSourceText(""); setCarnetText(""); setBusy(false); setStep("");
    }
  }, [open]);

  async function readFile(f: File): Promise<string> {
    return await f.text();
  }

  async function launch() {
    if (!titre.trim()) return toast.error("Titre requis");
    if (sourceText.trim().length < 40) return toast.error("Colle ou importe la matière source (≥ 40 caractères)");
    setBusy(true);
    try {
      setStep("Création du module vide…");
      // Créer un module global vide
      const { data: created, error } = await supabase
        .from("modules_cours")
        .insert({
          titre: titre.trim(),
          description: null,
          categorie: categorie.trim() || null,
          est_global: true,
          parcours_id: null,
          ordre: 999,
        })
        .select("id")
        .single();
      if (error || !created) throw new Error(error?.message || "Impossible de créer le module");

      setStep("Génération IA du cours complet + quiz (peut prendre 30–60s)…");
      const r = await run({
        data: {
          module_id: created.id,
          titre: titre.trim(),
          categorie: categorie.trim() || undefined,
          source_text: sourceText,
          carnet_text: carnetText || undefined,
          replace,
        },
      });
      toast.success(
        `Module généré : ${r.sections_inserees} sections · ${r.carnet_inseres} exercices de carnet · ${r.quiz_questions} questions de quiz`,
      );
      onDone();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur IA");
    } finally {
      setBusy(false); setStep("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            Importer & enrichir un module par IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Titre du module *</Label>
              <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Étude de marché" />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Input value={categorie} onChange={(e) => setCategorie(e.target.value)} placeholder="Ex. Entrepreneuriat" />
            </div>
          </div>

          <div>
            <Label>Matière source (texte du cours / brief) *</Label>
            <Textarea
              rows={8}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Colle ici le texte brut du cours, les notes ou le brief. L'IA va le structurer et l'enrichir en 4–7 sections longues, un carnet et un quiz de 15 questions."
            />
            <Input
              type="file"
              accept=".txt,.md,.csv"
              className="mt-2"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setSourceText(await readFile(f));
                toast.success(`${f.name} chargé (${f.size} octets)`);
              }}
            />
          </div>

          <div>
            <Label>Carnet source (facultatif — consignes/exercices existants)</Label>
            <Textarea
              rows={4}
              value={carnetText}
              onChange={(e) => setCarnetText(e.target.value)}
              placeholder="Colle les exercices du carnet actuel. L'IA les adaptera et enrichira."
            />
            <Input
              type="file"
              accept=".txt,.md,.csv"
              className="mt-2"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setCarnetText(await readFile(f));
              }}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={replace} onCheckedChange={(v) => setReplace(!!v)} />
            Remplacer les contenus / carnet existants du module
          </label>

          {busy && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-primary" />
              {step}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annuler</Button>
          <Button onClick={launch} disabled={busy}>
            {busy ? <Loader2 className="animate-spin mr-1" size={14} /> : <Sparkles size={14} className="mr-1" />}
            Générer avec l'IA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}