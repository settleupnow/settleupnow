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

    const { invoice_id } = await req.json().catch(() => ({}));
    if (!invoice_id || typeof invoice_id !== "string") {
      return json(req, { error: "Missing invoice_id" }, 400);
    }

    // Ownership-enforced fetch: RLS-scoped client can only see the caller's rows.
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("client_name, invoice_number, invoice_amount, currency, user_id")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) {
      return json(req, { error: "Invoice not found" }, 404);
    }
    if (invoice.user_id !== user.id) {
      return json(req, { error: "Invoice not found" }, 404);
    }

    const userEmail = user.email;
    if (!userEmail) throw new Error("User has no email");

    const amount = new Intl.NumberFormat("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(invoice.invoice_amount);

    const currencySymbol = invoice.currency === "NGN" ? "₦" : `${invoice.currency} `;

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You just got paid</title>
</head>
<body style="margin:0;padding:0;background-color:#1a1a1a;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#1a1a1a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background-color:#242424;border-radius:16px;border:1px solid #2a2a2a;max-width:520px;">
          <tr>
            <td style="padding:40px 36px;text-align:center;color:#ffffff;">
              <p style="font-size:22px;font-weight:700;">SettleUp</p>
              <p style="font-size:24px;font-weight:700;">That's what we like to see.</p>
              <p style="font-size:15px;color:#cccccc;"><strong>${invoice.client_name}</strong> just settled <strong>${invoice.invoice_number || "your invoice"}</strong> for <strong>${currencySymbol}${amount}</strong>.</p>
              <p style="font-size:13px;color:#555555;">— The SettleUp Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SettleUp <noreply@settleup.ng>",
        to: [userEmail],
        subject: "You just got paid. 🎉",
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    const result = await res.json();
    return json(req, { success: true, id: result.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(err);
    return json(req, { error: message }, 500);
  }
});
