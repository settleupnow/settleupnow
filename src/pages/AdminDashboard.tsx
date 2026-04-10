import { useState, useEffect, useMemo, useRef } from "react";
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
  PlusLine,
  EditLine,
  ArrowLeftLine,
  CheckLine,
  CloseLine,
  Upload2Line,
  LayoutLine,
  UserFollowLine,
  SendPlaneLine,
} from "@mingcute/react";
import { toast } from "sonner";
import { trigger } from "@/lib/haptics";
import { 
  adminGetBlogPosts, 
  addBlogPost, 
  updateBlogPost, 
  deleteBlogPost, 
  uploadBlogImage 
} from "@/lib/store";
import { BlogPost, InvoiceStatus } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

type Screen = "overview" | "users" | "invoices" | "stats" | "blog" | "waitlist";

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
  waitlistCount: number;
  chartData: { date: string; invoices: number; emails: number }[];
}

interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
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
  { key: "waitlist", label: "Waitlist", icon: UserFollowLine },
  { key: "stats", label: "Stats", icon: ChartVerticalLine },
  { key: "blog", label: "Blog", icon: LayoutLine },
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
    return <Navigate to="/app" replace />;
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
        {screen === "waitlist" && <WaitlistScreen />}
        {screen === "stats" && <StatsScreen />}
        {screen === "blog" && <BlogScreen />}
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
    { label: "Waitlist", value: stats.waitlistCount || 0 },
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
                    <StatusChip status={inv.status as InvoiceStatus} />
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

/* ─── Blog ───────────────────────────────────────── */

function BlogScreen() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGetBlogPosts();
      setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost?.title || !editingPost?.slug || !editingPost?.content) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      if (editingPost.id) {
        await updateBlogPost(editingPost.id, editingPost);
        toast.success("Post updated!");
      } else {
        await addBlogPost({
          title: editingPost.title,
          slug: editingPost.slug,
          content: editingPost.content,
          excerpt: editingPost.excerpt || null,
          cover_image_url: editingPost.cover_image_url || null,
          is_published: !!editingPost.is_published,
        });
        toast.success("Post created!");
      }
      setEditingPost(null);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save post.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      await deleteBlogPost(id);
      toast.success("Post deleted.");
      load();
    } catch (err) {
      toast.error("Failed to delete post.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPost) return;
    
    setUploadingImage(true);
    try {
      const url = await uploadBlogImage(file);
      setEditingPost({ ...editingPost, cover_image_url: url });
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error("Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading && !editingPost) return <Loader />;

  if (editingPost) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setEditingPost(null)}>
            <ArrowLeftLine className="h-5 w-5" />
          </Button>
          <h2 className="type-h1">{editingPost.id ? "Edit Post" : "Create New Post"}</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-5 rounded-lg border bg-card p-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={editingPost.title || ""}
                onChange={(e) => {
                  const title = e.target.value;
                  const slug = title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                  setEditingPost({ ...editingPost, title, slug: editingPost.id ? editingPost.slug : slug });
                }}
                placeholder="The Future of Billing"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input
                value={editingPost.slug || ""}
                onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                placeholder="the-future-of-billing"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Excerpt (Search meta description)</Label>
            <Textarea
              value={editingPost.excerpt || ""}
              onChange={(e) => setEditingPost({ ...editingPost, excerpt: e.target.value })}
              placeholder="Brief summary for the blog list cards..."
              rows={2}
            />
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label>Cover Image</Label>
            <div className="flex items-center gap-4">
              {editingPost.cover_image_url && (
                <img
                  src={editingPost.cover_image_url}
                  alt="Cover"
                  className="h-20 w-32 rounded-md border object-cover bg-background"
                />
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload2Line className="h-4 w-4 mr-1.5" />
                {uploadingImage ? "Uploading..." : editingPost.cover_image_url ? "Change Image" : "Upload Image"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content (Markdown) *</Label>
            <Textarea
              value={editingPost.content || ""}
              onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
              placeholder="Write your story here..."
              rows={12}
              className="font-mono"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="published"
              checked={editingPost.is_published}
              onCheckedChange={(checked) => setEditingPost({ ...editingPost, is_published: checked })}
            />
            <Label htmlFor="published">Published</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setEditingPost(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Post"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="type-h1">Blog Posts</h2>
          <p className="type-body-small mt-1 text-muted-foreground">Manage your public blog entries.</p>
        </div>
        <Button onClick={() => setEditingPost({ is_published: false })}>
          <PlusLine className="h-4 w-4 mr-2" /> Create New Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 flex flex-col items-center justify-center text-center">
          <LayoutLine className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="type-h3">No Posts Yet</h3>
          <p className="type-body-small text-muted-foreground mt-2 max-w-sm">
            You haven't written any blog posts yet. Click "Create New Post" to start writing your first article.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-ink text-white">
                  <th className="text-left px-4 py-3 type-section-label !text-white">Title</th>
                  <th className="text-left px-4 py-3 type-section-label !text-white">Slug</th>
                  <th className="text-left px-4 py-3 type-section-label !text-white">Status</th>
                  <th className="text-left px-4 py-3 type-section-label !text-white">Created At</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, i) => (
                  <tr key={post.id} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-card' : 'bg-background'}`}>
                    <td className="px-4 py-3 type-body font-medium">{post.title}</td>
                    <td className="px-4 py-3 type-metadata">/{post.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        post.is_published ? "bg-naira-pale text-naira" : "bg-muted text-muted-foreground"
                      }`}>
                        {post.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 type-metadata">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingPost(post)}>
                          <EditLine className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <DeleteLine className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Post</AlertDialogTitle>
                              <AlertDialogDescription>Are you sure you want to delete "{post.title}"?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePost(post.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function WaitlistScreen() {
  const [list, setList] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailToContact, setEmailToContact] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchAdmin("waitlist")
      .then((d) => setList(d.waitlist))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    await fetchAdmin("delete-waitlist", { id });
    load();
    toast.success("Entry removed");
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h2 className="type-h1 mb-6">Waitlist</h2>
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-ink text-white">
                <th className="text-left px-4 py-3 type-section-label !text-white">Email</th>
                <th className="text-left px-4 py-3 type-section-label !text-white">Joined At</th>
                <th className="text-right px-4 py-3 type-section-label !text-white pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((entry, i) => (
                <tr key={entry.id} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-card' : 'bg-background'}`}>
                  <td className="px-4 py-4 type-body font-medium">{entry.email}</td>
                  <td className="px-4 py-4 type-metadata">
                    {new Date(entry.created_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td className="px-4 py-4 pr-6">
                    <div className="flex items-center justify-end gap-2">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary hover:bg-naira-pale"
                        onClick={() => setEmailToContact(entry.email)}
                      >
                        <SendPlaneLine className="h-4 w-4 mr-1.5" /> Email
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <DeleteLine className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="type-h2">Remove Entry</AlertDialogTitle>
                            <AlertDialogDescription className="type-body">
                              Remove <strong>{entry.email}</strong> from the waitlist?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(entry.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center type-body-small text-muted-foreground">
                    Waitlist is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmailModal 
        email={emailToContact} 
        onClose={() => setEmailToContact(null)} 
      />
    </div>
  );
}

function EmailModal({ email, onClose }: { email: string | null; onClose: () => void }) {
  const [subject, setSubject] = useState("Welcome to SettleUp");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (email) {
      setBody(`Hi,\n\nThanks for joining the SettleUp waitlist! We're excited to have you.\n\n[Your message here]\n\nBest,\nThe SettleUp Team`);
    }
  }, [email]);

  const handleSend = async () => {
    if (!subject || !body) {
      toast.error("Subject and message are required");
      return;
    }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-send-email`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ to: email, subject, body })
      });

      if (!res.ok) throw new Error("Failed to send email");
      
      toast.success("Email sent successfully!");
      onClose();
    } catch (err) {
      toast.error("Failed to send email. Check console for details.");
    } finally {
      setSending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="type-h3">Contact User</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><CloseLine /></Button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="type-metadata">Recipient</Label>
            <Input value={email} disabled className="bg-muted text-muted-foreground cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <Label className="type-metadata">Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject..." />
          </div>
          <div className="space-y-1.5">
            <Label className="type-metadata">Message</Label>
            <Textarea 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              placeholder="Type your message..." 
              rows={8}
              className="resize-none"
            />
          </div>
        </div>
        <div className="p-6 bg-muted/50 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Sending..." : (
              <>
                <SendPlaneLine className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
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