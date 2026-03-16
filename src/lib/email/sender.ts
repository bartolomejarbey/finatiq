// Re-export everything from resend.ts — single source of truth for email sending
export { sendEmail } from "./resend";
export type { SendEmailOptions as EmailOptions } from "./resend";
