import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, LineItem, BusinessProfile } from "./types";
import { formatCurrencyForPdf } from "./format";

// Brand colors
const GREEN: [number, number, number] = [26, 107, 60];    // #1A6B3C
const DARK: [number, number, number] = [26, 26, 26];      // #1a1a1a
const GRAY: [number, number, number] = [136, 136, 136];   // #888888
const WHITE: [number, number, number] = [255, 255, 255];
const ALT_ROW: [number, number, number] = [245, 245, 245]; // #F5F5F5

const MARGIN = 20;
const PAGE_W = 210; // A4 width in mm
const CONTENT_W = PAGE_W - MARGIN * 2;

function buildInvoicePdf(
  invoice: Invoice,
  lineItems: LineItem[],
  profile: BusinessProfile | null
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageH = doc.internal.pageSize.getHeight();
  let y = MARGIN;

  // ── Header Left: Business name + bank details ──
  const businessName = profile?.business_name || "Business";
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text(businessName, MARGIN, y + 6);

  // Bank details under business name
  const bankName = invoice.bank_name || profile?.bank_name;
  const bankAccNum = invoice.bank_account_number || profile?.bank_account_number;
  const bankAccName = invoice.bank_account_name || profile?.bank_account_name;

  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  doc.setTextColor(...GRAY);
  let bankY = y + 12;
  if (bankName) { doc.text(bankName, MARGIN, bankY); bankY += 4; }
  if (bankAccNum) { doc.text(`Acc: ${bankAccNum}`, MARGIN, bankY); bankY += 4; }
  if (bankAccName) { doc.text(bankAccName, MARGIN, bankY); bankY += 4; }

  // ── Header Right: INVOICE title + number + dates ──
  const rightX = PAGE_W - MARGIN;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("INVOICE", rightX, y + 6, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("courier", "normal");
  doc.setTextColor(...GRAY);
  doc.text(invoice.invoice_number || "N/A", rightX, y + 13, { align: "right" });

  const issueDate = new Date(invoice.created_at).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const dueDate = new Date(invoice.due_date).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  doc.text(`Issued: ${issueDate}`, rightX, y + 19, { align: "right" });
  doc.text(`Due: ${dueDate}`, rightX, y + 24, { align: "right" });

  y = Math.max(bankY, y + 28) + 4;

  // ── Green divider ──
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // ── Bill To ──
  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  doc.setTextColor(...GRAY);
  doc.text("BILL TO", MARGIN, y);
  y += 5;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(invoice.client_name, MARGIN, y);
  y += 5;

  if (invoice.client_email) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(invoice.client_email, MARGIN, y);
    y += 5;
  }

  y += 6;

  // ── Line items table ──
  const tableBody = lineItems.map((item) => [
    item.description,
    String(item.quantity),
    formatCurrencyForPdf(item.unit_price, invoice.currency),
    formatCurrencyForPdf(item.amount, invoice.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"]],
    body: tableBody,
    margin: { left: MARGIN, right: MARGIN },
    theme: "plain",
    headStyles: {
      fillColor: GREEN,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 8,
      font: "courier",
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "right", cellWidth: 32 },
      3: { halign: "right", cellWidth: 32 },
    },
    alternateRowStyles: {
      fillColor: ALT_ROW,
    },
    didParseCell(data) {
      // Right-align amount header
      if (data.section === "head" && (data.column.index === 2 || data.column.index === 3)) {
        data.cell.styles.halign = "right";
      }
      if (data.section === "head" && data.column.index === 1) {
        data.cell.styles.halign = "center";
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Totals ──
  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxAmount = subtotal * ((invoice.tax_rate || 0) / 100);
  const total = subtotal + taxAmount;

  const labelX = PAGE_W - MARGIN - 70;
  const valX = PAGE_W - MARGIN;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Subtotal", labelX, y);
  doc.text(formatCurrencyForPdf(subtotal, invoice.currency), valX, y, { align: "right" });
  y += 6;

  if (invoice.tax_rate && invoice.tax_rate > 0) {
    doc.text(`Tax (${invoice.tax_rate}%)`, labelX, y);
    doc.text(formatCurrencyForPdf(taxAmount, invoice.currency), valX, y, { align: "right" });
    y += 6;
  }

  // Thin green line above total
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.3);
  doc.line(labelX, y, valX, y);
  y += 5;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GREEN);
  doc.text("Total", labelX, y);
  doc.text(formatCurrencyForPdf(total, invoice.currency), valX, y, { align: "right" });
  y += 10;

  // ── Notes ──
  if (invoice.notes) {
    y += 4;
    const boxX = MARGIN;
    const boxW = CONTENT_W;
    const noteLines = doc.setFont("helvetica", "normal").setFontSize(8).splitTextToSize(invoice.notes, boxW - 10);
    const boxH = noteLines.length * 4 + 8;

    // Light gray background
    doc.setFillColor(248, 248, 248);
    doc.rect(boxX, y, boxW, boxH, "F");

    // Green left border
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.8);
    doc.line(boxX, y, boxX, y + boxH);

    doc.setTextColor(...DARK);
    doc.text(noteLines, boxX + 5, y + 6);
    y += boxH + 6;
  }

  // ── Payment link ──
  if (invoice.payment_link) {
    doc.setFontSize(8);
    doc.setFont("courier", "normal");
    doc.setTextColor(...GRAY);
    doc.text("Payment Link:", MARGIN, y);
    doc.setTextColor(...GREEN);
    doc.text(invoice.payment_link, MARGIN + 28, y);
    y += 8;
  }

  // ── Footer ──
  const footerY = pageH - 12;
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY - 4, PAGE_W - MARGIN, footerY - 4);

  doc.setFontSize(7);
  doc.setFont("courier", "normal");
  doc.setTextColor(...GRAY);
  doc.text("Generated by SettleUp · settleup.ng", PAGE_W / 2, footerY, { align: "center" });

  return doc;
}

export function generateInvoicePdf(
  invoice: Invoice,
  lineItems: LineItem[],
  profile: BusinessProfile | null
): string {
  return buildInvoicePdf(invoice, lineItems, profile).output("datauristring");
}

export function generateInvoicePdfBlob(
  invoice: Invoice,
  lineItems: LineItem[],
  profile: BusinessProfile | null
): Blob {
  return buildInvoicePdf(invoice, lineItems, profile).output("blob");
}
