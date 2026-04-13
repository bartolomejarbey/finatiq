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
- extracted_provider: název banky/pojišťovny
- extracted_amount: výše úvěru nebo pojistného pokud vidíš

DŮLEŽITÉ: Pokud dokument nedokážeš přečíst nebo je nečitelný, nastav confidence na "low" a document_type na to co si MYSLÍŠ že to je. Nehádej obsah — raději vrať null pro extracted pole.`;

async function classifyWithModel(
  model: string,
  signedUrl: string,
  fileType: string,
): Promise<{ classification: Record<string, unknown>; model: string } | null> {
  try {
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: "Klasifikuj tento dokument:" },
    ];

    if (fileType === "application/pdf") {
      userContent.push({
        type: "file",
        file: { url: signedUrl },
      } as unknown as OpenAI.Chat.Completions.ChatCompletionContentPart);
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: signedUrl, detail: "high" },
      });
    }

    const response = await openai.chat.completions.create({
      model,
      max_tokens: 500,
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

  // Upload file to storage using service role (bypasses RLS)
  const ext = file.name.split(".").pop() || "bin";
  const storagePath = `client-docs/${client.id}/classify_${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from("deal-documents")
    .upload(storagePath, Buffer.from(arrayBuffer), {
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json({ error: "Chyba při nahrávání souboru" }, { status: 500 });
  }

  // Get signed URL for AI analysis
  const { data: urlData, error: urlError } = await supabaseAdmin
    .storage
    .from("deal-documents")
    .createSignedUrl(storagePath, 300);

  if (urlError || !urlData?.signedUrl) {
    return NextResponse.json({ error: "Nepodařilo se získat odkaz na soubor" }, { status: 500 });
  }

  // Try primary model first
  let result = await classifyWithModel(MODEL_PRIMARY, urlData.signedUrl, file.type);

  // If primary failed or confidence is low, fallback to stronger model
  if (!result || result.classification.confidence === "low") {
    console.log(`Primary model ${result ? "returned low confidence" : "failed"}, trying fallback ${MODEL_FALLBACK}`);
    const fallbackResult = await classifyWithModel(MODEL_FALLBACK, urlData.signedUrl, file.type);
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
