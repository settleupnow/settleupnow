import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_EMAIL_BODY = `Hi {{client_name}},\n\nThis is a friendly reminder that your invoice {{invoice_number}} of {{invoice_amount}} was due on {{due_date}}. It is now {{days_overdue}} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`;

function fillTemplate(template: string, invoice: any, overdueDays: number): string {
  return template
    .replace(/\{\{client_name\}\}/g, invoice.client_name)
    .replace(/\{\{invoice_amount\}\}/g, `${invoice.currency} ${invoice.invoice_amount}`)
    .replace(/\{\{due_date\}\}/g, invoice.due_date)
    .replace(/\{\{days_overdue\}\}/g, String(Math.max(0, overdueDays)))
    .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number || "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const { invoice_id } = await req.json();
    if (!invoice_id) throw new Error("invoice_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (error || !invoice) throw new Error("Invoice not found");
    if (!invoice.client_email) throw new Error("No client email on invoice");

    // Check for custom reminder template
    let customBody: string | null = null;
    if (invoice.user_id) {
      const { data: profile } = await supabase
        .from("business_profile")
        .select("reminder_template")
        .eq("user_id", invoice.user_id)
        .maybeSingle();
      if (profile?.reminder_template) {
        customBody = profile.reminder_template;
      }
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(invoice.due_date);
    due.setHours(0, 0, 0, 0);
    const overdueDays = Math.max(0, Math.round((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));

    const template = customBody || DEFAULT_EMAIL_BODY;
    const subject = overdueDays > 0 ? "Overdue Invoice Reminder" : "Invoice Payment Reminder";
    const body = fillTemplate(template, invoice, overdueDays);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SettleUp <onboarding@resend.dev>",
        to: [invoice.client_email],
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    await supabase
      .from("invoices")
      .update({
        last_reminder_sent: new Date().toISOString(),
        reminder_count: (invoice.reminder_count || 0) + 1,
      })
      .eq("id", invoice_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error(err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
