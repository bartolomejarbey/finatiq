import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // Verify cron secret (optional — for security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Neoprávněný přístup" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find advisors where trial has expired but status is still 'trial'
  const { data: expiredAdvisors, error } = await supabase
    .from("advisors")
    .select("id, email, company_name, trial_ends_at")
    .eq("subscription_status", "trial")
    .lt("trial_ends_at", new Date().toISOString());

  if (error) {
    console.error("[trial-check] Chyba při načítání:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expiredAdvisors || expiredAdvisors.length === 0) {
    return NextResponse.json({ message: "Žádné expirované trialy", updated: 0 });
  }

  // Update status to 'expired'
  const ids = expiredAdvisors.map((a) => a.id);
  const { error: updateError } = await supabase
    .from("advisors")
    .update({ subscription_status: "expired" })
    .in("id", ids);

  if (updateError) {
    console.error("[trial-check] Chyba při aktualizaci:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log expired advisors (ready for Resend email integration)
  for (const advisor of expiredAdvisors) {
    console.log(
      `[trial-check] Trial expirován: ${advisor.company_name} (${advisor.email}), ID: ${advisor.id}`
    );
    // TODO: Send email via Resend
    // await resend.emails.send({
    //   from: 'Finatiq <noreply@finatiq.cz>',
    //   to: advisor.email,
    //   subject: 'Vaše zkušební období skončilo',
    //   ...
    // });
  }

  return NextResponse.json({
    message: `Aktualizováno ${expiredAdvisors.length} poradců na 'expired'`,
    updated: expiredAdvisors.length,
    advisors: expiredAdvisors.map((a) => ({ id: a.id, company_name: a.company_name })),
  });
}
