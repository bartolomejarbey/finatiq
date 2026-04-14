import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // AUTH: verify the requester is the advisor
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

  const { data: advisorAuth } = await authSupabase
    .from("advisors")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!advisorAuth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use authenticated advisor's ID, ignore any advisor_id from body
  const advisor_id = advisorAuth.id;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  // Find matching seasonal reminders for this advisor
  const { data: seasonalReminders } = await supabaseAdmin
    .from("seasonal_reminders")
    .select("*")
    .eq("advisor_id", advisor_id)
    .eq("month", currentMonth)
    .eq("is_active", true);

  if (!seasonalReminders || seasonalReminders.length === 0) {
    return NextResponse.json({ created: 0 });
  }

  let totalCreated = 0;

  for (const reminder of seasonalReminders) {
    let clientIds: string[] = [];

    switch (reminder.target) {
      case "all_clients": {
        const { data: clients } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("advisor_id", advisor_id);
        clientIds = (clients || []).map((c) => c.id);
        break;
      }
      case "osvc": {
        const { data: clients } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("advisor_id", advisor_id)
          .eq("is_osvc", true);
        clientIds = (clients || []).map((c) => c.id);
        break;
      }
      case "has_car_insurance": {
        const { data: contracts } = await supabaseAdmin
          .from("contracts")
          .select("client_id")
          .ilike("type", "%pojisteni%");
        const contractClientIds = new Set(
          (contracts || []).map((c) => c.client_id)
        );
        // Filter to only this advisor's clients
        const { data: clients } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("advisor_id", advisor_id);
        clientIds = (clients || [])
          .filter((c) => contractClientIds.has(c.id))
          .map((c) => c.id);
        break;
      }
      case "has_property": {
        const { data: contracts } = await supabaseAdmin
          .from("contracts")
          .select("client_id")
          .ilike("type", "%nemovitost%");
        const contractClientIds = new Set(
          (contracts || []).map((c) => c.client_id)
        );
        const { data: clients } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("advisor_id", advisor_id);
        clientIds = (clients || [])
          .filter((c) => contractClientIds.has(c.id))
          .map((c) => c.id);
        break;
      }
    }

    if (clientIds.length === 0) continue;

    // Check which reminders were already created this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { data: existingReminders } = await supabaseAdmin
      .from("reminders")
      .select("client_id")
      .eq("advisor_id", advisor_id)
      .eq("title", reminder.title)
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd);

    const existingClientIds = new Set(
      (existingReminders || []).map((r) => r.client_id)
    );

    const newReminders = clientIds
      .filter((cid) => !existingClientIds.has(cid))
      .map((cid) => ({
        advisor_id,
        client_id: cid,
        title: reminder.title,
        description: reminder.description || null,
        type: "seasonal",
        due_date: new Date(
          now.getFullYear(),
          reminder.month - 1,
          reminder.day
        ).toISOString(),
        is_completed: false,
      }));

    if (newReminders.length > 0) {
      await supabaseAdmin.from("reminders").insert(newReminders);
      totalCreated += newReminders.length;
    }
  }

  return NextResponse.json({ created: totalCreated });
}
