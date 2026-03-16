"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploadProps {
  clientId: string;
  advisorId: string;
  category?: string;
  onUploaded?: (docId: string, ocrData?: Record<string, unknown>) => void;
  runOcr?: boolean;
}

export function DocumentUpload({ clientId, advisorId, category = "other", onUploaded, runOcr = false }: DocumentUploadProps) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.size <= 10 * 1024 * 1024) setFile(f);
    else if (f) toast.error("Soubor je příliš velký (max 10 MB).");
  }, []);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.size <= 10 * 1024 * 1024) setFile(f);
    else if (f) toast.error("Soubor je příliš velký (max 10 MB).");
  }, []);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(20);

    const filePath = `client-docs/${clientId}/${Date.now()}_${file.name}`;
    setProgress(40);

    const { error: storageError } = await supabase.storage.from("deal-documents").upload(filePath, file);
    if (storageError) {
      toast.error("Chyba při nahrávání souboru.");
      setUploading(false);
      setProgress(0);
      return;
    }

    setProgress(70);

    const { data: doc } = await supabase.from("client_documents").insert({
      client_id: clientId,
      advisor_id: advisorId,
      name: file.name,
      category,
      file_path: filePath,
      file_size: file.size,
      uploaded_by: "client",
    }).select("id").single();

    setProgress(90);

    if (!doc) {
      toast.error("Chyba při ukládání záznamu.");
      setUploading(false);
      return;
    }

    // Run OCR if requested
    let ocrData: Record<string, unknown> | undefined;
    if (runOcr) {
      setOcrLoading(true);
      try {
        const res = await fetch("/api/ocr/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: doc.id }),
        });
        const result = await res.json();
        if (result.ok) ocrData = result.ocr_data;
      } catch {
        // OCR failure is non-critical
      }
      setOcrLoading(false);
    }

    setProgress(100);
    setUploading(false);
    setDone(true);
    toast.success("Dokument nahrán.");
    onUploaded?.(doc.id, ocrData);
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <span className="text-sm font-medium text-emerald-700">Dokument nahrán</span>
        <button onClick={() => { setDone(false); setFile(null); setProgress(0); }} className="ml-auto text-xs text-emerald-500 hover:text-emerald-700">Nahrát další</button>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-colors"
        style={{ borderColor: "var(--card-border, #e2e8f0)" }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Upload className="mb-2 h-8 w-8" style={{ color: "var(--card-text-dim, #94a3b8)" }} />
        <p className="text-sm" style={{ color: "var(--card-text-muted, #64748b)" }}>Přetáhněte soubor sem</p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--card-text-muted, #64748b)" }}>PDF, JPG, PNG — max 10 MB</p>
        <label className="mt-3 cursor-pointer rounded-lg px-4 py-2 text-xs font-medium" style={{ backgroundColor: "var(--table-hover, #f1f5f9)", color: "var(--card-text-muted, #475569)" }}>
          Vybrat soubor
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleSelect} />
        </label>
      </div>

      {file && (
        <div className="mt-3">
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
            <FileText className="h-4 w-4 text-blue-500" />
            <span className="flex-1 text-xs text-blue-700 truncate">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
            <button onClick={() => setFile(null)} className="text-blue-400 hover:text-blue-600"><X className="h-3 w-3" /></button>
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
              <div className="h-1.5 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading || ocrLoading} size="sm" className="mt-3 w-full">
            {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : ocrLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
            {ocrLoading ? "Zpracování OCR..." : uploading ? "Nahrávání..." : "Nahrát"}
          </Button>
        </div>
      )}
    </div>
  );
}
