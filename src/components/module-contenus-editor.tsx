import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, FileText, Video, Save, HelpCircle, Check } from "lucide-react";
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
  ordre: number;
};

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

  async function load() {
    if (!moduleId) return;
    setLoading(true);
    const { data } = await supabase
      .from("contenus_module")
      .select("*")
      .eq("module_id", moduleId)
      .order("ordre");
    setItems(
      (data ?? []).map((c: any) => ({
        ...c,
        quiz_questions: Array.isArray(c.quiz_questions) ? c.quiz_questions : [],
      })) as Contenu[],
    );
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
    else payload = { ...base, quiz_questions: [], quiz_score_min: 70 };
    const { error } = await supabase.from("contenus_module").insert(payload);
    if (error) return toast.error(error.message);
    await load();
    onChanged?.();
  }

  function patch(id: string, changes: Partial<Contenu>) {
    setItems((arr) => arr.map((c) => (c.id === id ? { ...c, ...changes } : c)));
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
      payload.quiz_score_min = Math.min(100, Math.max(0, c.quiz_score_min ?? 70));
    }
    const { error } = await supabase.from("contenus_module").update(payload).eq("id", c.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("Bloc enregistré");
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
      <DialogContent className="max-h-[88vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contenus — {moduleTitre}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <Loader2 className="mx-auto my-8 animate-spin text-primary" />
        ) : (
          <div className="space-y-4">
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
                    <Input value={c.titre ?? ""} onChange={(e) => patch(c.id, { titre: e.target.value })} placeholder={c.type === "quiz" ? "Ex : Quiz de validation" : "Titre"} />
                  </div>

                  {c.type === "texte" && (
                    <div>
                      <Label className="text-xs">Contenu (HTML accepté)</Label>
                      <Textarea rows={5} value={c.contenu_texte ?? ""} onChange={(e) => patch(c.id, { contenu_texte: e.target.value })} placeholder="<h2>Titre</h2><p>…</p>" />
                    </div>
                  )}

                  {c.type === "video_embed" && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr_120px]">
                      <div>
                        <Label className="text-xs">Plateforme</Label>
                        <Select value={c.video_platform ?? "youtube"} onValueChange={(v) => patch(c.id, { video_platform: v as Contenu["video_platform"] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="youtube">YouTube</SelectItem>
                            <SelectItem value="vimeo">Vimeo</SelectItem>
                            <SelectItem value="dailymotion">Dailymotion</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">URL</Label><Input value={c.video_url ?? ""} onChange={(e) => patch(c.id, { video_url: e.target.value })} placeholder="https://…" /></div>
                      <div><Label className="text-xs">Durée (s)</Label><Input type="number" value={c.duree_video_secondes ?? 0} onChange={(e) => patch(c.id, { duree_video_secondes: parseInt(e.target.value) || 0 })} /></div>
                    </div>
                  )}

                  {c.type === "quiz" && (
                    <div className="space-y-3">
                      <div className="w-40">
                        <Label className="text-xs">Seuil de réussite (%)</Label>
                        <Input type="number" min={0} max={100} value={c.quiz_score_min ?? 70} onChange={(e) => patch(c.id, { quiz_score_min: parseInt(e.target.value) || 0 })} />
                      </div>

                      {(c.quiz_questions ?? []).map((q, qi) => (
                        <div key={qi} className="rounded-lg border border-border bg-background p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Question {qi + 1}</span>
                            <Button size="icon" variant="ghost" className="ml-auto text-destructive" onClick={() => removeQuestion(c, qi)}><Trash2 size={12} /></Button>
                          </div>
                          <Input className="mb-2" value={q.question} onChange={(e) => updQuestion(c, qi, { question: e.target.value })} placeholder="Intitulé de la question" />
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
                                <Input value={opt} onChange={(e) => updOption(c, qi, oi, e.target.value)} placeholder={`Réponse ${oi + 1}`} />
                                <Button size="icon" variant="ghost" className="text-muted-foreground" onClick={() => removeOption(c, qi, oi)} disabled={q.options.length <= 2}><Trash2 size={12} /></Button>
                              </div>
                            ))}
                          </div>
                          <Button size="sm" variant="ghost" className="mt-1 text-xs" onClick={() => addOption(c, qi)}><Plus size={12} className="mr-1" />Ajouter une réponse</Button>
                        </div>
                      ))}

                      <Button size="sm" variant="outline" onClick={() => addQuestion(c)}><Plus size={13} className="mr-1" />Ajouter une question</Button>
                      <p className="text-xs text-muted-foreground">Le cercle vert = la bonne réponse. Minimum 2 réponses par question.</p>
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

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={() => addBlock("texte")}><Plus size={14} className="mr-1" /><FileText size={14} className="mr-1" />Texte</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock("video_embed")}><Plus size={14} className="mr-1" /><Video size={14} className="mr-1" />Vidéo</Button>
              <Button variant="outline" size="sm" onClick={() => addBlock("quiz")}><Plus size={14} className="mr-1" /><HelpCircle size={14} className="mr-1" />Quiz</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
