import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function getAuthenticatedClient() {
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
  if (!user) return null;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, advisor_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return client ? { user, client, supabaseAdmin } : null;
}

export async function GET() {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { client, supabaseAdmin } = auth;

  // Get payments
  const { data: payments, error: paymentsError } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("client_id", client.id)
    .order("due_date", { ascending: true });

  if (paymentsError) {
    // Table might not exist yet
    if (paymentsError.code === "42P01") {
      return NextResponse.json({ payments: [], contracts: [] });
    }
    return NextResponse.json(
      { error: "Chyba při načítání plateb: " + paymentsError.message },
      { status: 500 }
    );
  }

  // Get contracts for linking
  const { data: contracts } = await supabaseAdmin
    .from("contracts")
    .select("id, title, type, monthly_payment")
    .eq("client_id", client.id)
    .eq("status", "active");

  return NextResponse.json({
    payments: payments || [],
    contracts: contracts || [],
    client_id: client.id,
  });
}

export async function POST(request: Request) {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { client, supabaseAdmin } = auth;
  const body = await request.json();

  const payload = {
    client_id: client.id,
    advisor_id: client.advisor_id,
    title: body.title,
    amount: body.amount,
    currency: body.currency || "CZK",
    status: "pending",
    due_date: body.due_date || null,
    contract_id: body.contract_id || null,
    is_recurring: body.is_recurring || false,
    recurrence_interval: body.recurrence_interval || null,
    recurrence_day: body.recurrence_day || null,
    next_due_date: body.due_date || null,
    note: body.note || null,
    created_by: "client",
  };

  const { data: payment, error: insertError } = await supabaseAdmin
    .from("payments")
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Chyba při ukládání platby: " + insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ payment });
}

export async function PATCH(request: Request) {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { client, supabaseAdmin } = auth;
  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: "Chybí ID platby" }, { status: 400 });
  }

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id, client_id, is_recurring, recurrence_interval, amount, title, contract_id, recurrence_day")
    .eq("id", body.id)
    .single();

  if (!existing || existing.client_id !== client.id) {
    return NextResponse.json({ error: "Platba nenalezena" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.status === "paid") {
    updates.status = "paid";
    updates.paid_date = new Date().toISOString().split("T")[0];

    // If recurring, create next payment
    if (existing.is_recurring && existing.recurrence_interval) {
      const currentDue = existing.recurrence_day
        ? new Date()
        : body.due_date ? new Date(body.due_date) : new Date();

      let nextDate: Date;
      if (existing.recurrence_interval === "monthly") {
        nextDate = new Date(currentDue);
        nextDate.setMonth(nextDate.getMonth() + 1);
        if (existing.recurrence_day) nextDate.setDate(existing.recurrence_day);
      } else if (existing.recurrence_interval === "quarterly") {
        nextDate = new Date(currentDue);
        nextDate.setMonth(nextDate.getMonth() + 3);
        if (existing.recurrence_day) nextDate.setDate(existing.recurrence_day);
      } else {
        nextDate = new Date(currentDue);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        if (existing.recurrence_day) nextDate.setDate(existing.recurrence_day);
      }

      await supabaseAdmin.from("payments").insert({
        client_id: client.id,
        advisor_id: client.advisor_id,
        title: existing.title,
        amount: existing.amount,
        contract_id: existing.contract_id,
        status: "pending",
        due_date: nextDate.toISOString().split("T")[0],
        is_recurring: true,
        recurrence_interval: existing.recurrence_interval,
        recurrence_day: existing.recurrence_day,
        created_by: "system",
      });
    }
  } else if (body.status) {
    updates.status = body.status;
  }

  if (body.title) updates.title = body.title;
  if (body.amount) updates.amount = body.amount;
  if (body.due_date) updates.due_date = body.due_date;
  if (body.note !== undefined) updates.note = body.note;

  const { error: updateError } = await supabaseAdmin
    .from("payments")
    .update(updates)
    .eq("id", body.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Chyba při aktualizaci: " + updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
