import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { addInvoice, addLineItems, getNextInvoiceNumber, getClients, upsertClient, getBusinessProfile, getInvoices } from "@/lib/store";
import { LineItem, Client } from "@/lib/types";
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
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/PaywallModal";

const FREE_INVOICE_LIMIT = 3;

interface LineItemDraft {
  description: string;
  quantity: number;
  unit_price: number;
}

function ClientAutocomplete({
  value,
  onChange,
  onSelect,
  clients,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (c: Client) => void;
  clients: Client[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.length > 0
    ? clients.filter((c) => c.name.toLowerCase().includes(value.toLowerCase()))
    : [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Acme Corp"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 type-body hover:bg-accent transition-colors"
              onClick={() => { onSelect(c); setOpen(false); }}
            >
              <span className="type-body-strong">{c.name}</span>
              {c.email && <span className="type-metadata ml-2">{c.email}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const [clients, setClients] = useState<Client[]>([]);
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);
  const { status: subStatus } = useSubscription();
  const [paywall, setPaywall] = useState<string | null>(null);
  const [invoiceCount, setInvoiceCount] = useState(0);

  useEffect(() => {
    getInvoices().then((inv) => setInvoiceCount(inv.length));
  }, []);

  useEffect(() => {
    getNextInvoiceNumber().then(setInvoiceNumber);
    getClients().then(setClients);
    getBusinessProfile().then((profile) => {
      if (profile?.include_vat_default && profile.vat_rate !== undefined) {
        setTaxRate(profile.vat_rate);
      }
    });
  }, []);

  function handleClientSelect(c: Client) {
    setClientName(c.name);
    if (c.email) setClientEmail(c.email);
    if (c.whatsapp) setClientWhatsapp(c.whatsapp);
  }

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
    if (subStatus !== "active" && invoiceCount >= FREE_INVOICE_LIMIT) {
      trigger("warning");
      setPaywall(`Free plan is limited to ${FREE_INVOICE_LIMIT} invoices.`);
      return;
    }
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

      // Auto-save client
      await upsertClient({
        name: clientName,
        email: clientEmail || null,
        whatsapp: clientWhatsapp || null,
      });

      trigger("success");
      toast.success("Invoice created!");
      navigate("/app");
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
          <Link to="/app"><ArrowLeftLine className="h-5 w-5" /></Link>
        </Button>
        <h1 className="type-h1">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 stagger-children">
        <div className="space-y-2">
          <Label>Invoice Number</Label>
          <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Client Name *</Label>
          <ClientAutocomplete
            value={clientName}
            onChange={setClientName}
            onSelect={handleClientSelect}
            clients={clients}
          />
        </div>
        <div className="space-y-2">
          <Label>Client Email *</Label>
          <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="billing@acme.com" />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp Number</Label>
          <Input value={clientWhatsapp} onChange={(e) => setClientWhatsapp(e.target.value)} placeholder="+234..." />
        </div>

        {/* Document-style Line Items Card */}
        <div className="relative bg-white rounded-lg overflow-hidden" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
          {/* Folded corner */}
          <div
            className="absolute top-0 right-0 w-10 h-10 z-10"
            style={{
              background: "linear-gradient(225deg, hsl(var(--color-paper)) 50%, #e0dbd3 50%, #e8e3db 52%, #fff 52%)",
            }}
          />

          <div className="p-5 pt-6 space-y-4">
            <p className="type-section-label">LINE ITEMS</p>

            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 type-section-label text-xs pb-1 border-b">
              <div className="col-span-5">DESCRIPTION</div>
              <div className="col-span-3 text-center">QTY</div>
              <div className="col-span-3 text-right">UNIT PRICE</div>
              <div className="col-span-1"></div>
            </div>

            {lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(i, "description", e.target.value)}
                    className="border-0 border-b rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <div className="col-span-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => updateLineItem(i, "quantity", Math.max(1, item.quantity - 1))}
                    >
                      <span className="text-sm font-medium">−</span>
                    </Button>
                    <span className="w-8 text-center type-data text-sm">{item.quantity}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => updateLineItem(i, "quantity", item.quantity + 1)}
                    >
                      <span className="text-sm font-medium">+</span>
                    </Button>
                  </div>
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) => updateLineItem(i, "unit_price", parseFloat(e.target.value) || 0)}
                    className="border-0 border-b rounded-none bg-transparent px-0 text-right focus-visible:ring-0 focus-visible:ring-offset-0 type-data text-sm"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  {lineItems.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLineItem(i)}>
                      <Delete2Line className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={addLineItemRow} className="w-full">
              <AddCircleLine className="h-4 w-4 mr-1" /> Add Line Item
            </Button>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-end gap-8">
                <span className="type-body-small">Subtotal</span>
                <span className="type-data w-28 text-right">{currency} {subtotal.toLocaleString()}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-end gap-8">
                  <span className="type-body-small">Tax ({taxRate}%)</span>
                  <span className="type-data w-28 text-right">{currency} {taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-end gap-8 pt-1 border-t">
                <span className="type-body-strong">Total</span>
                <span className="type-data font-bold w-28 text-right">{currency} {total.toLocaleString()}</span>
              </div>
            </div>
          </div>
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

        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
              >
                <CalendarLine className="mr-2 h-4 w-4" />
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
