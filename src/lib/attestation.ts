import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export async function generateAttestation(etudiantId: string, parcoursId: string) {
  try {
    // 1. Vérifier l'éligibilité
    const { data: attestationData, error: attestationError } = await supabase
      .rpc("fn_parcours_attestation", {
        p_etudiant_id: etudiantId,
        p_parcours_id: parcoursId,
      });

    if (attestationError) throw new Error(`Erreur vérification: ${attestationError.message}`);

    if (!attestationData?.eligible) {
      throw new Error(attestationData?.message || "Vous n'êtes pas éligible à l'attestation. Note minimum 10/20 requise.");
    }

    // 2. Récupérer les infos de l'étudiant et du parcours
    const [etudiantResult, parcoursResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", etudiantId)
        .single(),
      supabase
        .from("parcours")
        .select("titre, mission_id, missions(nom)")
        .eq("id", parcoursId)
        .single(),
    ]);

    if (etudiantResult.error) throw new Error(`Erreur étudiant: ${etudiantResult.error.message}`);
    if (parcoursResult.error) throw new Error(`Erreur parcours: ${parcoursResult.error.message}`);

    const etudiant = etudiantResult.data;
    const parcours = parcoursResult.data;

    // 3. Récupérer les notes détaillées
    const { data: notes, error: notesError } = await supabase
      .from("notes_finales_module")
      .select(`
        note_finale,
        modules_cours (
          titre,
          ordre
        )
      `)
      .eq("etudiant_id", etudiantId)
      .eq("parcours_id", parcoursId)
      .order("modules_cours(ordre)", { ascending: true });

    if (notesError) throw new Error(`Erreur notes: ${notesError.message}`);

    // 4. Générer le PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // === DESIGN DU PDF ===
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const primaryColor = "#7C3AED";
    const secondaryColor = "#1E1B4B";

    // Fond
    doc.setFillColor(245, 245, 250);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Bordure colorée
    doc.setDrawColor(primaryColor);
    doc.setLineWidth(2);
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

    // En-tête
    doc.setFillColor(secondaryColor);
    doc.rect(margin, margin, pageWidth - 2 * margin, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ATTESTATION DE RÉUSSITE", pageWidth / 2, margin + 25, { align: "center" });

    // Titre
    doc.setTextColor(secondaryColor);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Parcours : " + (parcours?.titre || "Non spécifié"), pageWidth / 2, margin + 60, { align: "center" });

    // Corps
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    const bodyY = margin + 80;
    doc.text("Je soussigné(e),", margin + 10, bodyY);
    doc.text("certifie que", margin + 10, bodyY + 10);

    // Nom de l'étudiant
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text(etudiant?.full_name || "Étudiant", margin + 10, bodyY + 25);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text("a suivi avec succès le parcours de formation :", margin + 10, bodyY + 35);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(secondaryColor);
    doc.text(parcours?.titre || "Parcours", margin + 10, bodyY + 50);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    // Notes
    const notesY = bodyY + 70;
    doc.text("Détail des modules validés :", margin + 10, notesY);

    let currentY = notesY + 10;
    if (notes && notes.length > 0) {
      notes.forEach((note, index) => {
        const moduleTitre = note.modules_cours?.titre || `Module ${index + 1}`;
        const noteFormatted = note.note_finale?.toFixed(1) || "0.0";
        doc.text(`${index + 1}. ${moduleTitre}`, margin + 15, currentY);
        doc.text(`${noteFormatted}/20`, pageWidth - margin - 30, currentY);
        currentY += 8;
      });
    }

    // Moyenne
    currentY += 5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor);
    doc.text(`Moyenne générale : ${attestationData?.note_moyenne?.toFixed(1) || "0.0"}/20`, margin + 10, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    // Date
    const today = new Date();
    const dateStr = today.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Signature
    const signatureY = pageHeight - margin - 20;
    doc.text(`Fait à Dakar, le ${dateStr}`, pageWidth / 2, signatureY, { align: "center" });

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin + 40, signatureY + 5, pageWidth - margin - 40, signatureY + 5);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.text("Signature du responsable pédagogique", pageWidth / 2, signatureY + 15, { align: "center" });

    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("ASSIRIK — Plateforme pédagogique entrepreneuriat", pageWidth / 2, pageHeight - margin - 5, { align: "center" });

    // 5. Sauvegarder le PDF
    const fileName = `Attestation_${parcours?.titre || "parcours"}_${etudiant?.full_name || "etudiant"}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };

  } catch (error: any) {
    console.error("Erreur génération attestation:", error);
    throw new Error(error.message || "Erreur lors de la génération de l'attestation");
  }
}
