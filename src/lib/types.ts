export type InvoiceStatus = "unpaid" | "overdue" | "paid";

export interface Invoice {
  id: string;
  client_name: string;
  client_email: string;
  client_whatsapp: string;
  invoice_amount: number;
  currency: string;
  due_date: string;
  status: InvoiceStatus;
  reminder_count: number;
  last_reminder_sent: string | null;
  paid_at: string | null;
  notes: string;
  created_at: string;
}

export interface MessageTemplates {
  email: string;
  whatsapp: string;
}
