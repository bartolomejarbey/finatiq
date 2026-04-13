import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL_PRIMARY = "gpt-4o-mini";
const MODEL_FALLBACK = "gpt-4o";

const CLASSIFY_PROMPT = `Jsi asistent pro klasifikaci finančních dokumentů. Podívej se na přiložený dokument a urči jeho typ.

Vrať JSON ve formátu:
{
  "document_type": "contract" | "invoice" | "receipt" | "statement" | "other",
  "confidence": "high" | "medium" | "low",
  "description_cs": "Stručný popis dokumentu v češtině (1 věta)",
  "extracted_provider": "Název poskytovatele/banky/pojišťovny pokud vidíš (nebo null)",
  "extracted_amount": number | null,
  "extracted_type": "uver" | "pojisteni" | null,
  "redirect_suggestion": "documents" | "receipts" | null
}

PRAVIDLA:
- "contract" = úvěrová smlouva, pojistná smlouva, jakákoliv smlouva se smluvními stranami a podmínkami
- "invoice" = faktura s IČO, číslem faktury, datem splatnosti → redirect_suggestion: "documents"
- "receipt" = účtenka, paragon, pokladní bloček → redirect_suggestion: "receipts"
- "statement" = bankovní výpis, výpis z účtu → redirect_suggestion: "documents"
- "other" = cokoliv jiného → redirect_suggestion: "documents"

Pokud je to smlouva, zkus rozpoznat:
- extracted_type: "uver" pokud je to úvěrová/hypoteční smlouva, "pojisteni" pokud pojistná smlouva
- extracted_provider: název banky/pojišťovny (např. ČSOB, Česká spořitelna, Allianz...)
- extracted_amount: výše úvěru nebo pojistného pokud vidíš

DŮLEŽITÉ:
- Dokument může mít více stran — přečti VŠECHNY strany.
- Pokud dokument nedokážeš přečíst, nastav confidence na "low". Nehádej obsah.
- Bankovní a finanční dokumenty od bank (ČSOB, KB, ČS, mBank, Raiffeisen, Moneta...) jsou typicky smlouvy nebo výpisy.`;

async function classifyWithModel(
  model: string,
  base64Data: string,
  mimeType: string,
): Promise<{ classification: Record<string, unknown>; model: string } | null> {
  try {
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: "Klasifikuj tento dokument. Přečti všechny strany:" },
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
      max_tokens: 600,
      messages: [
        { role: "system", content: CLASSIFY_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const classification = JSON.parse(content);
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

  // Try primary model first
  let result = await classifyWithModel(MODEL_PRIMARY, base64Data, mimeType);

  // If primary failed or confidence is low, fallback to stronger model
  if (!result || result.classification.confidence === "low") {
    console.log(`Primary model ${result ? "returned low confidence" : "failed"}, trying fallback ${MODEL_FALLBACK}`);
    const fallbackResult = await classifyWithModel(MODEL_FALLBACK, base64Data, mimeType);
    if (fallbackResult) {
      result = fallbackResult;
    }
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
