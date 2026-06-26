import { supabase } from "@/integrations/supabase/client";

const ONE_YEAR = 60 * 60 * 24 * 365;

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

/** Upload un logo partenaire (admin uniquement, RLS appliquée). Retourne le path stocké. */
export async function uploadPartnerLogo(file: File): Promise<string> {
  const path = `${Date.now()}_${safeName(file.name)}`;
  const { error } = await supabase.storage.from("partner-logos").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

/** Retourne une URL signée (longue durée) pour afficher un logo stocké. */
export async function getLogoUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage.from("partner-logos").createSignedUrl(pathOrUrl, ONE_YEAR);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Upload une pièce jointe carnet pour l'utilisateur courant. path = <uid>/<parcoursId>/<file>. */
export async function uploadCarnetAttachment(userId: string, parcoursId: string, file: File): Promise<string> {
  const path = `${userId}/${parcoursId}/${Date.now()}_${safeName(file.name)}`;
  const { error } = await supabase.storage.from("carnet-attachments").upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

/** URL signée 1 h pour télécharger une pièce jointe carnet. */
export async function getCarnetAttachmentUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("carnet-attachments").createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function deleteCarnetAttachment(path: string) {
  await supabase.storage.from("carnet-attachments").remove([path]);
}