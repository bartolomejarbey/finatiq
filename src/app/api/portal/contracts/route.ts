import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get client record
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, advisor_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ contracts: [] });
  }

  const { data: contracts, error } = await supabaseAdmin
    .from("contracts")
    .select("id, title, status, type, provider, interest_rate, remaining_balance, monthly_payment, valid_from, valid_to, insurance_type, value, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Chyba při načítání smluv: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    contracts: contracts || [],
    client_id: client.id,
    advisor_id: client.advisor_id,
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, advisor_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
  }

  const body = await request.json();

  const payload = {
    ...body,
    client_id: client.id,
    advisor_id: client.advisor_id,
    client_uploaded: true,
    processing_status: "new",
  };

  const { data: newContract, error: insertError } = await supabaseAdmin
    .from("contracts")
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Chyba při ukládání smlouvy: " + insertError.message },
      { status: 500 }
    );
  }

  // Create alerts for the advisor
  if (client.advisor_id) {
    const { data: advisor, error: advisorError } = await supabaseAdmin
      .from("advisors")
      .select("interest_rate_threshold")
      .eq("id", client.advisor_id)
      .single();

    if (advisorError) {
      console.error("Failed to fetch advisor for alerts:", advisorError.message);
    }

    const threshold = advisor?.interest_rate_threshold ?? 5.0;
    const providerInfo = body.provider ? ` u ${body.provider}` : "";
    const amountInfo = body.value ? ` (${new Intl.NumberFormat("cs-CZ").format(body.value)} Kč)` : "";
    const typeLabel = body.type === "uver" ? "úvěr" : "pojištění";

    // High interest rate alert
    if (body.type === "uver" && body.interest_rate && Number(body.interest_rate) > threshold) {
      const { error: alertError } = await supabaseAdmin.from("upsell_alerts").insert({
        advisor_id: client.advisor_id,
        client_id: client.id,
        title: `⚠️ Vysoký úrok ${body.interest_rate}%${providerInfo}`,
        description: `Klient nahrál ${typeLabel}${providerInfo}${amountInfo} s úrokem ${body.interest_rate}%, což překračuje váš práh ${threshold}%. Doporučujeme kontaktovat klienta ohledně možnosti refinancování.`,
        category: "loans",
        priority: Number(body.interest_rate) > threshold * 1.5 ? "critical" : "high",
        status: "new",
      });
      if (alertError) console.error("Failed to create high-rate alert:", alertError.message);
    }

    // New contract notification — always notify advisor about client-uploaded contracts
    const missingParts: string[] = [];
    if (body.type === "uver") {
      if (!body.interest_rate) missingParts.push("úroková sazba");
      if (!body.monthly_payment) missingParts.push("měsíční splátka");
      if (!body.valid_to) missingParts.push("datum splatnosti");
    }

    const missingInfo = missingParts.length > 0 ? ` Chybí: ${missingParts.join(", ")}.` : "";
    const { error: notifError } = await supabaseAdmin.from("upsell_alerts").insert({
      advisor_id: client.advisor_id,
      client_id: client.id,
      title: missingParts.length > 0
        ? `📋 Nová smlouva — chybí údaje`
        : `📋 Nová smlouva${providerInfo}`,
      description: `Klient nahrál ${typeLabel}${providerInfo}${amountInfo}.${missingInfo} Zkontrolujte smlouvu a doplňte údaje.`,
      category: "contracts",
      priority: missingParts.length > 0 ? "medium" : "low",
      status: "new",
    });
    if (notifError) console.error("Failed to create contract notification:", notifError.message);
  }

  return NextResponse.json({ contract: newContract });
}
