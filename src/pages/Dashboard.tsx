import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getInvoices } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import { StatusChip } from "@/components/StatusChip";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const invoices = useMemo(() => getInvoices(), []);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <Button asChild size="sm">
          <Link to="/add">
            <Plus className="h-4 w-4 mr-1" /> New Invoice
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Outstanding</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{formatCurrency(totalOutstanding, "NGN")}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overdue</p>
          <p className="text-2xl font-bold mt-1 text-destructive">{overdueCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid This Month</p>
          <p className="text-2xl font-bold mt-1 text-success">{formatCurrency(paidThisMonth, "NGN")}</p>
        </div>
      </div>

      {/* Invoice List */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground">No invoices yet. Create your first one!</p>
          <Button asChild variant="outline">
            <Link to="/add">Add Invoice</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((inv) => (
            <Link
              key={inv.id}
              to={`/invoice/${inv.id}`}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{inv.client_name}</p>
                <p className="text-sm text-muted-foreground">
                  Due {new Date(inv.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <p className="font-semibold text-foreground text-right">
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
