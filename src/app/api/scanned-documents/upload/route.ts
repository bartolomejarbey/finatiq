import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { processDocument } from "@/lib/services/document-processor";
import { getScannedDocumentSignedUrl } from "@/lib/storage/scanned-documents";

export async function POST(request: Request) {
  // Rate limit: 30 uploads per day per IP
  const ip = getClientIp(request);
  const limited = checkRateLimit(`${ip}:doc-upload`, 30, 24 * 60 * 60 * 1000);
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const clientId = formData.get("client_id") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Chybí soubor" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Nepodporovaný typ souboru. Povolené: JPG, PNG, PDF." },
      { status: 400 }
    );
  }

  // Validate file size (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Soubor je příliš velký (max 10 MB)." },
      { status: 400 }
    );
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("scanned-documents")
      .upload(fileName, file, {
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Chyba při nahrávání souboru: " + uploadError.message },
        { status: 500 }
      );
    }

    // 2. Create pending record in DB — store only file_path, NOT signed URL
    // TODO: Až přidáme team accounts, tenant_id musí jít z advisors.id nebo organization tabulky,
    // ne přímo z user.id. Aktuálně advisor.user_id = tenant_id.
    const { data: doc, error: insertError } = await supabaseAdmin
      .from("scanned_documents")
      .insert({
        tenant_id: user.id,
        uploaded_by: user.id,
        client_id: clientId || null,
        file_path: fileName,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
      })
      .select()
      .single();

    if (insertError || !doc) {
      return NextResponse.json(
        { error: "Chyba při ukládání záznamu: " + (insertError?.message ?? "") },
        { status: 500 }
      );
    }

    // 3. Process via OpenAI Vision — service generates its own signed URL
    const result = await processDocument(fileName, {
      tenantId: user.id,
      documentId: doc.id,
    });

    // 4. Return result — generate a fresh signed URL for client preview
    const previewUrl =
      result.status === "rejected"
        ? await getScannedDocumentSignedUrl(fileName, 3600)
        : null;

    if (result.status === "rejected") {
      return NextResponse.json({
        success: false,
        status: "rejected",
        document_id: doc.id,
        message: result.retry_guidance,
        rejection_code: result.rejection_reason,
        file_url: previewUrl,
        actions: [
          { type: "retake", label: "Vyfotit znovu" },
          { type: "override", label: "Uložit stejně a doplnit ručně" },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      document_id: doc.id,
      data: result.data,
      summary: result.summary,
      document_type: result.document_type,
      warning_fields: result.warning_fields,
      model_used: result.model_used,
      escalated: result.escalated,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Chyba při zpracování dokumentu",
      },
      { status: 500 }
    );
  }
}
