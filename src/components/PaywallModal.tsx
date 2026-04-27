import { PlanCards } from "./PlanCards";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortal } from "react-dom";

interface PaywallModalProps {
  open: boolean;
  onClose?: () => void;
  reason?: string;
}

export function PaywallModal({ open, onClose, reason }: PaywallModalProps) {
  const { refresh } = useSubscription();
  if (!open) return null;

  const handleSuccess = async () => {
    await refresh();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div
        className="relative w-full max-w-2xl rounded-2xl p-6 sm:p-8 my-auto"
        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
      >
        <div className="text-center mb-6">
          <h2 className="font-sans font-bold text-2xl sm:text-3xl text-white tracking-[-0.02em]">
            you've hit the limit.
          </h2>
          <p className="font-sans text-sm mt-2" style={{ color: "#888" }}>
            upgrade to keep using SettleUp — your clients aren't going to pay themselves.
          </p>
          {reason && (
            <p className="font-mono text-[11px] tracking-wide mt-3" style={{ color: "#6B6560" }}>{reason}</p>
          )}
        </div>

        <PlanCards onSuccess={handleSuccess} highlight="pro" />
      </div>
    </div>
  );
}
