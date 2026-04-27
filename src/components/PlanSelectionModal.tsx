import { PlanCards } from "./PlanCards";
import { useSubscription } from "@/hooks/useSubscription";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PlanSelectionModalProps {
  /** Title shown at top */
  title?: string;
  /** Subtitle */
  subtitle?: string;
  /** If true, user can close it (paywall vs onboarding) */
  dismissible?: boolean;
  /** Open state externally controlled (for paywalls) */
  open?: boolean;
  onClose?: () => void;
  /** Auto-show for free users on mount */
  autoShowForFree?: boolean;
  /** Allow "continue on free" link */
  allowContinueFree?: boolean;
}

export function PlanSelectionModal({
  title = "choose your plan.",
  subtitle = "pick the plan that fits how you work.",
  dismissible = false,
  open: openProp,
  onClose,
  autoShowForFree = false,
  allowContinueFree = false,
}: PlanSelectionModalProps) {
  const { status, loading, refresh } = useSubscription();
  const [internalOpen, setInternalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (autoShowForFree && !loading && status === "free" && !dismissed) {
      setInternalOpen(true);
    }
  }, [autoShowForFree, loading, status, dismissed]);

  const open = openProp ?? internalOpen;
  if (!open) return null;

  const handleClose = () => {
    if (!dismissible && !allowContinueFree) return;
    setDismissed(true);
    setInternalOpen(false);
    onClose?.();
  };

  const handleSuccess = async () => {
    await refresh();
    setInternalOpen(false);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8 overflow-y-auto" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
      <div
        className="relative w-full max-w-2xl rounded-2xl p-6 sm:p-8 my-auto"
        style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}
      >
        <div className="text-center mb-6">
          <h2 className="font-sans font-bold text-2xl sm:text-3xl text-white tracking-[-0.02em]">{title}</h2>
          <p className="font-sans text-sm mt-2" style={{ color: "#888" }}>{subtitle}</p>
        </div>

        <PlanCards onSuccess={handleSuccess} highlight="pro" />

        {allowContinueFree && (
          <div className="text-center mt-6">
            <button
              onClick={handleClose}
              className="font-mono text-xs tracking-wide hover:text-white transition-colors"
              style={{ color: "#6B6560" }}
            >
              continue on free →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
