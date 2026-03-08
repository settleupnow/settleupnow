import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addInvoice } from "@/lib/store";
import { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function AddInvoice() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [dueDate, setDueDate] = useState<Date>();
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName || !clientEmail || !amount || !dueDate) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const invoice: Invoice = {
      id: crypto.randomUUID(),
      client_name: clientName,
      client_email: clientEmail,
      client_whatsapp: clientWhatsapp,
      invoice_amount: parseFloat(amount),
      currency,
      due_date: dueDate.toISOString().split("T")[0],
      status: due < now ? "overdue" : "unpaid",
      reminder_count: 0,
      last_reminder_sent: null,
      paid_at: null,
      notes,
      created_at: new Date().toISOString(),
    };

    addInvoice(invoice);
    toast.success("Invoice created!");
    navigate(`/invoice/${invoice.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
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
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={3} />
        </div>

        <Button type="submit" className="w-full" size="lg">
          Create Invoice
        </Button>
      </form>
    </div>
  );
}
