import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getScannedDocumentSignedUrl } from "@/lib/storage/scanned-documents";

export async function GET(request: Request) {
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

  // Get client record to find tenant (advisor)
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, advisor_id")
    .eq("user_id", user.id)
    .single();

  // User can be advisor (tenant) or client
  const isClient = !!client;

  let query = supabaseAdmin
    .from("scanned_documents")
    .select(
      "id, file_path, file_name, file_size_bytes, mime_type, document_type, merchant_name, document_date, total_amount, currency, quality_status, summary, created_at, manually_overridden"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (isClient) {
    // Client sees documents uploaded by them or assigned to them
    query = query.or(
      `uploaded_by.eq.${user.id},client_id.eq.${client.id}`
    );
  } else {
    // Advisor sees their own documents (they are the tenant)
    query = query.eq("tenant_id", user.id);
  }

  const { data: docs, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Generate fresh signed URLs for thumbnails
  const docsWithUrls = await Promise.all(
    (docs || []).map(async (doc) => {
      const thumbnailUrl = doc.file_path
        ? await getScannedDocumentSignedUrl(doc.file_path, 3600)
        : null;
      return { ...doc, thumbnail_url: thumbnailUrl };
    })
  );

  return NextResponse.json({ documents: docsWithUrls });
}
