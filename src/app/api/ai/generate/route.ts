import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const PROMPTS: Record<string, string> = {
  client_summary: `Jsi finanční poradce. Na základě dodaných dat o klientovi vygeneruj stručné česky psané shrnutí (3-5 vět). Zaměř se na: celkový finanční stav, hlavní rizika, doporučení pro další kroky. Odpovídej pouze textem shrnutí, bez formátování.`,
  deal_summary: `Jsi finanční poradce. Na základě dat o obchodním případu (dealu) vygeneruj stručné shrnutí a doporučení (2-3 věty). Odpovídej česky, pouze textem.`,
  email_draft: `Jsi finanční poradce. Napiš profesionální email klientovi v češtině. Email musí být zdvořilý, stručný a konkrétní. Odpovídej pouze textem emailu.`,
  upsell_suggestion: `Jsi finanční poradce. Na základě dodaného kontextu napiš stručné doporučení (1-2 věty) pro cross-sell nebo upsell příležitost. Odpovídej česky.`,
};

export async function POST(request: Request) {
  // Rate limit: 30 per hour per IP
  const ip = getClientIp(request);
  const limited = checkRateLimit(`${ip}:ai-generate`, 30, 60 * 60 * 1000);
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

  const { type, context } = await request.json();
  const openaiKey = process.env.OPENAI_API_KEY;
  const systemPrompt = PROMPTS[type] || "Jsi finanční asistent. Odpovídej česky, stručně a profesionálně.";

  if (openaiKey) {
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
            { role: "user", content: `Kontext:\n${JSON.stringify(context, null, 2)}` },
          ],
          max_tokens: 1024,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const text = aiData.choices?.[0]?.message?.content || "";
        if (text) return NextResponse.json({ text });
      }
    } catch (err) {
      console.error("AI generate error:", err);
    }
  }

  // Fallback: mock responses
  let text = "";

  switch (type) {
    case "client_summary":
      text = `Klient ${context?.name || ""} patří do segmentu ${context?.segment || "standardní"}. ` +
        `Celková hodnota portfolia činí ${context?.portfolioValue || "0"} Kč. ` +
        `Má ${context?.activeContracts || 0} aktivních smluv a ${context?.pendingPayments || 0} čekajících plateb. ` +
        `Doporučuji zaměřit se na ${context?.segment === "vip" ? "udržení vztahu a exkluzivní nabídky" : "rozšíření portfolia a cross-sell příležitosti"}.`;
      break;

    case "deal_summary":
      text = `Deal "${context?.title || ""}" s hodnotou ${context?.value || "0"} Kč se nachází ve fázi ${context?.stage || "neznámá"}. ` +
        `Kontakt: ${context?.contact || "neuveden"}. ` +
        `Doporučení: ${context?.isOld ? "Tento deal je v pipeline již delší dobu. Zvažte follow-up nebo přehodnocení strategie." : "Deal postupuje standardním tempem. Pokračujte v aktivní komunikaci s klientem."}`;
      break;

    case "email_draft":
      text = `Dobrý den ${context?.clientName || ""},\n\n` +
        `navazuji na naši předchozí komunikaci a rád bych Vás informoval o nových možnostech, které by mohly být pro Vás zajímavé.\n\n` +
        `Na základě Vašeho aktuálního portfolia bych doporučil zvážit ${context?.recommendation || "diverzifikaci investic"}.\n\n` +
        `Rád si s Vámi domluvm schůzku, kde bychom vše probrali podrobněji.\n\n` +
        `S pozdravem,\n${context?.advisorName || "Váš poradce"}`;
      break;

    case "upsell_suggestion":
      text = `Na základě analýzy portfolia klienta doporučuji: ${context?.recommendation || "Zvážit doplňkové pojištění nebo investiční produkt."}`;
      break;

    default:
      text = "AI asistent je připraven pomoci. Zadejte konkrétní požadavek.";
  }

  return NextResponse.json({ text });
}
