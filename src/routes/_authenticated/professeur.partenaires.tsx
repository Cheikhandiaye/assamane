import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AssirikShell } from "@/components/assirik-shell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Building2, Mail, MapPin, Search } from "lucide-react";
import type { Partenaire } from "@/components/partenaire-form";
import { toast } from "sonner";
import { useRoleGuard } from "@/hooks/use-role-guard";

export const Route = createFileRoute("/_authenticated/professeur/partenaires")({
  component: ProfesseurPartenairesPage,
});

function ProfesseurPartenairesPage() {
  useRoleGuard("professeur");
  const [items, setItems] = useState<Partenaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: rows, error } = await supabase
        .from("parcours_professeurs")
        .select(
          "parcours:parcours_id ( mission:mission_id ( partenaire:partenaire_id ( id, nom, logo_url, couleur_primaire, couleur_secondaire, adresse, contact_email ) ) )",
        )
        .eq("professeur_id", user.id);
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      type Row = { parcours: { mission: { partenaire: Partenaire | null } | null } | null };
      const map = new Map<string, Partenaire>();
      ((rows ?? []) as unknown as Row[]).forEach((r) => {
        const p = r?.parcours?.mission?.partenaire;
        if (p && !map.has(p.id)) map.set(p.id, p);
      });
      setItems(Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom)));
      setLoading(false);
    })();
  }, []);

  const filtered = items.filter((p) => p.nom.toLowerCase().includes(query.toLowerCase()));

  return (
    <AssirikShell title="🏢 Mes partenaires">
      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un partenaire..."
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-card p-8 text-center text-muted-foreground">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-card p-10 text-center">
          <Building2 size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">Aucun partenaire</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu n'es encore associé à aucun partenaire via tes parcours.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white text-lg font-bold"
                  style={{ backgroundColor: p.couleur_primaire ?? "#7C3AED" }}
                >
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.nom} className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    p.nom.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-foreground">{p.nom}</p>
                  {p.contact_email && (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mail size={12} /> {p.contact_email}
                    </p>
                  )}
                  {p.adresse && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin size={12} /> {p.adresse}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AssirikShell>
  );
}