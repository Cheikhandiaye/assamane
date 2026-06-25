import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  component: OnboardingPage,
});

const SCREENS = [
  { emoji: "🚀", title: "Bienvenue sur ASSIRIK ! 🚀", text: "Ta plateforme pour devenir entrepreneur." },
  { emoji: "🎥", title: "1️⃣ Suis le cours", text: "Regarde les vidéos et lis les cours. Atteins 80% pour débloquer ton carnet ! Si tu es en classe, ton prof t'ouvre l'accès directement. 🎓" },
  { emoji: "📓", title: "2️⃣ Remplis ton carnet", text: "Réponds aux questions, sauvegarde en brouillon, soumets quand tu es prêt·e. Ton prof valide et tu avances !" },
  { emoji: "🏆", title: "3️⃣ Gagne des badges", text: "Valide tes modules, travaille en équipe, débloque des récompenses !" },
];

function OnboardingPage() {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  async function finish() {
    if (user) await supabase.from("profiles").update({ onboarding_done: true }).eq("id", user.id);
    navigate({ to: "/etudiant" });
  }

  const s = SCREENS[i];
  const last = i === SCREENS.length - 1;

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-10 text-white"
      style={{ background: "linear-gradient(135deg,#1E1B4B 0%,#7C3AED 100%)" }}>
      {i > 0 ? <button onClick={finish} className="self-end text-sm opacity-80 hover:opacity-100">Passer</button> : <div />}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="mb-6 text-8xl animate-bounce">{s.emoji}</div>
        <h1 className="text-3xl font-black">{s.title}</h1>
        <p className="mt-3 max-w-md text-base opacity-90">{s.text}</p>
      </div>
      <div className="flex gap-2">
        {SCREENS.map((_, idx) => <span key={idx} className={`h-2 w-2 rounded-full ${idx === i ? "bg-white" : "bg-white/40"}`} />)}
      </div>
      <button onClick={() => (last ? finish() : setI(i + 1))}
        className="mt-6 w-full max-w-xs rounded-2xl px-6 py-3 text-base font-bold"
        style={{ backgroundColor: last ? "#F97316" : "transparent", border: last ? "none" : "2px solid white" }}>
        {last ? "C'est parti ! 🎉" : "Suivant →"}
      </button>
    </div>
  );
}