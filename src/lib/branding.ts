import { useEffect } from "react";

export interface PartenaireBrand {
  couleur_primaire?: string | null;
  couleur_secondaire?: string | null;
}

/** Applique les couleurs d'un partenaire en CSS variables (--brand-primary / --brand-accent). */
export function applyBrand(brand: PartenaireBrand | null | undefined) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", brand?.couleur_primaire || "#7C3AED");
  root.style.setProperty("--brand-accent", brand?.couleur_secondaire || "#F97316");
}

export function useBrand(brand: PartenaireBrand | null | undefined) {
  useEffect(() => {
    applyBrand(brand);
    return () => applyBrand(null);
  }, [brand?.couleur_primaire, brand?.couleur_secondaire]);
}