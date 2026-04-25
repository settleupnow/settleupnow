import { startPaystackCheckout, type Plan } from "@/lib/paystack";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Loading3Line } from "@mingcute/react";

interface PlanCardsProps {
  onSuccess: () => void;
  highlight?: Plan;
}

const features = {
  basic: [
    "Unlimited invoices",
    "Automatic email reminders",
    "Invoice PDF generation",
    "Cancel anytime",
  ],
  pro: [
    "Everything in Basic",
    "WhatsApp reminders",
    "Priority support",
  ],
};

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
      <path d="M3 8L6.5 11.5L13 5" stroke="#1A6B3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlanCards({ onSuccess, highlight }: PlanCardsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<Plan | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    if (!user?.email) return;
    setLoading(plan);
    await startPaystackCheckout(plan, user.email, () => {
      setLoading(null);
      onSuccess();
    });
    // Reset loading after iframe opens (Paystack popup handles UX)
    setTimeout(() => setLoading(null), 1500);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Basic */}
      <div
        className="rounded-xl p-6 flex flex-col"
        style={{
          backgroundColor: "#1f1f1f",
          border: highlight === "basic" ? "1px solid #1A6B3C" : "1px solid #333",
        }}
      >
        <span
          className="font-mono text-[10px] font-medium tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm self-start"
          style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#ccc" }}
        >
          BASIC
        </span>
        <p className="font-sans font-bold text-3xl text-white mt-4 mb-5">
          ₦2,500<span className="font-sans font-normal text-base" style={{ color: "#6B6560" }}>/mo</span>
        </p>
        <ul className="space-y-2.5 mb-6 flex-1">
          {features.basic.map((f) => (
            <li key={f} className="flex items-center gap-2.5">
              <Check />
              <span className="font-sans text-sm text-white">{f}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => handleSubscribe("basic")}
          disabled={loading !== null}
          className="w-full font-sans text-sm font-semibold px-6 py-3 rounded-full transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ border: "1px solid #1A6B3C", color: "#fff", backgroundColor: "transparent" }}
        >
          {loading === "basic" ? <Loading3Line className="h-4 w-4 animate-spin" /> : "Get started"}
        </button>
      </div>

      {/* Pro */}
      <div className="relative">
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm whitespace-nowrap z-10"
          style={{ backgroundColor: "#1A6B3C", color: "#fff" }}
        >
          MOST POPULAR
        </span>
        <div
          className="rounded-xl p-6 flex flex-col h-full"
          style={{
            backgroundColor: "#1f1f1f",
            border: "1px solid #1A6B3C",
            boxShadow: "0 0 30px rgba(26,107,60,0.15)",
          }}
        >
          <span
            className="font-mono text-[10px] font-medium tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm self-start"
            style={{ backgroundColor: "rgba(26,107,60,0.18)", color: "#1A6B3C" }}
          >
            PRO
          </span>
          <p className="font-sans font-bold text-3xl text-white mt-4 mb-5">
            ₦3,500<span className="font-sans font-normal text-base" style={{ color: "#6B6560" }}>/mo</span>
          </p>
          <ul className="space-y-2.5 mb-6 flex-1">
            {features.pro.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <Check />
                <span className="font-sans text-sm text-white">{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => handleSubscribe("pro")}
            disabled={loading !== null}
            className="w-full font-sans text-sm font-semibold px-6 py-3 rounded-full text-white transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#1A6B3C" }}
          >
            {loading === "pro" ? <Loading3Line className="h-4 w-4 animate-spin" /> : "Get Pro"}
          </button>
        </div>
      </div>
    </div>
  );
}
