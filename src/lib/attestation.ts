import { supabase } from "@/integrations/supabase/client";
import { calculerNoteFinale } from "@/lib/note-engine";
import jsPDF from "jspdf";

export interface AttestationStatus {
  complete: boolean;
  completed_at: string | null;
  deadline: string | null;
  within_deadline: boolean;
}

export async function fetchAttestationStatus(etudiantId: string, parcoursId: string): Promise<AttestationStatus> {
  const { data, error } = await supabase.rpc("fn_parcours_attestation", {
    _etudiant_id: etudiantId,
    _parcours_id: parcoursId,
  });
  if (error) return { complete: false, completed_at: null, deadline: null, within_deadline: false };
  const row = Array.isArray(data) ? data[0] : data;
  return (row as AttestationStatus) ?? { complete: false, completed_at: null, deadline: null, within_deadline: false };
}

export interface AttestationData {
  studentName: string;
  parcoursNom: string;
  partenaireNom: string | null;
  completedAt: string | null;
  note: number | null;
  reference: string;
}

export async function buildAttestation(etudiantId: string, parcoursId: string): Promise<AttestationData | null> {
  const status = await fetchAttestationStatus(etudiantId, parcoursId);
  if (!status.complete) return null;

  const [{ data: prof }, { data: pc }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", etudiantId).maybeSingle(),
    supabase
      .from("parcours")
      .select("nom, pondere_individuel, pondere_groupe, missions:mission_id(partenaires:partenaire_id(nom))")
      .eq("id", parcoursId)
      .maybeSingle(),
  ]);

  const { data: ind } = await supabase
    .from("reponses_etudiant")
    .select("note")
    .eq("etudiant_id", etudiantId)
    .eq("parcours_id", parcoursId)
    .eq("statut", "valide")
    .not("note", "is", null);
  const notesInd = (ind ?? []).map((r: any) => Number(r.note)).filter((n) => !isNaN(n));

  const { data: gm } = await supabase
    .from("groupe_membres")
    .select("groupe_id, groupes!inner(parcours_id)")
    .eq("etudiant_id", etudiantId)
    .eq("groupes.parcours_id", parcoursId);
  const groupeId = (gm ?? [])[0]?.groupe_id;

  let notesGrp: number[] = [];
  if (groupeId) {
    const { data: rg } = await supabase
      .from("reponses_groupe")
      .select("note")
      .eq("groupe_id", groupeId)
      .eq("parcours_id", parcoursId)
      .eq("statut", "valide")
      .not("note", "is", null);
    notesGrp = (rg ?? []).map((r: any) => Number(r.note)).filter((n) => !isNaN(n));
  }

  const note = calculerNoteFinale(
    notesInd,
    notesGrp,
    Number(pc?.pondere_individuel ?? 60),
    Number(pc?.pondere_groupe ?? 40),
  );

  return {
    studentName: prof?.full_name ?? "Étudiant",
    parcoursNom: pc?.nom ?? "Parcours",
    partenaireNom: (pc as any)?.missions?.partenaires?.nom ?? null,
    completedAt: status.completed_at,
    note,
    reference: `ASSIRIK-${parcoursId.slice(0, 8).toUpperCase()}-${etudiantId.slice(0, 6).toUpperCase()}`,
  };
}

export function downloadAttestationPDF(d: AttestationData) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setDrawColor("#7C3AED"); doc.setLineWidth(3); doc.rect(28, 28, W - 56, H - 56);
  doc.setDrawColor("#F97316"); doc.setLineWidth(1); doc.rect(40, 40, W - 80, H - 80);

  doc.setFont("helvetica", "bold"); doc.setTextColor("#1E1B4B"); doc.setFontSize(32);
  doc.text("ATTESTATION DE RÉUSSITE", W / 2, 130, { align: "center" });
  doc.setDrawColor("#F97316"); doc.setLineWidth(2); doc.line(W / 2 - 130, 150, W / 2 + 130, 150);

  doc.setFont("helvetica", "normal"); doc.setFontSize(14); doc.setTextColor("#0F172A");
  doc.text("La plateforme ASSIRIK atteste que", W / 2, 205, { align: "center" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.setTextColor("#7C3AED");
  doc.text(d.studentName, W / 2, 248, { align: "center" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(14); doc.setTextColor("#0F172A");
  doc.text("a complété avec succès le parcours", W / 2, 288, { align: "center" });

  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor("#1E1B4B");
  doc.text(d.parcoursNom, W / 2, 318, { align: "center" });

  if (d.partenaireNom) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor("#475569");
    doc.text(`Partenaire : ${d.partenaireNom}`, W / 2, 342, { align: "center" });
  }

  const dateStr = d.completedAt ? new Date(d.completedAt).toLocaleDateString("fr-FR") : "—";
  const noteStr = d.note === null ? "—" : `${d.note.toFixed(2)}/20`;
  doc.setFontSize(13); doc.setTextColor("#0F172A");
  doc.text(`Note finale : ${noteStr}`, W / 2 - 150, 392, { align: "center" });
  doc.text(`Date d'obtention : ${dateStr}`, W / 2 + 150, 392, { align: "center" });

  doc.setFontSize(9); doc.setTextColor("#94A3B8");
  doc.text(`Référence : ${d.reference}`, W / 2, H - 55, { align: "center" });

  doc.save(`attestation-${d.parcoursNom.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
