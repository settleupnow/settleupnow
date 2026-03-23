import { useState, useEffect, useRef } from "react";
import { getTemplates, saveTemplates, getBusinessProfile, saveBusinessProfile, uploadLogo } from "@/lib/store";
import { BusinessProfile } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeftLine, Loading3Line, ExitLine, Upload2Line } from "@mingcute/react";
import { Link } from "react-router-dom";
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

export default function SettingsPage() {
  const { signOut } = useAuth();
  const [templates, setTemplates] = useState(getTemplates);
  const [profile, setProfile] = useState<Omit<BusinessProfile, "id">>({
    business_name: "",
    logo_url: null,
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
    reminder_template: null,
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getBusinessProfile().then((data) => {
      if (data) {
        setProfile({
          business_name: data.business_name || "",
          logo_url: data.logo_url || null,
          bank_name: data.bank_name || "",
          bank_account_number: data.bank_account_number || "",
          bank_account_name: data.bank_account_name || "",
          reminder_template: data.reminder_template || null,
        });
      }
      setLoadingProfile(false);
    });
  }, []);

  function handleSaveTemplates() {
    trigger("success");
    saveTemplates(templates);
    toast.success("Templates saved!");
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await saveBusinessProfile(profile);
      trigger("success");
      toast.success("Business profile saved!");
    } catch {
      trigger("error");
      toast.error("Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      trigger("error");
      toast.error("Please upload an image file.");
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadLogo(file);
      setProfile({ ...profile, logo_url: url });
      trigger("success");
      toast.success("Logo uploaded!");
    } catch {
      trigger("error");
      toast.error("Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/app"><ArrowLeftLine className="h-5 w-5" /></Link>
        </Button>
        <h1 className="type-h1">Settings</h1>
      </div>

      {/* Business Profile */}
      <div className="rounded-lg border bg-card p-5 space-y-5">
        <p className="type-h3">Business Profile</p>
        {loadingProfile ? (
          <div className="flex justify-center py-4">
            <Loading3Line className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="stagger-children space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                placeholder="Your Business Name"
              />
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {profile.logo_url && (
                  <img
                    src={profile.logo_url}
                    alt="Business logo"
                    className="h-14 w-14 rounded-md border object-contain bg-background"
                  />
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload2Line className="h-4 w-4 mr-1.5" />
                  {uploadingLogo ? "Uploading..." : profile.logo_url ? "Change Logo" : "Upload Logo"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input
                value={profile.bank_name}
                onChange={(e) => setProfile({ ...profile, bank_name: e.target.value })}
                placeholder="First Bank"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Number</Label>
              <Input
                value={profile.bank_account_number}
                onChange={(e) => setProfile({ ...profile, bank_account_number: e.target.value })}
                placeholder="0123456789"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={profile.bank_account_name}
                onChange={(e) => setProfile({ ...profile, bank_account_name: e.target.value })}
                placeholder="Your Name / Business Name"
              />
            </div>
            <Button onClick={handleSaveProfile} className="w-full" size="lg" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Business Profile"}
            </Button>
          </div>
        )}
      </div>

      {/* Reminder Message Template */}
      <div className="rounded-lg border bg-card p-5 space-y-5">
        <div>
          <p className="type-h3 mb-1">Reminder Message</p>
          <p className="type-body-small">
            Customise the email message sent when you follow up on invoices.
          </p>
        </div>
        <div className="space-y-2">
          <Label>Email Reminder Template</Label>
          <Textarea
            rows={8}
            value={profile.reminder_template || ""}
            onChange={(e) => setProfile({ ...profile, reminder_template: e.target.value || null })}
            placeholder={DEFAULT_REMINDER}
          />
        </div>
        <div className="rounded-md bg-background p-3 space-y-1.5">
          <p className="type-section-label mb-2">AVAILABLE VARIABLES</p>
          {REMINDER_VARIABLES.map((v) => (
            <div key={v.var} className="flex items-baseline gap-2">
              <code className="type-data text-primary text-xs">{v.var}</code>
              <span className="type-body-small">{v.desc}</span>
            </div>
          ))}
        </div>
        <Button onClick={handleSaveProfile} className="w-full" size="lg" disabled={savingProfile}>
          {savingProfile ? "Saving..." : "Save Reminder Template"}
        </Button>
      </div>

      {/* Message Templates (WhatsApp/Email local) */}
      <div className="rounded-lg border bg-card p-5 space-y-5">
        <div>
          <p className="type-h3 mb-1">Message Templates</p>
          <p className="type-body-small">
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

        <Button onClick={handleSaveTemplates} className="w-full" size="lg">
          Save Templates
        </Button>
      </div>

      {/* Logout */}
      <div className="rounded-lg border bg-card p-5">
        <Button
          variant="destructive"
          className="w-full"
          size="lg"
          onClick={() => { trigger("warning"); signOut(); }}
        >
          <ExitLine className="h-4 w-4 mr-2" /> Log Out
        </Button>
      </div>
    </div>
  );
}
