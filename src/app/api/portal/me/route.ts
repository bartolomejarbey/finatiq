import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/portal/me
 * Returns the current user's client record, auto-creating one if needed.
 * Uses service role key to bypass RLS.
 */
export async function GET() {
  // 1. Get authenticated user from session
  const userClient = await createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Use service role to query/create client record (bypasses RLS)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 3. Look up existing client record
  const { data: existing } = await admin
    .from("clients")
    .select("id, advisor_id, is_osvc, first_name, last_name, onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ client: existing });
  }

  // 4. Auto-create minimal client record
  const { data: created, error: insertError } = await admin
    .from("clients")
    .insert({
      user_id: user.id,
      email: user.email || null,
      first_name: user.user_metadata?.first_name || null,
      last_name: user.user_metadata?.last_name || null,
    })
    .select("id, advisor_id, is_osvc, first_name, last_name, onboarding_completed")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit klientský profil: " + insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ client: created });
}
