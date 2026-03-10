import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin via their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userMetadata = claimsData.claims.user_metadata as Record<string, unknown> | undefined;

    const isAdmin = userMetadata?.is_admin === true;
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to bypass RLS
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (type === "users") {
      // Get all users from auth.admin
      const { data: usersData, error: usersError } =
        await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (usersError) throw usersError;

      // Get invoice counts per user
      const { data: invoices } = await adminClient
        .from("invoices")
        .select("user_id, invoice_amount");

      const userInvoiceMap: Record<
        string,
        { count: number; totalValue: number }
      > = {};
      for (const inv of invoices || []) {
        if (!userInvoiceMap[inv.user_id]) {
          userInvoiceMap[inv.user_id] = { count: 0, totalValue: 0 };
        }
        userInvoiceMap[inv.user_id].count++;
        userInvoiceMap[inv.user_id].totalValue += inv.invoice_amount || 0;
      }

      const users = (usersData?.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        invoice_count: userInvoiceMap[u.id]?.count || 0,
        total_invoice_value: userInvoiceMap[u.id]?.totalValue || 0,
      }));

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "invoices") {
      const { data: invoices } = await adminClient
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      // Get user emails
      const { data: usersData } =
        await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      for (const u of usersData?.users || []) {
        emailMap[u.id] = u.email || "";
      }

      const enriched = (invoices || []).map((inv) => ({
        ...inv,
        user_email: emailMap[inv.user_id] || "Unknown",
      }));

      return new Response(JSON.stringify({ invoices: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "stats") {
      const { data: invoices } = await adminClient
        .from("invoices")
        .select("created_at, reminder_count, status");

      const { data: usersData } =
        await adminClient.auth.admin.listUsers({ perPage: 1000 });

      const totalUsers = usersData?.users?.length || 0;
      const totalInvoices = invoices?.length || 0;
      const totalEmailsSent = (invoices || []).reduce(
        (s, i) => s + (i.reminder_count || 0),
        0
      );
      const activeInvoices = (invoices || []).filter(
        (i) => i.status === "unpaid" || i.status === "overdue"
      ).length;

      // Last 30 days chart data
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyInvoices: Record<string, number> = {};
      const dailyEmails: Record<string, number> = {};

      for (let d = new Date(thirtyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        dailyInvoices[key] = 0;
        dailyEmails[key] = 0;
      }

      for (const inv of invoices || []) {
        const day = inv.created_at?.slice(0, 10);
        if (day && dailyInvoices[day] !== undefined) {
          dailyInvoices[day]++;
          dailyEmails[day] += inv.reminder_count || 0;
        }
      }

      const chartData = Object.keys(dailyInvoices)
        .sort()
        .map((date) => ({
          date,
          invoices: dailyInvoices[date],
          emails: dailyEmails[date],
        }));

      return new Response(
        JSON.stringify({
          totalUsers,
          totalInvoices,
          totalEmailsSent,
          activeInvoices,
          chartData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (type === "delete-user") {
      const body = await req.json();
      const userId = body.userId;
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
