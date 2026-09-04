import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Server-side source of truth — the browser's claimed plan is NEVER trusted.
// Amounts are in kobo (NGN minor units).
const PLANS = {
  basic: { amountKobo: 250000, currency: "NGN" },
  pro: { amountKobo: 350000, currency: "NGN" },
} as const;

type Plan = keyof typeof PLANS;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
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
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return json(req, { error: "Unauthorized" }, 401);
    }
    const user = userData.user;
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const { reference, plan } = body as { reference?: string; plan?: string };

    if (!reference || typeof reference !== "string") {
      return json(req, { error: "Missing reference" }, 400);
    }
    if (!plan || !(plan in PLANS)) {
      return json(req, { error: "Invalid plan" }, 400);
    }
    const expected = PLANS[plan as Plan];

    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecret) {
      return json(req, { error: "Server not configured" }, 500);
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${paystackSecret}` } },
    );

    const verifyJson = await verifyRes.json().catch(() => null);
    if (!verifyRes.ok || !verifyJson?.status || verifyJson?.data?.status !== "success") {
      return json(req, { error: "Verification failed" }, 400);
    }

    const data = verifyJson.data;
    // 1. Amount + currency must match the claimed plan exactly.
    if (data.amount !== expected.amountKobo) {
      return json(req, { error: "Amount mismatch for plan" }, 400);
    }
    if ((data.currency ?? "NGN") !== expected.currency) {
      return json(req, { error: "Currency mismatch for plan" }, 400);
    }
    // 2. Payer email must match the signed-in SettleUp account.
    const payerEmail = (data.customer?.email ?? "").toLowerCase();
    const accountEmail = (user.email ?? "").toLowerCase();
    if (!payerEmail || !accountEmail || payerEmail !== accountEmail) {
      return json(req, { error: "Payer email does not match account" }, 400);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 3. Single-use reference: reject if ANY profile already consumed it.
    const { data: refTaken } = await serviceClient
      .from("business_profile")
      .select("user_id")
      .eq("subscription_reference", reference)
      .maybeSingle();
    if (refTaken && refTaken.user_id !== userId) {
      return json(req, { error: "Reference already used" }, 409);
    }

    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 30);

    const { data: existing } = await serviceClient
      .from("business_profile")
      .select("id, subscription_reference")
      .eq("user_id", userId)
      .maybeSingle();

    // Same-reference retry by the same user is idempotent, not an error.
    if (existing && existing.subscription_reference === reference) {
      return json(req, { ok: true, plan, deduped: true });
    }

    const update = {
      subscription_status: "active",
      subscription_plan: plan,
      subscription_reference: reference,
      subscription_started_at: now.toISOString(),
      subscription_expires_at: expires.toISOString(),
    };

    if (existing?.id) {
      const { error: upErr } = await serviceClient
        .from("business_profile")
        .update(update)
        .eq("id", existing.id);
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await serviceClient
        .from("business_profile")
        .insert({ user_id: userId, business_name: "", bank_name: "", bank_account_number: "", bank_account_name: "", ...update });
      if (insErr) throw insErr;
    }

    // Best-effort payment ledger (ignored if table absent on older DBs).
    await serviceClient.from("payment_events").insert({
      user_id: userId,
      provider: "paystack",
      reference,
      plan,
      amount_kobo: data.amount,
      currency: data.currency ?? "NGN",
      payer_email: payerEmail,
      raw: data,
    }).then(() => {}, () => {});

    return json(req, { ok: true, plan });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Never echo raw internals; verify-payment runs pre-entitlement.
    console.error("verify-payment error:", message);
    return json(req, { error: "Verification failed" }, 500);
  }
});
