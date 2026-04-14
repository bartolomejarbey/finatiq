import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  // AUTH: require authenticated admin user
  const cookieStore = await cookies();
  const authSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is an advisor (admin access)
  const { data: advisor } = await authSupabase
    .from("advisors")
    .select("id, role")
    .eq("user_id", user.id)
    .single();
  if (!advisor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const tables = ["advisors", "clients", "deals", "contracts", "documents", "error_logs", "audit_logs", "tickets"];
  const counts: Record<string, number> = {};

  for (const table of tables) {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    counts[table] = count || 0;
  }

  // Active users (last 24h, 7d, 30d)
  const now = new Date();
  const day = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [d1, d7, d30] = await Promise.all([
    supabase.from("audit_logs").select("user_id", { count: "exact", head: true }).eq("action", "login").gte("created_at", day),
    supabase.from("audit_logs").select("user_id", { count: "exact", head: true }).eq("action", "login").gte("created_at", week),
    supabase.from("audit_logs").select("user_id", { count: "exact", head: true }).eq("action", "login").gte("created_at", month),
  ]);

  // Recent errors
  const { count: criticalErrors } = await supabase
    .from("error_logs")
    .select("*", { count: "exact", head: true })
    .eq("severity", "critical")
    .gte("created_at", day);

  return NextResponse.json({
    status: "healthy",
    timestamp: now.toISOString(),
    counts,
    activeUsers: { day: d1.count || 0, week: d7.count || 0, month: d30.count || 0 },
    criticalErrors24h: criticalErrors || 0,
  });
}
