import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // AUTH: verify the requester is the invoice owner
  const cookieStore = await cookies();
  const authSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: advisor } = await authSupabase
    .from("advisors")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!advisor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, advisors(company_name, email, billing_name, billing_ico, billing_dic, billing_address)")
    .eq("id", id)
    .eq("advisor_id", advisor.id)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const advisorBilling = invoice.advisors as Record<string, string> | null;
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text("FAKTURA", 20, 25);
  doc.setFontSize(10);
  doc.text(`Cislo: ${invoice.invoice_number || "—"}`, 20, 35);
  doc.text(`Datum vystaveni: ${new Date(invoice.created_at).toLocaleDateString("cs-CZ")}`, 20, 42);
  doc.text(`Datum splatnosti: ${new Date(invoice.due_date).toLocaleDateString("cs-CZ")}`, 20, 49);

  // Supplier
  doc.setFontSize(11);
  doc.text("Dodavatel:", 20, 65);
  doc.setFontSize(9);
  doc.text("Harotas s.r.o.", 20, 72);
  doc.text("ICO: 21402027 | DIC: CZ21402027", 20, 78);
  doc.text("Skolska 689/20, Nove Mesto, 110 00 Praha 1", 20, 84);

  // Customer
  doc.setFontSize(11);
  doc.text("Odberatel:", 120, 65);
  doc.setFontSize(9);
  doc.text(advisorBilling?.billing_name || advisorBilling?.company_name || "—", 120, 72);
  if (advisorBilling?.billing_ico) doc.text(`ICO: ${advisorBilling.billing_ico}`, 120, 78);
  if (advisorBilling?.billing_dic) doc.text(`DIC: ${advisorBilling.billing_dic}`, 120, 84);
  if (advisorBilling?.billing_address) doc.text(advisorBilling.billing_address, 120, 90);

  // Table header
  let y = 110;
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y - 5, 170, 8, "F");
  doc.setFontSize(9);
  doc.text("Polozka", 22, y);
  doc.text("Obdobi", 100, y);
  doc.text("Castka", 155, y);

  // Table row
  y += 12;
  doc.text("Predplatne Finatiq", 22, y);
  doc.text(invoice.period || "—", 100, y);
  doc.text(`${Number(invoice.amount).toLocaleString("cs-CZ")} Kc`, 155, y);

  // Totals
  y += 20;
  doc.text(`Zaklad: ${Number(invoice.amount).toLocaleString("cs-CZ")} Kc`, 130, y);
  if (invoice.vat_applied) {
    y += 7;
    doc.text(`DPH 21%: ${Number(invoice.vat_amount).toLocaleString("cs-CZ")} Kc`, 130, y);
  }
  y += 7;
  doc.setFontSize(11);
  const total = Number(invoice.total_with_vat || invoice.amount);
  doc.text(`Celkem: ${total.toLocaleString("cs-CZ")} Kc`, 130, y);

  // Payment info
  y += 20;
  doc.setFontSize(9);
  doc.text("Platebni udaje:", 20, y);
  y += 7;
  doc.text("Banka: Fio banka", 20, y);
  y += 6;
  const vs = (invoice.invoice_number || "").replace(/-/g, "");
  doc.text(`VS: ${vs}`, 20, y);

  const pdfBuffer = doc.output("arraybuffer");

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="faktura-${invoice.invoice_number || id}.pdf"`,
    },
  });
}
