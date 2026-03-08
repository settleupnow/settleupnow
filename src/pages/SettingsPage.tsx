import { useState } from "react";
import { getTemplates, saveTemplates } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function SettingsPage() {
  const [templates, setTemplates] = useState(getTemplates);

  function handleSave() {
    saveTemplates(templates);
    toast.success("Templates saved!");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-5">
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Message Templates</p>
          <p className="text-xs text-muted-foreground">
            Use placeholders: {"{{client_name}}"}, {"{{invoice_amount}}"}, {"{{due_date}}"}, {"{{days_overdue}}"}
          </p>
        </div>

        <div className="space-y-2">
          <Label>Email Template</Label>
          <Textarea
            rows={6}
            value={templates.email}
            onChange={(e) => setTemplates({ ...templates, email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>WhatsApp Template</Label>
          <Textarea
            rows={4}
            value={templates.whatsapp}
            onChange={(e) => setTemplates({ ...templates, whatsapp: e.target.value })}
          />
        </div>

        <Button onClick={handleSave} className="w-full" size="lg">
          Save Templates
        </Button>
      </div>
    </div>
  );
}
