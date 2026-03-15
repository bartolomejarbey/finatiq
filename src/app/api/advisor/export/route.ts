import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
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

  const type = request.nextUrl.searchParams.get("type") || "clients";

  const escape = (val: string | number | null | undefined): string => {
    const str = val == null ? "" : String(val);
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  let csvContent = "\uFEFF"; // BOM for Excel

  if (type === "clients") {
    const { data: clients } = await supabase
      .from("clients")
      .select("first_name, last_name, email, phone, segment, created_at")
      .order("created_at", { ascending: false });

    const headers = ["Jméno", "Příjmení", "Email", "Telefon", "Segment", "Vytvořen"];
    const rows = (clients || []).map((c) => [
      escape(c.first_name),
      escape(c.last_name),
      escape(c.email),
      escape(c.phone),
      escape(c.segment),
      escape(c.created_at ? new Date(c.created_at).toLocaleDateString("cs-CZ") : ""),
    ]);

    csvContent += [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  } else if (type === "deals") {
    const { data: deals } = await supabase
      .from("deals")
      .select("title, value, contact_name, contact_email, source, created_at, converted_at, lost_at")
      .order("created_at", { ascending: false });

    const headers = ["Název", "Hodnota", "Kontakt", "Email", "Zdroj", "Vytvořen", "Konvertován", "Ztracen"];
    const rows = (deals || []).map((d) => [
      escape(d.title),
      escape(d.value),
      escape(d.contact_name),
      escape(d.contact_email),
      escape(d.source),
      escape(d.created_at ? new Date(d.created_at).toLocaleDateString("cs-CZ") : ""),
      escape(d.converted_at ? new Date(d.converted_at).toLocaleDateString("cs-CZ") : ""),
      escape(d.lost_at ? new Date(d.lost_at).toLocaleDateString("cs-CZ") : ""),
    ]);

    csvContent += [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  } else {
    return NextResponse.json({ error: "Neznámý typ exportu" }, { status: 400 });
  }

  await logAudit(user.id, "advisor", "export", type);

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}_export_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
