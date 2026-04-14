import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const STATIC_PAGES = [
  { label: "Přehled", href: "/advisor", type: "page" },
  { label: "Obchodní příležitosti", href: "/advisor/crm/pipeline", type: "page" },
  { label: "Klienti", href: "/advisor/clients", type: "page" },
  { label: "Nové smlouvy", href: "/advisor/smlouvy-klientu", type: "page" },
  { label: "Připomínky", href: "/advisor/pripominky", type: "page" },
  { label: "Příležitosti", href: "/advisor/upsell", type: "page" },
  { label: "Automatizace", href: "/advisor/automatizace", type: "page" },
  { label: "Šablony", href: "/advisor/sablony", type: "page" },
  { label: "Kampaně", href: "/advisor/campaigns", type: "page" },
  { label: "Články", href: "/advisor/clanky", type: "page" },
  { label: "Kalendář", href: "/advisor/kalendar", type: "page" },
  { label: "Nastavení", href: "/advisor/settings", type: "page" },
  { label: "Branding", href: "/advisor/nastaveni/branding", type: "page" },
  { label: "Upsell pravidla", href: "/advisor/nastaveni/upsell-pravidla", type: "page" },
  { label: "Tým", href: "/advisor/nastaveni/tym", type: "page" },
  { label: "Podpora", href: "/advisor/podpora", type: "page" },
  { label: "Předplatné", href: "/advisor/predplatne", type: "page" },
  { label: "Import klientů", href: "/advisor/import", type: "page" },
  { label: "Spokojenost", href: "/advisor/spokojenost", type: "page" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get advisor_id
  const { data: adv } = await supabase
    .from("advisors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!adv) {
    return NextResponse.json({ results: [] });
  }

  const results: { label: string; href: string; type: string; subtitle?: string }[] = [];

  // Sanitize query for PostgREST ilike — escape special chars
  const sanitizedQ = q.replace(/[%_\\]/g, (ch) => `\\${ch}`);

  // 1. Search static pages
  const pageMatches = STATIC_PAGES.filter((p) =>
    p.label.toLowerCase().includes(q)
  ).slice(0, 3);
  results.push(...pageMatches);

  // 2. Search clients
  const { data: clients } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email")
    .eq("advisor_id", adv.id)
    .or(
      `first_name.ilike.%${sanitizedQ}%,last_name.ilike.%${sanitizedQ}%,email.ilike.%${sanitizedQ}%`
    )
    .limit(5);

  if (clients) {
    for (const c of clients) {
      results.push({
        label: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || "Klient",
        href: `/advisor/clients/${c.id}`,
        type: "client",
        subtitle: c.email || undefined,
      });
    }
  }

  // 3. Search deals
  const { data: deals } = await supabase
    .from("deals")
    .select("id, name, client_id")
    .eq("advisor_id", adv.id)
    .ilike("name", `%${sanitizedQ}%`)
    .limit(3);

  if (deals) {
    for (const d of deals) {
      results.push({
        label: d.name,
        href: `/advisor/crm/pipeline`,
        type: "deal",
      });
    }
  }

  return NextResponse.json({ results: results.slice(0, 10) });
}
