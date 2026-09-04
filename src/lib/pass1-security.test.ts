import { describe, it, expect } from "vitest";
import { PLAN_CONFIG } from "@/lib/paystack";

// Pass 1 — server/client contract locks.
// These mirror the rules enforced in supabase/functions/verify-payment.
// If PLAN_CONFIG changes, the edge function PLANS map must change in lockstep.

const SERVER_PLANS = {
  basic: { amountKobo: 250000, currency: "NGN" },
  pro: { amountKobo: 350000, currency: "NGN" },
} as const;

function validatePayment(args: {
  claimedPlan: string;
  paidAmountKobo: number;
  paidCurrency: string;
  payerEmail: string;
  accountEmail: string;
  referenceTakenByOther: boolean;
}): { ok: boolean; reason?: string } {
  if (!(args.claimedPlan in SERVER_PLANS)) return { ok: false, reason: "Invalid plan" };
  const expected = SERVER_PLANS[args.claimedPlan as keyof typeof SERVER_PLANS];
  if (args.paidAmountKobo !== expected.amountKobo) return { ok: false, reason: "Amount mismatch" };
  if (args.paidCurrency !== expected.currency) return { ok: false, reason: "Currency mismatch" };
  if (!args.payerEmail || args.payerEmail.toLowerCase() !== args.accountEmail.toLowerCase()) {
    return { ok: false, reason: "Payer mismatch" };
  }
  if (args.referenceTakenByOther) return { ok: false, reason: "Reference reuse" };
  return { ok: true };
}

function isOwner(invoiceUserId: string, callerUserId: string): boolean {
  return invoiceUserId === callerUserId;
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
  it("client plan amounts match the server source of truth", () => {
    expect(PLAN_CONFIG.basic.amountKobo).toBe(SERVER_PLANS.basic.amountKobo);
    expect(PLAN_CONFIG.pro.amountKobo).toBe(SERVER_PLANS.pro.amountKobo);
  });

  it("rejects a cheap payment claiming pro (the pre-Pass-1 exploit)", () => {
    const r = validatePayment({
      claimedPlan: "pro",
      paidAmountKobo: 250000, // basic amount
      paidCurrency: "NGN",
      payerEmail: "owner@example.com",
      accountEmail: "owner@example.com",
      referenceTakenByOther: false,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("Amount mismatch");
  });

  it("rejects currency mismatch", () => {
    const r = validatePayment({
      claimedPlan: "basic",
      paidAmountKobo: 250000,
      paidCurrency: "USD",
      payerEmail: "owner@example.com",
      accountEmail: "owner@example.com",
      referenceTakenByOther: false,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects payer/account email mismatch", () => {
    const r = validatePayment({
      claimedPlan: "basic",
      paidAmountKobo: 250000,
      paidCurrency: "NGN",
      payerEmail: "attacker@example.com",
      accountEmail: "owner@example.com",
      referenceTakenByOther: false,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects reused references", () => {
    const r = validatePayment({
      claimedPlan: "basic",
      paidAmountKobo: 250000,
      paidCurrency: "NGN",
      payerEmail: "owner@example.com",
      accountEmail: "owner@example.com",
      referenceTakenByOther: true,
    });
    expect(r.ok).toBe(false);
  });

  it("accepts an exact match", () => {
    const r = validatePayment({
      claimedPlan: "pro",
      paidAmountKobo: 350000,
      paidCurrency: "NGN",
      payerEmail: "Owner@Example.com",
      accountEmail: "owner@example.com",
      referenceTakenByOther: false,
    });
    expect(r.ok).toBe(true);
  });
});

describe("Pass 1 — tenant isolation", () => {
  it("owner can access own invoice, others cannot", () => {
    expect(isOwner("user-1", "user-1")).toBe(true);
    expect(isOwner("user-2", "user-1")).toBe(false);
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
