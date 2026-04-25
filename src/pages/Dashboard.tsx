import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { getInvoices } from "@/lib/store";
import { Invoice } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { StatusChip } from "@/components/StatusChip";
import { AddCircleLine, FileLine, Loading3Line } from "@mingcute/react";
import { Button } from "@/components/ui/button";
import { trigger } from "@/lib/haptics";
import { WelcomeModal } from "@/components/WelcomeModal";
import { PlanSelectionModal } from "@/components/PlanSelectionModal";
import { PaywallModal } from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";
import { cn } from "@/lib/utils";

const FREE_INVOICE_LIMIT = 3;

type FilterTab = "all" | "overdue" | "settled";

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const { status: subStatus } = useSubscription();
  const [paywall, setPaywall] = useState<string | null>(null);

  useEffect(() => {
    getInvoices().then((data) => {
      setInvoices(data);
      setLoading(false);
    });
  }, []);

  const isFree = subStatus !== "active";
  const overFreeLimit = isFree && invoices.length >= FREE_INVOICE_LIMIT;

  const handleNewInvoice = (e: React.MouseEvent) => {
    if (overFreeLimit) {
      e.preventDefault();
      trigger("warning");
      setPaywall(`Free plan is limited to ${FREE_INVOICE_LIMIT} invoices.`);
    } else {
      trigger("light");
    }
  };

  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.invoice_amount, 0);

  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const now = new Date();
  const paidThisMonth = invoices
    .filter(
      (i) =>
        i.status === "paid" &&
        i.paid_at &&
        new Date(i.paid_at).getMonth() === now.getMonth() &&
        new Date(i.paid_at).getFullYear() === now.getFullYear()
    )
    .reduce((s, i) => s + i.invoice_amount, 0);

  const remindersThisMonth = invoices.filter(
    (i) =>
      i.last_reminder_sent &&
      new Date(i.last_reminder_sent).getMonth() === now.getMonth() &&
      new Date(i.last_reminder_sent).getFullYear() === now.getFullYear()
  ).length;

  const sorted = useMemo(
    () =>
      [...invoices].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      ),
    [invoices]
  );

  const filtered = useMemo(() => {
    if (filter === "overdue") return sorted.filter((i) => i.status === "overdue");
    if (filter === "settled") return sorted.filter((i) => i.status === "paid");
    return sorted;
  }, [sorted, filter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "overdue", label: "Overdue" },
    { key: "settled", label: "Settled" },
  ];

  return (
    <div className="space-y-5">
      <WelcomeModal />
      <PlanSelectionModal
        autoShowForFree
        allowContinueFree
        title="choose your plan."
        subtitle="pick what fits how you work — or continue on free."
      />
      <PaywallModal open={paywall !== null} onClose={() => setPaywall(null)} reason={paywall ?? undefined} />
      <div className="flex items-center justify-between">
        <h1 className="type-h1">Dashboard</h1>
        <Button asChild size="sm" onClick={handleNewInvoice}>
          <Link to="/app/add">
            <AddCircleLine className="h-4 w-4 mr-1" /> New Invoice
          </Link>
        </Button>
      </div>

      {/* Unified Stats Card */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Hero stat */}
        <div className="p-5 border-b">
          <p className="type-section-label">Total Outstanding</p>
          <p className="type-data text-3xl sm:text-4xl mt-1.5 tracking-tight">
            {formatCurrency(totalOutstanding, "NGN")}
          </p>
        </div>

        {/* Sub stats grid */}
        <div className="grid grid-cols-3 divide-x">
          <div className="p-4">
            <p className="type-section-label">Overdue</p>
            <p className="type-data text-lg mt-1 !text-clay">{overdueCount}</p>
          </div>
          <div className="p-4">
            <p className="type-section-label">Paid This Month</p>
            <p
              className={cn(
                "type-data text-lg mt-1 !text-naira",
                paidThisMonth > 0 && "animate-pulse-naira"
              )}
            >
              {formatCurrency(paidThisMonth, "NGN")}
            </p>
          </div>
          <div className="p-4">
            <p className="type-section-label">Reminders Sent</p>
            <p className="type-data text-lg mt-1">{remindersThisMonth}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      {sorted.length > 0 && (
        <div className="flex items-center gap-1 border-b">
          {tabs.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  trigger("light");
                  setFilter(t.key);
                }}
                className={cn(
                  "relative px-4 py-2.5 type-ui-label transition-colors",
                  active
                    ? "text-naira"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-naira rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Invoice List */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border bg-card text-center py-14 px-6 space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <FileLine className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="type-body-strong">No invoices yet.</p>
            <p className="type-body-small text-muted-foreground">
              Start by adding your first client.
            </p>
          </div>
          <Button asChild onClick={handleNewInvoice}>
            <Link to="/app/add">
              <AddCircleLine className="h-4 w-4 mr-1" /> New Invoice
            </Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 type-body-small text-muted-foreground">
          No {filter} invoices.
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {filtered.map((inv) => (
            <Link
              key={inv.id}
              to={`/app/invoice/${inv.id}`}
              onClick={() => trigger("light")}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="type-body-strong truncate">{inv.client_name}</p>
                <p className="type-metadata">
                  Due {new Date(inv.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <p className="type-data text-right">
                  {formatCurrency(inv.invoice_amount, inv.currency)}
                </p>
                <StatusChip status={inv.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
