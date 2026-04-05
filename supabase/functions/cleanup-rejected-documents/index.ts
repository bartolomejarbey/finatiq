// Supabase Edge Function: Cleanup rejected documents older than 30 days
// Schedule: Daily at 3:00 AM via Supabase Dashboard → Edge Functions → Cron Triggers
// Cron expression: 0 3 * * *

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Find rejected, non-overridden documents older than 30 days
  const { data: docs, error: fetchError } = await supabase
    .from("scanned_documents")
    .select("id, file_path")
    .eq("quality_status", "rejected")
    .eq("manually_overridden", false)
    .lt("created_at", thirtyDaysAgo);

  if (fetchError) {
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500 }
    );
  }

  if (!docs || docs.length === 0) {
    return new Response(
      JSON.stringify({ message: "No documents to clean up", deleted: 0 })
    );
  }

  // Delete files from Storage
  const filePaths = docs
    .map((d) => d.file_path)
    .filter(Boolean) as string[];

  if (filePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("scanned-documents")
      .remove(filePaths);

    if (storageError) {
      console.error("Storage cleanup error:", storageError.message);
    }
  }

  // Delete DB records (cascade deletes processing_logs)
  const ids = docs.map((d) => d.id);
  const { error: deleteError } = await supabase
    .from("scanned_documents")
    .delete()
    .in("id", ids);

  if (deleteError) {
    return new Response(
      JSON.stringify({ error: deleteError.message }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({
      message: `Cleaned up ${ids.length} rejected documents`,
      deleted: ids.length,
      file_paths_removed: filePaths.length,
    })
  );
});
