import { useEffect, useRef, useState } from "react";

interface Options<T> {
  value: T;
  onSave: (v: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ value, onSave, delay = 1500, enabled = true }: Options<T>) {
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaving(true);
      setError(null);
      try {
        await onSave(value);
        setLastSaved(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value), enabled]);

  return { saving, lastSaved, error };
}