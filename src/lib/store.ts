import { Invoice, MessageTemplates } from "./types";

const INVOICES_KEY = "settleup_invoices";
const TEMPLATES_KEY = "settleup_templates";

const DEFAULT_TEMPLATES: MessageTemplates = {
  email: `Hi {{client_name}},\n\nThis is a friendly reminder that your invoice of {{invoice_amount}} was due on {{due_date}}. It is now {{days_overdue}} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`,
  whatsapp: `Hi {{client_name}}, just a reminder that your invoice of {{invoice_amount}} (due {{due_date}}) is {{days_overdue}} days overdue. Please settle when you can. Thanks!`,
};

export function getInvoices(): Invoice[] {
  const data = localStorage.getItem(INVOICES_KEY);
  if (!data) return [];
  const invoices: Invoice[] = JSON.parse(data);
  // Auto-update overdue status
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return invoices.map((inv) => {
    if (inv.status !== "paid" && new Date(inv.due_date) < now) {
      return { ...inv, status: "overdue" as const };
    }
    return inv;
  });
}

export function saveInvoices(invoices: Invoice[]) {
  localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
}

export function getInvoice(id: string): Invoice | undefined {
  return getInvoices().find((i) => i.id === id);
}

export function addInvoice(invoice: Invoice) {
  const all = getInvoices();
  all.push(invoice);
  saveInvoices(all);
}

export function updateInvoice(id: string, updates: Partial<Invoice>) {
  const all = getInvoices().map((i) => (i.id === id ? { ...i, ...updates } : i));
  saveInvoices(all);
}

export function deleteInvoice(id: string) {
  saveInvoices(getInvoices().filter((i) => i.id !== id));
}

export function getTemplates(): MessageTemplates {
  const data = localStorage.getItem(TEMPLATES_KEY);
  return data ? JSON.parse(data) : DEFAULT_TEMPLATES;
}

export function saveTemplates(templates: MessageTemplates) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}
