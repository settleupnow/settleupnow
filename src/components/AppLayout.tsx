import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home1Line, DocumentsLine, Settings3Line, WhatsappLine } from "@mingcute/react";
import { cn } from "@/lib/utils";
import { trigger } from "@/lib/haptics";
import { PageTransition } from "@/components/PageTransition";
import logo from "@/assets/settleup-logo.svg";
import { Analytics } from "@vercel/analytics/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { SettingsModal } from "@/components/SettingsModal";

const navItems = [
  { to: "/app", icon: Home1Line, label: "Dashboard", exact: true },
  { to: "/app/invoices", icon: DocumentsLine, label: "Invoices", exact: false },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);

  useEffect(() => {
    // trigger slide-in
    const t = setTimeout(() => setSidebarMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Close settings modal when navigating away
  useEffect(() => {
    if (!pathname.startsWith("/app/settings")) setSettingsOpen(false);
  }, [pathname]);

  const isPro = plan === "pro";

  if (isMobile) {
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
            {[...navItems, { to: "/app/settings", icon: Settings3Line, label: "Settings", exact: false }].map(({ to, icon: Icon, label, exact }) => {
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
        <Analytics />
      </div>
    );
  }

  // Desktop layout with sidebar
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex flex-col"
        style={{
          width: 220,
          backgroundColor: "#111111",
          transform: sidebarMounted ? "translateX(0)" : "translateX(-220px)",
          transition: "transform 300ms ease",
        }}
      >
        <div className="px-6 pt-7 pb-8">
          <Link to="/app" className="inline-block">
            <img src={logo} alt="SettleUp" className="h-7 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
          </Link>
        </div>

        <div className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={() => trigger("light")}
                className={cn(
                  "relative flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors",
                  active ? "" : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
                style={active ? { color: "#1A6B3C" } : undefined}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r"
                    style={{ backgroundColor: "#1A6B3C" }}
                  />
                )}
                <Icon className="h-5 w-5" />
                <span className="font-sans text-sm font-medium">{label}</span>
              </Link>
            );
          })}

          {/* Settings - opens modal */}
          <button
            onClick={() => {
              trigger("light");
              setSettingsOpen(true);
            }}
            className={cn(
              "w-full relative flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings3Line className="h-5 w-5" />
            <span className="font-sans text-sm font-medium">Settings</span>
          </button>

          {/* WhatsApp Reminders - Pro */}
          <div
            className={cn(
              "relative flex items-center gap-3 px-4 py-2.5 rounded-md",
              isPro ? "text-gray-400" : "text-gray-600 cursor-not-allowed"
            )}
            title={isPro ? "Coming soon" : "Available on Pro"}
          >
            <WhatsappLine className="h-5 w-5" />
            <span className="font-sans text-sm font-medium flex-1">WhatsApp</span>
            {!isPro && (
              <span
                className="font-mono text-[9px] font-bold tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-sm"
                style={{ backgroundColor: "rgba(26,107,60,0.2)", color: "#1A6B3C" }}
              >
                PRO
              </span>
            )}
          </div>
        </div>

        {user?.email && (
          <div className="px-6 py-5 border-t" style={{ borderColor: "#222" }}>
            <p className="font-mono text-[11px] truncate" style={{ color: "#666" }}>
              {user.email}
            </p>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1" style={{ marginLeft: 220 }}>
        <div className="container max-w-3xl mx-auto px-6 py-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Analytics />
    </div>
  );
}
