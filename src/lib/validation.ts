import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email("Neplatný email"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
});

export const registerSchema = z.object({
  email: z.string().email("Neplatný email"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
  company_name: z.string().min(2, "Název firmy je povinný"),
  full_name: z.string().min(2, "Jméno je povinné"),
});

// Client
export const clientSchema = z.object({
  first_name: z.string().min(1, "Jméno je povinné"),
  last_name: z.string().min(1, "Příjmení je povinné"),
  email: z.string().email("Neplatný email").optional().or(z.literal("")),
  phone: z.string().optional(),
  segment: z.enum(["new", "standard", "active", "vip", "sleeping"]).optional(),
});

// Deal
export const dealSchema = z.object({
  title: z.string().min(1, "Název je povinný"),
  value: z.number().min(0).optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  stage_id: z.string().uuid().optional(),
  source: z.enum(["manual", "meta", "referral", "web"]).optional(),
});

// AI Chat
export const aiChatSchema = z.object({
  client_id: z.string().uuid("Neplatné client_id"),
  message: z.string().min(1, "Zpráva je povinná").max(2000, "Zpráva je příliš dlouhá"),
});

// AI Generate
export const aiGenerateSchema = z.object({
  type: z.enum(["client_summary", "deal_summary", "email_draft", "upsell_suggestion"]),
  context: z.record(z.string(), z.unknown()).optional(),
});

// Meta Conversion
export const metaConversionSchema = z.object({
  dealId: z.string().uuid().optional(),
  dealValue: z.number().min(0).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
});

// OCR
export const ocrProcessSchema = z.object({
  documentId: z.string().uuid("Neplatné documentId"),
});

// Contact form
export const contactSchema = z.object({
  name: z.string().min(2, "Jméno je povinné"),
  email: z.string().email("Neplatný email"),
  subject: z.string().min(1, "Předmět je povinný"),
  message: z.string().min(10, "Zpráva je příliš krátká").max(5000),
});

// Verification code
export const sendCodeSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(["sms", "email"]),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

// Helper: validate and return typed result or error response
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message || "Neplatná data" };
}
