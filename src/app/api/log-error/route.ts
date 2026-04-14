import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 30 per hour per IP to prevent log flooding
  const ip = getClientIp(request);
  const limited = checkRateLimit(`${ip}:log-error`, 30, 60 * 60 * 1000);
  if (limited) return limited;

  // AUTH: require authenticated user — use their real user_id, not body param
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

  try {
    const body = await request.json();

    const VALID_SEVERITIES = ["low", "medium", "high", "critical"];
    const severity = VALID_SEVERITIES.includes(body.severity) ? body.severity : "medium";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from("error_logs").insert({
      error_type: String(body.error_type || "unknown").slice(0, 100),
      message: String(body.message || "").slice(0, 1000),
      stack_trace: body.stack_trace ? String(body.stack_trace).slice(0, 5000) : null,
      user_id: user.id,
      user_role: body.user_role || null,
      url: body.url ? String(body.url).slice(0, 500) : null,
      severity,
      metadata: body.metadata || {},
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
