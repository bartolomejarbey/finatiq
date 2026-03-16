import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

  // Mock AI responses based on type
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

  // Simulate slight delay for realism
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({ text });
}
