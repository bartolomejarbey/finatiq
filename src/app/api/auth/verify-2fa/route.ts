import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { user_id, code } = await request.json();

  if (!user_id || !code) {
    return NextResponse.json({ error: "Chybí údaje" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check verification code
  const { data: vc } = await supabase
    .from("verification_codes")
    .select("*")
    .eq("user_id", user_id)
    .eq("code", code)
    .eq("type", "2fa")
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!vc) {
    return NextResponse.json(
      { error: "Neplatný nebo expirovaný kód" },
      { status: 400 }
    );
  }

  // Mark code as used
  await supabase
    .from("verification_codes")
    .update({ used: true })
    .eq("id", vc.id);

  return NextResponse.json({ success: true });
}
