import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore in Server Components
          }
        },
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: advisor, error } = await supabaseAdmin
    .from("advisors")
    .select("subscription_status, trial_ends_at, selected_plan_id")
    .eq("user_id", user.id)
    .single();

  if (error || !advisor) {
    return NextResponse.json({ error: "Poradce nenalezen" }, { status: 404 });
  }

  let daysRemaining: number | null = null;
  if (advisor.trial_ends_at) {
    const diff = new Date(advisor.trial_ends_at).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  let selectedPlan = null;
  if (advisor.selected_plan_id) {
    const { data: plan } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, name, price_monthly")
      .eq("id", advisor.selected_plan_id)
      .single();
    selectedPlan = plan;
  }

  return NextResponse.json({
    status: advisor.subscription_status || "trial",
    trial_ends_at: advisor.trial_ends_at,
    days_remaining: daysRemaining,
    selected_plan: selectedPlan,
  });
}
