import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { uploadCarnetAttachment, getCarnetAttachmentUrl, deleteCarnetAttachment } from "@/lib/storage";
import { toast } from "sonner";
import { Loader2, Paperclip, Trash2, Download } from "lucide-react";

export interface FieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "boolean" | "date" | "file";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface Props {
  field: FieldConfig;
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly?: boolean;
  uploadCtx?: { userId: string; parcoursId: string };
}

export function CarnetField({ field, value, onChange, readOnly, uploadCtx }: Props) {
  const [busy, setBusy] = useState(false);

  async function openAttachment(path: string) {
    const url = await getCarnetAttachmentUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("Lien indisponible");
  }

  const labelEl = (
    <Label className="text-sm">
      {field.label}
      {field.required && !readOnly && <span className="text-destructive"> *</span>}
    </Label>
  );

  if (readOnly) {
    let display: any =
      field.type === "boolean"
        ? value ? "Oui" : "Non"
        : value ? String(value) : "—";
    if (field.type === "file" && value) {
      return (
        <div className="space-y-1">
          {labelEl}
          <button type="button" onClick={() => openAttachment(String(value))} className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm hover:bg-muted">
            <Download size={14} /> Télécharger la pièce jointe
          </button>
        </div>
      );
    }
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
      {field.type === "file" && (
        <div className="space-y-2">
          {value ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <Paperclip size={14} className="text-primary" />
              <button type="button" className="flex-1 truncate text-left hover:underline" onClick={() => openAttachment(String(value))}>
                Pièce jointe enregistrée
              </button>
              <button
                type="button"
                className="text-destructive hover:text-destructive/80"
                onClick={async () => { await deleteCarnetAttachment(String(value)); onChange(null); }}
                title="Supprimer"
              ><Trash2 size={14} /></button>
            </div>
          ) : null}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
            {value ? "Remplacer le fichier" : "Joindre un fichier"}
            <input
              type="file"
              className="hidden"
              disabled={busy || !uploadCtx}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f || !uploadCtx) return;
                if (f.size > 10 * 1024 * 1024) { toast.error("Fichier > 10 Mo"); return; }
                setBusy(true);
                try {
                  const path = await uploadCarnetAttachment(uploadCtx.userId, uploadCtx.parcoursId, f);
                  onChange(path);
                  toast.success("Pièce jointe ajoutée");
                } catch (err: any) {
                  toast.error(err?.message ?? "Erreur d'upload");
                } finally { setBusy(false); e.target.value = ""; }
              }}
            />
          </label>
          {!uploadCtx && <p className="text-xs text-muted-foreground">Upload désactivé hors contexte parcours.</p>}
        </div>
      )}
    </div>
  );
}