import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireClientAccess } from "@/lib/api/portal-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id");
  if (!clientId) {
    return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
  }

  const auth = await requireClientAccess(clientId);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, title, type, provider")
    .eq("client_id", clientId);

  if (!contracts || contracts.length === 0) {
    return NextResponse.json({ duplicates: [] });
  }

  const duplicates: { type: string; contracts: { id: string; title: string }[]; message: string }[] = [];

  // Check duplicate types
  const typeGroups: Record<string, typeof contracts> = {};
  for (const c of contracts) {
    const t = c.type || "unknown";
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(c);
  }

  for (const [type, group] of Object.entries(typeGroups)) {
    if (group.length > 1) {
      const typeLabel = type === "pojisteni" ? "pojištění" : type === "uver" ? "úvěr" : type;
      duplicates.push({
        type: "duplicate_type",
        contracts: group.map((c) => ({ id: c.id, title: c.title })),
        message: `Máte ${group.length}x ${typeLabel} — možná zbytečné duplicitní krytí`,
      });
    }
  }

  // Check duplicate providers
  const providerGroups: Record<string, typeof contracts> = {};
  for (const c of contracts) {
    const p = c.provider || "";
    if (!p) continue;
    if (!providerGroups[p]) providerGroups[p] = [];
    providerGroups[p].push(c);
  }

  for (const [provider, group] of Object.entries(providerGroups)) {
    if (group.length > 1) {
      duplicates.push({
        type: "duplicate_provider",
        contracts: group.map((c) => ({ id: c.id, title: c.title })),
        message: `Máte ${group.length} smluv u poskytovatele ${provider}`,
      });
    }
  }

  return NextResponse.json({ duplicates });
}
