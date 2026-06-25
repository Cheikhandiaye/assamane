import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { useRoleGuard } from "@/hooks/use-role-guard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/notifications")({ component: Page });

function Page() {
  useRoleGuard("admin");
  const [audience, setAudience] = useState<"all" | "etudiant" | "professeur" | "partenaire">("all");
  const [titre, setTitre] = useState("");
  const [message, setMessage] = useState("");
  const [lien, setLien] = useState("");
  const [sending, setSending] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("notifications").select("titre, message, type, created_at").eq("type", "broadcast").order("created_at", { ascending: false }).limit(10);
    const seen = new Set<string>();
    const dedup = (data ?? []).filter((n) => { const k = n.titre + (n.created_at ?? ""); if (seen.has(k)) return false; seen.add(k); return true; });
    setRecent(dedup);
  }
  useEffect(() => { load(); }, []);

  async function send() {
    if (!titre || !message) return toast.error("Titre et message requis");
    setSending(true);
    let userIds: string[] = [];
    if (audience === "all") {
      const { data } = await supabase.from("profiles").select("id");
      userIds = (data ?? []).map((p) => p.id);
    } else {
      const { data } = await supabase.from("user_roles").select("user_id").eq("role", audience);
      userIds = (data ?? []).map((p) => p.user_id);
    }
    if (!userIds.length) { setSending(false); return toast.error("Aucun destinataire"); }
    const rows = userIds.map((id) => ({ destinataire_id: id, titre, message, type: "broadcast", lien: lien || null }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Envoyé à ${userIds.length} destinataire(s)`);
    setTitre(""); setMessage(""); setLien(""); load();
  }

  return (
    <AssirikShell title="📣 Notifications">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Nouveau message</h2>
          <div className="space-y-3">
            <div><Label>Audience</Label>
              <Select value={audience} onValueChange={(v: any) => setAudience(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout le monde</SelectItem>
                  <SelectItem value="etudiant">Étudiants</SelectItem>
                  <SelectItem value="professeur">Professeurs</SelectItem>
                  <SelectItem value="partenaire">Partenaires</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Titre</Label><Input value={titre} onChange={(e) => setTitre(e.target.value)} /></div>
            <div><Label>Message</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} /></div>
            <div><Label>Lien optionnel (ex. /etudiant/parcours)</Label><Input value={lien} onChange={(e) => setLien(e.target.value)} /></div>
            <Button onClick={send} disabled={sending} className="w-full">
              {sending ? <Loader2 className="mr-2 animate-spin" size={14} /> : <Send size={14} className="mr-1" />}
              Envoyer
            </Button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Envois récents</h2>
          {recent.length === 0 ? <p className="text-sm text-muted-foreground">Aucun envoi.</p> : (
            <ul className="space-y-2">{recent.map((n, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <p className="font-medium">{n.titre}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.created_at ? new Date(n.created_at).toLocaleString("fr-FR") : ""}</p>
              </li>
            ))}</ul>
          )}
        </div>
      </div>
    </AssirikShell>
  );
}