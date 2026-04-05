import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify document belongs to user
  const { data: existing } = await supabaseAdmin
    .from("scanned_documents")
    .select("id, tenant_id, uploaded_by, file_path, quality_status")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Dokument nenalezen" }, { status: 404 });
  }

  if (existing.tenant_id !== user.id && existing.uploaded_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Delete file from storage
    if (existing.file_path) {
      await supabaseAdmin.storage
        .from("scanned-documents")
        .remove([existing.file_path]);
    }

    // Delete processing logs
    await supabaseAdmin
      .from("scanned_document_processing_logs")
      .delete()
      .eq("scanned_document_id", id);

    // Delete document record
    await supabaseAdmin.from("scanned_documents").delete().eq("id", id);

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error("Retake delete error:", error);
    return NextResponse.json(
      { error: "Chyba při mazání dokumentu" },
      { status: 500 }
    );
  }
}
