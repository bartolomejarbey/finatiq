import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { getScannedDocumentSignedUrl } from "@/lib/storage/scanned-documents";

// ---------------------------------------------------------------------------
// OpenAI client (server-side only)
// ---------------------------------------------------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL_PRIMARY = process.env.OPENAI_MODEL_PRIMARY || "gpt-4o-mini";
const MODEL_FALLBACK = process.env.OPENAI_MODEL_FALLBACK || "gpt-4o";

// Ceny za 1M tokenů (aktualizuj podle aktuálních OpenAI cen)
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4o": { input: 2.50, output: 10.0 },
};

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Jsi asistent pro zpracování finančních dokumentů v aplikaci Finatiq. Analyzuj přiložený dokument (účtenka, faktura, výpis, smlouva) a extrahuj strukturovaná data.

KRITICKÁ PRAVIDLA:

1. Dvě pole jsou KRITICKÁ: datum (date) a celková částka (total_amount). Bez nich je dokument NEPOUŽITELNÝ.

2. Pokud NEJSI SI 100% JISTÝ datem NEBO částkou, nastav quality_status = "rejected" a do rejection_reason napiš konkrétní kód. NIKDY nehádej. Raději odmítni, než abys vrátil vymyšlená data. Halucinované číslo v účetnictví klienta je HORŠÍ než žádné číslo.

3. Pokud vidíš jasně datum i částku, ale ostatní pole jsou nejistá (jméno obchodu, IČO, položky), nastav quality_status = "warning" a do warning_fields vypiš, která pole jsou nejistá. Dokument se uloží, ale poradce si data zkontroluje.

4. Pokud vidíš vše jasně a jsi si jistý, nastav quality_status = "ok".

5. Do retry_guidance_cs napiš KONKRÉTNÍ instrukci pro uživatele v češtině, tykáním, přátelsky. NE generické "špatná kvalita". Příklady dobrých instrukcí:
   - "Účtenka je rozmazaná, částku nelze přečíst. Vyfoť ji prosím znovu z menší vzdálenosti a drž mobil pevně."
   - "Horní část účtenky chybí, nevidím datum. Vyfoť prosím celou účtenku od začátku do konce."
   - "Foto je moc tmavé. Zkus to u okna nebo s bleskem — text musí být jasně viditelný."
   - "Na účtence je odlesk, který zakrývá částku. Nakloň ji mírně jinak nebo vyfoť ze strany, aby tam nebyl lesk."
   - "Účtenka je pokrčená a text se láme. Narovnej ji na rovnou plochu a vyfoť znovu."
   - "Foto má nízké rozlišení, text je nečitelný. Vyfoť prosím přímo z aplikace, ne screenshot screenshotu."
   - "Toto nevypadá jako účtenka ani faktura. Zkontroluj prosím, že jsi vybral/a správnou fotku."

6. Buď VELMI PŘÍSNÝ. Lepší odmítnout 20 % fotek a mít 100% spolehlivá data, než přijmout všechno a halucinovat částky.

7. Pro položky (items) — pokud jsou nečitelné, vrať null. Není to kritické pole a neodmítej kvůli tomu dokument.

8. Data v češtině: názvy obchodů nech tak jak jsou (např. "Albert", "Kaufland"), částky jako čísla (ne string), datum ve formátu ISO 8601 (YYYY-MM-DD).

9. Hodnocení confidence:
   - "high" = dokument je čitelný, všechna pole jasně viditelná, jsi si jistý extrakcí
   - "medium" = některá pole jsou nejistá nebo nečitelná, ale kritická pole máš
   - "low" = máš pochybnosti, i když kritická pole vidíš. Toto spustí fallback na silnější model.`;

// ---------------------------------------------------------------------------
// JSON schema for structured output
// ---------------------------------------------------------------------------

const DOCUMENT_SCHEMA = {
  name: "document_extraction",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      document_type: {
        type: "string",
        enum: ["receipt", "invoice", "contract", "statement", "other"],
      },
      extracted_data: {
        type: "object",
        properties: {
          merchant_name: { type: ["string", "null"] },
          merchant_ico: { type: ["string", "null"] },
          merchant_dic: { type: ["string", "null"] },
          date: {
            type: ["string", "null"],
            description: "ISO 8601 format YYYY-MM-DD",
          },
          total_amount: { type: ["number", "null"] },
          currency: {
            type: ["string", "null"],
            description: "CZK, EUR, USD...",
          },
          vat_amount: { type: ["number", "null"] },
          items: {
            type: ["array", "null"],
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: ["number", "null"] },
                price: { type: ["number", "null"] },
              },
              required: ["name", "quantity", "price"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "merchant_name",
          "merchant_ico",
          "merchant_dic",
          "date",
          "total_amount",
          "currency",
          "vat_amount",
          "items",
        ],
        additionalProperties: false,
      },
      summary: {
        type: "string",
        description: "Krátké shrnutí dokumentu v češtině, max 2 věty",
      },
      quality_status: {
        type: "string",
        enum: ["ok", "warning", "rejected"],
      },
      critical_fields_readable: {
        type: "object",
        properties: {
          date: { type: "boolean" },
          total_amount: { type: "boolean" },
        },
        required: ["date", "total_amount"],
        additionalProperties: false,
      },
      rejection_reason: {
        type: ["string", "null"],
        enum: [
          "unreadable_amount",
          "unreadable_date",
          "blurry_image",
          "dark_image",
          "cropped_image",
          "crumpled_paper",
          "glare_reflection",
          "low_resolution",
          "not_a_document",
          null,
        ],
      },
      retry_guidance_cs: {
        type: ["string", "null"],
        description:
          "Konkrétní česká instrukce pro uživatele, co udělat jinak. Tykání, přátelský tón.",
      },
      warning_fields: {
        type: ["array", "null"],
        items: { type: "string" },
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
      confidence_reason: { type: "string" },
      requires_human_review: { type: "boolean" },
    },
    required: [
      "document_type",
      "extracted_data",
      "summary",
      "quality_status",
      "critical_fields_readable",
      "rejection_reason",
      "retry_guidance_cs",
      "warning_fields",
      "confidence",
      "confidence_reason",
      "requires_human_review",
    ],
    additionalProperties: false,
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedData {
  merchant_name: string | null;
  merchant_ico: string | null;
  merchant_dic: string | null;
  date: string | null;
  total_amount: number | null;
  currency: string | null;
  vat_amount: number | null;
  items: Array<{ name: string; quantity: number | null; price: number | null }> | null;
}

interface VisionParsedResult {
  document_type: string;
  extracted_data: ExtractedData;
  summary: string;
  quality_status: "ok" | "warning" | "rejected";
  critical_fields_readable: { date: boolean; total_amount: boolean };
  rejection_reason: string | null;
  retry_guidance_cs: string | null;
  warning_fields: string[] | null;
  confidence: "high" | "medium" | "low";
  confidence_reason: string;
  requires_human_review: boolean;
}

interface VisionCallResult {
  parsed: VisionParsedResult;
  usage: { input: number; output: number; total: number };
}

export interface ProcessingResult {
  status: "ok" | "warning" | "rejected";
  data?: ExtractedData;
  summary?: string;
  document_type?: string;
  warning_fields?: string[] | null;
  rejection_reason?: string | null;
  retry_guidance?: string | null;
  can_override?: boolean;
  file_path: string;
  model_used: string;
  escalated: boolean;
  tokens: { input: number; output: number; total: number };
  cost_usd: number;
}

export class DocumentProcessingError extends Error {
  public readonly cause: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "DocumentProcessingError";
    this.cause = cause;
  }
}

// ---------------------------------------------------------------------------
// Supabase admin client (service role)
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ---------------------------------------------------------------------------
// Helper: call OpenAI Vision API
// ---------------------------------------------------------------------------

async function callOpenAIVision({
  model,
  fileUrl,
  detail,
}: {
  model: string;
  fileUrl: string;
  detail: "low" | "high";
}): Promise<VisionCallResult> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: fileUrl, detail },
          },
          {
            type: "text",
            text: "Analyzuj tento dokument a extrahuj data podle instrukcí.",
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: DOCUMENT_SCHEMA,
    },
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new DocumentProcessingError("OpenAI returned empty response");
  }

  const parsed = JSON.parse(content) as VisionParsedResult;
  const usage = {
    input: response.usage?.prompt_tokens ?? 0,
    output: response.usage?.completion_tokens ?? 0,
    total: response.usage?.total_tokens ?? 0,
  };

  return { parsed, usage };
}

// ---------------------------------------------------------------------------
// Helper: retry with exponential backoff
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const isRateLimit =
        error instanceof OpenAI.RateLimitError ||
        (error instanceof Error && error.message.includes("429"));
      const isTimeout =
        error instanceof OpenAI.APIConnectionTimeoutError ||
        (error instanceof Error && error.message.includes("timeout"));
      const isAuth =
        error instanceof OpenAI.AuthenticationError ||
        (error instanceof Error && error.message.includes("401"));

      // Auth errors — don't retry
      if (isAuth) throw error;

      // Timeout — retry only once
      if (isTimeout && attempt >= 1) throw error;

      // Rate limit — retry with backoff
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(3, attempt);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Other errors on last attempt
      if (attempt === maxRetries) throw error;

      // Other transient errors — retry with backoff
      const delay = baseDelayMs * Math.pow(3, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Helper: calculate cost
// ---------------------------------------------------------------------------

function calculateCost(
  model: string,
  usage: { input: number; output: number }
): number {
  const pricing = PRICING[model] ?? PRICING["gpt-4o-mini"];
  return (
    (usage.input / 1_000_000) * pricing.input +
    (usage.output / 1_000_000) * pricing.output
  );
}

function sumUsage(
  a: { input: number; output: number; total: number },
  b: { input: number; output: number; total: number }
) {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    total: a.total + b.total,
  };
}

// ---------------------------------------------------------------------------
// Helper: log processing to DB
// ---------------------------------------------------------------------------

async function logProcessing(params: {
  documentId: string;
  tenantId: string;
  model: string;
  escalated: boolean;
  wasRejected: boolean;
  usage: { input: number; output: number; total: number };
  cost: number;
  processingTimeMs: number;
  qualityStatus: string;
  errorMessage?: string;
}) {
  const supabase = getSupabaseAdmin();
  await supabase.from("scanned_document_processing_logs").insert({
    scanned_document_id: params.documentId,
    tenant_id: params.tenantId,
    model_used: params.model,
    escalated: params.escalated,
    quality_status: params.qualityStatus,
    was_rejected: params.wasRejected,
    tokens_input: params.usage.input,
    tokens_output: params.usage.output,
    tokens_total: params.usage.total,
    cost_usd: params.cost,
    processing_time_ms: params.processingTimeMs,
    error_message: params.errorMessage ?? null,
  });
}

// ---------------------------------------------------------------------------
// Helper: save extracted data to documents table
// ---------------------------------------------------------------------------

async function saveDocumentData(
  documentId: string,
  parsed: VisionParsedResult
) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("scanned_documents")
    .update({
      document_type: parsed.document_type,
      merchant_name: parsed.extracted_data.merchant_name,
      merchant_ico: parsed.extracted_data.merchant_ico,
      merchant_dic: parsed.extracted_data.merchant_dic,
      document_date: parsed.extracted_data.date,
      total_amount: parsed.extracted_data.total_amount,
      currency: parsed.extracted_data.currency ?? "CZK",
      vat_amount: parsed.extracted_data.vat_amount,
      items: parsed.extracted_data.items,
      summary: parsed.summary,
      quality_status: parsed.quality_status,
      warning_fields: parsed.warning_fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);
}

// ---------------------------------------------------------------------------
// Helper: log error to DB
// ---------------------------------------------------------------------------

async function logError(documentId: string, error: unknown) {
  const supabase = getSupabaseAdmin();
  const message =
    error instanceof Error ? error.message : "Unknown processing error";

  await supabase
    .from("scanned_documents")
    .update({
      quality_status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  await supabase.from("scanned_document_processing_logs").insert({
    scanned_document_id: documentId,
    tenant_id: "00000000-0000-0000-0000-000000000000", // fallback, will be overwritten
    model_used: MODEL_PRIMARY,
    error_message: message,
  });
}

// ---------------------------------------------------------------------------
// Main: processDocument()
// ---------------------------------------------------------------------------

export async function processDocument(
  filePath: string,
  options: { tenantId: string; documentId: string }
): Promise<ProcessingResult> {
  const startTime = Date.now();

  // Generate a one-time signed URL for OpenAI Vision API call
  const signedUrl = await getScannedDocumentSignedUrl(filePath, 3600);
  if (!signedUrl) {
    throw new DocumentProcessingError(
      "Nepodařilo se vygenerovat URL pro zpracování dokumentu"
    );
  }

  try {
    // Krok 1: Primary model (mini) s low detail
    const miniResult = await withRetry(() =>
      callOpenAIVision({
        model: MODEL_PRIMARY,
        fileUrl: signedUrl,
        detail: "low",
      })
    );

    const miniCost = calculateCost(MODEL_PRIMARY, miniResult.usage);

    // Krok 2: Quality gate — rejected?
    if (miniResult.parsed.quality_status === "rejected") {
      await logProcessing({
        documentId: options.documentId,
        tenantId: options.tenantId,
        model: MODEL_PRIMARY,
        escalated: false,
        wasRejected: true,
        usage: miniResult.usage,
        cost: miniCost,
        processingTimeMs: Date.now() - startTime,
        qualityStatus: "rejected",
      });

      // Update document status
      const supabase = getSupabaseAdmin();
      await supabase
        .from("scanned_documents")
        .update({
          quality_status: "rejected",
          rejection_reason: miniResult.parsed.rejection_reason,
          retry_guidance: miniResult.parsed.retry_guidance_cs,
          summary: miniResult.parsed.summary,
          document_type: miniResult.parsed.document_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", options.documentId);

      return {
        status: "rejected",
        rejection_reason: miniResult.parsed.rejection_reason,
        retry_guidance: miniResult.parsed.retry_guidance_cs,
        can_override: true,
        file_path: filePath,
        model_used: MODEL_PRIMARY,
        escalated: false,
        tokens: miniResult.usage,
        cost_usd: miniCost,
      };
    }

    // Krok 3: Low confidence → fallback na 4o
    if (
      miniResult.parsed.confidence === "low" ||
      miniResult.parsed.requires_human_review
    ) {
      const fallbackResult = await withRetry(() =>
        callOpenAIVision({
          model: MODEL_FALLBACK,
          fileUrl: signedUrl,
          detail: "high",
        })
      );

      const fallbackCost = calculateCost(MODEL_FALLBACK, fallbackResult.usage);
      const totalCost = miniCost + fallbackCost;
      const totalUsage = sumUsage(miniResult.usage, fallbackResult.usage);

      // Fallback model can also reject
      if (fallbackResult.parsed.quality_status === "rejected") {
        await logProcessing({
          documentId: options.documentId,
          tenantId: options.tenantId,
          model: MODEL_FALLBACK,
          escalated: true,
          wasRejected: true,
          usage: totalUsage,
          cost: totalCost,
          processingTimeMs: Date.now() - startTime,
          qualityStatus: "rejected",
        });

        const supabase = getSupabaseAdmin();
        await supabase
          .from("scanned_documents")
          .update({
            quality_status: "rejected",
            rejection_reason: fallbackResult.parsed.rejection_reason,
            retry_guidance: fallbackResult.parsed.retry_guidance_cs,
            summary: fallbackResult.parsed.summary,
            document_type: fallbackResult.parsed.document_type,
            updated_at: new Date().toISOString(),
          })
          .eq("id", options.documentId);

        return {
          status: "rejected",
          rejection_reason: fallbackResult.parsed.rejection_reason,
          retry_guidance: fallbackResult.parsed.retry_guidance_cs,
          can_override: true,
          file_path: filePath,
          model_used: MODEL_FALLBACK,
          escalated: true,
          tokens: totalUsage,
          cost_usd: totalCost,
        };
      }

      await logProcessing({
        documentId: options.documentId,
        tenantId: options.tenantId,
        model: MODEL_FALLBACK,
        escalated: true,
        wasRejected: false,
        usage: totalUsage,
        cost: totalCost,
        processingTimeMs: Date.now() - startTime,
        qualityStatus: fallbackResult.parsed.quality_status,
      });

      await saveDocumentData(options.documentId, fallbackResult.parsed);

      return {
        status: fallbackResult.parsed.quality_status,
        data: fallbackResult.parsed.extracted_data,
        summary: fallbackResult.parsed.summary,
        document_type: fallbackResult.parsed.document_type,
        warning_fields: fallbackResult.parsed.warning_fields,
        file_path: filePath,
        model_used: MODEL_FALLBACK,
        escalated: true,
        tokens: totalUsage,
        cost_usd: totalCost,
      };
    }

    // Krok 4: Mini OK nebo warning
    await logProcessing({
      documentId: options.documentId,
      tenantId: options.tenantId,
      model: MODEL_PRIMARY,
      escalated: false,
      wasRejected: false,
      usage: miniResult.usage,
      cost: miniCost,
      processingTimeMs: Date.now() - startTime,
      qualityStatus: miniResult.parsed.quality_status,
    });

    await saveDocumentData(options.documentId, miniResult.parsed);

    return {
      status: miniResult.parsed.quality_status,
      data: miniResult.parsed.extracted_data,
      summary: miniResult.parsed.summary,
      document_type: miniResult.parsed.document_type,
      warning_fields: miniResult.parsed.warning_fields,
      file_path: filePath,
      model_used: MODEL_PRIMARY,
      escalated: false,
      tokens: miniResult.usage,
      cost_usd: miniCost,
    };
  } catch (error) {
    await logError(options.documentId, error);

    if (error instanceof OpenAI.AuthenticationError) {
      throw new DocumentProcessingError(
        "Chyba konfigurace: neplatný OpenAI API klíč. Kontaktuj administrátora.",
        error
      );
    }

    throw new DocumentProcessingError(
      error instanceof Error
        ? error.message
        : "Neočekávaná chyba při zpracování dokumentu",
      error
    );
  }
}
