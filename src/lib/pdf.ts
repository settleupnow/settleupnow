import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice, LineItem, BusinessProfile } from "./types";
import { formatCurrencyForPdf } from "./format";

export function generateInvoicePdf(
  invoice: Invoice,
  lineItems: LineItem[],
  profile: BusinessProfile | null
): string {
  const doc = new jsPDF();
  let y = 20;

  // Business name / logo
  if (profile?.business_name) {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(profile.business_name, 14, y);
    y += 12;
  }

  // Invoice header
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice: ${invoice.invoice_number || "N/A"}`, 14, y);
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString("en-GB")}`, 140, y);
  y += 7;
  doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString("en-GB")}`, 140, y);
  y += 12;

  // Client info
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(invoice.client_name, 14, y);
  y += 6;
  doc.text(invoice.client_email, 14, y);
  y += 12;

  // Line items table
  const tableBody = lineItems.map((item) => [
    item.description,
    String(item.quantity),
    formatCurrencyForPdf(item.unit_price, invoice.currency),
    formatCurrencyForPdf(item.amount, invoice.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [50, 80, 160] },
    styles: { fontSize: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxAmount = subtotal * ((invoice.tax_rate || 0) / 100);
  const total = subtotal + taxAmount;

  doc.setFontSize(10);
  const rightX = 120;
  doc.text("Subtotal:", rightX, y);
  doc.text(formatCurrencyForPdf(subtotal, invoice.currency), 190, y, { align: "right" });
  y += 6;

  if (invoice.tax_rate && invoice.tax_rate > 0) {
    doc.text(`Tax (${invoice.tax_rate}%):`, rightX, y);
    doc.text(formatCurrencyForPdf(taxAmount, invoice.currency), 190, y, { align: "right" });
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total:", rightX, y);
  doc.text(formatCurrencyForPdf(total, invoice.currency), 180, y, { align: "right" });
  y += 14;

  // Payment link
  if (invoice.payment_link) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Payment Link:", 14, y);
    doc.setTextColor(50, 80, 160);
    doc.text(invoice.payment_link, 14, y + 6);
    doc.setTextColor(0, 0, 0);
    y += 16;
  }

  // Bank details
  const bankName = invoice.bank_name || profile?.bank_name;
  const bankAccNum = invoice.bank_account_number || profile?.bank_account_number;
  const bankAccName = invoice.bank_account_name || profile?.bank_account_name;

  if (bankName || bankAccNum) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Bank Details:", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    if (bankName) { doc.text(`Bank: ${bankName}`, 14, y); y += 5; }
    if (bankAccNum) { doc.text(`Account No: ${bankAccNum}`, 14, y); y += 5; }
    if (bankAccName) { doc.text(`Account Name: ${bankAccName}`, 14, y); y += 5; }
  }

  // Return as base64 data URI
  return doc.output("datauristring");
}

export function generateInvoicePdfBlob(
  invoice: Invoice,
  lineItems: LineItem[],
  profile: BusinessProfile | null
): Blob {
  const doc = new jsPDF();
  let y = 20;

  if (profile?.business_name) {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(profile.business_name, 14, y);
    y += 12;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice: ${invoice.invoice_number || "N/A"}`, 14, y);
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString("en-GB")}`, 140, y);
  y += 7;
  doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString("en-GB")}`, 140, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(invoice.client_name, 14, y);
  y += 6;
  doc.text(invoice.client_email, 14, y);
  y += 12;

  const tableBody = lineItems.map((item) => [
    item.description,
    String(item.quantity),
    formatCurrencyForPdf(item.unit_price, invoice.currency),
    formatCurrencyForPdf(item.amount, invoice.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Description", "Qty", "Unit Price", "Amount"]],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [50, 80, 160] },
    styles: { fontSize: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxAmount = subtotal * ((invoice.tax_rate || 0) / 100);
  const total = subtotal + taxAmount;

  doc.setFontSize(10);
  const rightX = 145;
  doc.text("Subtotal:", rightX, y);
  doc.text(formatCurrencyForPdf(subtotal, invoice.currency), 180, y, { align: "right" });
  y += 6;

  if (invoice.tax_rate && invoice.tax_rate > 0) {
    doc.text(`Tax (${invoice.tax_rate}%):`, rightX, y);
    doc.text(formatCurrencyForPdf(taxAmount, invoice.currency), 180, y, { align: "right" });
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total:", rightX, y);
  doc.text(formatCurrencyForPdf(total, invoice.currency), 180, y, { align: "right" });
  y += 14;

  if (invoice.payment_link) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Payment Link:", 14, y);
    doc.setTextColor(50, 80, 160);
    doc.text(invoice.payment_link, 14, y + 6);
    doc.setTextColor(0, 0, 0);
    y += 16;
  }

  const bankName = invoice.bank_name || profile?.bank_name;
  const bankAccNum = invoice.bank_account_number || profile?.bank_account_number;
  const bankAccName = invoice.bank_account_name || profile?.bank_account_name;

  if (bankName || bankAccNum) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Bank Details:", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    if (bankName) { doc.text(`Bank: ${bankName}`, 14, y); y += 5; }
    if (bankAccNum) { doc.text(`Account No: ${bankAccNum}`, 14, y); y += 5; }
    if (bankAccName) { doc.text(`Account Name: ${bankAccName}`, 14, y); y += 5; }
  }

  return doc.output("blob");
}
