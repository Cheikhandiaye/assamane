import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Rocket } from "lucide-react";

export const Route = createFileRoute("/auth/reset-password")({
  ssr: false,
  component: ResetPage,
});

function ResetPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) toast.error(error.message);
    else setSent(true);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-secondary px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-md">
        <div className="mb-6 flex items-center gap-2">
          <Rocket size={28} className="text-primary" />
          <span className="text-xl font-black">ASSIRIK</span>
        </div>
        <h1 className="text-xl font-bold">Réinitialiser le mot de passe</h1>
        {sent ? (
          <p className="mt-4 text-sm text-muted-foreground">📩 Un lien a été envoyé à {email}. Vérifie ta boîte mail.</p>
        ) : (
          <form onSubmit={send} className="mt-4 space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-base" />
            <button className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground">Envoyer le lien</button>
          </form>
        )}
        <Link to="/auth" className="mt-4 inline-block text-sm text-primary hover:underline">← Retour</Link>
      </div>
    </div>
  );
}