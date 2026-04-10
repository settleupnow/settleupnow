import { useState, useEffect } from "react";
import { getBusinessProfile, saveBusinessProfile } from "@/lib/store";
import { BusinessProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeftLine, Loading3Line } from "@mingcute/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { trigger } from "@/lib/haptics";

export default function TaxCompliance() {
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
          tin: "",
          vat_number: "",
          vat_rate: 7.5,
          include_vat_default: false,
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
      toast.success("Tax & Compliance settings saved!");
    } catch {
      trigger("error");
      toast.error("Failed to save settings.");
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
        <h1 className="type-h1">Tax & Compliance</h1>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="tin">Tax Identification Number (TIN)</Label>
              <Input
                id="tin"
                value={profile?.tin || ""}
                onChange={(e) => setProfile(p => p ? { ...p, tin: e.target.value } : null)}
                placeholder="e.g. 1234567890"
              />
              <p className="text-[11px] text-muted-foreground">Required for FIRS-compliant invoicing</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vat_number">VAT Registration Number</Label>
              <Input
                id="vat_number"
                value={profile?.vat_number || ""}
                onChange={(e) => setProfile(p => p ? { ...p, vat_number: e.target.value } : null)}
                placeholder="e.g. 00012345-0001"
              />
              <p className="text-[11px] text-muted-foreground">Only required if you are VAT-registered</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vat_rate">VAT Rate (%)</Label>
              <Input
                id="vat_rate"
                type="number"
                step="0.1"
                value={profile?.vat_rate ?? 7.5}
                onChange={(e) => setProfile(p => p ? { ...p, vat_rate: parseFloat(e.target.value) || 0 } : null)}
                placeholder="7.5"
              />
              <p className="text-[11px] text-muted-foreground">Standard Nigeria VAT rate is 7.5%</p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Include VAT on invoices by default</Label>
                <p className="text-[11px] text-muted-foreground">Pre-fill the VAT rate field on new invoices</p>
              </div>
              <Switch
                checked={profile?.include_vat_default || false}
                onCheckedChange={(checked) => setProfile(p => p ? { ...p, include_vat_default: checked } : null)}
              />
            </div>

            <Button onClick={handleSave} className="w-full mt-4" size="lg" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
