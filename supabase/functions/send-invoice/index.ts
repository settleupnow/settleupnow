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

// 8 MB base64 cap (~6 MB binary) — generous for an invoice PDF, blocks relay abuse.
const MAX_PDF_BASE64 = 8 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, { error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(req, { error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return json(req, { error: "Invalid authentication token" }, 401);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const body = await req.json().catch(() => ({}));
    const { invoice_id, pdf_base64 } = body as {
      invoice_id?: string;
      pdf_base64?: string;
      // Legacy fields — ignored for addressing, kept for compat logging only.
      to?: string;
      client_name?: string;
      invoice_number?: string;
    };

    if (!invoice_id || typeof invoice_id !== "string") {
      return json(req, { error: "Missing required field: invoice_id" }, 400);
    }
    if (!pdf_base64 || typeof pdf_base64 !== "string") {
      return json(req, { error: "Missing required field: pdf_base64" }, 400);
    }
    if (pdf_base64.length > MAX_PDF_BASE64) {
      return json(req, { error: "Attachment too large" }, 413);
    }

    // Load the invoice through the caller's RLS-scoped client: proves ownership.
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("id, user_id, client_email, client_name, invoice_number, status")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) {
      return json(req, { error: "Invoice not found" }, 404);
    }
    if (invoice.user_id !== user.id) {
      return json(req, { error: "Invoice not found" }, 404);
    }
    if (!invoice.client_email) {
      return json(req, { error: "Invoice has no client email" }, 400);
    }
    if (invoice.status === "paid") {
      return json(req, { error: "Invoice already paid" }, 400);
    }

    // The recipient is ALWAYS the stored client email — never caller-supplied.
    // This closes the arbitrary-email relay vector.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SettleUp <noreply@settleup.ng>",
        to: [invoice.client_email],
        subject: `Invoice ${invoice.invoice_number || ""} from SettleUp`,
        text: `Hi ${invoice.client_name || ""},\n\nPlease find your invoice attached.\n\nThank you.`,
        attachments: [
          {
            filename: `invoice-${invoice.invoice_number || "document"}.pdf`,
            content: pdf_base64,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    const result = await res.json();
    return json(req, { success: true, id: result.id });
  } catch (err: unknown) {
    console.error(err);
    return json(req, { error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
