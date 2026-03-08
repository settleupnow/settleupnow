import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getInvoice, updateInvoice } from "@/lib/store";
import { formatCurrency, daysOverdue } from "@/lib/format";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, CheckCircle2, Clock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [, setRefresh] = useState(0);

  const invoice = useMemo(() => getInvoice(id!), [id, editing]);

  // Edit state
  const [editData, setEditData] = useState(() => invoice);

  if (!invoice) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button asChild variant="outline"><Link to="/">Go back</Link></Button>
      </div>
    );
  }

  function handleMarkPaid() {
    updateInvoice(id!, { status: "paid", paid_at: new Date().toISOString() });
    setRefresh((r) => r + 1);
    toast.success("Invoice marked as paid!");
    navigate(0); // refresh
  }

  function handleSendReminder() {
    updateInvoice(id!, {
      reminder_count: invoice!.reminder_count + 1,
      last_reminder_sent: new Date().toISOString(),
    });
    toast.success("Reminder triggered successfully!");
    navigate(0);
  }

  function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editData) return;
    updateInvoice(id!, {
      client_name: editData.client_name,
      client_email: editData.client_email,
      client_whatsapp: editData.client_whatsapp,
      invoice_amount: editData.invoice_amount,
      currency: editData.currency,
      notes: editData.notes,
    });
    setEditing(false);
    toast.success("Invoice updated!");
    navigate(0);
  }

  const overdueDays = daysOverdue(invoice.due_date);

  if (editing && editData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Edit Invoice</h1>
        </div>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client Name</Label>
            <Input value={editData.client_name} onChange={(e) => setEditData({ ...editData, client_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Client Email</Label>
            <Input value={editData.client_email} onChange={(e) => setEditData({ ...editData, client_email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input value={editData.client_whatsapp} onChange={(e) => setEditData({ ...editData, client_whatsapp: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={editData.invoice_amount} onChange={(e) => setEditData({ ...editData, invoice_amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={editData.currency} onChange={(e) => setEditData({ ...editData, currency: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={editData.notes} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} rows={3} />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Save Changes</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex-1">Invoice Detail</h1>
        <Button variant="ghost" size="icon" onClick={() => { setEditData(invoice); setEditing(true); }}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-bold text-foreground">{invoice.client_name}</p>
            <p className="text-sm text-muted-foreground">{invoice.client_email}</p>
            {invoice.client_whatsapp && (
              <p className="text-sm text-muted-foreground">{invoice.client_whatsapp}</p>
            )}
          </div>
          <StatusChip status={invoice.status} />
        </div>

        <div className="h-px bg-border" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-semibold text-lg text-foreground">{formatCurrency(invoice.invoice_amount, invoice.currency)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due Date</p>
            <p className="font-semibold text-foreground">
              {new Date(invoice.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          {invoice.status === "overdue" && (
            <div className="col-span-2">
              <p className="text-sm font-medium text-destructive">{overdueDays} days overdue</p>
            </div>
          )}
          {invoice.paid_at && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Paid On</p>
              <p className="font-semibold text-success">
                {new Date(invoice.paid_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          )}
        </div>

        {invoice.notes && (
          <>
            <div className="h-px bg-border" />
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm text-foreground">{invoice.notes}</p>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {invoice.status !== "paid" && (
          <Button variant="success" className="w-full" size="lg" onClick={handleMarkPaid}>
            <CheckCircle2 className="h-5 w-5 mr-2" /> Mark as Paid
          </Button>
        )}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSendReminder}
          disabled={invoice.status === "paid"}
        >
          <Send className="h-5 w-5 mr-2" /> Send Reminder
        </Button>
      </div>

      {/* Reminder History */}
      <div className="rounded-xl border bg-card p-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Reminder History
        </div>
        <p className="text-sm text-muted-foreground">
          {invoice.reminder_count === 0
            ? "No reminders sent yet."
            : `${invoice.reminder_count} reminder${invoice.reminder_count > 1 ? "s" : ""} sent`}
        </p>
        {invoice.last_reminder_sent && (
          <p className="text-xs text-muted-foreground">
            Last sent: {new Date(invoice.last_reminder_sent).toLocaleString("en-GB")}
          </p>
        )}
      </div>
    </div>
  );
}
