import { InvoiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<InvoiceStatus, { label: string; classes: string }> = {
  unpaid: { label: "Unpaid", classes: "bg-warning/15 text-warning" },
  overdue: { label: "Overdue", classes: "bg-destructive/15 text-destructive" },
  paid: { label: "Paid", classes: "bg-success/15 text-success" },
};

export function StatusChip({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", config.classes)}>
      {config.label}
    </span>
  );
}
