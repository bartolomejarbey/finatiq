import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from_name?: string;
  reply_to?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const resend = getResend();
  const fromName = options.from_name || "Finatiq";
  const fromDomain = process.env.RESEND_FROM_DOMAIN || "finatiq.cz";

  if (!resend) {
    console.log(`[EMAIL MOCK] From: ${fromName} <noreply@${fromDomain}>`);
    console.log(`[EMAIL MOCK] To: ${options.to}`);
    console.log(`[EMAIL MOCK] Subject: ${options.subject}`);
    console.log(`[EMAIL MOCK] Body length: ${options.html.length} chars`);
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <noreply@${fromDomain}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.reply_to,
    });

    if (error) {
      console.error("[EMAIL] Resend error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[EMAIL] Send failed:", err);
    return false;
  }
}
