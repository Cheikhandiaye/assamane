import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, FileText, Video, Save, HelpCircle, Check, Download, Upload, Clock, Target, Brain } from "lucide-react";
import { toast } from "sonner";

type QuizQuestion = { question: string; options: string[]; correct: number };

type Contenu = {
  id: string;
  type: "texte" | "video_embed" | "quiz";
  titre: string | null;
  contenu_texte: string | null;
  video_url: string | null;
  video_platform: "youtube" | "vimeo" | "dailymotion" | null;
  duree_video_secondes: number | null;
  quiz_questions: QuizQuestion[] | null;
  quiz_score_min: number | null;
  quiz_duree_minutes: number | null;
  quiz_penalite_deuxieme_essai: number | null;
  ponderation_quiz: number | null;
  ponderation_carnet: number | null;
  ordre: number;
};

// ─── Parseur CSV robuste (guillemets, virgules internes, CRLF, BOM) ───
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* ignore */ }
      else field += ch;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function downloadTemplate() {
  const lines = [
    "question,reponse_1,reponse_2,reponse_3,reponse_4,bonne_reponse",
    '"Quelle est la capitale du Sénégal ?",Dakar,Thiès,Saint-Louis,Ziguinchor,1',
    '"Combien font 2 + 2 ?",3,4,5,,2',
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template-quiz.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ModuleContenusEditor({
  moduleId,
  moduleTitre,
  open,
  onOpenChange,
  onChanged,
}: {
  moduleId: string | null;
  moduleTitre: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Contenu[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // États pour la configuration globale du module
  const [dureeQuiz, setDureeQuiz] = useState<number>(10);
  const [seuilReussite, setSeuilReussite] = useState<number>(70);
  const [penaliteDeuxiemeEssai, setPenaliteDeuxiemeEssai] = useState<number>(25);
  const [ponderationQuiz, setPonderationQuiz] = useState<number>(60);
  const [ponderationCarnet, setPonderationCarnet] = useState<number>(40);

  async function load() {
    if (!moduleId) return;
    setLoading(true);
    
    // Charger les contenus
    const { data: contenusData } = await supabase
      .from("contenus_module")
      .select("*")
      .eq("module_id", moduleId)
      .order("ordre");
    
    setItems(
      (contenusData ?? []).map((c: any) => ({
        ...c,
        quiz_questions: Array.isArray(c.quiz_questions) ? c.quiz_questions : [],
      })) as Contenu[],
    );

    // Charger la configuration du module
    const { data: moduleData } = await supabase
      .from("modules_cours")
      .select("duree_quiz, seuil_reussite, penalite_deuxieme_essai, ponderation_quiz, ponderation_carnet")
      .eq("id", moduleId)
      .single();

    if (moduleData) {
      setDureeQuiz(moduleData.duree_quiz || 10);
      setSeuilReussite(moduleData.seuil_reussite || 70);
      setPenaliteDeuxiemeEssai(moduleData.penalite_deuxieme_essai ? 
        Math.round((moduleData.penalite_deuxieme_essai || 0) * 100) : 25
      );
      setPonderationQuiz(moduleData.ponderation_quiz ? 
        Math.round((moduleData.ponderation_quiz || 0.6) * 100) : 60
      );
      setPonderationCarnet(moduleData.ponderation_carnet ? 
        Math.round((moduleData.ponderation_carnet || 0.4) * 100) : 40
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    if (open && moduleId) load();
  }, [open, moduleId]);

  async function addBlock(type: "texte" | "video_embed" | "quiz") {
    if (!moduleId) return;
    const nextOrdre = (items[items.length - 1]?.ordre ?? 0) + 1;
    const base: any = { module_id: moduleId, type, titre: "", ordre: nextOrdre };
    let payload: any;
    if (type === "texte") payload = { ...base, contenu_texte: "" };
    else if (type === "video_embed") payload = { ...base, video_platform: "youtube", video_url: "", duree_video_secondes: 0 };
    else payload = { ...base, quiz_questions: [], quiz_score_min: seuilReussite, quiz_duree_minutes: dureeQuiz, quiz_penalite_deuxieme_essai: penaliteDeuxiemeEssai / 100 };
    const { error } = await supabase.from("contenus_module").insert(payload);
    if (error) return toast.error(error.message);
    await load();
    onChanged?.();
  }

  function patch(id: string, changes: Partial<Contenu>) {
    setItems((arr) => arr.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }

  // ─── Sauvegarde de la configuration globale du module ───
  async function saveModuleConfig() {
    if (!moduleId) return;
    
    const payload = {
      duree_quiz: dureeQuiz,
      seuil_reussite: seuilReussite,
      penalite_deuxieme_essai: penaliteDeuxiemeEssai / 100,
      ponderation_quiz: ponderationQuiz / 100,
      ponderation_carnet: ponderationCarnet / 100,
    };

    const { error } = await supabase
      .from("modules_cours")
      .update(payload)
      .eq("id", moduleId);

    if (error) {
      toast.error("Erreur lors de l'enregistrement de la configuration");
      return;
    }

    toast.success("Configuration du module enregistrée");
    
    // Mettre à jour les blocs quiz existants avec les nouvelles valeurs par défaut
    const quizItems = items.filter(c => c.type === "quiz");
    for (const item of quizItems) {
      await supabase
        .from("contenus_module")
        .update({
          quiz_score_min: seuilReussite,
          quiz_duree_minutes: dureeQuiz,
          quiz_penalite_deuxieme_essai: penaliteDeuxiemeEssai / 100,
        } as any)
        .eq("id", item.id);
    }

    await load();
    onChanged?.();
  }

  // ─── Helpers quiz ───
  function setQuestions(id: string, qs: QuizQuestion[]) { patch(id, { quiz_questions: qs }); }
  function addQuestion(c: Contenu) {
    setQuestions(c.id, [...(c.quiz_questions ?? []), { question: "", options: ["", ""], correct: 0 }]);
  }
  function updQuestion(c: Contenu, qi: number, changes: Partial<QuizQuestion>) {
    const qs = [...(c.quiz_questions ?? [])];
    qs[qi] = { ...qs[qi], ...changes };
    setQuestions(c.id, qs);
  }
  function removeQuestion(c: Contenu, qi: number) {
    setQuestions(c.id, (c.quiz_questions ?? []).filter((_, i) => i !== qi));
  }
  function addOption(c: Contenu, qi: number) {
    const qs = [...(c.quiz_questions ?? [])];
    qs[qi] = { ...qs[qi], options: [...qs[qi].options, ""] };
    setQuestions(c.id, qs);
  }
  function updOption(c: Contenu, qi: number, oi: number, val: string) {
    const qs = [...(c.quiz_questions ?? [])];
    const opts = [...qs[qi].options]; opts[oi] = val;
    qs[qi] = { ...qs[qi], options: opts };
    setQuestions(c.id, qs);
  }
  function removeOption(c: Contenu, qi: number, oi: number) {
    const qs = [...(c.quiz_questions ?? [])];
    const opts = qs[qi].options.filter((_, i) => i !== oi);
    let correct = qs[qi].correct;
    if (correct >= opts.length) correct = Math.max(0, opts.length - 1);
    qs[qi] = { ...qs[qi], options: opts, correct };
    setQuestions(c.id, qs);
  }

  async function importCSV(c: Contenu, file: File) {
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) return toast.error("Fichier vide.");
    const start = (rows[0][0] ?? "").toLowerCase().includes("question") ? 1 : 0;
    const imported: QuizQuestion[] = [];
    let ignored = 0;
    for (let i = start; i < rows.length; i++) {
      const r = rows[i];
      const question = (r[0] ?? "").trim();
      const raw = [r[1], r[2], r[3], r[4]].map((s) => (s ?? "").trim());
      const correctCol = parseInt((r[5] ?? "").trim(), 10) - 1;
      const options = raw.filter(Boolean);
      if (!question || options.length < 2 || isNaN(correctCol) || correctCol < 0 || correctCol > 3 || !raw[correctCol]) {
        ignored++;
        continue;
      }
      const correct = raw.slice(0, correctCol).filter(Boolean).length;
      imported.push({ question, options, correct });
    }
    if (!imported.length) return toast.error("Aucune question valide. Vérifie le template (colonne bonne_reponse = numéro 1 à 4).");
    setQuestions(c.id, [...(c.quiz_questions ?? []), ...imported]);
    toast.success(`${imported.length} question(s) importée(s)${ignored ? ` · ${ignored} ligne(s) ignorée(s)` : ""}. Clique « Enregistrer ce bloc » pour sauvegarder.`);
  }

  async function saveBlock(c: Contenu) {
    setSavingId(c.id);
    const payload: any = { titre: c.titre };
    if (c.type === "texte") {
      payload.contenu_texte = c.contenu_texte;
    } else if (c.type === "video_embed") {
      payload.video_platform = c.video_platform;
      payload.video_url = c.video_url;
      payload.duree_video_secondes = c.duree_video_secondes || 0;
    } else if (c.type === "quiz") {
      const qs = c.quiz_questions ?? [];
      const bad = qs.some((q) => !q.question.trim() || q.options.filter((o) => o.trim()).length < 2);
      if (qs.length === 0 || bad) {
        setSavingId(null);
        return toast.error("Chaque question doit avoir un intitulé et au moins 2 réponses.");
      }
      payload.quiz_questions = qs;
      payload.quiz_score_min = Math.min(100, Math.max(0, c.quiz_score_min ?? seuilReussite));
      payload.quiz_duree_minutes = c.quiz_duree_minutes ?? dureeQuiz;
      payload.quiz_penalite_deuxieme_essai = c.quiz_penalite_deuxieme_essai ?? (penaliteDeuxiemeEssai / 100);
    }
    const { error } = await supabase.from("contenus_module").update(payload).eq("id", c.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("Bloc enregistré");
    await load();
  }

  async function removeBlock(id: string) {
    if (!confirm("Supprimer ce bloc de contenu ?")) return;
    const { error } = await supabase.from("contenus_module").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await load();
    onChanged?.();
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[idx], b = items[j];
    await supabase.from("contenus_module").update({ ordre: b.ordre }).eq("id", a.id);
    await supabase.from("contenus_module").update({ ordre: a.ordre }).eq("id", b.id);
    await load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Contenus — {moduleTitre}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <Loader2 className="mx-auto my-8 animate-spin text-primary" />
        ) : (
          <div className="space-y-4">
            {/* ===== CONFIGURATION GLOBALE DU MODULE ===== */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">⚙️ Configuration du module</h3>
                <span className="text-xs text-muted-foreground ml-2">Ces paramètres s'appliquent à tous les quiz du module</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temps du quiz */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Temps imparti (minutes)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={dureeQuiz}
                    onChange={(e) => setDureeQuiz(Number(e.target.value))}
                    className="h-8"
                  />
                </div>

                {/* Seuil de réussite */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Seuil de réussite : {seuilReussite}%
                  </Label>
                  <Slider
                    value={[seuilReussite]}
                    onValueChange={([value]) => setSeuilReussite(value)}
                    min={40}
                    max={100}
                    step={5}
                    className="py-1"
                  />
                </div>

                {/* Pénalité 2e essai */}
                <div className="space-y-2">
                  <Label className="text-xs">Pénalité 2e essai : {penaliteDeuxiemeEssai}%</Label>
                  <Slider
                    value={[penaliteDeuxiemeEssai]}
                    onValueChange={([value]) => setPenaliteDeuxiemeEssai(value)}
                    min={0}
                    max={50}
                    step={5}
                    className="py-1"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Réduction appliquée à la note du 2e essai
                  </p>
                </div>

                {/* Pondérations */}
                <div className="space-y-2">
                  <Label className="text-xs">Pondération</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs">Quiz: {ponderationQuiz}%</p>
                      <Slider
                        value={[ponderationQuiz]}
                        onValueChange={([value]) => {
                          setPonderationQuiz(value);
                          setPonderationCarnet(100 - value);
                        }}
                        min={20}
                        max={80}
                        step={5}
                        className="py-1"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs">Carnet: {ponderationCarnet}%</p>
                      <Slider
                        value={[ponderationCarnet]}
                        onValueChange={([value]) => {
                          setPonderationCarnet(value);
                          setPonderationQuiz(100 - value);
                        }}
                        min={20}
                        max={80}
                        step={5}
                        className="py-1"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Note finale = (Quiz × {ponderationQuiz}%) + (Carnet × {ponderationCarnet}%)
                  </p>
                </div>
              </div>

              <Button 
                size="sm" 
                variant="outline" 
                className="mt-3"
                onClick={saveModuleConfig}
              >
                <Save className="h-3 w-3 mr-1" />
                Appliquer la configuration
              </Button>
            </div>

            {/* ===== LISTE DES BLOCS ===== */}
            {items.length === 0 && (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Aucun contenu. Ajoute un bloc ci-dessous.
              </p>
            )}

            {items.map((c, idx) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  {c.type === "texte" ? <FileText size={15} className="text-primary" /> : c.type === "video_embed" ? <Video size={15} className="text-primary" /> : <HelpCircle size={15} className="text-primary" />}
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {c.type === "texte" ? "Texte" : c.type === "video_embed" ? "Vidéo" : "Quiz"} · #{idx + 1}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}><ChevronUp size={14} /></Button>
                    <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}><ChevronDown size={14} /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeBlock(c.id)}><Trash2 size={14} /></Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Titre du bloc</Label>
                    <Input 
                      value={c.titre ?? ""} 
                      onChange={(e) => patch(c.id, { titre: e.target.value })} 
                      placeholder={c.type === "quiz" ? "Ex : Quiz de validation" : "Titre"} 
                    />
                  </div>

                  {c.type === "texte" && (
                    <div>
                      <Label className="text-xs">Contenu (HTML accepté)</Label>
                      <Textarea 
                        rows={5} 
                        value={c.contenu_texte ?? ""} 
                        onChange={(e) => patch(c.id, { contenu_texte: e.target.value })} 
                        placeholder="<h2>Titre</h2><p>…</p>" 
                      />
                    </div>
                  )}

                  {c.type === "video_embed" && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr_120px]">
                      <div>
                        <Label className="text-xs">Plateforme</Label>
                        <Select 
                          value={c.video_platform ?? "youtube"} 
                          onValueChange={(v) => patch(c.id, { video_platform: v as Contenu["video_platform"] })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="vimeo">Vimeo</SelectItem>
                            <SelectItem value="dailymotion">Dailymotion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">URL</Label>
                        <Input 
                          value={c.video_url ?? ""} 
                          onChange={(e) => patch(c.id, { video_url: e.target.value })} 
                          placeholder="https://…" 
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Durée (s)</Label>
                        <Input 
                          type="number" 
                          value={c.duree_video_secondes ?? 0} 
                          onChange={(e) => patch(c.id, { duree_video_secondes: parseInt(e.target.value) || 0 })} 
                        />
                      </div>
                    </div>
                  )}

                  {c.type === "quiz" && (
                    <div className="space-y-3">
                      {/* Configuration spécifique au quiz */}
                      <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3 rounded-lg">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Seuil réussite</Label>
                          <Input 
                            type="number" 
                            min={0} 
                            max={100} 
                            className="h-7 text-sm"
                            value={c.quiz_score_min ?? seuilReussite} 
                            onChange={(e) => patch(c.id, { quiz_score_min: parseInt(e.target.value) || 0 })} 
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Durée (min)</Label>
                          <Input 
                            type="number" 
                            min={1} 
                            max={120} 
                            className="h-7 text-sm"
                            value={c.quiz_duree_minutes ?? dureeQuiz} 
                            onChange={(e) => patch(c.id, { quiz_duree_minutes: parseInt(e.target.value) || 1 })} 
                          />
                        </div>
                      </div>

                      {/* Import / Export */}
                      <div className="flex flex-wrap items-end gap-2">
                        <Button size="sm" variant="outline" onClick={downloadTemplate}>
                          <Download size={13} className="mr-1" />Template CSV
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => fileInputs.current[c.id]?.click()}>
                          <Upload size={13} className="mr-1" />Importer un CSV
                        </Button>
                        <input
                          ref={(el) => { fileInputs.current[c.id] = el; }}
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) importCSV(c, f);
                            e.target.value = "";
                          }}
                        />
                      </div>

                      {/* Liste des questions */}
                      {(c.quiz_questions ?? []).map((q, qi) => (
                        <div key={qi} className="rounded-lg border border-border bg-background p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Question {qi + 1}</span>
                            <Button size="icon" variant="ghost" className="ml-auto text-destructive" onClick={() => removeQuestion(c, qi)}><Trash2 size={12} /></Button>
                          </div>
                          <Input 
                            className="mb-2" 
                            value={q.question} 
                            onChange={(e) => updQuestion(c, qi, { question: e.target.value })} 
                            placeholder="Intitulé de la question" 
                          />
                          <div className="space-y-1.5">
                            {q.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updQuestion(c, qi, { correct: oi })}
                                  title="Marquer comme bonne réponse"
                                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${q.correct === oi ? "border-green-600 bg-green-600 text-white" : "border-border text-transparent"}`}
                                >
                                  <Check size={12} />
                                </button>
                                <Input 
                                  value={opt} 
                                  onChange={(e) => updOption(c, qi, oi, e.target.value)} 
                                  placeholder={`Réponse ${oi + 1}`} 
                                />
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="text-muted-foreground" 
                                  onClick={() => removeOption(c, qi, oi)} 
                                  disabled={q.options.length <= 2}
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            ))}
                          </div>
                          <Button size="sm" variant="ghost" className="mt-1 text-xs" onClick={() => addOption(c, qi)}>
                            <Plus size={12} className="mr-1" />Ajouter une réponse
                          </Button>
                        </div>
                      ))}

                      <Button size="sm" variant="outline" onClick={() => addQuestion(c)}>
                        <Plus size={13} className="mr-1" />Ajouter une question
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Cercle vert = bonne réponse. Min. 2 réponses. L'import CSV ajoute aux questions existantes.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => saveBlock(c)} disabled={savingId === c.id}>
                      {savingId === c.id ? <Loader2 size={13} className="mr-1 animate-spin" /> : <Save size={13} className="mr-1" />}
                      Enregistrer ce bloc
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* ===== BOUTONS D'AJOUT ===== */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={() => addBlock("texte")}>
                <Plus size={14} className="mr-1" /><FileText size={14} className="mr-1" />Texte
              </Button>
              <Button variant="outline" size="sm" onClick={() => addBlock("video_embed")}>
                <Plus size={14} className="mr-1" /><Video size={14} className="mr-1" />Vidéo
              </Button>
              <Button variant="outline" size="sm" onClick={() => addBlock("quiz")}>
                <Plus size={14} className="mr-1" /><HelpCircle size={14} className="mr-1" />Quiz
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
