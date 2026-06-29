import { supabase } from "@/integrations/supabase/client";

const ONE_YEAR = 60 * 60 * 24 * 365;

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

/** Upload un logo partenaire (admin uniquement, RLS appliquée). Retourne l'URL publique complète. */
export async function uploadPartnerLogo(file: File): Promise<string> {
  // Vérifier la taille (max 5 Mo)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Le logo ne doit pas dépasser 5 Mo");
  }

  // Vérifier le type
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Format de fichier non supporté. Utilisez PNG, JPG, WEBP ou SVG.");
  }

  const path = `partner-logos/${Date.now()}_${safeName(file.name)}`;
  const { error } = await supabase.storage.from("partner-logos").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  
  if (error) throw error;

  // 🔥 RETOURNER L'URL PUBLIQUE COMPLÈTE
  const { data: publicUrlData } = supabase.storage
    .from("partner-logos")
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
}

/** Retourne une URL signée (longue durée) pour afficher un logo stocké. */
export async function getLogoUrl(pathOrUrl: string | null | undefined): Promise<string | null> {
  if (!pathOrUrl) return null;
  // Si c'est déjà une URL complète, la retourner directement
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  
  // Sinon, créer une URL signée
  const { data, error } = await supabase.storage.from("partner-logos").createSignedUrl(pathOrUrl, ONE_YEAR);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Supprimer un logo partenaire */
export async function deletePartnerLogo(pathOrUrl: string | null | undefined): Promise<void> {
  if (!pathOrUrl) return;

  // Extraire le path depuis l'URL si nécessaire
  let path = pathOrUrl;
  if (pathOrUrl.startsWith("http")) {
    // Extraire le path après le bucket
    const urlParts = pathOrUrl.split("/partner-logos/");
    if (urlParts.length === 2) {
      path = urlParts[1];
    } else {
      // Essayer de trouver le nom du fichier
      const fileName = pathOrUrl.split("/").pop();
      if (fileName) {
        path = `partner-logos/${fileName}`;
      }
    }
  }

  if (!path || path === "") return;

  const { error } = await supabase.storage.from("partner-logos").remove([path]);
  if (error) {
    console.error("Erreur suppression logo:", error);
    // Non bloquant
  }
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
