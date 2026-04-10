import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not set");

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(
        JSON.stringify({ error: "Missing invoice_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch invoice details
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("client_name, invoice_number, invoice_amount, currency")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Radio+Canada+Big:wght@400;600;700&family=DM+Mono&display=swap');
  </style>
</head>
<body style="margin:0;padding:0;background-color:#1a1a1a;font-family:'Radio Canada Big',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#1a1a1a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background-color:#242424;border-radius:16px;border:1px solid #2a2a2a;max-width:520px;">
          <tr>
            <td style="padding:40px 36px;">
              <!-- Logo -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-bottom:32px;text-align:center;">
                    <span style="font-family:'Radio Canada Big',Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Settle<span style="color:#1A6B3C;">Up</span></span>
                  </td>
                </tr>
              </table>

              <!-- Emoji -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align:center;padding-bottom:24px;font-size:48px;">
                    🎉
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-family:'Radio Canada Big',Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;text-align:center;padding-bottom:8px;">
                    That's what we like to see.
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:20px 0;">
                    <div style="height:1px;background-color:#333333;"></div>
                  </td>
                </tr>
              </table>

              <!-- Body text -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-family:'Radio Canada Big',Arial,sans-serif;font-size:15px;color:#cccccc;line-height:1.7;text-align:center;padding-bottom:20px;">
                    <strong style="color:#ffffff;">${invoice.client_name}</strong> just settled <strong style="color:#1A6B3C;">${invoice.invoice_number || "your invoice"}</strong> for <strong style="color:#1A6B3C;">${currencySymbol}${amount}</strong>.
                  </td>
                </tr>
                <tr>
                  <td style="font-family:'Radio Canada Big',Arial,sans-serif;font-size:15px;color:#888888;line-height:1.7;text-align:center;padding-bottom:20px;">
                    Your invoice did the work. SettleUp handled the follow-up. You got paid.
                  </td>
                </tr>
                <tr>
                  <td style="font-family:'Radio Canada Big',Arial,sans-serif;font-size:15px;color:#cccccc;line-height:1.7;text-align:center;padding-bottom:24px;">
                    <strong style="color:#ffffff;">That's the move.</strong>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:0 0 24px;">
                    <div style="height:1px;background-color:#333333;"></div>
                  </td>
                </tr>
              </table>

              <!-- Referral -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-family:'Radio Canada Big',Arial,sans-serif;font-size:13px;color:#888888;line-height:1.6;text-align:center;padding-bottom:28px;">
                    Know someone still chasing clients on WhatsApp?<br/>
                    Send them to <a href="https://settleup.ng" style="color:#1A6B3C;text-decoration:none;font-weight:600;">settleup.ng</a> — their invoices deserve the same treatment.
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-family:'Radio Canada Big',Arial,sans-serif;font-size:13px;color:#555555;text-align:center;">
                    — The SettleUp Team
                  </td>
                </tr>
              </table>
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
    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
