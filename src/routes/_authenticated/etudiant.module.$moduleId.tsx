import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { TextContent } from "@/components/text-content";
import { VideoEmbed } from "@/components/video-embed";
import { QuizRunner } from "@/components/quiz-runner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Loader2, CheckCircle2, FileText, Video, HelpCircle, NotebookPen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/etudiant/module/$moduleId")({ component: Page });

function Page() {
  useRoleGuard("etudiant");
  const { user } = useCurrentUser();
  const { moduleId } = Route.useParams();
  const [module, setModule] = useState<any>(null);
  const [contenus, setContenus] = useState<any[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data: m } = await supabase
      .from("modules_cours")
      .select("id, titre, description, parcours_id")
      .eq("id", moduleId)
      .maybeSingle();
    setModule(m);
    const { data: cs } = await supabase
      .from("contenus_module")
      .select("*")
      .eq("module_id", moduleId)
      .order("ordre");
    setContenus(
      (cs ?? []).map((c: any) => ({ ...c, quiz_questions: Array.isArray(c.quiz_questions) ? c.quiz_questions : [] })),
    );
    const { data: sv } = await supabase
      .from("suivi_contenu")
      .select("contenu_id, complete")
      .eq("etudiant_id", user.id)
      .eq("module_id", moduleId);
    setDoneIds(new Set((sv ?? []).filter((s) => s.complete && s.contenu_id).map((s) => s.contenu_id as string)));
    setLoading(false);
  }

  useEffect(() => { if (user) load(); }, [user, moduleId]);

  async function markComplete(contenuId: string) {
    if (!user || !module || doneIds.has(contenuId)) return;
    // 1) garantir que la ligne existe (sans écraser un complete existant)
    await supabase.from("suivi_contenu").upsert(
      { etudiant_id: user.id, contenu_id: contenuId, module_id: moduleId, parcours_id: module.parcours_id, complete: false },
      { onConflict: "etudiant_id,contenu_id", ignoreDuplicates: true },
    );
    // 2) passer à complete=true -> déclenche le trigger AFTER UPDATE
    const { error } = await supabase
      .from("suivi_contenu")
      .update({ complete: true, updated_at: new Date().toISOString() })
      .eq("etudiant_id", user.id)
      .eq("contenu_id", contenuId);
    if (error) return;
    setDoneIds((prev) => new Set(prev).add(contenuId));
  }

  if (loading) return <AssirikShell title="Module"><Loader2 className="mx-auto animate-spin text-primary" /></AssirikShell>;
  if (!module) return <AssirikShell title="Module introuvable"><p className="text-muted-foreground">Ce module n'existe pas ou tu n'y as pas accès.</p></AssirikShell>;

  const total = contenus.length;
  const done = contenus.filter((c) => doneIds.has(c.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  return (
    <AssirikShell title={`📦 ${module.titre}`}>
      <Link to="/etudiant/parcours">
        <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground"><ArrowLeft size={14} className="mr-1" />Mes parcours</Button>
      </Link>

      {module.description && <p className="mb-4 text-sm text-muted-foreground">{module.description}</p>}

      <div className="mb-6 flex items-center gap-3">
        <Progress value={pct} className="h-2 flex-1" />
        <span className="text-sm font-medium text-muted-foreground">{done}/{total}</span>
      </div>

      {allDone && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="text-green-600" />
          <p className="text-sm font-medium text-green-800">Module terminé ! Ton carnet est débloqué.</p>
          <Link to="/etudiant/carnet" className="ml-auto">
            <Button size="sm"><NotebookPen size={14} className="mr-1" />Aller au carnet</Button>
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {contenus.map((c, idx) => {
          const isDone = doneIds.has(c.id);
          return (
            <section key={c.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                {c.type === "texte" ? <FileText size={16} className="text-primary" /> : c.type === "video_embed" ? <Video size={16} className="text-primary" /> : <HelpCircle size={16} className="text-primary" />}
                <h3 className="font-semibold">{c.titre || `Contenu ${idx + 1}`}</h3>
                {isDone && <CheckCircle2 size={16} className="ml-auto text-green-600" />}
              </div>

              {c.type === "texte" && (
                <TextContent contenuId={c.id} html={c.contenu_texte ?? ""} onRead={() => markComplete(c.id)} />
              )}

              {c.type === "video_embed" && (
                <VideoEmbed url={c.video_url ?? ""} onComplete={() => markComplete(c.id)} />
              )}

              {c.type === "quiz" && (
                <QuizRunner
                  questions={c.quiz_questions ?? []}
                  scoreMin={c.quiz_score_min ?? 70}
                  alreadyDone={isDone}
                  onPassed={() => markComplete(c.id)}
                />
              )}
            </section>
          );
        })}

        {contenus.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Ce module n'a pas encore de contenu.
          </p>
        )}
      </div>
    </AssirikShell>
  );
}
