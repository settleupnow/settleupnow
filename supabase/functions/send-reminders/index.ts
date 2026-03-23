import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_EMAIL_TEMPLATE = {
  dueSoon: {
    subject: "Reminder: Invoice due in 3 days",
    body: `Hi {{client_name}},\n\nThis is a friendly reminder that your invoice {{invoice_number}} of {{invoice_amount}} is due on {{due_date}} (in 3 days).\n\nPlease arrange payment before the due date.\n\nThank you.`,
  },
  dueToday: {
    subject: "Reminder: Invoice due today",
    body: `Hi {{client_name}},\n\nThis is a reminder that your invoice {{invoice_number}} of {{invoice_amount}} is due today ({{due_date}}).\n\nPlease arrange payment today.\n\nThank you.`,
  },
  overdue: {
    subject: "Overdue Invoice Reminder",
    body: `Hi {{client_name}},\n\nThis is a reminder that your invoice {{invoice_number}} of {{invoice_amount}} was due on {{due_date}}. It is now {{days_overdue}} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`,
  },
  stillOverdue: {
    subject: "Overdue Invoice - Follow Up",
    body: `Hi {{client_name}},\n\nThis is a follow-up reminder that your invoice {{invoice_number}} of {{invoice_amount}} was due on {{due_date}}. It is now {{days_overdue}} days overdue.\n\nPlease settle this invoice as soon as possible.\n\nThank you.`,
  },
};

function daysDiff(date1: Date, date2: Date): number {
  const d1 = new Date(date1);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(date2);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

function fillTemplate(template: string, invoice: any, overdueDays: number): string {
  return template
    .replace(/\{\{client_name\}\}/g, invoice.client_name)
    .replace(/\{\{invoice_amount\}\}/g, `${invoice.currency} ${invoice.invoice_amount}`)
    .replace(/\{\{due_date\}\}/g, invoice.due_date)
    .replace(/\{\{days_overdue\}\}/g, String(Math.max(0, overdueDays)))
    .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number || "");
}

function getReminderType(diffDays: number): keyof typeof DEFAULT_EMAIL_TEMPLATE | null {
  if (diffDays === -3) return "dueSoon";
  if (diffDays === 0) return "dueToday";
  if (diffDays === 3 || diffDays === 7 || diffDays === 14) return "overdue";
  if (diffDays > 14 && diffDays % 14 === 0) return "stillOverdue";
  return null;
}

async function sendEmail(
  resendKey: string,
  to: string,
  subject: string,
  body: string
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SettleUp <onboarding@resend.dev>",
      to: [to],
      subject,
      text: body,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select("*")
      .neq("status", "paid");

    if (error) throw error;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let sent = 0;

    for (const inv of invoices || []) {
      const dueDate = new Date(inv.due_date);
      const diff = daysDiff(today, dueDate);
      const reminderType = getReminderType(diff);

      if (!reminderType || !inv.client_email) continue;

      // Check for custom reminder template
      let customBody: string | null = null;
      if (inv.user_id) {
        const { data: profile } = await supabase
          .from("business_profile")
          .select("reminder_template")
          .eq("user_id", inv.user_id)
          .maybeSingle();
        if (profile?.reminder_template) {
          customBody = profile.reminder_template;
        }
      }

      const tmpl = DEFAULT_EMAIL_TEMPLATE[reminderType];
      const subject = fillTemplate(tmpl.subject, inv, Math.max(0, diff));
      const body = fillTemplate(customBody || tmpl.body, inv, Math.max(0, diff));

      await sendEmail(resendKey, inv.client_email, subject, body);

      await supabase
        .from("invoices")
        .update({
          last_reminder_sent: new Date().toISOString(),
          reminder_count: (inv.reminder_count || 0) + 1,
        })
        .eq("id", inv.id);

      sent++;
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
