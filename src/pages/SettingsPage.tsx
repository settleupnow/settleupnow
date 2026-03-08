import { useState, useEffect } from "react";
import { getTemplates, saveTemplates, getBusinessProfile, saveBusinessProfile } from "@/lib/store";
import { BusinessProfile } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function SettingsPage() {
  const [templates, setTemplates] = useState(getTemplates);
  const [profile, setProfile] = useState<Omit<BusinessProfile, "id">>({
    business_name: "",
    logo_url: null,
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    getBusinessProfile().then((data) => {
      if (data) {
        setProfile({
          business_name: data.business_name || "",
          logo_url: data.logo_url || null,
          bank_name: data.bank_name || "",
          bank_account_number: data.bank_account_number || "",
          bank_account_name: data.bank_account_name || "",
        });
      }
      setLoadingProfile(false);
    });
  }, []);

  function handleSaveTemplates() {
    saveTemplates(templates);
    toast.success("Templates saved!");
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await saveBusinessProfile(profile);
      toast.success("Business profile saved!");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Business Profile */}
      <div className="rounded-xl border bg-card p-5 space-y-5">
        <p className="text-sm font-medium text-foreground">Business Profile</p>
        {loadingProfile ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                placeholder="Your Business Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={profile.logo_url || ""}
                onChange={(e) => setProfile({ ...profile, logo_url: e.target.value || null })}
                placeholder="https://example.com/logo.png"
              />
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
          </>
        )}
      </div>

      {/* Message Templates */}
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

        <Button onClick={handleSaveTemplates} className="w-full" size="lg">
          Save Templates
        </Button>
      </div>
    </div>
  );
}
