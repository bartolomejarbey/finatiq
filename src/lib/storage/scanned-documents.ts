import { createClient } from "@supabase/supabase-js";

const BUCKET = "scanned-documents";

/**
 * Generate a fresh signed URL for a scanned document in the private bucket.
 * Uses service role key — call from server-side only (API routes, Server Components).
 */
export async function getScannedDocumentSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Delete a scanned document file from storage.
 */
export async function deleteScannedDocumentFile(filePath: string): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);

  if (error) {
    console.error("Failed to delete scanned document:", error);
    return false;
  }

  return true;
}
