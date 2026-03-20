import { InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<InvoiceStatus, { label: string; classes: string }> = {
  unpaid: { label: "PENDING", classes: "bg-amber-pale text-amber" },
  overdue: { label: "OVERDUE", classes: "bg-clay-pale text-clay" },
  paid: { label: "SETTLED", classes: "bg-naira-pale text-naira" },
};

export function StatusChip({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 font-mono font-medium tracking-widest uppercase",
        config.classes
      )}
      style={{ fontSize: '10px', letterSpacing: '0.12em', lineHeight: 1 }}
    >
      {config.label}
    </span>
  );
}