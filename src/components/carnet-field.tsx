import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "boolean" | "date";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface Props {
  field: FieldConfig;
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly?: boolean;
}

export function CarnetField({ field, value, onChange, readOnly }: Props) {
  const labelEl = (
    <Label className="text-sm">
      {field.label}
      {field.required && !readOnly && <span className="text-destructive"> *</span>}
    </Label>
  );

  if (readOnly) {
    const display =
      field.type === "boolean"
        ? value
          ? "Oui"
          : "Non"
        : value
          ? String(value)
          : "—";
    return (
      <div className="space-y-1">
        {labelEl}
        <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          {display}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {labelEl}
      {field.type === "textarea" && (
        <Textarea rows={4} value={(value as string) ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === "text" && (
        <Input value={(value as string) ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === "number" && (
        <Input type="number" value={(value as string) ?? ""} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === "date" && (
        <Input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.type === "boolean" && (
        <div className="flex items-center gap-2">
          <Switch checked={Boolean(value)} onCheckedChange={onChange} />
          <span className="text-xs text-muted-foreground">{value ? "Oui" : "Non"}</span>
        </div>
      )}
      {field.type === "select" && (
        <Select value={(value as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
          <SelectContent>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}