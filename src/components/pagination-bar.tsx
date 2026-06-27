import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationBar({
  page, pageCount, total, from, to, onPage,
}: {
  page: number; pageCount: number; total: number;
  from: number; to: number; onPage: (p: number) => void;
}) {
  if (total === 0) return null;

  // Fenêtre compacte : 1 … (page-1, page, page+1) … dernière
  const shown: number[] = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || (p >= page - 1 && p <= page + 1)) shown.push(p);
  }
  const items: (number | "…")[] = [];
  let prev = 0;
  for (const p of shown) {
    if (prev && p - prev > 1) items.push("…");
    items.push(p);
    prev = p;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm">
      <span className="text-muted-foreground">{from}–{to} sur {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={14} />
        </Button>
        {items.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-2 text-muted-foreground">…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="min-w-9"
              onClick={() => onPage(p)}
            >
              {p}
            </Button>
          )
        )}
        <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
