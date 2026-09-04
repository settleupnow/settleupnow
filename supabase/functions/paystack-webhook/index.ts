import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Paystack webhook: renewal / failure / cancellation source of truth.
// Verify: HMAC-SHA512 of the RAW request body with PAYSTACK_SECRET_KEY,
// compared against the `x-paystack-signature` header.

const PLANS_BY_AMOUNT: Record<number, "basic" | "pro"> = {
  250000: "basic",
  350000: "pro",
};

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) throw new Error("PAYSTACK_SECRET_KEY not set");

    const raw = await req.text();
    const signature = req.headers.get("x-paystack-signature") ?? "";
    const expected = await hmacHex(secret, raw);
    if (!signature || !timingSafeEqual(signature, expected)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(raw) as { event: string; data: any };
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const email: string | undefined = event.data?.customer?.email?.toLowerCase();
    const reference: string | undefined = event.data?.reference;
    const amount: number | undefined = event.data?.amount;

    // Always ledger the event (best-effort).
    await supabase.from("payment_events").insert({
      provider: "paystack",
      event: event.event,
      reference: reference ?? null,
      amount_kobo: amount ?? null,
      currency: event.data?.currency ?? null,
      payer_email: email ?? null,
      raw: event,
    }).then(() => {}, () => {});

    // Resolve the SettleUp user by payer email.
    let userId: string | null = null;
    if (email) {
      const { data } = await supabase.auth.admin.listUsers();
      userId = data?.users?.find((u) => (u.email ?? "").toLowerCase() === email)?.id ?? null;
    }

    if (event.event === "charge.success" && userId) {
      const plan = amount != null ? PLANS_BY_AMOUNT[amount] : undefined;
      const now = new Date();
      const expires = new Date(now);
      expires.setDate(expires.getDate() + 30);
      const patch: Record<string, unknown> = {
        subscription_status: "active",
        subscription_started_at: now.toISOString(),
        subscription_expires_at: expires.toISOString(),
      };
      if (plan) patch.subscription_plan = plan;
      if (reference) patch.subscription_reference = reference;
      await supabase.from("business_profile").update(patch).eq("user_id", userId);
    }

    if ((event.event === "charge.failed" || event.event === "invoice.payment_failed") && userId) {
      await supabase.from("business_profile")
        .update({ subscription_status: "past_due" })
        .eq("user_id", userId);
    }

    if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
      if (userId) {
        await supabase.from("business_profile")
          .update({ subscription_status: "cancelled" })
          .eq("user_id", userId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("webhook error:", err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: "Webhook failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
