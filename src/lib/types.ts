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
  invoice_number: string;
  tax_rate: number;
  payment_link: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
}

export interface LineItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface BusinessProfile {
  id?: string;
  business_name: string;
  logo_url: string | null;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  reminder_template?: string | null;
}

export interface MessageTemplates {
  email: string;
  whatsapp: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  created_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  is_published: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
}
