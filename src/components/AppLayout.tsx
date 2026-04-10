import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home1Line, DocumentsLine, Settings3Line } from "@mingcute/react";
import { cn } from "@/lib/utils";
import { trigger } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import logo from "@/assets/settleup-logo.svg";
import { Analytics } from "@vercel/analytics/next";

const navItems = [
  { to: "/app", icon: Home1Line, label: "Dashboard", exact: true },
  { to: "/app/invoices", icon: DocumentsLine, label: "Invoices", exact: false },
  { to: "/app/settings", icon: Settings3Line, label: "Settings", exact: false },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto flex items-center justify-center h-14 px-4">
          <Link to="/app">
            <img src={logo} alt="SettleUp" className="h-[22px] w-auto" />
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-6 pb-24">
        <PageTransition>{children}</PageTransition>
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto flex justify-around py-2">
          {navItems.map(({ to, icon: Icon, label, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
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