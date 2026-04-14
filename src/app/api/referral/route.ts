import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Chybi kod" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Code is first 6 chars of client UUID (no dashes, uppercase)
  // We need to find a client whose id starts with these chars (case-insensitive)
  const codeLower = code.toLowerCase();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, advisor_id")
    .limit(100);

  const client = (clients || []).find((c) =>
    c.id.replace(/-/g, "").substring(0, 6).toLowerCase() === codeLower
  );

  if (!client) {
    return NextResponse.json({ error: "Neplatny kod" }, { status: 404 });
  }

  // Fetch advisor info
  const { data: advisor } = await supabase
    .from("advisors")
    .select("id, company_name, brand_primary_color, brand_secondary_color")
    .eq("id", client.advisor_id)
    .single();

  return NextResponse.json({
    advisor: advisor
      ? {
          company_name: advisor.company_name,
          brand_primary_color: advisor.brand_primary_color,
          brand_secondary_color: advisor.brand_secondary_color,
        }
      : null,
    referring_client_first_name: client.first_name,
    advisor_id: advisor?.id || null,
    referring_client_id: client.id,
  });
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 referrals per hour per IP
  const ip = getClientIp(req);
  const limited = checkRateLimit(`${ip}:referral`, 10, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { code, name, email, phone, message } = body;

    if (!code || !name || !email) {
      return NextResponse.json(
        { error: "Vyplnte jmeno a email" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Find referring client by code
    const codeLower = code.toLowerCase();
    const { data: clients } = await supabase
      .from("clients")
      .select("id, advisor_id")
      .limit(100);

    const client = (clients || []).find(
      (c) =>
        c.id.replace(/-/g, "").substring(0, 6).toLowerCase() === codeLower
    );

    if (!client) {
      return NextResponse.json({ error: "Neplatny kod" }, { status: 404 });
    }

    // Create referral record
    const { error: refError } = await supabase.from("referrals").insert({
      referring_client_id: client.id,
      advisor_id: client.advisor_id,
      referral_code: code.toUpperCase(),
      referred_name: name,
      referred_email: email,
      referred_phone: phone || null,
      message: message || null,
      status: "pending",
    });

    if (refError) {
      console.error("Referral insert error:", refError);
      return NextResponse.json({ error: "Nepodařilo se uložit doporučení." }, { status: 500 });
    }

    // Create deal in CRM
    // Find the first pipeline stage for this advisor
    const { data: stages } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("advisor_id", client.advisor_id)
      .order("position", { ascending: true })
      .limit(1);

    const stageId = stages?.[0]?.id;

    if (stageId) {
      const { error: dealError } = await supabase.from("deals").insert({
        advisor_id: client.advisor_id,
        stage_id: stageId,
        title: `Doporuceni: ${name}`,
        contact_name: name,
        contact_email: email,
        contact_phone: phone || null,
        source: "referral",
        notes: message ? `Zprava: ${message}` : null,
      });
      if (dealError) {
        console.error("Referral deal insert error:", dealError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Referral POST error:", err);
    return NextResponse.json(
      { error: "Chyba serveru" },
      { status: 500 }
    );
  }
}
