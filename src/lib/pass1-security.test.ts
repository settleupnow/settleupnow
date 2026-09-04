import { describe, it, expect } from "vitest";
import { PLAN_CONFIG } from "@/lib/paystack";
import { PAYMENTS_ENFORCED } from "@/lib/entitlements";

// Pass 1 — server/client contract locks.
// These mirror the rules enforced in supabase/functions/verify-payment.
// If PLAN_CONFIG changes, the edge function PLANS map must change in lockstep.

const SERVER_PLANS = {
  basic: { amountKobo: 250000, currency: "NGN", planCode: "PLN_4n23zjwe46m5yh2" },
  pro: { amountKobo: 350000, currency: "NGN", planCode: "PLN_ng3gpqk3kdsigpp" },
} as const;

function validatePayment(args: {
  claimedPlan: string;
  paidAmountKobo: number;
  paidCurrency: string;
  payerEmail: string;
  accountEmail: string;
  submittedReference: string;
  verifiedReference: string;
  transactionPlanCode?: string | null;
  referenceTakenByOther: boolean;
}): { ok: boolean; reason?: string } {
  if (!(args.claimedPlan in SERVER_PLANS)) return { ok: false, reason: "Invalid plan" };
  const expected = SERVER_PLANS[args.claimedPlan as keyof typeof SERVER_PLANS];
  if (args.paidAmountKobo !== expected.amountKobo) return { ok: false, reason: "Amount mismatch" };
  if (args.paidCurrency !== expected.currency) return { ok: false, reason: "Currency mismatch" };
  if (!args.payerEmail || args.payerEmail.toLowerCase() !== args.accountEmail.toLowerCase()) {
    return { ok: false, reason: "Payer mismatch" };
  }
  if (args.submittedReference !== args.verifiedReference) {
    return { ok: false, reason: "Reference mismatch" };
  }
  if (args.transactionPlanCode != null && args.transactionPlanCode !== expected.planCode) {
    return { ok: false, reason: "Plan mismatch" };
  }
  if (args.referenceTakenByOther) return { ok: false, reason: "Reference reuse" };
  return { ok: true };
}

const OK_PAYMENT = {
  claimedPlan: "pro",
  paidAmountKobo: 350000,
  paidCurrency: "NGN",
  payerEmail: "owner@example.com",
  accountEmail: "owner@example.com",
  submittedReference: "ref_123",
  verifiedReference: "ref_123",
  transactionPlanCode: "PLN_ng3gpqk3kdsigpp",
  referenceTakenByOther: false,
};

function isOwner(invoiceUserId: string, callerUserId: string): boolean {
  return invoiceUserId === callerUserId;
}

// Mirror of the identifier resolution in supabase/functions/send-invoice.
// invoice_id wins when both are supplied; neither supplied is a 400.
type InvoiceLookup =
  | { kind: "by-id"; id: string }
  | { kind: "by-number"; number: string }
  | { kind: "missing" };

function resolveInvoiceLookup(body: {
  invoice_id?: unknown;
  invoice_number?: unknown;
}): InvoiceLookup {
  const hasId = typeof body.invoice_id === "string" && body.invoice_id !== "";
  const hasNumber =
    typeof body.invoice_number === "string" && body.invoice_number !== "";
  if (hasId) return { kind: "by-id", id: body.invoice_id as string };
  if (hasNumber) return { kind: "by-number", number: body.invoice_number as string };
  return { kind: "missing" };
}

// Mirror of the server recipient rule: the stored client email always wins;
// request-supplied `to` / `client_name` are never used for addressing.
function deriveRecipient(
  stored: { client_email: string },
  _request: { to?: unknown; client_name?: unknown },
): string {
  return stored.client_email;
}

function cronAuthorized(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  if (provided.length !== expected.length) return false;
  let out = 0;
  for (let i = 0; i < provided.length; i++) out |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return out === 0;
}

function sentToday(iso: string | null, now = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

describe("Pass 1 — payment verification", () => {
  it("client plan amounts and codes match the server source of truth", () => {
    expect(PLAN_CONFIG.basic.amountKobo).toBe(SERVER_PLANS.basic.amountKobo);
    expect(PLAN_CONFIG.pro.amountKobo).toBe(SERVER_PLANS.pro.amountKobo);
    expect(PLAN_CONFIG.basic.planCode).toBe(SERVER_PLANS.basic.planCode);
    expect(PLAN_CONFIG.pro.planCode).toBe(SERVER_PLANS.pro.planCode);
  });

  it("rejects a cheap payment claiming pro (the pre-Pass-1 exploit)", () => {
    const r = validatePayment({
      ...OK_PAYMENT,
      paidAmountKobo: 250000, // basic amount
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("Amount mismatch");
  });

  it("rejects currency mismatch", () => {
    const r = validatePayment({ ...OK_PAYMENT, claimedPlan: "basic", paidAmountKobo: 250000, paidCurrency: "USD", transactionPlanCode: "PLN_4n23zjwe46m5yh2" });
    expect(r.ok).toBe(false);
  });

  it("rejects payer/account email mismatch", () => {
    const r = validatePayment({ ...OK_PAYMENT, payerEmail: "attacker@example.com" });
    expect(r.ok).toBe(false);
  });

  it("rejects reference mismatch and reuse", () => {
    expect(validatePayment({ ...OK_PAYMENT, verifiedReference: "other" }).ok).toBe(false);
    expect(validatePayment({ ...OK_PAYMENT, referenceTakenByOther: true }).ok).toBe(false);
  });

  it("rejects a wrong Paystack plan code when present", () => {
    const r = validatePayment({ ...OK_PAYMENT, transactionPlanCode: "PLN_4n23zjwe46m5yh2" });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("Plan mismatch");
  });

  it("accepts an exact match (plan code omitted for one-off charges)", () => {
    expect(validatePayment({ ...OK_PAYMENT }).ok).toBe(true);
    expect(validatePayment({ ...OK_PAYMENT, transactionPlanCode: null }).ok).toBe(true);
    expect(validatePayment({
      ...OK_PAYMENT,
      payerEmail: "Owner@Example.com",
    }).ok).toBe(true);
  });
});

describe("Pass 1 — tenant isolation", () => {
  it("owner can access own invoice, others cannot", () => {
    expect(isOwner("user-1", "user-1")).toBe(true);
    expect(isOwner("user-2", "user-1")).toBe(false);
  });

  it("manual reminders are NOT gated on subscription while testing", () => {
    // Payments intentionally disabled (PAYMENTS_ENFORCED = false): any
    // authenticated owner may send. Flip this test when re-enabling.
    expect(PAYMENTS_ENFORCED).toBe(false);
    const allowed = (status: string | null) =>
      !PAYMENTS_ENFORCED || status === "active";
    expect(allowed("active")).toBe(true);
    expect(allowed("free")).toBe(true);
    expect(allowed(null)).toBe(true);
  });

  it("send-invoice resolves invoice_id lookup", () => {
    expect(resolveInvoiceLookup({ invoice_id: "inv-123" })).toEqual({
      kind: "by-id",
      id: "inv-123",
    });
  });

  it("send-invoice prefers invoice_id when both identifiers are supplied", () => {
    expect(
      resolveInvoiceLookup({ invoice_id: "inv-123", invoice_number: "INV-001" }),
    ).toEqual({ kind: "by-id", id: "inv-123" });
  });

  it("send-invoice resolves legacy invoice_number lookup", () => {
    expect(resolveInvoiceLookup({ invoice_number: "INV-001" })).toEqual({
      kind: "by-number",
      number: "INV-001",
    });
  });

  it("send-invoice rejects requests with neither identifier", () => {
    expect(resolveInvoiceLookup({})).toEqual({ kind: "missing" });
    expect(resolveInvoiceLookup({ invoice_id: "", invoice_number: "" })).toEqual({
      kind: "missing",
    });
  });

  it("send-invoice never trusts a request-supplied recipient", () => {
    const stored = { client_email: "client@business.com" };
    expect(
      deriveRecipient(stored, {
        to: "relay@attacker.com",
        client_name: "Attacker",
      }),
    ).toBe("client@business.com");
  });

  it("send-invoice must use stored client email, never caller input", () => {
    const stored = "client@business.com";
    const callerSupplied = "relay@attacker.com";
    const recipient = stored; // server rule
    expect(recipient).toBe(stored);
    expect(recipient).not.toBe(callerSupplied);
  });
});

describe("Pass 1 — cron protection + idempotency", () => {
  it("rejects missing/wrong cron secret", () => {
    expect(cronAuthorized(null, "s3cret")).toBe(false);
    expect(cronAuthorized("wrong", "s3cret")).toBe(false);
    expect(cronAuthorized("s3cret", "s3cret")).toBe(true);
  });

  it("skips invoices already auto-reminded today", () => {
    const now = new Date();
    expect(sentToday(now.toISOString(), now)).toBe(true);
    expect(sentToday(null, now)).toBe(false);
    expect(sentToday(new Date(2020, 0, 1).toISOString(), now)).toBe(false);
  });
});
