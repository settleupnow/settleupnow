import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getInvoices } from "@/lib/store";
import { Invoice, InvoiceStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { FileLine, Loading3Line, AddLine } from "@mingcute/react";
import { cn } from "@/lib/utils";
import { trigger } from "@/lib/haptics";

type FilterTab = "all" | InvoiceStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
];

const STATUS_BADGE: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  unpaid:  { label: "Unpaid",  color: "#92400e", bg: "#fef3c7" },
  overdue: { label: "Overdue", color: "#C4623A", bg: "#fde8de" },
  paid:    { label: "Paid",    color: "#1A6B3C", bg: "#dcf4e8" },
};

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    getInvoices().then((data) => {
      setInvoices(data);
      setLoading(false);
    });
  }, []);

  const filtered =
    activeTab === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === activeTab);

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <div className="space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="type-h1">Invoices</h1>
        <span className="text-sm text-muted-foreground">
          {loading ? "—" : `${sorted.length} invoice${sorted.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {TABS.map((tab) => {
          const count =
            tab.key === "all"
              ? invoices.length
              : invoices.filter((i) => i.status === tab.key).length;

          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); trigger("light"); }}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-card border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "text-[10px] font-mono rounded-full px-1.5 py-0.5 leading-none",
                  activeTab === tab.key
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <FileLine className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="type-body-small">
            {activeTab === "all"
              ? "No invoices yet. Tap + to create one."
              : `No ${activeTab} invoices.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5" style={{ paddingBottom: '120px' }}>
          {sorted.map((inv) => {
            const badge = STATUS_BADGE[inv.status];
            return (
              <Link
                key={inv.id}
                to={`/app/invoice/${inv.id}`}
                onClick={() => trigger("light")}
                className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/30 active:scale-[0.98] transition-all duration-150"
              >
                {/* Left: name + invoice number */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[15px] text-foreground truncate leading-tight">
                    {inv.client_name}
                  </p>
                  <p
                    className="text-[11px] text-muted-foreground mt-0.5"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {inv.invoice_number}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Due{" "}
                    {new Date(inv.due_date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Right: amount + badge */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-4">
                  <p className="font-bold text-[15px] text-foreground">
                    {formatCurrency(inv.invoice_amount, inv.currency)}
                  </p>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide"
                    style={{ color: badge.color, background: badge.bg }}
                  >
                    {badge.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { trigger("light"); navigate("/app/add"); }}
        className="fixed right-4 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90 hover:scale-105"
        style={{ background: "#1A6B3C", bottom: "80px" }}
        aria-label="Add invoice"
      >
        <AddLine className="h-7 w-7" style={{ color: "#ffffff" }} />
      </button>
    </div>
  );
}
