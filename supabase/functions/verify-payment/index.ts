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
// Amounts are in kobo (NGN minor units). planCode binds the Paystack
// transaction to the expected subscription product.
const PLANS = {
  basic: { amountKobo: 250000, currency: "NGN", planCode: "PLN_4n23zjwe46m5yh2" },
  pro: { amountKobo: 350000, currency: "NGN", planCode: "PLN_ng3gpqk3kdsigpp" },
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
    // 3. Reference in the verified transaction must be the one submitted.
    if (data.reference !== reference) {
      return json(req, { error: "Payment does not match the selected plan" }, 400);
    }
    // 4. When Paystack reports plan info, it must be the expected product.
    // (One-off charges omit it; amount + currency + email + reference bind those.)
    const transactionPlan = typeof data.plan === "string"
      ? data.plan
      : data.plan?.plan_code;
    if (transactionPlan != null && transactionPlan !== expected.planCode) {
      return json(req, { error: "Payment does not match the selected plan" }, 400);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 5. Atomic activation: single-use reference + profile upsert in one RPC.
    // A 23505 conflict means the reference was already consumed.
    const paidAt = typeof data.paid_at === "string" ? data.paid_at : null;
    const { error: activationError } = await serviceClient.rpc(
      "activate_subscription_from_payment",
      {
        payment_reference: reference,
        payment_user_id: userId,
        payment_plan: plan,
        payment_amount: data.amount,
        payment_currency: data.currency ?? "NGN",
        payment_provider: "paystack",
        payment_paid_at: paidAt,
      },
    );

    if (activationError) {
      const alreadyUsed =
        (activationError as { code?: string }).code === "23505" ||
        /duplicate|already exists|already been used/i.test(activationError.message ?? "");
      console.error("verify-payment activation error:", activationError.message);
      return json(
        req,
        { error: alreadyUsed ? "Payment reference has already been used" : "Could not activate subscription" },
        alreadyUsed ? 409 : 500,
      );
    }

    return json(req, { ok: true, plan });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Never echo raw internals; verify-payment runs pre-entitlement.
    console.error("verify-payment error:", message);
    return json(req, { error: "Verification failed" }, 500);
  }
});
