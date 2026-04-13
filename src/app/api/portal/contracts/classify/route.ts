import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
- extracted_amount: výše úvěru nebo pojistného pokud vidíš`;

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

  // Get client record
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
  }

  const body = await request.json();
  const { storage_path } = body;

  if (!storage_path) {
    return NextResponse.json({ error: "Chybí cesta k souboru" }, { status: 400 });
  }

  // Get signed URL for the file
  const { data: urlData, error: urlError } = await supabaseAdmin
    .storage
    .from("deal-documents")
    .createSignedUrl(storage_path, 300);

  if (urlError || !urlData?.signedUrl) {
    return NextResponse.json({ error: "Nepodařilo se získat odkaz na soubor" }, { status: 500 });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 500,
      messages: [
        { role: "system", content: CLASSIFY_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Klasifikuj tento dokument:" },
            { type: "image_url", image_url: { url: urlData.signedUrl, detail: "low" } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI nevrátila odpověď" }, { status: 500 });
    }

    const classification = JSON.parse(content);
    return NextResponse.json({ classification });
  } catch (e: unknown) {
    console.error("AI classification error:", e);
    return NextResponse.json({ error: "Chyba při AI klasifikaci" }, { status: 500 });
  }
}
