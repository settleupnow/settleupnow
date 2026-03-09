import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useSearchParams } from "react-router-dom";
import { supabase, SUPABASE_ANON_KEY } from "@/lib/supabase";
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
  DownSmallLine,
} from "@mingcute/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const url = new URL(
    `${import.meta.env.VITE_SUPABASE_URL || "https://ijexmbrtbbqbxvusiiew.supabase.co"}/functions/v1/admin-data`
  );

  if (!body) {
    url.searchParams.set("type", type);
  }

  const res = await fetch(url.toString(), {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
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

  // Access check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loading3Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAdmin = user?.user_metadata?.is_admin === true;
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-5 border-b">
          <h1 className="text-lg font-bold text-foreground">
            Settle<span className="text-primary">Up</span>{" "}
            <span className="text-xs font-normal text-muted-foreground">Admin</span>
          </h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setScreen(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                screen === key
                  ? "bg-primary/10 text-primary"
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
      <h2 className="text-xl font-bold text-foreground mb-6">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {c.label}
            </p>
            <p className="text-3xl font-bold mt-2 text-foreground">{c.value.toLocaleString()}</p>
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
      <h2 className="text-xl font-bold text-foreground mb-6">Users</h2>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Invoices</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Value</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-foreground">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">{u.invoice_count}</td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatCurrency(u.total_invoice_value, "NGN")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
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
                          <DeleteBinLine className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Account</AlertDialogTitle>
                          <AlertDialogDescription>
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
        <h2 className="text-xl font-bold text-foreground">Invoices</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reminders</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[160px]">{inv.user_email}</td>
                  <td className="px-4 py-3 text-foreground">{inv.client_name}</td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {formatCurrency(inv.invoice_amount, inv.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip status={inv.status as any} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(inv.due_date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">{inv.reminder_count}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
      <h2 className="text-xl font-bold text-foreground">Stats — Last 30 Days</h2>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Invoices Created per Day</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid hsl(220, 13%, 91%)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="invoices" fill="hsl(200, 100%, 48%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Emails Sent per Day</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 46%)" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid hsl(220, 13%, 91%)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="emails" fill="hsl(145, 63%, 42%)" radius={[4, 4, 0, 0]} />
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
