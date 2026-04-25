import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type Plan = "basic" | "pro";

export const PLAN_CONFIG: Record<Plan, { amountKobo: number; planCode: string; label: string; nairaLabel: string }> = {
  basic: {
    amountKobo: 250000,
    planCode: "PLN_4n23zjwe46m5yh2",
    label: "Basic",
    nairaLabel: "₦2,500/mo",
  },
  pro: {
    amountKobo: 350000,
    planCode: "PLN_ng3gpqk3kdsigpp",
    label: "Pro",
    nairaLabel: "₦3,500/mo",
  },
};

const PAYSTACK_PUBLIC_KEY = "pk_live_657125108edafde492b67ac6ce82ee94127b7cb8";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

export async function startPaystackCheckout(
  plan: Plan,
  email: string,
  onSuccess: () => void,
): Promise<void> {
  if (!window.PaystackPop) {
    toast.error("Payment library not loaded. Please refresh.");
    return;
  }
  const cfg = PLAN_CONFIG[plan];
  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount: cfg.amountKobo,
    plan: cfg.planCode,
    currency: "NGN",
    ref: `settleup_${Date.now()}`,
    callback: function (response: { reference: string }) {
      // Paystack runs callback outside React; use a microtask.
      void (async () => {
        try {
          const { error } = await supabase.functions.invoke("verify-payment", {
            body: { reference: response.reference, plan },
          });
          if (error) throw error;
          toast.success("Subscription activated!");
          onSuccess();
        } catch (err) {
          toast.error("Payment verification failed. Contact support.");
          console.error(err);
        }
      })();
    },
    onClose: function () {
      // user closed — no-op
    },
  });
  handler.openIframe();
}
