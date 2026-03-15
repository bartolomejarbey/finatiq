import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import * as templates from "@/lib/email/templates";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results: Record<string, unknown> = {};
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.finatiq.cz";

  // 1. Trial expiration check
  try {
    const now = new Date().toISOString();

    // Find trials expiring in 3 days
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expiringSoon } = await supabase
      .from("advisors")
      .select("id, company_name, user_id, trial_ends_at")
      .eq("subscription_status", "trial")
      .gte("trial_ends_at", now)
      .lte("trial_ends_at", threeDaysFromNow);

    for (const adv of expiringSoon || []) {
      const daysLeft = Math.ceil(
        (new Date(adv.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const { data: userData } = await supabase.auth.admin.getUserById(adv.user_id);
      if (userData?.user?.email) {
        const tmpl = templates.trialExpiring(adv.company_name, daysLeft, `${baseUrl}/advisor/predplatne`);
        await sendEmail({ to: userData.user.email, ...tmpl });
      }
    }

    // Find expired trials
    const { data: expired } = await supabase
      .from("advisors")
      .select("id, company_name, user_id, trial_ends_at")
      .eq("subscription_status", "trial")
      .lt("trial_ends_at", now);

    for (const adv of expired || []) {
      await supabase
        .from("advisors")
        .update({ subscription_status: "expired" })
        .eq("id", adv.id);

      const { data: userData } = await supabase.auth.admin.getUserById(adv.user_id);
      if (userData?.user?.email) {
        const tmpl = templates.trialExpired(adv.company_name, `${baseUrl}/advisor/predplatne`);
        await sendEmail({ to: userData.user.email, ...tmpl });
      }
    }

    results.trials = {
      expiring_soon: expiringSoon?.length || 0,
      expired: expired?.length || 0,
    };
  } catch (e) {
    console.error("[CRON] Trial check error:", e);
    results.trials = { error: String(e) };
  }

  // 2. Payment reminders (due in 3 days)
  try {
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const { data: pendingPayments } = await supabase
      .from("payments")
      .select("id, client_id, amount, due_date")
      .eq("status", "pending")
      .gte("due_date", today)
      .lte("due_date", threeDaysFromNow);

    let sentCount = 0;
    for (const payment of pendingPayments || []) {
      const { data: client } = await supabase
        .from("clients")
        .select("first_name, last_name, email, advisor_id")
        .eq("id", payment.client_id)
        .single();

      if (client?.email) {
        const tmpl = templates.paymentReminder(
          `${client.first_name} ${client.last_name}`,
          payment.amount,
          new Date(payment.due_date).toLocaleDateString("cs-CZ")
        );
        await sendEmail({ to: client.email, ...tmpl });
        sentCount++;
      }
    }

    results.payment_reminders = { pending: pendingPayments?.length || 0, sent: sentCount };
  } catch (e) {
    console.error("[CRON] Payment reminder error:", e);
    results.payment_reminders = { error: String(e) };
  }

  // 3. Overdue invoice check
  try {
    const today = new Date().toISOString().split("T")[0];
    const { data: overdueInvoices, count } = await supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .neq("status", "paid")
      .lt("due_date", today);

    if (count && count > 0) {
      await supabase
        .from("invoices")
        .update({ status: "overdue" })
        .neq("status", "paid")
        .lt("due_date", today);
    }

    results.overdue_invoices = count || 0;
  } catch (e) {
    console.error("[CRON] Invoice check error:", e);
    results.overdue_invoices = { error: String(e) };
  }

  // --- Invoice email reminders ---
  try {
    const today = new Date();

    // 3 days before due: send reminder
    const threeDaysFuture = new Date(today);
    threeDaysFuture.setDate(today.getDate() + 3);
    const futureDateStr = threeDaysFuture.toISOString().split("T")[0];

    const { data: dueSoon } = await supabase
      .from("invoices")
      .select("id, advisor_id, amount, total_with_vat, due_date, reminder_sent_at, advisors(company_name, email)")
      .eq("status", "issued")
      .eq("due_date", futureDateStr)
      .is("reminder_sent_at", null);

    for (const inv of dueSoon || []) {
      const adv = (inv as any).advisors;
      if (adv?.email) {
        const tpl = templates.invoiceDueSoon(adv.company_name || "Poradce", inv.total_with_vat || inv.amount, new Date(inv.due_date).toLocaleDateString("cs-CZ"));
        await sendEmail({ to: adv.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
        await supabase.from("invoices").update({ reminder_sent_at: new Date().toISOString() }).eq("id", inv.id);
      }
    }

    // 1 day after due: first overdue email
    const oneDayAgo = new Date(today);
    oneDayAgo.setDate(today.getDate() - 1);
    const oneDayAgoStr = oneDayAgo.toISOString().split("T")[0];

    const { data: justOverdue } = await supabase
      .from("invoices")
      .select("id, advisor_id, amount, total_with_vat, due_date, advisors(company_name, email)")
      .in("status", ["issued", "overdue"])
      .eq("due_date", oneDayAgoStr);

    for (const inv of justOverdue || []) {
      const adv = (inv as any).advisors;
      if (adv?.email) {
        const tpl = templates.invoiceOverdue(adv.company_name || "Poradce", inv.total_with_vat || inv.amount, new Date(inv.due_date).toLocaleDateString("cs-CZ"));
        await sendEmail({ to: adv.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
      }
      await supabase.from("invoices").update({ status: "overdue" }).eq("id", inv.id);
    }

    // 7 days after due: second reminder
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const { data: secondReminders } = await supabase
      .from("invoices")
      .select("id, advisor_id, amount, total_with_vat, second_reminder_sent_at, advisors(company_name, email)")
      .eq("status", "overdue")
      .eq("due_date", sevenDaysAgoStr)
      .is("second_reminder_sent_at", null);

    for (const inv of secondReminders || []) {
      const adv = (inv as any).advisors;
      if (adv?.email) {
        const tpl = templates.invoiceSecondReminder(adv.company_name || "Poradce", inv.total_with_vat || inv.amount);
        await sendEmail({ to: adv.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
        await supabase.from("invoices").update({ second_reminder_sent_at: new Date().toISOString() }).eq("id", inv.id);
      }
    }

    // 14 days after due: suspend subscription
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);
    const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().split("T")[0];

    const { data: toSuspend } = await supabase
      .from("invoices")
      .select("advisor_id, advisors(company_name, email)")
      .eq("status", "overdue")
      .lte("due_date", fourteenDaysAgoStr);

    for (const inv of toSuspend || []) {
      const adv = (inv as any).advisors;
      await supabase.from("advisors").update({ subscription_status: "pending_payment" }).eq("id", inv.advisor_id);
      if (adv?.email) {
        const tpl = templates.subscriptionSuspended(adv.company_name || "Poradce");
        await sendEmail({ to: adv.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
      }
    }

    results.invoice_reminders = {
      due_soon: dueSoon?.length || 0,
      just_overdue: justOverdue?.length || 0,
      second_reminders: secondReminders?.length || 0,
      suspended: toSuspend?.length || 0,
    };
  } catch (e) {
    console.error("[CRON] Invoice reminders error:", e);
    results.invoice_reminders = { error: String(e) };
  }

  // --- Feature trial checks ---
  try {
    const today = new Date();

    const FEATURE_NAMES: Record<string, string> = {
      crm: "CRM & Pipeline", portal: "Klientský portál", templates: "Šablony smluv",
      scoring: "Lead scoring", automations: "Automatizace", meta_ads: "Meta Ads",
      ocr: "OCR dokumentů", ai_assistant: "AI asistent", osvc: "OSVČ modul", calendar: "Kalendář",
    };

    const { data: advisorsWithTrials } = await supabase
      .from("advisors")
      .select("id, company_name, email, feature_trials")
      .not("feature_trials", "eq", "{}");

    for (const adv of advisorsWithTrials || []) {
      const trials = (adv.feature_trials || {}) as Record<string, string>;
      for (const [feature, expiryStr] of Object.entries(trials)) {
        const expiry = new Date(expiryStr);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 2 && adv.email) {
          const tpl = templates.featureTrialExpiring(adv.company_name || "Poradce", FEATURE_NAMES[feature] || feature, 2);
          await sendEmail({ to: adv.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
        }
        if (diffDays <= 0 && adv.email) {
          const tpl = templates.featureTrialExpired(adv.company_name || "Poradce", FEATURE_NAMES[feature] || feature);
          await sendEmail({ to: adv.email, subject: tpl.subject, html: tpl.html }).catch(() => {});
        }
      }
    }

    results.feature_trials = { checked: advisorsWithTrials?.length || 0 };
  } catch (e) {
    console.error("[CRON] Feature trial check error:", e);
    results.feature_trials = { error: String(e) };
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
