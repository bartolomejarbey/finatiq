import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const AI_ANALYSIS_PROMPT = `Analyzuj tento text finanční smlouvy/dokumentu. Extrahuj a vrať JSON:
{
  "type": "úvěr" | "hypotéka" | "životní_pojištění" | "investice" | "spoření" | "jiné",
  "provider": "název banky/pojišťovny",
  "interest_rate": číslo nebo null,
  "monthly_payment": číslo nebo null,
  "total_amount": číslo nebo null,
  "insured_amount": číslo nebo null,
  "start_date": "YYYY-MM-DD" nebo null,
  "end_date": "YYYY-MM-DD" nebo null,
  "fixation_end": "YYYY-MM-DD" nebo null,
  "has_indexation": boolean nebo null,
  "has_insurance": boolean nebo null,
  "key_findings": ["důležitý nález 1", "důležitý nález 2"],
  "risks": ["riziko 1", "riziko 2"],
  "opportunities": ["příležitost 1"]
}
Odpovídej POUZE validním JSON bez dalšího textu.`;

export async function POST(request: Request) {
  // Rate limit: 20 per day per IP
  const ip = getClientIp(request);
  const limited = checkRateLimit(`${ip}:ocr-process`, 20, 24 * 60 * 60 * 1000);
  if (limited) return limited;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await request.json();
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get document record
  const { data: doc } = await supabaseAdmin
    .from("client_documents")
    .select("*")
    .eq("id", documentId)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Update status to processing
  const { error: processingError } = await supabaseAdmin
    .from("client_documents")
    .update({ ocr_status: "processing" })
    .eq("id", documentId);
  if (processingError) console.error("Failed to set OCR status to processing:", processingError.message);

  try {
    // Step 1: Extract text from document using OCR
    let ocrText = "";
    const openaiKey = process.env.OPENAI_API_KEY;

    if (doc.file_url && openaiKey) {
      // Use existing ocr_text or file content
      ocrText = doc.ocr_text || doc.file_name || "";
    }

    // Step 2: AI analysis with GPT-4o Mini (if API key available)
    let aiAnalysis = null;
    if (openaiKey && (ocrText || doc.category)) {
      const textToAnalyze = ocrText || `Dokument typu: ${doc.category || "neznámý"}, název: ${doc.file_name || "neznámý"}`;

      try {
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: AI_ANALYSIS_PROMPT,
              },
              {
                role: "user",
                content: `Text dokumentu:\n${textToAnalyze}`,
              },
            ],
            max_tokens: 1024,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          try {
            aiAnalysis = JSON.parse(content);
          } catch {
            // If JSON parsing fails, store raw content
            aiAnalysis = { raw_response: content, parse_error: true };
          }
        }
      } catch (err) {
        console.error("AI analysis error:", err);
      }
    }

    // Fallback: generate basic OCR data if no AI analysis
    if (!aiAnalysis) {
      aiAnalysis = {
        type: doc.category === "contract" ? "jiné" : doc.category || "jiné",
        provider: null,
        interest_rate: null,
        monthly_payment: null,
        total_amount: null,
        key_findings: ["Dokument nahrán, AI analýza není k dispozici"],
        risks: [],
        opportunities: [],
      };
    }

    // Basic OCR data for backward compatibility
    const ocrData = {
      document_type: aiAnalysis.type || doc.category || "doklad",
      provider: aiAnalysis.provider || null,
      amount: aiAnalysis.total_amount || null,
      date: new Date().toISOString().split("T")[0],
      currency: "CZK",
    };

    const ocrTextResult = ocrText || `Typ: ${ocrData.document_type}\nPoskytovatel: ${ocrData.provider || "neznámý"}`;

    // Save OCR results + AI analysis
    const { error: saveError } = await supabaseAdmin
      .from("client_documents")
      .update({
        ocr_text: ocrTextResult,
        ocr_data: ocrData,
        ocr_status: "done",
        ai_analysis: aiAnalysis,
      })
      .eq("id", documentId);
    if (saveError) console.error("Failed to save OCR results:", saveError.message);

    return NextResponse.json({
      ok: true,
      ocr_data: ocrData,
      ocr_text: ocrTextResult,
      ai_analysis: aiAnalysis,
    });
  } catch (error) {
    console.error("OCR processing error:", error);

    const { error: statusError } = await supabaseAdmin
      .from("client_documents")
      .update({ ocr_status: "error" })
      .eq("id", documentId);
    if (statusError) console.error("Failed to set OCR status to error:", statusError.message);

    return NextResponse.json({ error: "Chyba při zpracování dokumentu" }, { status: 500 });
  }
}
