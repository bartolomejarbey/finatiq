import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { verificationCode as verificationCodeTemplate } from "@/lib/email/templates";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { user_id, type, phone, email } = await request.json();

  // Rate limit: 3 per 10 minutes per email
  if (email) {
    const limited = checkRateLimit(`${email}:send-code`, 3, 10 * 60 * 1000);
    if (limited) return limited;
  }

  if (!user_id || !type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await supabase.from("verification_codes").insert({
    user_id,
    code,
    type,
    phone: phone || null,
    expires_at: expiresAt.toISOString(),
  });

  if (type === "sms" && phone) {
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioNumber) {
      try {
        const twilioRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
            },
            body: new URLSearchParams({
              From: twilioNumber,
              To: phone,
              Body: `Váš ověřovací kód Finatiq: ${code}`,
            }),
          }
        );

        if (!twilioRes.ok) {
          console.error("[SMS] Twilio error:", twilioRes.status, await twilioRes.text());
        }
      } catch (err) {
        console.error("[SMS] Failed to send:", err);
      }
    } else {
      console.log(`[SMS MOCK] Code ${code} to ${phone}`);
    }
  } else if (type === "email" && email) {
    const tpl = verificationCodeTemplate(email, code);
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
  } else {
    console.log(`[VERIFY MOCK] Code ${code} for user ${user_id} via ${type}`);
  }

  return NextResponse.json({ ok: true });
}
