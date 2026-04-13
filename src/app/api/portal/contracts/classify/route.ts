import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL_PRIMARY = "gpt-4o";
const MODEL_FALLBACK = "gpt-4o-mini";

const CLASSIFY_PROMPT = `Jsi precizní OCR asistent pro české finanční dokumenty. PŘESNĚ přečti a přepiš údaje. NIKDY si nevymýšlej.

Vrať JSON:
{
  "document_type": "contract" | "invoice" | "receipt" | "statement" | "other",
  "confidence": "high" | "medium" | "low",
  "description_cs": "Stručný popis (1 věta)",
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
  "source_quotes": { [field]: "přesná citace z dokumentu" },
  "redirect_suggestion": "documents" | "receipts" | null
}

═══ KROK 1: URČI TYP DOKUMENTU ═══

Přečti NÁZEV/NADPIS dokumentu (první strana, velký text nahoře). To určuje typ:
- "Smlouva o spotřebitelském úvěru" / "Smlouva o úvěru" / "Úvěrová smlouva" / "Hypoteční smlouva" → extracted_type = "uver"
- "Pojistná smlouva" / "Pojistka" → extracted_type = "pojisteni"

⚠️ POZOR: Úvěrová smlouva na auto/vozidlo JE ÚVĚR ("uver"), NE pojištění!
Pokud je v úvěrové smlouvě zmínka o pojištění (např. "pojištění schopnosti splácet", "pojištění odpovědnosti za škodu způsobenou provozem vozidla"), stále je to ÚVĚR — ta zmínka je jen doplňkový produkt k úvěru.

Rozhoduje NADPIS dokumentu a typ smlouvy, NE zmínky o pojištění uvnitř textu.

═══ KROK 2: IDENTIFIKUJ STRANY SMLOUVY ═══

Každá smlouva má DVĚ strany:
- VĚŘITEL / POSKYTOVATEL ÚVĚRU / POJISTITEL = banka nebo pojišťovna (ČSOB, Česká spořitelna, KB, mBank, Raiffeisen, Moneta, Allianz, Kooperativa, Generali, ČPP, UNIQA...)
- DLUŽNÍK / KLIENT / POJISTNÍK = fyzická osoba nebo firma která si bere úvěr/pojištění

extracted_provider = VĚŘITEL/POJISTITEL (= ta BANKA nebo POJIŠŤOVNA), NIKDY dlužník/klient!

Hledej:
- "Věřitel:", "Poskytovatel:", "Pojistitel:" → TO je provider
- "Dlužník:", "Klient:", "Pojistník:", "Spotřebitel:" → to NENÍ provider
- Logo banky/pojišťovny v hlavičce → to je provider
- Pokud je v dokumentu firma s.r.o./a.s. jako DLUŽNÍK a banka jako VĚŘITEL → provider = banka

═══ KROK 3: NAJDI SPRÁVNOU ČÁSTKU ═══

V úvěrové smlouvě existuje NĚKOLIK různých částek. Potřebuješ JISTINU (výši úvěru):

✅ SPRÁVNÁ částka (extracted_amount):
- "Výše úvěru" / "Jistina úvěru" / "Poskytnutý úvěr" / "Úvěr ve výši"
- Toto je kolik peněz klient SKUTEČNĚ DOSTAL

❌ ŠPATNÉ částky (NEPOUŽÍVEJ jako extracted_amount):
- "Celková částka splatná spotřebitelem" = jistina + úroky + poplatky (je VYŠŠÍ než jistina)
- "RPSN" = roční procentní sazba nákladů (je to procento, ne částka)
- "Poplatek za zpracování" = jen poplatek
- "Pojistné" = cena pojištění (doplňkový produkt)

OVĚŘENÍ: Najdi částku SLOVY (hledej "slovy:"). Převeď slovní zápis na číslo. Pokud se liší od číslic → použij SLOVNÍ verzi.
Do source_quotes uveď obojí — číselný i slovní zápis.

═══ KROK 4: EXTRAHUJ DALŠÍ ÚDAJE ═══

- extracted_interest_rate: číslo u "úroková sazba", "p.a.", "fixní sazba". Vrať jako desetinné (5,49% → 5.49). POZOR: RPSN ≠ úroková sazba!
- extracted_monthly_payment: číslo u "měsíční splátka", "anuitní splátka". NE "celková částka", NE roční platba.
- extracted_signing_date: datum u podpisů nebo "sjednáno dne", "uzavřeno dne" (YYYY-MM-DD)
- extracted_maturity_date: datum u "splatnost", "platnost do", "poslední splátka" (YYYY-MM-DD)
- extracted_remaining_balance: POUZE pokud je explicitně "zůstatek"/"nesplaceno"
- extracted_insurance_type: POUZE pokud je to pojistná smlouva (ne úvěr s pojištěním)
- missing_fields: pole polí které v dokumentu NEJSOU: "interest_rate", "monthly_payment", "signing_date", "maturity_date", "amount", "remaining_balance"

═══ KROK 5: KONTROLA PŘED ODESLÁNÍM ═══

1. Je extracted_type správně? (úvěr na auto = "uver", NE "pojisteni")
2. Je extracted_provider VĚŘITEL/BANKA, ne dlužník/klient?
3. Je extracted_amount JISTINA úvěru, ne celková splatná částka?
4. Ověřil jsi částku proti SLOVNÍMU zápisu?
5. Má KAŽDÁ hodnota citaci v source_quotes? Pokud ne → null.
6. Přečetl jsi VŠECHNY strany?`;

async function classifyWithModel(
  model: string,
  base64Data: string,
  mimeType: string,
): Promise<{ classification: Record<string, unknown>; model: string } | null> {
  try {
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: `Analyzuj tento dokument. POSTUP:
1) Přečti NADPIS — je to úvěrová smlouva nebo pojistná smlouva? (úvěr na auto = ÚVĚR, ne pojištění!)
2) Najdi VĚŘITELE (banku) — to je provider. DLUŽNÍK/klient NENÍ provider!
3) Najdi JISTINU úvěru (kolik klient dostal), NE celkovou splatnou částku (ta je vyšší — zahrnuje úroky).
4) Ověř částku proti SLOVNÍMU zápisu ("slovy:").
5) Ke každé hodnotě uveď přesnou citaci z dokumentu.` },
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

/**
 * Second-pass verification: re-reads the document to verify the extracted amount
 * by asking the AI to read digit-by-digit and cross-check against the word version.
 */
async function verifyAmount(
  model: string,
  base64Data: string,
  mimeType: string,
  claimedAmount: number,
): Promise<number | null> {
  try {
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const verifyPrompt = `Přečti tento dokument a najdi PŘESNOU výši úvěru/jistiny. IGNORUJ jakýkoliv předchozí výsledek.

KROK 1: Najdi řádek "Celková výše úvěru" nebo "Výše úvěru" nebo "Jistina".

KROK 2: Přečti ČÍSLICE — POZOR na formát!
České dokumenty používají MEZERU jako oddělovač tisíců a ČÁRKU jako desetinnou čárku.
Příklady formátu:
- "138 595,00 CZK" = sto třicet osm tisíc pět set devadesát pět = 138595
- "1 500 000,00 CZK" = jeden milion pět set tisíc = 1500000
- "45 000,00 CZK" = čtyřicet pět tisíc = 45000
- "2 350 000,00 CZK" = dva miliony tři sta padesát tisíc = 2350000

Mezera je ODDĚLOVAČ TISÍCŮ, ne oddělovač celého čísla! "138 595" = stotřicetosmtisícpětsetdevadesátpět, NE "138" a "595" zvlášť.
",00" na konci je HALÉŘOVÁ část — ignoruj ji.

Přečti číslo a napiš každou SKUPINU zvlášť, pak celé číslo.

KROK 3: Najdi SLOVNÍ zápis (hledej "slovy:" nebo "(slovy").
Rozlož ho na části:

ČESKÝ SLOVNÍ ROZKLAD:
- "jedno sto" / "sto" = 100
- "třicet" = 30, "dvacet" = 20, "padesát" = 50, "čtyřicet" = 40, "šedesát" = 60, "sedmdesát" = 70, "osmdesát" = 80, "devadesát" = 90
- "osm" = 8, "devět" = 9, "pět" = 5, "šest" = 6, "sedm" = 7, "jeden/jedno" = 1, "dva/dvě" = 2, "tři" = 3, "čtyři" = 4
- "tisíc" = ×1000
- "milion/miliony" = ×1000000
- "korun českých" / "Kč" = měna (ignoruj)

Příklad rozkladu: "sto třicet osm tisíc pět set devadesát pět" = (100 + 30 + 8) × 1000 + 5 × 100 + 90 + 5 = 138 × 1000 + 595 = 138595
Příklad: "jeden milion pět set tisíc" = 1 × 1000000 + 5 × 100 × 1000 = 1500000

KROK 4: Porovnej číslo z ČÍSLIC a ze SLOV.

Vrať JSON:
{
  "raw_digits": "přesně jak je číslo v dokumentu, např. '138 595,00'",
  "digit_groups": "skupiny číslic: '138' a '595'",
  "digit_result": 138595,
  "word_reading": "přesný slovní zápis z dokumentu",
  "word_breakdown": "rozklad: (100+30+8)×1000 + 500+90+5 = 138595",
  "word_result": 138595,
  "match": true,
  "final_amount": 138595
}

PRAVIDLA:
- Pokud se digit_result a word_result LIŠÍ → použij word_result jako final_amount
- Pokud slovní zápis chybí → použij digit_result, nastav match na false
- Částka je VŽDY celé číslo (ignoruj ",00" haléře)
- NESMÍŠ zaměnit "138 595" (= 138595) za "1 385 950" — to je 10× víc!`;

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: verifyPrompt },
    ];

    if (mimeType === "application/pdf") {
      userContent.push({
        type: "file",
        file: { filename: "document.pdf", file_data: dataUrl },
      } as unknown as OpenAI.Chat.Completions.ChatCompletionContentPart);
    } else {
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl, detail: "high" },
      });
    }

    const response = await openai.chat.completions.create({
      model,
      max_tokens: 400,
      temperature: 0,
      messages: [{ role: "user", content: userContent }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const result = JSON.parse(content);
    console.log("Amount verification:", JSON.stringify(result));

    // Prefer word_result if available and valid, then final_amount, then digit_result
    const candidates = [
      result.word_result,
      result.final_amount,
      result.digit_result,
    ].filter((v) => typeof v === "number" && v > 0);

    if (candidates.length > 0) {
      const best = candidates[0];
      if (best !== claimedAmount) {
        console.log(`Amount corrected: ${claimedAmount} → ${best} (word: "${result.word_reading}", breakdown: "${result.word_breakdown}")`);
      }
      return best;
    }
    return null;
  } catch (e) {
    console.error("Amount verification failed:", e);
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

  // If we got a result with an amount, verify it with a second focused pass
  if (result && result.classification.extracted_amount != null) {
    const verifiedAmount = await verifyAmount(
      MODEL_PRIMARY,
      base64Data,
      mimeType,
      result.classification.extracted_amount as number,
    );
    if (verifiedAmount != null) {
      if (verifiedAmount !== result.classification.extracted_amount) {
        console.log(`Overriding amount: ${result.classification.extracted_amount} → ${verifiedAmount}`);
        if (!result.classification.source_quotes) result.classification.source_quotes = {};
        (result.classification.source_quotes as Record<string, string>).amount_verification = `Opraveno ověřením: ${result.classification.extracted_amount} → ${verifiedAmount}`;
      }
      result.classification.extracted_amount = verifiedAmount;
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
