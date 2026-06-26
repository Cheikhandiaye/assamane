import { useEffect, useState } from "react";
import { getLogoUrl } from "@/lib/storage";

export function PartnerLogo({ path, alt, className }: { path: string | null | undefined; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getLogoUrl(path ?? null).then((u) => { if (alive) setSrc(u); });
    return () => { alive = false; };
  }, [path]);
  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}