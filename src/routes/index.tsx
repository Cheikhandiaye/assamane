import { createFileRoute, Link } from "@tanstack/react-router";
import { Rocket } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ASSIRIK — Plateforme pédagogique entrepreneuriat" },
      { name: "description", content: "ASSIRIK accompagne étudiants, professeurs et partenaires dans un parcours pédagogique d'entrepreneuriat structuré." },
      { property: "og:title", content: "ASSIRIK" },
      { property: "og:description", content: "Plateforme pédagogique entrepreneuriat" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <div className="inline-flex items-center gap-3 mb-6">
          <Rocket size={48} className="text-primary" />
          <span className="text-5xl font-bold text-primary">ASSIRIK</span>
        </div>
        <p className="text-lg text-muted-foreground mb-8">
          La plateforme pédagogique pour apprendre l'entrepreneuriat. 🚀
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:opacity-90"
        >
          Accéder à mon espace
        </Link>
      </div>
    </div>
  );
}
