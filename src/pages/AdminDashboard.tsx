import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/StatusChip";
import { formatCurrency } from "@/lib/format";
import {
  Loading3Line,
  Home1Line,
  User1Line,
  FileLine,
  ChartVerticalLine,
  ExitLine,
  DeleteLine,
} from "@mingcute/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Screen = "overview" | "users" | "invoices" | "stats";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  invoice_count: number;
  total_invoice_value: number;
}

interface AdminInvoice {
  id: string;
  user_email: string;
  client_name: string;
  invoice_amount: number;
  currency: string;
  status: string;
  due_date: string;
  reminder_count: number;
}

interface StatsData {
  totalUsers: number;
  totalInvoices: number;
  totalEmailsSent: number;
  activeInvoices: number;
  chartData: { date: string; invoices: number; emails: number }[];
}

async function fetchAdmin(type: string, body?: object) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error("No active session token found.");
  }

  const url = new URL(
    `${import.meta.env.VITE_SUPABASE_URL || "https://ijexmbrtbbqbxvusiiew.supabase.co"}/functions/v1/admin-data`
  );

  url.searchParams.set("type", type);

  const res = await fetch(url.toString(), {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body
      ? {
          body: JSON.stringify({ ...body }),
        }
      : {}),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch admin data");
  }
  return res.json();
}

const navItems: { key: Screen; label: string; icon: typeof Home1Line }[] = [
  { key: "overview", label: "Overview", icon: Home1Line },
  { key: "users", label: "Users", icon: User1Line },
  { key: "invoices", label: "Invoices", icon: FileLine },
  { key: "stats", label: "Stats", icon: ChartVerticalLine },
];

export default function AdminDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const screen = (searchParams.get("tab") as Screen) || "overview";
  const setScreen = (s: Screen) => setSearchParams({ tab: s });

  useEffect(() => {
    if (authLoading) return;
    console.log("Full User Object:", user);
    console.log("User Metadata:", user?.user_metadata);
    console.log("is_admin value:", user?.user_metadata?.is_admin);
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="type-body-small">Loading...</p>
      </div>
    );
  }

  if (!user || user.user_metadata?.is_admin !== true) {
    console.log("Not admin, redirecting");
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-5 border-b">
          <h1 className="type-h3">
            Settle<span className="text-primary">Up</span>{" "}
            <span className="type-metadata">Admin</span>
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setScreen(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm type-ui-label transition-colors ${
                screen === key
                  ? "bg-naira-pale text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <ExitLine className="h-4 w-4 mr-2" /> Log Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        {screen === "overview" && <OverviewScreen />}
        {screen === "users" && <UsersScreen />}
        {screen === "invoices" && <InvoicesScreen />}
        {screen === "stats" && <StatsScreen />}
      </main>
    </div>
  );
}

/* ─── Overview ───────────────────────────────────── */

function OverviewScreen() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmin("stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return <Loader />;
  }

  const cards = [
    { label: "Total Users", value: stats.totalUsers },
    { label: "Total Invoices", value: stats.totalInvoices },
    { label: "Total Emails Sent", value: stats.totalEmailsSent },
    { label: "Active Invoices", value: stats.activeInvoices },
  ];

  return (
    <div>
      <h2 className="type-h1 mb-6">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-5">
            <p className="type-section-label">{c.label}</p>
            <p className="type-data text-3xl mt-2">{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Users ──────────────────────────────────────── */

function UsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAdmin("users")
      .then((d) => setUsers(d.users))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (userId: string) => {
    await fetchAdmin("delete-user", { userId });
    load();
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h2 className="type-h1 mb-6">Users</h2>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-ink text-white">
                <th className="text-left px-4 py-3 type-section-label !text-white">Email</th>
                <th className="text-left px-4 py-3 type-section-label !text-white">Joined</th>
                <th className="text-right px-4 py-3 type-section-label !text-white">Invoices</th>
                <th className="text-right px-4 py-3 type-section-label !text-white">Total Value</th>
                <th className="text-left px-4 py-3 type-section-label !text-white">Last Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-card' : 'bg-background'}`}>
                  <td className="px-4 py-3 type-body">{u.email}</td>
                  <td className="px-4 py-3 type-metadata">
                    {new Date(u.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right type-data">{u.invoice_count}</td>
                  <td className="px-4 py-3 text-right type-data">
                    {formatCurrency(u.total_invoice_value, "NGN")}
                  </td>
                  <td className="px-4 py-3 type-metadata">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <DeleteLine className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="type-h2">Delete Account</AlertDialogTitle>
                          <AlertDialogDescription className="type-body">
                            This will permanently delete <strong>{u.email}</strong> and all their data. This cannot be
                            undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(u.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Invoices ───────────────────────────────────── */

function InvoicesScreen() {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchAdmin("invoices")
      .then((d) => setInvoices(d.invoices))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (statusFilter === "all" ? invoices : invoices.filter((i) => i.status === statusFilter)),
    [invoices, statusFilter]
  );

  if (loading) return <Loader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="type-h1">Invoices</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unpaid">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="paid">Settled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-ink text-white">
                <th className="text-left px-4 py-3 type-section-label !text-white">User</th>
                <th className="text-left px-4 py-3 type-section-label !text-white">Client</th>
                <th className="text-right px-4 py-3 type-section-label !text-white">Amount</th>
                <th className="text-left px-4 py-3 type-section-label !text-white">Status</th>
                <th className="text-left px-4 py-3 type-section-label !text-white">Due Date</th>
                <th className="text-right px-4 py-3 type-section-label !text-white">Reminders</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <tr key={inv.id} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-card' : 'bg-background'}`}>
                  <td className="px-4 py-3 type-metadata truncate max-w-[160px]">{inv.user_email}</td>
                  <td className="px-4 py-3 type-body">{inv.client_name}</td>
                  <td className="px-4 py-3 text-right type-data">
                    {formatCurrency(inv.invoice_amount, inv.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={inv.status as any} />
                  </td>
                  <td className="px-4 py-3 type-metadata">
                    {new Date(inv.due_date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right type-data">{inv.reminder_count}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center type-body-small">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Stats ──────────────────────────────────────── */

function StatsScreen() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmin("stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) return <Loader />;

  return (
    <div className="space-y-8">
      <h2 className="type-h1">Stats — Last 30 Days</h2>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="type-section-label mb-4">Invoices Created per Day</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D8D0C4" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#6B6560", fontFamily: "'DM Mono', monospace" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: "#6B6560", fontFamily: "'DM Mono', monospace" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 6,
                border: "1px solid #D8D0C4",
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            />
            <Bar dataKey="invoices" fill="#1A6B3C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <h3 className="type-section-label mb-4">Emails Sent per Day</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#D8D0C4" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#6B6560", fontFamily: "'DM Mono', monospace" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: "#6B6560", fontFamily: "'DM Mono', monospace" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 6,
                border: "1px solid #D8D0C4",
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            />
            <Bar dataKey="emails" fill="#E8A020" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Shared ─────────────────────────────────────── */

function Loader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}