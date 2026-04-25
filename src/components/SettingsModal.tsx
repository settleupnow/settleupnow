import { useState, useEffect } from "react";
import {
  Building2Line,
  MailLine,
  FileCheckLine,
  BellRingingLine,
  ArrowRightLine,
  ArrowLeftLine,
  CloseLine,
} from "@mingcute/react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import BusinessProfileSettings from "@/pages/settings/BusinessProfile";
import ReminderMessageSettings from "@/pages/settings/ReminderMessage";
import TaxComplianceSettings from "@/pages/settings/TaxCompliance";
import NotificationPreferences from "@/pages/settings/NotificationPreferences";
import { trigger } from "@/lib/haptics";
import { PaywallModal } from "@/components/PaywallModal";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type Panel = "list" | "profile" | "reminder" | "tax" | "notifications";

interface RowProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  locked?: boolean;
}

function Row({ icon, label, onClick, locked }: RowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-accent/5 transition-colors active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {locked && (
          <span
            className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-sm"
            style={{ backgroundColor: "rgba(26,107,60,0.18)", color: "#1A6B3C" }}
          >
            PRO
          </span>
        )}
        <ArrowRightLine className="h-5 w-5 text-muted-foreground" />
      </div>
    </button>
  );
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [panel, setPanel] = useState<Panel>("list");
  const [paywall, setPaywall] = useState<string | null>(null);
  const { signOut } = useAuth();
  const { plan, status } = useSubscription();
  const isPaid = status === "active";
  const isPro = plan === "pro";

  useEffect(() => {
    if (open) setPanel("list");
  }, [open]);

  if (!open) return null;

  const handleGated = (target: Panel, requirePro = false) => {
    // Free users only get Business Profile
    if (!isPaid && target !== "profile") {
      setPaywall(`${target} requires a paid plan`);
      return;
    }
    if (requirePro && !isPro) {
      setPaywall(`${target} is a Pro feature`);
      return;
    }
    setPanel(target);
  };

  const renderPanel = () => {
    switch (panel) {
      case "profile":
        return <BusinessProfileSettings />;
      case "reminder":
        return <ReminderMessageSettings />;
      case "tax":
        return <TaxComplianceSettings />;
      case "notifications":
        return <NotificationPreferences />;
      default:
        return (
          <div className="space-y-3">
            <Row
              icon={<Building2Line className="h-5 w-5" />}
              label="Business Profile"
              onClick={() => handleGated("profile")}
            />
            <Row
              icon={<MailLine className="h-5 w-5" />}
              label="Reminder Message"
              onClick={() => handleGated("reminder")}
              locked={!isPaid}
            />
            <Row
              icon={<FileCheckLine className="h-5 w-5" />}
              label="Tax & Compliance"
              onClick={() => handleGated("tax")}
              locked={!isPaid}
            />
            <Row
              icon={<BellRingingLine className="h-5 w-5" />}
              label="Notification Preferences"
              onClick={() => handleGated("notifications")}
              locked={!isPaid}
            />
            <div className="pt-8 flex justify-center">
              <button
                onClick={() => {
                  trigger("warning");
                  signOut();
                }}
                className="font-bold text-base hover:underline transition-all"
                style={{ color: "#C4623A" }}
              >
                log out
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center px-4 py-8 overflow-y-auto"
        style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-2xl rounded-2xl bg-background border my-auto max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {panel !== "list" && (
                <button
                  onClick={() => setPanel("list")}
                  className="p-1.5 -ml-1.5 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <ArrowLeftLine className="h-5 w-5" />
                </button>
              )}
              <h2 className="type-h1 text-xl">
                {panel === "list" ? "Settings" : ""}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-accent/50 transition-colors text-muted-foreground"
              aria-label="Close"
            >
              <CloseLine className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">{renderPanel()}</div>
        </div>
      </div>

      <PaywallModal
        open={paywall !== null}
        onClose={() => setPaywall(null)}
        reason={paywall ?? undefined}
      />
    </>
  );
}
