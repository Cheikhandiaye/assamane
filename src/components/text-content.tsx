import { useEffect, useRef } from "react";

interface Props {
  contenuId: string;
  html: string;
  onRead?: () => void;
  dwellMs?: number;
}

export function TextContent({ contenuId, html, onRead, dwellMs = 3000 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const fired = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.99) {
            if (fired.current || timer.current) continue;
            timer.current = setTimeout(() => {
              fired.current = true;
              onRead?.();
              timer.current = null;
            }, dwellMs);
          } else if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
        }
      },
      { threshold: [0, 0.99] },
    );
    obs.observe(ref.current);
    return () => {
      obs.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [contenuId, onRead, dwellMs]);

  return (
    <div
      ref={ref}
      data-content-id={contenuId}
      className="prose prose-sm max-w-none rounded-lg border border-border bg-card p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}