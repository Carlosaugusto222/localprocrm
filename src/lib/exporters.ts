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

type DocOrg = {
  name?: string | null; logo_url?: string | null; cnpj?: string | null;
  phone?: string | null; email?: string | null; address?: string | null;
  city?: string | null; state?: string | null; zip?: string | null;
};
type DocItem = { description: string; quantity: number; unit_price: number; total?: number };
type DocKind = "quote" | "order" | "receipt";

const KIND_TITLE: Record<DocKind, string> = {
  quote: "ORÇAMENTO",
  order: "ORDEM DE SERVIÇO",
  receipt: "RECIBO",
};

export function generateBusinessPDF(opts: {
  kind: DocKind;
  number: number | string;
  org: DocOrg;
  customer?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  title?: string;
  items: DocItem[];
  notes?: string | null;
  total: number;
  date?: Date;
}) {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth();
  const date = opts.date ?? new Date();

  // Header
  doc.setFillColor(20, 20, 24);
  doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.text(opts.org.name ?? "Empresa", 14, 12);
  doc.setFontSize(9);
  const subtitle = [opts.org.cnpj && `CNPJ: ${opts.org.cnpj}`, opts.org.phone, opts.org.email]
    .filter(Boolean).join("  ·  ");
  if (subtitle) doc.text(subtitle, 14, 19);

  doc.setFontSize(13);
  doc.text(KIND_TITLE[opts.kind], W - 14, 12, { align: "right" });
  doc.setFontSize(9);
  doc.text(`Nº ${opts.number}`, W - 14, 18, { align: "right" });
  doc.text(date.toLocaleDateString("pt-BR"), W - 14, 23, { align: "right" });

  doc.setTextColor(20);

  let y = 36;
  if (opts.title) {
    doc.setFontSize(12);
    doc.text(opts.title, 14, y);
    y += 7;
  }

  if (opts.customer?.name) {
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Cliente", 14, y);
    doc.setTextColor(20);
    doc.text(opts.customer.name, 14, y + 5);
    const contact = [opts.customer.phone, opts.customer.email].filter(Boolean).join("  ·  ");
    if (contact) { doc.setFontSize(9); doc.setTextColor(100); doc.text(contact, 14, y + 10); doc.setTextColor(20); }
    y += 16;
  }

  const fmt = (n: number) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  autoTable(doc, {
    startY: y,
    head: [["Descrição", "Qtd", "Unit.", "Total"]],
    body: opts.items.map(it => [
      it.description,
      String(it.quantity),
      fmt(it.unit_price),
      fmt(it.total ?? it.quantity * it.unit_price),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 30] },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  const endY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text("TOTAL", W - 60, endY);
  doc.setFontSize(14);
  doc.text(fmt(opts.total), W - 14, endY, { align: "right" });

  if (opts.notes) {
    doc.setFontSize(9); doc.setTextColor(80);
    doc.text("Observações:", 14, endY + 14);
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(opts.notes, W - 28);
    doc.text(lines, 14, endY + 19);
  }

  if (opts.kind === "receipt") {
    const sigY = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(150);
    doc.line(W / 2 - 50, sigY, W / 2 + 50, sigY);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text("Assinatura", W / 2, sigY + 5, { align: "center" });
  }

  doc.save(`${opts.kind}-${opts.number}.pdf`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
