import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit: 20 per hour per IP
  const ip = getClientIp(request);
  const limited = checkRateLimit(`${ip}:ai-chat`, 20, 60 * 60 * 1000);
  if (limited) return limited;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { client_id, message } = await request.json();

    if (!client_id || !message) {
      return NextResponse.json(
        { error: "client_id a message jsou povinne" },
        { status: 400 }
      );
    }

    // Fetch client data
    const [contractsRes, paymentsRes, goalsRes] = await Promise.all([
      supabase
        .from("contracts")
        .select("*")
        .eq("client_id", client_id),
      supabase
        .from("payments")
        .select("*")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("goals")
        .select("*")
        .eq("client_id", client_id),
    ]);

    const contracts = contractsRes.data || [];
    const payments = paymentsRes.data || [];
    const goals = goalsRes.data || [];

    // Build context string summarizing the client's financial situation
    const loanContracts = contracts.filter(
      (c) => c.type === "loan" || c.type === "uver" || c.type === "hypoteka"
    );
    const insuranceContracts = contracts.filter(
      (c) =>
        c.type === "insurance" ||
        c.type === "pojisteni" ||
        c.type === "pojistka"
    );
    const totalLoanAmount = loanContracts.reduce(
      (sum, c) => sum + (Number(c.amount) || 0),
      0
    );
    const totalPayments = payments.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );
    const context = `Klient má ${contracts.length} smluv, z toho ${loanContracts.length} úvěrů v celkové výši ${totalLoanAmount} Kč a ${insuranceContracts.length} pojistek. Posledních ${payments.length} plateb v celkové výši ${totalPayments} Kč. Má ${goals.length} finančních cílů.`;

    const openaiKey = process.env.OPENAI_API_KEY;

    if (openaiKey) {
      // Real AI response via GPT-4o Mini
      const systemPrompt = `Jsi finanční asistent pro českého klienta. Odpovídej vždy česky, stručně a srozumitelně. Pomáháš klientovi orientovat se v jeho financích — smlouvách, platbách, cílech a investicích. Nenavrhuj konkrétní produkty, ale odkazuj na poradce pro detailní radu.

Kontext klienta:
${context}

Smlouvy: ${JSON.stringify(contracts.map((c) => ({ name: c.name || c.title, type: c.type, amount: c.amount, status: c.status })))}
Platby: ${JSON.stringify(payments.map((p) => ({ amount: p.amount, status: p.status, due_date: p.due_date })))}
Cíle: ${JSON.stringify(goals.map((g) => ({ name: g.name || g.title, target: g.target_amount, current: g.current_amount })))}`;

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
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            max_tokens: 512,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const reply = aiData.choices?.[0]?.message?.content || "Omlouvám se, nepodařilo se vygenerovat odpověď.";
          return NextResponse.json({ reply });
        }
      } catch (err) {
        console.error("AI chat error:", err);
      }
    }

    // Fallback: keyword-based mock responses
    const lowerMessage = message.toLowerCase();
    let reply = "";

    if (lowerMessage.includes("dluzim") || lowerMessage.includes("dluh")) {
      reply = `Na základě vašich smluv máte celkem ${loanContracts.length} úvěrů v celkové výši ${totalLoanAmount.toLocaleString("cs-CZ")} Kč. ${loanContracts.length > 0 ? `Vaše úvěry: ${loanContracts.map((c) => `${c.name || c.title || "Úvěr"} - ${Number(c.amount || 0).toLocaleString("cs-CZ")} Kč`).join(", ")}.` : "Aktuálně nemáte žádné evidované úvěry."}`;
    } else if (
      lowerMessage.includes("pojistka") ||
      lowerMessage.includes("pojisteni")
    ) {
      reply = `Máte celkem ${insuranceContracts.length} pojistných smluv. ${insuranceContracts.length > 0 ? `Vaše pojistky: ${insuranceContracts.map((c) => `${c.name || c.title || "Pojistka"} - ${Number(c.amount || 0).toLocaleString("cs-CZ")} Kč`).join(", ")}.` : "Aktuálně nemáte žádné evidované pojistky. Doporučuji probrat možnosti s vaším poradcem."}`;
    } else if (lowerMessage.includes("splatka")) {
      const pendingPayments = payments.filter((p) => p.status !== "paid");
      reply = `Z posledních ${payments.length} plateb je ${pendingPayments.length} neuhrazených v celkové výši ${pendingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0).toLocaleString("cs-CZ")} Kč. ${pendingPayments.length > 0 ? "Doporučuji uhradit co nejdříve." : "Všechny platby jsou uhrazeny, skvělá práce!"}`;
    } else if (
      lowerMessage.includes("cil") ||
      lowerMessage.includes("investice")
    ) {
      reply = `Máte celkem ${goals.length} finančních cílů. ${goals.length > 0 ? goals.map((g) => `${g.name || g.title || "Cíl"}: ${Number(g.current_amount || 0).toLocaleString("cs-CZ")} / ${Number(g.target_amount || 0).toLocaleString("cs-CZ")} Kč`).join("; ") + "." : "Aktuálně nemáte žádné nastavené cíle. Doporučuji si stanovit finanční cíle pro lepší plánování."}`;
    } else {
      reply =
        "Pro podrobnější informace doporučuji kontaktovat vašeho poradce. Mohu vám pomoci s dotazy ohledně vašich smluv, plateb a finančních cílů.";
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Chyba pri zpracovani dotazu" },
      { status: 500 }
    );
  }
}
