import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export interface AttestationStatus {
  complete: boolean;
  completed_at: string | null;
  deadline: string | null;
  within_deadline: boolean;
}

export interface AttestationPDFData extends AttestationStatus {
  etudiant_nom: string;
  etudiant_email: string | null;
  parcours_nom: string;
  mission_nom: string | null;
  note_moyenne: number;
  notes: Array<{ module_titre: string; note_finale: number | null }>;
}

type RpcAttestationPayload = Partial<AttestationStatus> | Partial<AttestationStatus>[] | null;

function normalizeAttestationStatus(payload: unknown): AttestationStatus {
  const row = (Array.isArray(payload) ? payload[0] : payload) as RpcAttestationPayload;
  const value = row && !Array.isArray(row) ? row : {};
  return {
    complete: Boolean(value.complete),
    completed_at: typeof value.completed_at === "string" ? value.completed_at : null,
    deadline: typeof value.deadline === "string" ? value.deadline : null,
    within_deadline: Boolean(value.within_deadline),
  };
}

export function normalizeDetailedAttestationData(payload: unknown, parcoursTitre = "Parcours") {
  const base = normalizeAttestationStatus(payload);
  const row = (Array.isArray(payload) ? payload[0] : payload) as Record<string, unknown> | null;
  const noteMoyenne = typeof row?.note_moyenne === "number" ? row.note_moyenne : base.complete ? 10 : 0;
  return {
    parcours_titre: typeof row?.parcours_titre === "string" ? row.parcours_titre : parcoursTitre,
    complete: base.complete,
    eligible: Boolean(row?.eligible ?? (base.complete && base.within_deadline && noteMoyenne >= 10)),
    note_moyenne: noteMoyenne,
    modules_valides: typeof row?.modules_valides === "number" ? row.modules_valides : 0,
    modules_total: typeof row?.modules_total === "number" ? row.modules_total : 0,
    taux_reussite: typeof row?.taux_reussite === "number" ? row.taux_reussite : base.complete ? 100 : 0,
    modules_echoues: Array.isArray(row?.modules_echoues) ? row.modules_echoues : [],
    modules_a_reprendre: Array.isArray(row?.modules_a_reprendre) ? row.modules_a_reprendre : [],
    seuil_requis: typeof row?.seuil_requis === "number" ? row.seuil_requis : 10,
    message:
      typeof row?.message === "string"
        ? row.message
        : base.complete
          ? base.within_deadline
            ? "Parcours terminé dans les délais."
            : "Parcours terminé hors délai."
          : "Parcours en cours.",
    peut_telecharger: Boolean(row?.peut_telecharger ?? (base.complete && base.within_deadline && noteMoyenne >= 10)),
    peut_refaire_modules: Boolean(row?.peut_refaire_modules ?? false),
    date_generation: typeof row?.date_generation === "string" ? row.date_generation : new Date().toISOString(),
  };
}

export async function fetchAttestationStatus(etudiantId: string, parcoursId: string): Promise<AttestationStatus> {
  const { data, error } = await supabase.rpc("fn_parcours_attestation", {
    p_etudiant_id: etudiantId,
    p_parcours_id: parcoursId,
  });
  if (error) throw new Error(error.message);
  return normalizeAttestationStatus(data);
}

export async function buildAttestation(etudiantId: string, parcoursId: string): Promise<AttestationPDFData | null> {
  const status = await fetchAttestationStatus(etudiantId, parcoursId);
  if (!status.complete || !status.within_deadline) return null;

  const [etudiantResult, parcoursResult, notesResult] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", etudiantId).single(),
    supabase.from("parcours").select("nom, mission_id, missions(nom)").eq("id", parcoursId).single(),
    supabase
      .from("notes_finales_module")
      .select("note_finale, modules_cours(titre, ordre)")
      .eq("etudiant_id", etudiantId)
      .eq("parcours_id", parcoursId),
  ]);

  if (etudiantResult.error) throw new Error(`Erreur étudiant: ${etudiantResult.error.message}`);
  if (parcoursResult.error) throw new Error(`Erreur parcours: ${parcoursResult.error.message}`);
  if (notesResult.error) throw new Error(`Erreur notes: ${notesResult.error.message}`);

  const etudiant = etudiantResult.data as { full_name: string | null; email: string | null };
  const parcours = parcoursResult.data as unknown as { nom: string | null; missions: { nom: string | null } | null };
  const notes = ((notesResult.data ?? []) as unknown as Array<{
    note_finale: number | null;
    modules_cours: { titre: string | null; ordre: number | null } | { titre: string | null; ordre: number | null }[] | null;
  }>)
    .map((note) => {
      const module = Array.isArray(note.modules_cours) ? note.modules_cours[0] : note.modules_cours;
      return {
        module_titre: module?.titre ?? "Module",
        module_ordre: module?.ordre ?? 0,
        note_finale: note.note_finale,
      };
    })
    .sort((a, b) => a.module_ordre - b.module_ordre)
    .map(({ module_ordre: _module_ordre, ...note }) => note);

  const noteMoyenne = notes.length
    ? notes.reduce((sum, note) => sum + (note.note_finale ?? 0), 0) / notes.length
    : 0;

  return {
    ...status,
    etudiant_nom: etudiant.full_name ?? etudiant.email ?? "Étudiant",
    etudiant_email: etudiant.email,
    parcours_nom: parcours.nom ?? "Parcours",
    mission_nom: parcours.missions?.nom ?? null,
    note_moyenne: noteMoyenne,
    notes,
  };
}

export function downloadAttestationPDF(data: AttestationPDFData) {
  const doc = createAttestationDocument(data);
  const safeParcours = data.parcours_nom.replace(/[^\p{L}\p{N}]+/gu, "_");
  const safeEtudiant = data.etudiant_nom.replace(/[^\p{L}\p{N}]+/gu, "_");
  doc.save(`Attestation_${safeParcours}_${safeEtudiant}.pdf`);
}

function createAttestationDocument(data: AttestationPDFData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const primaryColor = "#7C3AED";
  const secondaryColor = "#1E1B4B";

  doc.setFillColor(245, 245, 250);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(primaryColor);
  doc.setLineWidth(2);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

  doc.setFillColor(secondaryColor);
  doc.rect(margin, margin, pageWidth - 2 * margin, 40, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("ATTESTATION DE RÉUSSITE", pageWidth / 2, margin + 25, { align: "center" });

  doc.setTextColor(secondaryColor);
  doc.setFontSize(16);
  doc.text(`Parcours : ${data.parcours_nom}`, pageWidth / 2, margin + 60, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const bodyY = margin + 80;
  doc.text("Je soussigné(e),", margin + 10, bodyY);
  doc.text("certifie que", margin + 10, bodyY + 10);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor);
  doc.text(data.etudiant_nom, margin + 10, bodyY + 25);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text("a suivi avec succès le parcours de formation :", margin + 10, bodyY + 35);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(secondaryColor);
  doc.text(data.parcours_nom, margin + 10, bodyY + 50);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const notesY = bodyY + 70;
  doc.text("Détail des modules validés :", margin + 10, notesY);

  let currentY = notesY + 10;
  data.notes.forEach((note, index) => {
    doc.text(`${index + 1}. ${note.module_titre}`, margin + 15, currentY);
    doc.text(`${(note.note_finale ?? 0).toFixed(1)}/20`, pageWidth - margin - 30, currentY);
    currentY += 8;
  });

  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor);
  doc.text(`Moyenne générale : ${data.note_moyenne.toFixed(1)}/20`, margin + 10, currentY);

  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const signatureY = pageHeight - margin - 20;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  doc.text(`Fait à Dakar, le ${dateStr}`, pageWidth / 2, signatureY, { align: "center" });

  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin + 40, signatureY + 5, pageWidth - margin - 40, signatureY + 5);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(10);
  doc.text("Signature du responsable pédagogique", pageWidth / 2, signatureY + 15, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("ASSIRIK — Plateforme pédagogique entrepreneuriat", pageWidth / 2, pageHeight - margin - 5, { align: "center" });
  return doc;
}

export async function generateAttestation(etudiantId: string, parcoursId: string) {
  try {
    const data = await buildAttestation(etudiantId, parcoursId);
    if (!data) throw new Error("Vous n'êtes pas éligible à l'attestation.");
    downloadAttestationPDF(data);
    const fileName = `Attestation_${data.parcours_nom}_${data.etudiant_nom}.pdf`;
    return { success: true, fileName };
  } catch (error: any) {
    console.error("Erreur génération attestation:", error);
    throw new Error(error.message || "Erreur lors de la génération de l'attestation");
  }
}
