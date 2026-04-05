"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, FolderOpen, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { DocumentUploadResult } from "./DocumentUploadResult";

interface UploadResult {
  success: boolean;
  status: "ok" | "warning" | "rejected";
  document_id: string;
  data?: Record<string, unknown>;
  summary?: string;
  document_type?: string;
  warning_fields?: string[] | null;
  message?: string;
  rejection_code?: string | null;
  file_url?: string | null;
  model_used?: string;
  escalated?: boolean;
}

interface DocumentScannerProps {
  clientId?: string;
  onProcessed?: (result: UploadResult) => void;
}

async function compressBeforeUpload(file: File): Promise<File> {
  if (file.type === "application/pdf") return file;

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    return await imageCompression(file, options);
  } catch (err) {
    console.warn("Komprese selhala, posílám originál:", err);
    return file;
  }
}

export function DocumentScanner({ clientId, onProcessed }: DocumentScannerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size pre-compression
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Soubor je příliš velký (max 10 MB po kompresi).");
      resetInputs();
      return;
    }

    setCompressing(true);
    const compressed = await compressBeforeUpload(file);
    setCompressing(false);

    if (compressed.size > 10 * 1024 * 1024) {
      toast.error("Soubor je příliš velký i po kompresi (max 10 MB).");
      resetInputs();
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", compressed);
      if (clientId) formData.append("client_id", clientId);

      const response = await fetch("/api/scanned-documents/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResult = await response.json();

      if (!response.ok) {
        toast.error((data as { error?: string }).error ?? "Chyba při zpracování.");
        setUploading(false);
        resetInputs();
        return;
      }

      setResult(data);
      onProcessed?.(data);
    } catch {
      toast.error("Chyba při nahrávání. Zkus to prosím znovu.");
    }

    setUploading(false);
    resetInputs();
  }

  function resetInputs() {
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  function handleRetake() {
    if (result?.document_id) {
      fetch(`/api/scanned-documents/${result.document_id}/retake`, {
        method: "POST",
      }).catch(() => {});
    }
    setResult(null);
    // Open camera for retake
    cameraRef.current?.click();
  }

  function handleReset() {
    setResult(null);
  }

  // Show result
  if (result) {
    return (
      <DocumentUploadResult
        status={result.status}
        documentId={result.document_id}
        data={result.data as never}
        summary={result.summary}
        documentType={result.document_type}
        warningFields={result.warning_fields}
        rejectionCode={result.rejection_code}
        retryGuidance={result.message}
        fileUrl={result.file_url ?? undefined}
        modelUsed={result.model_used}
        escalated={result.escalated}
        onRetake={handleRetake}
        onOverrideSuccess={handleReset}
        onClose={handleReset}
      />
    );
  }

  // Show upload UI
  return (
    <div className="rounded-2xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-6">
      <h3 className="mb-4 text-sm font-semibold text-[var(--card-text)]">
        Naskenovat dokument
      </h3>

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFile}
        className="hidden"
      />

      {uploading || compressing ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-[var(--card-text-muted)]">
            {compressing
              ? "Komprese obrázku..."
              : "Zpracovávám dokument..."}
          </p>
          <p className="text-xs text-[var(--card-text-dim)]">
            AI analyzuje účtenku, může to trvat pár sekund
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => cameraRef.current?.click()}
            className="flex-1 gap-2"
            size="lg"
          >
            <Camera className="h-5 w-5" />
            Vyfotit účtenku
          </Button>
          <Button
            onClick={() => galleryRef.current?.click()}
            variant="outline"
            className="flex-1 gap-2"
            size="lg"
          >
            <FolderOpen className="h-5 w-5" />
            Nahrát soubor
          </Button>
        </div>
      )}

      <p className="mt-3 text-center text-[10px] text-[var(--card-text-dim)]">
        JPG, PNG nebo PDF do 10 MB. Fotky se automaticky komprimují.
      </p>
    </div>
  );
}
