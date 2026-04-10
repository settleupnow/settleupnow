import { useState, useEffect } from "react";
import { getBusinessProfile, saveBusinessProfile } from "@/lib/store";
import { BusinessProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftLine, Loading3Line } from "@mingcute/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { trigger } from "@/lib/haptics";

const REMINDER_VARIABLES = [
  { var: "{{client_name}}", desc: "Client's full name" },
  { var: "{{invoice_amount}}", desc: "Invoice amount with currency" },
  { var: "{{due_date}}", desc: "Invoice due date" },
  { var: "{{invoice_number}}", desc: "Invoice number (e.g. INV-001)" },
];

const DEFAULT_REMINDER = `Hi {{client_name}},

This is a friendly reminder that your invoice {{invoice_number}} of {{invoice_amount}} was due on {{due_date}}.

Please arrange payment at your earliest convenience.

Thank you.`;

export default function ReminderMessage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Omit<BusinessProfile, "id"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBusinessProfile().then((data) => {
      if (data) {
        setProfile(data);
      } else {
        setProfile({
          business_name: "",
          logo_url: null,
          bank_name: "",
          bank_account_number: "",
          bank_account_name: "",
          reminder_template: null,
        });
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      await saveBusinessProfile(profile);
      trigger("success");
      toast.success("Reminder template saved!");
    } catch {
      trigger("error");
      toast.error("Failed to save template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeftLine className="h-5 w-5" />
        </Button>
        <h1 className="type-h1">Reminder Message</h1>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div>
              <p className="type-body-small text-muted-foreground mb-4">
                Customise the email message sent when you follow up on invoices.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Email Reminder Template</Label>
              <Textarea
                rows={10}
                className="resize-none"
                value={profile?.reminder_template || ""}
                onChange={(e) => setProfile(p => p ? { ...p, reminder_template: e.target.value } : null)}
                placeholder={DEFAULT_REMINDER}
              />
            </div>
            <div className="rounded-md bg-muted/30 p-4 space-y-2">
              <p className="type-section-label text-[10px] uppercase tracking-wider text-muted-foreground">Available Variables</p>
              <div className="grid grid-cols-1 gap-2">
                {REMINDER_VARIABLES.map((v) => (
                  <div key={v.var} className="flex items-center gap-2">
                    <code className="text-[11px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded transition-colors hover:bg-primary/20 cursor-default">
                      {v.var}
                    </code>
                    <span className="text-xs text-muted-foreground">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" size="lg" disabled={saving}>
              {saving ? "Saving..." : "Save Reminder Template"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
