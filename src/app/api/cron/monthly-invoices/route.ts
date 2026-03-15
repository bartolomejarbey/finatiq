import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { invoiceReady } from "@/lib/email/templates";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 14);

  // Get active advisors with their plans
  const { data: advisors } = await supabase
    .from("advisors")
    .select("id, user_id, company_name, email, billing_dic, selected_plan_id, subscription_status")
    .eq("subscription_status", "active");

  if (!advisors || advisors.length === 0) {
    return NextResponse.json({ generated: 0, period });
  }

  // Get existing invoices for this period
  const { data: existing } = await supabase
    .from("invoices")
    .select("advisor_id")
    .eq("period", period);
  const existingSet = new Set((existing || []).map((i) => i.advisor_id));

  // Get plan prices
  const planIds = [...new Set(advisors.map((a) => a.selected_plan_id).filter(Boolean))];
  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("id, name, price_monthly")
    .in("id", planIds.length > 0 ? planIds : ["_none_"]);
  const planMap = Object.fromEntries((plans || []).map((p) => [p.id, p]));

  // Count existing invoices this period for numbering
  const periodPrefix = period.replace("-", "");
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .like("invoice_number", `${periodPrefix}-%`);
  let seq = (count || 0) + 1;

  let generated = 0;

  for (const advisor of advisors) {
    if (existingSet.has(advisor.id)) continue;
    const plan = planMap[advisor.selected_plan_id];
    if (!plan || plan.price_monthly <= 0) continue;

    const vatApplied = !!advisor.billing_dic;
    const amount = plan.price_monthly;
    const vatAmount = vatApplied ? Math.round(amount * 0.21 * 100) / 100 : 0;
    const totalWithVat = amount + vatAmount;
    const invoiceNumber = `${periodPrefix}-${String(seq).padStart(3, "0")}`;

    const { error } = await supabase.from("invoices").insert({
      advisor_id: advisor.id,
      period,
      amount,
      vat_amount: vatAmount,
      total_with_vat: totalWithVat,
      vat_applied: vatApplied,
      invoice_number: invoiceNumber,
      status: "issued",
      due_date: dueDate.toISOString().split("T")[0],
    });

    if (!error) {
      seq++;
      generated++;
      if (advisor.email) {
        const tpl = invoiceReady(
          advisor.company_name || "Poradce",
          totalWithVat,
          period,
          dueDate.toLocaleDateString("cs-CZ")
        );
        await sendEmail(advisor.email, tpl.subject, tpl.html).catch(() => {});
      }
    }
  }

  return NextResponse.json({ generated, period });
}
