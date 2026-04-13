import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL_PRIMARY = "gpt-4o";
const MODEL_FALLBACK = "gpt-4o-mini";

const CLASSIFY_PROMPT = `Jsi precizní OCR asistent pro finanční dokumenty. Tvůj úkol je PŘESNĚ přečíst a přepsat údaje z dokumentu. NIKDY si nevymýšlej ani neodhaduj hodnoty.

Vrať JSON ve formátu:
{
  "document_type": "contract" | "invoice" | "receipt" | "statement" | "other",
  "confidence": "high" | "medium" | "low",
  "description_cs": "Stručný popis dokumentu v češtině (1 věta)",
  "extracted_provider": string | null,
  "extracted_amount": number | null,
  "extracted_type": "uver" | "pojisteni" | null,
  "extracted_interest_rate": number | null,
  "extracted_monthly_payment": number | null,
  "extracted_signing_date": "YYYY-MM-DD" | null,
  "extracted_maturity_date": "YYYY-MM-DD" | null,
  "extracted_remaining_balance": number | null,
  "extracted_insurance_type": "zivotni" | "majetek" | "auto" | "odpovednost" | "dalsi" | null,
  "missing_fields": string[],
  "source_quotes": { [field: string]: string },
  "redirect_suggestion": "documents" | "receipts" | null
}

KLASIFIKACE:
- "contract" = úvěrová smlouva, pojistná smlouva, jakákoliv smlouva
- "invoice" = faktura → redirect_suggestion: "documents"
- "receipt" = účtenka, paragon → redirect_suggestion: "receipts"
- "statement" = bankovní výpis → redirect_suggestion: "documents"
- "other" = cokoliv jiného → redirect_suggestion: "documents"

PRAVIDLA EXTRAKCE — KRITICKY DŮLEŽITÉ:
1. Každou hodnotu MUSÍŠ přečíst DOSLOVA z dokumentu. Pokud tam číslo nevidíš napsané, vrať null.
2. Pro každou extrahovanou hodnotu MUSÍŠ uvést v "source_quotes" přesnou citaci textu z dokumentu, odkud jsi hodnotu vzal. Například: { "interest_rate": "úroková sazba 5,49 % p.a.", "amount": "výše úvěru: 1 500 000 Kč" }
3. NIKDY neodhaduj, nezaokrouhluj, nepočítej. Pokud je v dokumentu napsáno "1 523 400 Kč", vrať 1523400, ne 1500000.
4. Pokud údaj v dokumentu NENÍ, vrať null a přidej do missing_fields. NEPOČÍTEJ ho z jiných hodnot.
5. NEPLEŤ SI různá čísla — číslo smlouvy NENÍ částka, IČO NENÍ částka, PSČ NENÍ částka.

CO EXTRAHOVAT (pouze pokud je to smlouva):
- extracted_provider: přesný název banky/pojišťovny jak je v dokumentu
- extracted_amount: výše úvěru nebo celkové pojistné. Hledej u textu "výše úvěru", "jistina", "celková částka", "pojistná částka"
- extracted_interest_rate: POUZE číslo u textu "úroková sazba", "p.a.", "% ročně", "fixní sazba". Vrať jako desetinné číslo (5,49% → 5.49)
- extracted_monthly_payment: POUZE číslo u textu "měsíční splátka", "anuitní splátka", "měsíční pojistné". NE roční, NE jednorázové
- extracted_signing_date: datum u podpisů nebo "datum uzavření", "sjednáno dne"
- extracted_maturity_date: datum u textu "splatnost", "platnost do", "konec smlouvy"
- extracted_remaining_balance: POUZE pokud dokument explicitně uvádí "zůstatek" nebo "nesplaceno"
- extracted_insurance_type: typ pojištění
- missing_fields: pole názvů polí které v dokumentu URČITĚ NEJSOU. Hodnoty: "interest_rate", "monthly_payment", "signing_date", "maturity_date", "amount", "remaining_balance"

KONTROLA PŘED ODESLÁNÍM:
- Má KAŽDÁ extrahovaná hodnota odpovídající citaci v source_quotes?
- Je citace DOSLOVA z dokumentu, ne tvůj překlad/přeformulování?
- Pokud nemáš citaci → nastav hodnotu na null
- Přečetl jsi VŠECHNY strany dokumentu?`;

async function classifyWithModel(
  model: string,
  base64Data: string,
  mimeType: string,
): Promise<{ classification: Record<string, unknown>; model: string } | null> {
  try {
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: "Přečti POZORNĚ celý dokument, VŠECHNY strany. Pak přesně přepiš údaje. NEVYMÝŠLEJ si čísla — piš POUZE to co doslova vidíš v textu. Ke každému číslu uveď citaci." },
    ];

    if (mimeType === "application/pdf") {
      // For PDFs, use the file input type with inline base64
      userContent.push({
        type: "file",
        file: {
          filename: "document.pdf",
          file_data: dataUrl,
        },
      } as unknown as OpenAI.Chat.Completions.ChatCompletionContentPart);
    } else {
      // For images, use image_url with base64 data URL
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl, detail: "high" },
      });
    }

    const response = await openai.chat.completions.create({
      model,
      max_tokens: 1200,
      temperature: 0,
      messages: [
        { role: "system", content: CLASSIFY_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const classification = JSON.parse(content);

    // Validate: strip extracted values that have no source quote (likely hallucinated)
    const quotes = classification.source_quotes || {};
    const numericFields = [
      "extracted_amount",
      "extracted_interest_rate",
      "extracted_monthly_payment",
      "extracted_remaining_balance",
    ] as const;
    const stringFields = [
      "extracted_signing_date",
      "extracted_maturity_date",
    ] as const;
    const fieldToQuoteKey: Record<string, string> = {
      extracted_amount: "amount",
      extracted_interest_rate: "interest_rate",
      extracted_monthly_payment: "monthly_payment",
      extracted_remaining_balance: "remaining_balance",
      extracted_signing_date: "signing_date",
      extracted_maturity_date: "maturity_date",
    };

    for (const field of [...numericFields, ...stringFields]) {
      if (classification[field] != null) {
        const quoteKey = fieldToQuoteKey[field] || field.replace("extracted_", "");
        if (!quotes[quoteKey] && !quotes[field]) {
          // No source quote = likely hallucinated, null it out
          console.log(`Stripping ${field}=${classification[field]} — no source quote`);
          classification[field] = null;
          // Add to missing_fields if not there
          const missingKey = field.replace("extracted_", "");
          if (!classification.missing_fields) classification.missing_fields = [];
          if (!classification.missing_fields.includes(missingKey)) {
            classification.missing_fields.push(missingKey);
          }
        }
      }
    }

    return { classification, model };
  } catch (e) {
    console.error(`Classification failed with ${model}:`, e);
    return null;
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI klasifikace není nakonfigurována" }, { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
  }

  // Accept FormData with file
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Chybí soubor" }, { status: 400 });
  }

  // Check file size (max 20MB for OpenAI)
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Soubor je příliš velký (max 20 MB)" }, { status: 400 });
  }

  // Convert file to base64 for direct OpenAI submission
  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = file.type || "application/octet-stream";

  // Also upload to storage for later use (using service role to bypass RLS)
  const ext = file.name.split(".").pop() || "bin";
  const storagePath = `client-docs/${client.id}/classify_${Date.now()}.${ext}`;
  await supabaseAdmin.storage
    .from("deal-documents")
    .upload(storagePath, Buffer.from(arrayBuffer), { contentType: mimeType })
    .catch(() => {}); // Non-critical, just for reference

  // Use gpt-4o as primary for accuracy
  let result = await classifyWithModel(MODEL_PRIMARY, base64Data, mimeType);

  // If primary failed, retry once (same model — accuracy matters more than cost)
  if (!result) {
    console.log("Primary model failed, retrying...");
    result = await classifyWithModel(MODEL_PRIMARY, base64Data, mimeType);
  }

  // If still failed, try fallback
  if (!result) {
    console.log("Primary retry failed, trying fallback model");
    result = await classifyWithModel(MODEL_FALLBACK, base64Data, mimeType);
  }

  // Both models failed
  if (!result) {
    return NextResponse.json({
      classification: {
        document_type: "other",
        confidence: "low",
        description_cs: "Nepodařilo se dokument analyzovat. Zkuste nahrát čitelnější fotografii nebo sken.",
        extracted_provider: null,
        extracted_amount: null,
        extracted_type: null,
        redirect_suggestion: null,
        analysis_failed: true,
      },
      storage_path: storagePath,
    });
  }

  return NextResponse.json({
    classification: { ...result.classification, analyzed_by: result.model },
    storage_path: storagePath,
  });
}
