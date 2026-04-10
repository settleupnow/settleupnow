import { useState, useEffect, useRef } from "react";
import { getBusinessProfile, saveBusinessProfile, uploadLogo } from "@/lib/store";
import { BusinessProfile as BusinessProfileType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftLine, Loading3Line, Upload2Line } from "@mingcute/react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { trigger } from "@/lib/haptics";

export default function BusinessProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Omit<BusinessProfileType, "id">>({
    business_name: "",
    logo_url: null,
    bank_name: "",
    bank_account_number: "",
    bank_account_name: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
          tin: data.tin || null,
          vat_number: data.vat_number || null,
          vat_rate: data.vat_rate ?? 7.5,
          include_vat_default: data.include_vat_default ?? false,
        });
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveBusinessProfile(profile);
      trigger("success");
      toast.success("Business profile saved!");
    } catch {
      trigger("error");
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
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
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeftLine className="h-5 w-5" />
        </Button>
        <h1 className="type-h1">Business Profile</h1>
      </div>

      <div className="rounded-lg border bg-card p-5">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="stagger-children space-y-6">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                placeholder="Your Business Name"
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {profile.logo_url && (
                  <img
                    src={profile.logo_url}
                    alt="Business logo"
                    className="h-16 w-16 rounded-md border object-contain bg-background"
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

            <Button onClick={handleSave} className="w-full mt-4" size="lg" disabled={saving}>
              {saving ? "Saving..." : "Save Business Profile"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
