import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getInvoice, updateInvoice, getLineItems, getBusinessProfile } from "@/lib/store";
import { Invoice, LineItem, BusinessProfile } from "@/lib/types";
import { formatCurrency, daysOverdue } from "@/lib/format";
import { generateInvoicePdfBlob } from "@/lib/pdf";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { ArrowLeftLine, SendPlaneLine, CheckCircleLine, TimeLine, Edit2Line, Loading3Line, FileLine } from "@mingcute/react";
import { toast } from "sonner";
import { InvoiceEditForm } from "@/components/InvoiceEditForm";
import { trigger } from "@/lib/haptics";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  useEffect(() => {
    Promise.all([
      getInvoice(id!),
      getLineItems(id!),
      getBusinessProfile(),
    ]).then(([inv, items, prof]) => {
      setInvoice(inv || null);
      setLineItems(items);
      setProfile(prof);
      setLoading(false);
    });
  }, [id]);

  async function refreshInvoice() {
    const updated = await getInvoice(id!);
    setInvoice(updated || null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-muted-foreground">Invoice not found.</p>
        <Button asChild variant="outline"><Link to="/">Go back</Link></Button>
      </div>
    );
  }

  async function handleMarkPaid() {
    trigger("success");
    await updateInvoice(id!, { status: "paid", paid_at: new Date().toISOString() });
    toast.success("Invoice marked as paid!");
    await refreshInvoice();
  }

  async function handleSendReminder() {
    trigger("warning");
    setSending(true);
    try {
      const res = await fetch(
        "https://ijexmbrtbbqbxvusiiew.supabase.co/functions/v1/send-manual-reminder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZXhtYnJ0YmJxYnh2dXNpaWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzYxMDEsImV4cCI6MjA4ODU1MjEwMX0.s4mZwGSOt9HpTYbDKXQz4MkMBDxp4ADz2QXkmUbT_DE",
          },
          body: JSON.stringify({ invoice_id: id }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send reminder");
      trigger("success");
      toast.success("Reminder sent!");
      await refreshInvoice();
    } catch {
      trigger("error");
      toast.error("Failed to send reminder");
    } finally {
      setSending(false);
    }
  }

  async function handleSendInvoice() {
    trigger("light");
    setSendingInvoice(true);
    try {
      const freshLineItems = await getLineItems(id!);
      const pdfBlob = generateInvoicePdfBlob(invoice!, freshLineItems, profile);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      const res = await fetch(
        "https://ijexmbrtbbqbxvusiiew.supabase.co/functions/v1/send-invoice",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZXhtYnJ0YmJxYnh2dXNpaWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzYxMDEsImV4cCI6MjA4ODU1MjEwMX0.s4mZwGSOt9HpTYbDKXQz4MkMBDxp4ADz2QXkmUbT_DE",
          },
          body: JSON.stringify({
            to: invoice!.client_email,
            client_name: invoice!.client_name,
            invoice_number: invoice!.invoice_number,
            pdf_base64: base64,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to send invoice");
      trigger("success");
      toast.success("Invoice sent!");
    } catch {
      trigger("error");
      toast.error("Failed to send invoice");
    } finally {
      setSendingInvoice(false);
    }
  }

  async function handleSaveEdit(editData: Partial<Invoice>) {
    await updateInvoice(id!, editData);
    setEditing(false);
    trigger("success");
    toast.success("Invoice updated!");
    await refreshInvoice();
  }

  const overdueDays = daysOverdue(invoice.due_date);

  if (editing) {
    return (
      <InvoiceEditForm
        invoice={invoice}
        onSave={handleSaveEdit}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeftLine className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex-1">Invoice Detail</h1>
        <Button variant="ghost" size="icon" onClick={() => { trigger("light"); setEditing(true); }}>
          <Edit2Line className="h-4 w-4" />
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

        <div className="grid grid-cols-2 gap-4 text-sm stagger-children">
          {invoice.invoice_number && (
            <div>
              <p className="text-muted-foreground">Invoice #</p>
              <p className="font-semibold text-foreground">{invoice.invoice_number}</p>
            </div>
          )}
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

        {/* Line Items */}
        {lineItems.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="space-y-2 stagger-children">
              <p className="text-sm font-medium text-muted-foreground">Line Items</p>
              {lineItems.map((li, i) => (
                <div key={li.id || i} className="flex justify-between text-sm">
                  <span className="text-foreground">{li.description} × {li.quantity}</span>
                  <span className="font-medium text-foreground">{formatCurrency(li.amount, invoice.currency)}</span>
                </div>
              ))}
              {invoice.tax_rate > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground pt-1 border-t border-border">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span>{formatCurrency(invoice.invoice_amount - lineItems.reduce((s, li) => s + li.amount, 0), invoice.currency)}</span>
                </div>
              )}
            </div>
          </>
        )}

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
            <CheckCircleLine className="h-5 w-5 mr-2" /> Mark as Paid
          </Button>
        )}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSendInvoice}
          disabled={sendingInvoice}
        >
          {sendingInvoice ? (
            <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Sending Invoice...</>
          ) : (
            <><FileText className="h-5 w-5 mr-2" /> Send Invoice</>
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          size="lg"
          onClick={handleSendReminder}
          disabled={invoice.status === "paid" || sending}
        >
          {sending ? (
            <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Sending...</>
          ) : (
            <><Send className="h-5 w-5 mr-2" /> Send Reminder</>
          )}
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
