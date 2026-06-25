export function calculerNoteFinale(
  notesInd: number[],
  notesGrp: number[],
  ponderationInd: number,
  ponderationGrp: number,
): number | null {
  if (!notesInd.length && !notesGrp.length) return null;
  const moyInd = notesInd.length ? notesInd.reduce((a, b) => a + b, 0) / notesInd.length : null;
  const moyGrp = notesGrp.length ? notesGrp.reduce((a, b) => a + b, 0) / notesGrp.length : null;
  const poids = (moyInd !== null ? ponderationInd : 0) + (moyGrp !== null ? ponderationGrp : 0);
  if (!poids) return null;
  const total =
    (moyInd ?? 0) * (moyInd !== null ? ponderationInd : 0) +
    (moyGrp ?? 0) * (moyGrp !== null ? ponderationGrp : 0);
  return Math.round((total / poids) * 100) / 100;
}

export function formatNote(note: number | null): string {
  return note === null ? "—" : `${note.toFixed(2)}/20`;
}