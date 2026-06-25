import jsPDF from "jspdf";
import Papa from "papaparse";
import html2canvas from "html2canvas";

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  const csv = Papa.unparse(rows);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface PdfSection {
  title?: string;
  lines?: string[];
  table?: { headers: string[]; rows: (string | number)[][] };
}

export function exportPDF(filename: string, title: string, sections: PdfSection[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#1E1B4B");
  doc.text(title, margin, y);
  y += 24;
  doc.setDrawColor("#7C3AED");
  doc.setLineWidth(1.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  doc.setTextColor("#0F172A");

  for (const sec of sections) {
    if (y > 760) { doc.addPage(); y = margin; }
    if (sec.title) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(sec.title, margin, y);
      y += 18;
    }
    if (sec.lines) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      for (const line of sec.lines) {
        const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
        for (const w of wrapped) {
          if (y > 780) { doc.addPage(); y = margin; }
          doc.text(w, margin, y);
          y += 14;
        }
      }
      y += 6;
    }
    if (sec.table) {
      const colW = (pageWidth - margin * 2) / sec.table.headers.length;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setFillColor("#1E1B4B");
      doc.setTextColor("#ffffff");
      doc.rect(margin, y - 12, pageWidth - margin * 2, 18, "F");
      sec.table.headers.forEach((h, i) => doc.text(String(h), margin + 4 + i * colW, y));
      y += 14;
      doc.setTextColor("#0F172A");
      doc.setFont("helvetica", "normal");
      for (const row of sec.table.rows) {
        if (y > 780) { doc.addPage(); y = margin; }
        row.forEach((c, i) => {
          const txt = doc.splitTextToSize(String(c ?? ""), colW - 8);
          doc.text(txt[0] ?? "", margin + 4 + i * colW, y);
        });
        y += 14;
      }
      y += 10;
    }
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/** Capture une div HTML et l'exporte en PDF A4. */
export async function exportElementToPDF(element: HTMLElement, filename: string) {
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = canvas.width / pageWidth;
  const imgHeight = canvas.height / ratio;
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}