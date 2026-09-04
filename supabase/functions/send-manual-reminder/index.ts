import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://settleup.ng,https://www.settleup.ng,http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

const DEFAULT_EMAIL_BODY = `Hi {{client_name}},\n\nThis is a friendly reminder that your invoice {{invoice_number}} of {{invoice_amount}} was due on {{due_date}}. It is now {{days_overdue}} days overdue.\n\nPlease arrange payment at your earliest convenience.\n\nThank you.`;

interface ReminderInvoice {
  client_name: string;
  currency: string;
  invoice_amount: number;
  due_date: string;
  invoice_number: string | null;
}

function fillTemplate(template: string, invoice: ReminderInvoice, overdueDays: number): string {
  return template
    .replace(/\{\{client_name\}\}/g, invoice.client_name)
    .replace(/\{\{invoice_amount\}\}/g, `${invoice.currency} ${invoice.invoice_amount}`)
    .replace(/\{\{due_date\}\}/g, invoice.due_date)
    .replace(/\{\{days_overdue\}\}/g, String(Math.max(0, overdueDays)))
    .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number || "");
}

// Minimum gap between manual reminders for the same invoice (10 minutes).
const MIN_RESEND_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(req, { error: "Unauthorized" }, 401);
    }

    // Caller-scoped client (RLS enforced) for auth + ownership checks.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return json(req, { error: "Unauthorized" }, 401);
    }

    const { invoice_id } = await req.json().catch(() => ({}));
    if (!invoice_id || typeof invoice_id !== "string") {
      return json(req, { error: "invoice_id is required" }, 400);
    }

    // Ownership check via RLS-scoped read. Service role is NOT used for the
    // invoice fetch so one user can never operate on another user's invoice.
    const { data: invoice, error } = await userClient
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (error || !invoice) {
      return json(req, { error: "Invoice not found" }, 404);
    }
    if (!invoice.client_email) {
      return json(req, { error: "No client email on invoice" }, 400);
    }
    if (invoice.status === "paid") {
      return json(req, { error: "Invoice already paid" }, 400);
    }

    // Testing: subscription enforcement OFF — profile is loaded for the
    // custom reminder template only.
    const { data: profile } = await userClient
      .from("business_profile")
      .select("reminder_template, subscription_status")
      .eq("user_id", user.id)
      .maybeSingle();

    // Rate limit: refuse rapid re-sends of the same invoice.
    if (invoice.last_reminder_sent) {
      const last = new Date(invoice.last_reminder_sent).getTime();
      if (!Number.isNaN(last) && Date.now() - last < MIN_RESEND_MS) {
        return json(req, { error: "Reminder sent recently. Please wait before resending." }, 429);
      }
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(invoice.due_date);
    due.setHours(0, 0, 0, 0);
    const overdueDays = Math.max(0, Math.round((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));

    const template = profile?.reminder_template || DEFAULT_EMAIL_BODY;
    const subject = overdueDays > 0 ? "Overdue Invoice Reminder" : "Invoice Payment Reminder";
    const body = fillTemplate(template, invoice, overdueDays);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SettleUp <noreply@settleup.ng>",
        to: [invoice.client_email],
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    // Counter update goes through the caller's scoped client so RLS still applies.
    const { error: updateError } = await userClient
      .from("invoices")
      .update({
        last_reminder_sent: new Date().toISOString(),
        reminder_count: (invoice.reminder_count || 0) + 1,
      })
      .eq("id", invoice_id);

    if (updateError) throw updateError;

    return json(req, { success: true });
  } catch (err: unknown) {
    console.error(err);
    return json(req, { error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
