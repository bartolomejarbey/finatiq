import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";
import * as templates from "@/lib/email/templates";

const SUPERADMIN_EMAIL = "bartolomej@arbey.cz";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type === "new_ticket") {
      const tpl = templates.newTicketAlert(body.subject, body.advisorName);
      await sendEmail({ to: SUPERADMIN_EMAIL, subject: tpl.subject, html: tpl.html });
    } else if (body.type === "reply") {
      if (body.advisorEmail) {
        const tpl = templates.ticketReply(body.advisorName, body.message);
        await sendEmail({ to: body.advisorEmail, subject: tpl.subject, html: tpl.html });
      }
    } else if (body.type === "dm") {
      if (body.advisorEmail) {
        const tpl = templates.newDirectMessage(body.advisorName, body.message);
        await sendEmail({ to: body.advisorEmail, subject: tpl.subject, html: tpl.html });
      }
    } else if (body.type === "bulk") {
      if (body.email) {
        const tpl = templates.automationNotification(body.name, body.subject, body.body);
        await sendEmail({ to: body.email, subject: tpl.subject, html: tpl.html });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
