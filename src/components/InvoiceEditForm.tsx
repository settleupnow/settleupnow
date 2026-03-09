import { useState } from "react";
import { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftLine } from "@mingcute/react";

interface Props {
  invoice: Invoice;
  onSave: (data: Partial<Invoice>) => void;
  onCancel: () => void;
}

export function InvoiceEditForm({ invoice, onSave, onCancel }: Props) {
  const [editData, setEditData] = useState({ ...invoice });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      client_name: editData.client_name,
      client_email: editData.client_email,
      client_whatsapp: editData.client_whatsapp,
      invoice_amount: editData.invoice_amount,
      currency: editData.currency,
      notes: editData.notes,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Edit Invoice</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="flex-1">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
