import { Button } from "@/components/ui/button";
import { ArrowLeftLine, BellRingingLine } from "@mingcute/react";
import { useNavigate } from "react-router-dom";

export default function NotificationPreferences() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeftLine className="h-5 w-5" />
        </Button>
        <h1 className="type-h1">Notification Preferences</h1>
      </div>

      <div className="rounded-lg border bg-card p-10 flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <BellRingingLine className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <p className="type-h3">Coming Soon</p>
          <p className="type-body-small text-muted-foreground">
            We're building more ways for you to stay on top of your invoices.
          </p>
        </div>
      </div>
    </div>
  );
}
