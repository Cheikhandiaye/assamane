import { cn } from "@/lib/utils";

export interface TapOption {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  options: TapOption[];
  value: string;
  onChange: (v: string) => void;
}

export function TapToSelect({ options, value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all",
              active
                ? "border-accent bg-accent/10 shadow-sm"
                : "border-border bg-card hover:border-primary/40 hover:bg-muted",
            )}
          >
            {opt.icon && <span className="text-2xl">{opt.icon}</span>}
            <span className="text-center">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}