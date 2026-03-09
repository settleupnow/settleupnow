import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addInvoice, addLineItems, getNextInvoiceNumber } from "@/lib/store";
import { LineItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarLine, ArrowLeftLine, AddCircleLine, Delete2Line } from "@mingcute/react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { trigger } from "@/lib/haptics";

interface LineItemDraft {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function AddInvoice() {
  const navigate = useNavigate();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [dueDate, setDueDate] = useState<Date>();
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [paymentLink, setPaymentLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    getNextInvoiceNumber().then(setInvoiceNumber);
  }, []);

  function updateLineItem(index: number, field: keyof LineItemDraft, value: string | number) {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  }

  function addLineItemRow() {
    trigger("light");
    setLineItems([...lineItems, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    trigger("light");
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName || !clientEmail || !dueDate || lineItems.some(li => !li.description || li.unit_price <= 0)) {
      trigger("error");
      toast.error("Please fill in all required fields and line items.");
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    setSubmitting(true);
    try {
      const invoiceId = await addInvoice({
        client_name: clientName,
        client_email: clientEmail,
        client_whatsapp: clientWhatsapp,
        invoice_amount: total,
        currency,
        due_date: dueDate.toISOString().split("T")[0],
        status: due < now ? "overdue" : "unpaid",
        reminder_count: 0,
        last_reminder_sent: null,
        paid_at: null,
        notes,
        created_at: new Date().toISOString(),
        invoice_number: invoiceNumber,
        tax_rate: taxRate,
        payment_link: paymentLink || null,
        bank_name: null,
        bank_account_number: null,
        bank_account_name: null,
      });

      const items: LineItem[] = lineItems.map((li) => ({
        invoice_id: invoiceId,
        description: li.description,
        quantity: li.quantity,
        unit_price: li.unit_price,
        amount: li.quantity * li.unit_price,
      }));
      await addLineItems(items);

      trigger("success");
      toast.success("Invoice created!");
      navigate("/");
    } catch {
      trigger("error");
      toast.error("Failed to create invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeftLine className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 stagger-children">
        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Client Name *</Label>
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Acme Corp" />
        </div>
        <div className="space-y-2">
          <Label>Client Email *</Label>
          <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@acme.com" />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp Number</Label>
          <Input value={clientWhatsapp} onChange={(e) => setClientWhatsapp(e.target.value)} placeholder="+234..." />
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          <Label>Line Items *</Label>
          {lineItems.map((item, i) => (
            <div key={i} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
                {lineItems.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLineItem(i)}>
                    <Delete2Line className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateLineItem(i, "description", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Qty</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => updateLineItem(i, "quantity", Math.max(1, item.quantity - 1))}
                    >
                      <span className="text-lg font-medium">−</span>
                    </Button>
                    <span className="flex-1 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      onClick={() => updateLineItem(i, "quantity", item.quantity + 1)}
                    >
                      <span className="text-lg font-medium">+</span>
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
              <p className="text-sm text-right font-medium text-foreground">
                Amount: {currency} {(item.quantity * item.unit_price).toLocaleString()}
              </p>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addLineItemRow} className="w-full">
            <AddCircleLine className="h-4 w-4 mr-1" /> Add Line Item
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tax Rate (%)</Label>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} />
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-lg border bg-card p-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">{currency} {subtotal.toLocaleString()}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({taxRate}%)</span>
              <span className="font-medium text-foreground">{currency} {taxAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-border">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-foreground">{currency} {total.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Payment Link</Label>
          <Input
            value={paymentLink}
            onChange={(e) => setPaymentLink(e.target.value)}
            placeholder="https://paystack.com/pay/..."
          />
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={3} />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? "Creating..." : "Create Invoice"}
        </Button>
      </form>
    </div>
  );
}
