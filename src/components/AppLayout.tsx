import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/add", icon: Plus, label: "Add" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
            Settle<span className="text-primary">Up</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto flex justify-around py-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
