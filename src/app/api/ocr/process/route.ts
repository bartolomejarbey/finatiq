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
  await supabaseAdmin
    .from("client_documents")
    .update({ ocr_status: "processing" })
    .eq("id", documentId);

  try {
    // Step 1: Extract text from document using OCR
    let ocrText = "";
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (doc.file_url && anthropicKey) {
      // Use Claude to analyze the document directly (if text is available)
      // For now, use any existing ocr_text or file content
      ocrText = doc.ocr_text || doc.file_name || "";
    }

    // Step 2: AI analysis with Claude (if API key available)
    let aiAnalysis = null;
    if (anthropicKey && (ocrText || doc.category)) {
      const textToAnalyze = ocrText || `Dokument typu: ${doc.category || "neznámý"}, název: ${doc.file_name || "neznámý"}`;

      try {
        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `${AI_ANALYSIS_PROMPT}\n\nText dokumentu:\n${textToAnalyze}`,
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.content?.[0]?.text || "";
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
    await supabaseAdmin
      .from("client_documents")
      .update({
        ocr_text: ocrTextResult,
        ocr_data: ocrData,
        ocr_status: "done",
        ai_analysis: aiAnalysis,
      })
      .eq("id", documentId);

    return NextResponse.json({
      ok: true,
      ocr_data: ocrData,
      ocr_text: ocrTextResult,
      ai_analysis: aiAnalysis,
    });
  } catch (error) {
    console.error("OCR processing error:", error);

    await supabaseAdmin
      .from("client_documents")
      .update({ ocr_status: "error" })
      .eq("id", documentId);

    return NextResponse.json({ error: "Chyba při zpracování dokumentu" }, { status: 500 });
  }
}
