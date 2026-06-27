import { useState, useMemo, useEffect } from "react";

export function usePaginated<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // Si la liste rétrécit (filtre, suppression), on reste dans les bornes
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    pageCount,
    pageItems,
    total: items.length,
    from: items.length === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, items.length),
  };
}
