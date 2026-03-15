import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

  const { clientName, products, totalValue, note, advisorName, companyName } = await request.json();

  if (!clientName || !products || !Array.isArray(products)) {
    return NextResponse.json({ error: "Chybí povinné údaje" }, { status: 400 });
  }

  const date = new Date().toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Generate PDF-like HTML (downloadable as HTML, convertible to PDF via browser print)
  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title>Nabídka - ${clientName}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #22d3ee; padding-bottom: 20px; }
  .company { font-size: 24px; font-weight: 700; color: #060d1a; }
  .meta { text-align: right; font-size: 13px; color: #666; }
  h1 { font-size: 22px; margin: 0 0 8px; color: #060d1a; }
  .client-info { background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .client-info p { margin: 4px 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  th { background: #060d1a; color: #fff; padding: 10px 16px; text-align: left; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
  td { padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
  tr:nth-child(even) { background: #f8fafc; }
  .total-row { background: #060d1a !important; color: #22d3ee; font-weight: 700; font-size: 16px; }
  .note { margin-top: 24px; padding: 16px; background: #f0f9ff; border-left: 4px solid #22d3ee; border-radius: 0 8px 8px 0; font-size: 14px; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; color: #999; }
  .signature { margin-top: 48px; }
  .signature-line { width: 200px; border-top: 1px solid #333; padding-top: 4px; font-size: 13px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${companyName || "Finatiq"}</div>
      <p style="margin:4px 0 0;font-size:13px;color:#666;">${advisorName || "Finanční poradce"}</p>
    </div>
    <div class="meta">
      <p>Datum: ${date}</p>
      <p>Č. nabídky: NAB-${Date.now().toString(36).toUpperCase()}</p>
    </div>
  </div>

  <h1>Nabídka finančních produktů</h1>

  <div class="client-info">
    <p><strong>Klient:</strong> ${clientName}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Produkt</th>
        <th>Typ</th>
        <th>Popis</th>
        <th style="text-align:right">Hodnota</th>
      </tr>
    </thead>
    <tbody>
      ${(products as { name: string; type: string; description: string; value: number }[])
        .map(
          (p) => `<tr>
        <td>${p.name}</td>
        <td>${p.type || "—"}</td>
        <td>${p.description || "—"}</td>
        <td style="text-align:right;font-weight:600">${p.value ? new Intl.NumberFormat("cs-CZ").format(p.value) + " Kč" : "—"}</td>
      </tr>`
        )
        .join("")}
      <tr class="total-row">
        <td colspan="3">Celková hodnota nabídky</td>
        <td style="text-align:right">${new Intl.NumberFormat("cs-CZ").format(totalValue || 0)} Kč</td>
      </tr>
    </tbody>
  </table>

  ${note ? `<div class="note"><strong>Poznámka:</strong> ${note}</div>` : ""}

  <div class="signature">
    <div class="signature-line">${advisorName || "Podpis poradce"}</div>
  </div>

  <div class="footer">
    <span>${companyName || "Finatiq"}</span>
    <span>Vygenerováno platformou Finatiq</span>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="nabidka_${clientName.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.html"`,
    },
  });
}
