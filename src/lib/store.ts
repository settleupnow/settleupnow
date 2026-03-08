import { supabase } from "./supabase";
import { Invoice, MessageTemplates } from "./types";

const TEMPLATES_KEY = "settleup_templates";

const DEFAULT_TEMPLATES: MessageTemplates = {
  email: `Hi {{client_name}},\n\nThis is a friendly reminder that your invoice of {{invoice_amount}} was due on {{due_date}}. It is now {{days_overdue}} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`,
  whatsapp: `Hi {{client_name}}, just a reminder that your invoice of {{invoice_amount}} (due {{due_date}}) is {{days_overdue}} days overdue. Please settle when you can. Thanks!`,
};

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching invoices:", error);
    return [];
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return (data || []).map((inv) => {
    if (inv.status !== "paid" && new Date(inv.due_date) < now) {
      return { ...inv, status: "overdue" as const };
    }
    return inv;
  }) as Invoice[];
}

export async function getInvoice(id: string): Promise<Invoice | undefined> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return undefined;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (data.status !== "paid" && new Date(data.due_date) < now) {
    data.status = "overdue";
  }

  return data as Invoice;
}

export async function addInvoice(invoice: Omit<Invoice, "id">) {
  const { error } = await supabase.from("invoices").insert(invoice);
  if (error) {
    console.error("Error adding invoice:", error);
    throw error;
  }
}

export async function updateInvoice(id: string, updates: Partial<Invoice>) {
  const { error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id);
  if (error) {
    console.error("Error updating invoice:", error);
    throw error;
  }
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) {
    console.error("Error deleting invoice:", error);
    throw error;
  }
}

// Templates stay in localStorage (no table needed)
export function getTemplates(): MessageTemplates {
  const data = localStorage.getItem(TEMPLATES_KEY);
  return data ? JSON.parse(data) : DEFAULT_TEMPLATES;
}

export function saveTemplates(templates: MessageTemplates) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}
