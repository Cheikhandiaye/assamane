import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";

type QuizQuestion = { question: string; options: string[]; correct: number };

export function QuizRunner({
  questions,
  scoreMin,
  alreadyDone,
  onPassed,
}: {
  questions: QuizQuestion[];
  scoreMin: number;
  alreadyDone: boolean;
  onPassed: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  function submit() {
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= scoreMin;
    setResult({ score, passed });
    if (passed) onPassed();
  }

  function reset() { setAnswers({}); setResult(null); }

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  if (alreadyDone && !result) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
        <CheckCircle2 size={18} /> Quiz déjà réussi ✓
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={qi} className="rounded-lg border border-border bg-card p-4">
          <p className="mb-2 font-medium">{qi + 1}. {q.question}</p>
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const showCorrect = result && oi === q.correct;
              const showWrong = result && selected && oi !== q.correct;
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={!!result}
                  onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors
                    ${selected && !result ? "border-primary bg-primary/5" : "border-border"}
                    ${showCorrect ? "border-green-500 bg-green-50 text-green-800" : ""}
                    ${showWrong ? "border-red-400 bg-red-50 text-red-700" : ""}`}
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-xs
                    ${selected && !result ? "border-primary bg-primary text-white" : "border-muted-foreground/40"}`}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!result ? (
        <Button onClick={submit} disabled={!allAnswered}>Valider mes réponses</Button>
      ) : result.passed ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          <CheckCircle2 size={18} /> Réussi — {result.score}% (seuil : {scoreMin}%). Contenu validé ✓
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <XCircle size={18} /> Échec — {result.score}% (seuil : {scoreMin}%). Réessaie.
          </div>
          <Button variant="outline" onClick={reset}><RotateCcw size={14} className="mr-1" />Recommencer le quiz</Button>
        </div>
      )}
    </div>
  );
}
