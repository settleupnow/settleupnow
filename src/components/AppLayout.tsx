import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home1Line, AddCircleLine, Settings3Line } from "@mingcute/react";
import { cn } from "@/lib/utils";
import { trigger } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";

const navItems = [
  { to: "/app", icon: Home1Line, label: "Dashboard" },
  { to: "/app/add", icon: AddCircleLine, label: "Add" },
  { to: "/app/settings", icon: Settings3Line, label: "Settings" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/app" className="type-h3 tracking-tight">
            Settle<span className="text-primary">Up</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-6 pb-24">
        <PageTransition>{children}</PageTransition>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto flex justify-around py-2">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => trigger("light")}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-sm type-ui-label transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                style={{ fontSize: '12px' }}
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