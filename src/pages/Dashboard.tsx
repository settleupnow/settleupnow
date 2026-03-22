import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getInvoices } from "@/lib/store";
import { Invoice } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { StatusChip } from "@/components/StatusChip";
import { AddCircleLine, FileLine, Loading3Line } from "@mingcute/react";
import { Button } from "@/components/ui/button";
import { trigger } from "@/lib/haptics";

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoices().then((data) => {
      setInvoices(data);
      setLoading(false);
    });
  }, []);

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

  const sorted = [...invoices].sort(
    (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="type-h1">Dashboard</h1>
        <Button asChild size="sm" onClick={() => trigger("light")}>
          <Link to="/app/add">
            <AddCircleLine className="h-4 w-4 mr-1" /> New Invoice
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger-children">
        <div className="rounded-lg border bg-card p-4">
          <p className="type-section-label">Total Outstanding</p>
          <p className="type-data text-xl mt-1">{formatCurrency(totalOutstanding, "NGN")}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="type-section-label">Overdue</p>
          <p className="type-data text-xl mt-1 !text-clay">{overdueCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="type-section-label">Paid This Month</p>
          <p className="type-data text-xl mt-1 !text-naira">{formatCurrency(paidThisMonth, "NGN")}</p>
        </div>
      </div>

      {/* Invoice List */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileLine className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="type-body-small">No invoices yet. Create your first one!</p>
          <Button asChild variant="outline">
            <Link to="/app/add">Add Invoice</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {sorted.map((inv) => (
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