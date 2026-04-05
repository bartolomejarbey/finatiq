import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const overrideSchema = z.object({
  merchant_name: z.string().optional(),
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum musí být ve formátu YYYY-MM-DD"),
  total_amount: z.number().min(0, "Částka musí být kladná"),
  currency: z.string().default("CZK"),
  vat_amount: z.number().optional(),
  override_reason: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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

  const body = await request.json();
  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstError?.message ?? "Neplatná data" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify document belongs to user
  const { data: existing } = await supabaseAdmin
    .from("scanned_documents")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Dokument nenalezen" }, { status: 404 });
  }

  if (existing.tenant_id !== user.id && existing.uploaded_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Save override
  const { error: updateError } = await supabaseAdmin
    .from("scanned_documents")
    .update({
      merchant_name: data.merchant_name ?? null,
      document_date: data.document_date,
      total_amount: data.total_amount,
      currency: data.currency,
      vat_amount: data.vat_amount ?? null,
      quality_status: "manual_override",
      manually_overridden: true,
      original_rejection_reason: existing.rejection_reason,
      override_reason: data.override_reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Chyba při ukládání: " + updateError.message },
      { status: 500 }
    );
  }

  // Update processing log
  await supabaseAdmin
    .from("scanned_document_processing_logs")
    .update({ was_overridden: true })
    .eq("scanned_document_id", id);

  return NextResponse.json({ success: true });
}
