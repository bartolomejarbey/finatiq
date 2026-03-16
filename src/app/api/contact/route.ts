import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import { contactForm } from "@/lib/email/templates";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const CONTACT_EMAIL = "bartolomej@arbey.cz";

export async function POST(req: NextRequest) {
  // Rate limit: 5 per hour per IP
  const ip = getClientIp(req);
  const limited = checkRateLimit(`${ip}:contact`, 5, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { name, email, type, message } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Jméno je povinné (min. 2 znaky)." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Neplatný email." }, { status: 400 });
    }
    const validTypes = ["Obecný", "Technická podpora", "Obchodní", "Fakturace", "Meta Ads na klíč"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({ error: "Neplatný typ dotazu." }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json({ error: "Zpráva je povinná (min. 10 znaků)." }, { status: 400 });
    }

    const tpl = contactForm(name.trim(), email.trim(), type, message.trim());
    const sent = await sendEmail({
      to: CONTACT_EMAIL,
      subject: tpl.subject,
      html: tpl.html,
      reply_to: email.trim(),
    });

    if (!sent) {
      return NextResponse.json({ error: "Nepodařilo se odeslat zprávu." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Interní chyba serveru." }, { status: 500 });
  }
}
