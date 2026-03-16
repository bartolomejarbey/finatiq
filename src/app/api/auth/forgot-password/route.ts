import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { passwordReset } from "@/lib/email/templates";
import { randomUUID } from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { email } = await request.json();

  // Rate limit: 3 per hour per email
  if (email) {
    const limited = checkRateLimit(`${email}:forgot-password`, 3, 60 * 60 * 1000);
    if (limited) return limited;
  }

  if (!email) {
    return NextResponse.json({ error: "Email je povinný." }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if user exists (don't reveal if not — always return success)
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users?.find((u) => u.email === email);

  if (user) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await supabase.from("password_reset_tokens").insert({
      email,
      token,
      expires_at: expiresAt.toISOString(),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.finatiq.cz";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Get name from advisor or use email
    const { data: advisor } = await supabase
      .from("advisors")
      .select("company_name")
      .eq("user_id", user.id)
      .single();

    const name = advisor?.company_name || email;
    const tpl = passwordReset(name, resetUrl);
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({ ok: true });
}
