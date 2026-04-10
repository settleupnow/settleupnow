import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Building2Line, 
  MailLine, 
  FileCheckLine, 
  BellRingingLine, 
  ArrowRightLine,
  ArrowLeftLine
} from "@mingcute/react";
import { Link, useNavigate } from "react-router-dom";
import { trigger } from "@/lib/haptics";

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  to: string;
}

function SettingsRow({ icon, label, to }: SettingsRowProps) {
  return (
    <Link 
      to={to} 
      className="flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-accent/5 transition-colors active:scale-[0.98]"
      onClick={() => trigger("light")}
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <span className="font-medium text-foreground">{label}</span>
      </div>
      <ArrowRightLine className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}

export default function SettingsPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    trigger("warning");
    signOut();
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
          <ArrowLeftLine className="h-5 w-5" />
        </Button>
        <h1 className="type-h1 text-2xl">Settings</h1>
      </div>

      <div className="space-y-3">
        <SettingsRow 
          icon={<Building2Line className="h-5 w-5" />} 
          label="Business Profile" 
          to="/app/settings/profile" 
        />
        <SettingsRow 
          icon={<MailLine className="h-5 w-5" />} 
          label="Reminder Message" 
          to="/app/settings/reminder" 
        />
        <SettingsRow 
          icon={<FileCheckLine className="h-5 w-5" />} 
          label="Tax & Compliance" 
          to="/app/settings/tax" 
        />
        <SettingsRow 
          icon={<BellRingingLine className="h-5 w-5" />} 
          label="Notification Preferences" 
          to="/app/settings/notifications" 
        />
      </div>

      <div className="pt-12 pb-8 flex justify-center">
        <button 
          onClick={handleLogout}
          className="text-[#C4623A] font-bold text-lg hover:underline transition-all"
        >
          log out
        </button>
      </div>
    </div>
  );
}
