import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireClientAccess } from "@/lib/api/portal-auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }

  const auth = await requireClientAccess(clientId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Fetch client info
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, created_at, advisor_id")
    .eq("id", clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Fetch existing milestones
  const { data: existingMilestones } = await supabaseAdmin
    .from("milestones")
    .select("*")
    .eq("client_id", clientId);

  const existing = existingMilestones || [];
  const existingTypes = new Set(existing.map((m) => m.type));

  // Fetch counts for milestone checks
  const [contractsRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from("contracts")
      .select("id", { count: "exact" })
      .eq("client_id", clientId),
    supabaseAdmin.from("payments").select("id, status").eq("client_id", clientId),
  ]);

  const contractsCount = contractsRes.count || 0;
  const payments = paymentsRes.data || [];

  const newMilestones: Array<{
    client_id: string;
    type: string;
    title: string;
    description: string;
    achieved_at: string;
  }> = [];

  const now = new Date();
  const createdAt = new Date(client.created_at);
  const monthsDiff =
    (now.getFullYear() - createdAt.getFullYear()) * 12 +
    (now.getMonth() - createdAt.getMonth());

  // First contract
  if (contractsCount >= 1 && !existingTypes.has("first_contract")) {
    newMilestones.push({
      client_id: clientId,
      type: "first_contract",
      title: "První smlouva přidána",
      description: "Gratulujeme k první smlouvě ve vašem portfoliu!",
      achieved_at: now.toISOString(),
    });
  }

  // Time-based milestones
  if (monthsDiff >= 6 && !existingTypes.has("months_6")) {
    newMilestones.push({
      client_id: clientId,
      type: "months_6",
      title: "6 měsíců u poradce",
      description: "Už je to půl roku, co spolupracujeme!",
      achieved_at: now.toISOString(),
    });
  }

  if (monthsDiff >= 12 && !existingTypes.has("year_1")) {
    newMilestones.push({
      client_id: clientId,
      type: "year_1",
      title: "1 rok u poradce",
      description: "Rok spolupráce za námi. Děkujeme za důvěru!",
      achieved_at: now.toISOString(),
    });
  }

  if (monthsDiff >= 24 && !existingTypes.has("years_2")) {
    newMilestones.push({
      client_id: clientId,
      type: "years_2",
      title: "2 roky u poradce",
      description: "Dva roky společné cesty. To je skvělé!",
      achieved_at: now.toISOString(),
    });
  }

  if (monthsDiff >= 60 && !existingTypes.has("years_5")) {
    newMilestones.push({
      client_id: clientId,
      type: "years_5",
      title: "5 let u poradce",
      description: "Pět let spolupráce! Jste věrný klient.",
      achieved_at: now.toISOString(),
    });
  }

  // All payments on time
  if (
    payments.length > 0 &&
    !payments.some((p) => p.status === "overdue") &&
    !existingTypes.has("all_payments_on_time")
  ) {
    newMilestones.push({
      client_id: clientId,
      type: "all_payments_on_time",
      title: "Všechny platby včas",
      description: "Všechny vaše platby jsou uhrazeny včas. Výborně!",
      achieved_at: now.toISOString(),
    });
  }

  // Insert new milestones
  if (newMilestones.length > 0) {
    await supabaseAdmin.from("milestones").insert(newMilestones);
  }

  // Return all milestones
  const { data: allMilestones } = await supabaseAdmin
    .from("milestones")
    .select("*")
    .eq("client_id", clientId)
    .order("achieved_at", { ascending: false });

  return NextResponse.json({ milestones: allMilestones || [] });
}
