import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { createUserFn, updateUserFn } from "@/lib/admin-users.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Role = "admin" | "professeur" | "etudiant" | "partenaire";

export interface UserFormValue {
  user_id?: string;
  full_name?: string;
  email?: string;
  role: Role;
  partenaire_id?: string | null;
}

export function UserFormDialog({
  open,
  onOpenChange,
  initial,
  defaultRole,
  onSaved,
  title,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: UserFormValue | null;
  defaultRole: Role;
  onSaved: () => void;
  title?: string;
}) {
  const createU = useServerFn(createUserFn);
  const updateU = useServerFn(updateUserFn);
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(defaultRole);
  const [partenaireId, setPartenaireId] = useState<string>("");
  const [partenaires, setPartenaires] = useState<{ id: string; nom: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.full_name ?? "");
    setEmail(initial?.email ?? "");
    setPassword("");
    setRole(initial?.role ?? defaultRole);

    // Liste des partenaires pour le sélecteur
    supabase
      .from("partenaires")
      .select("id, nom")
      .order("nom")
      .then(({ data }) => setPartenaires(data ?? []));

    // Pré-remplissage du partenaire : depuis initial si fourni, sinon depuis la base en édition
    if (initial?.partenaire_id !== undefined) {
      setPartenaireId(initial.partenaire_id ?? "");
    } else if (initial?.user_id) {
      supabase
        .from("profiles")
        .select("partenaire_id")
        .eq("id", initial.user_id)
        .maybeSingle()
        .then(({ data }) => setPartenaireId(data?.partenaire_id ?? ""));
    } else {
      setPartenaireId("");
    }
  }, [open, initial, defaultRole]);

  const editing = !!initial?.user_id;
  const showPartenaire = role === "etudiant" || role === "partenaire";

  async function submit() {
    if (!full_name.trim() || !email.trim()) { toast.error("Nom et email requis"); return; }
    if (!editing && password.length < 8) { toast.error("Mot de passe : 8 caractères min."); return; }
    setSaving(true);
    const effectivePartenaire = showPartenaire ? (partenaireId || null) : null;
    try {
      if (editing && initial?.user_id) {
        await updateU({ data: { user_id: initial.user_id, full_name, email, password: password || undefined, role, partenaire_id: effectivePartenaire } });
        toast.success("Utilisateur mis à jour");
      } else {
        await createU({ data: { full_name, email, password, role, partenaire_id: effectivePartenaire } });
        toast.success("Utilisateur créé");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title ?? (editing ? "Modifier l'utilisateur" : "Créer un utilisateur")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom complet</Label><Input value={full_name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div>
            <Label>{editing ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={editing ? "Laisser vide pour ne pas changer" : "8 caractères min."} />
          </div>
          <div>
            <Label>Rôle</Label>
            <select className="w-full rounded-md border border-input bg-background p-2 text-sm" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="etudiant">Étudiant</option>
              <option value="professeur">Professeur</option>
              <option value="partenaire">Partenaire</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {showPartenaire && (
            <div>
              <Label>Partenaire {role === "etudiant" ? "(de rattachement)" : ""}</Label>
              <select
                className="w-full rounded-md border border-input bg-background p-2 text-sm"
                value={partenaireId}
                onChange={(e) => setPartenaireId(e.target.value)}
              >
                <option value="">— Aucun partenaire —</option>
                {partenaires.map((p) => (
                  <option key={p.id} value={p.id}>{p.nom}</option>
                ))}
              </select>
              {role === "etudiant" && !partenaireId && (
                <p className="mt-1 text-xs text-amber-600">
                  Sans partenaire, aucun prof ne pourra l'inscrire à un parcours.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving && <Loader2 size={14} className="mr-2 animate-spin" />}Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
