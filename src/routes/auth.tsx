import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Rocket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — ASSIRIK" },
      { name: "description", content: "Connecte-toi à ASSIRIK pour accéder à ton espace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("✨ Bienvenue !");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("🎉 Compte créé ! Tu peux te connecter.");
        setMode("signin");
        return;
      }
      navigate({ to: "/app", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error("❌ " + msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-card rounded-xl shadow-md p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Rocket size={28} className="text-primary" />
          <span className="text-2xl font-bold text-primary">ASSIRIK</span>
        </div>
        <h1 className="text-xl font-semibold text-center text-foreground mb-2">
          {mode === "signin" ? "Se connecter" : "Créer un compte"}
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {mode === "signin" ? "Ravi de te revoir !" : "Rejoins l'aventure entrepreneuriat 🚀"}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">Nom complet</span>
              <input
                id="fullName"                    // ← AJOUTÉ
                name="fullName"                  // ← AJOUTÉ
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-xl border border-input bg-background px-4 py-3"
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Email</span>
            <input
              id="email"                        // ← AJOUTÉ
              name="email"                      // ← AJOUTÉ
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-input bg-background px-4 py-3"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Mot de passe</span>
            <input
              id="password"                     // ← AJOUTÉ
              name="password"                   // ← AJOUTÉ
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-input bg-background px-4 py-3"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "..." : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-sm text-primary hover:underline w-full text-center"
        >
          {mode === "signin" ? "Pas encore de compte ? S'inscrire" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
