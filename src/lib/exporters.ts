import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function exportCSV(rows: Record<string, any>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportXLSX(rows: Record<string, any>[], filename: string, sheetName = "Dados") {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportPDF(
  title: string,
  rows: Record<string, any>[],
  filename: string,
  columns?: { header: string; key: string }[],
) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);

  const cols = columns ?? Object.keys(rows[0] ?? {}).map(k => ({ header: k, key: k }));
  autoTable(doc, {
    startY: 28,
    head: [cols.map(c => c.header)],
    body: rows.map(r => cols.map(c => String(r[c.key] ?? ""))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [245, 245, 247] },
  });
  doc.save(`${filename}.pdf`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
