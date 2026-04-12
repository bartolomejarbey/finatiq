"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PortalPageContainer } from "@/components/portal/PortalPageContainer";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderOpen, Upload, FileText, Loader2, Brain, Eye, Scan } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { DocumentScanner } from "@/components/documents/DocumentScanner";
import { ScannedDocumentsList } from "@/components/documents/ScannedDocumentsList";

interface Doc {
  id: string;
  name: string;
  category: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  ocr_status: string | null;
  ai_analysis: Record<string, unknown> | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  contract: "Smlouva",
  receipt: "Účtenka",
  invoice: "Faktura",
  proof: "Doklad",
  other: "Jiné",
};

export default function DocumentsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [clientId, setClientId] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("other");
  const [ocrProcessing, setOcrProcessing] = useState<string | null>(null);
  const [viewingAnalysis, setViewingAnalysis] = useState<Record<string, unknown> | null>(null);

  async function fetchData() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: client, error: clientError } = await supabase.from("clients").select("id, advisor_id").eq("user_id", user.id).single();
      if (clientError) {
        setError("Nepodařilo se načíst klientský profil.");
        setLoading(false);
        return;
      }
      if (!client) { setLoading(false); return; }
      setClientId(client.id);
      setAdvisorId(client.advisor_id);

      const { data, error: docsError } = await supabase.from("client_documents").select("id, name, category, file_path, file_size, uploaded_by, created_at, ocr_status, ai_analysis").eq("client_id", client.id).order("created_at", { ascending: false });
      if (docsError) {
        setError("Nepodařilo se načíst dokumenty.");
        setLoading(false);
        return;
      }
      setDocs(data || []);
      setLoading(false);
    }
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUpload() {
    if (!uploadFile || !clientId || !advisorId) return;
    setUploading(true);

    const filePath = `client-docs/${clientId}/${Date.now()}_${uploadFile.name}`;
    const { error: storageError } = await supabase.storage.from("deal-documents").upload(filePath, uploadFile);
    if (storageError) {
      toast.error("Chyba při nahrávání.");
      setUploading(false);
      return;
    }

    const { data: newDoc, error: insertError } = await supabase.from("client_documents").insert({
      client_id: clientId,
      advisor_id: advisorId,
      name: uploadFile.name,
      category: uploadCategory,
      file_path: filePath,
      file_size: uploadFile.size,
      uploaded_by: "client",
    }).select("id, name, category, file_path, file_size, uploaded_by, created_at, ocr_status, ai_analysis").single();

    if (insertError) {
      toast.error("Chyba při ukládání dokumentu: " + insertError.message);
      setUploading(false);
      return;
    }

    if (newDoc) {
      setDocs((prev) => [newDoc, ...prev]);

      // Auto-run OCR for PDF/image files
      const ext = uploadFile.name.toLowerCase().split(".").pop();
      if (ext && ["pdf", "jpg", "jpeg", "png"].includes(ext)) {
        runOcr(newDoc.id);
      }
    }

    setUploadFile(null);
    setUploading(false);
    toast.success("Dokument nahrán.");
  }

  async function runOcr(docId: string) {
    setOcrProcessing(docId);
    try {
      const res = await fetch("/api/ocr/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: docId }),
      });
      const result = await res.json();
      if (result.ok) {
        setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, ocr_status: "done", ai_analysis: result.ai_analysis } : d));
        toast.success("AI analýza dokončena.");
      }
    } catch {
      // OCR failure is non-critical
    }
    setOcrProcessing(null);
  }

  async function handleDownload(filePath: string) {
    const { data } = await supabase.storage.from("deal-documents").createSignedUrl(filePath, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) return <PortalPageContainer className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></PortalPageContainer>;
  if (error) return <PortalPageContainer><ErrorState description={error} onRetry={fetchData} /></PortalPageContainer>;

  return (
    <PortalPageContainer>
      <h1 className="mb-6 text-2xl font-bold text-[var(--card-text)]">Dokumenty</h1>

      <Tabs defaultValue="scan" className="mb-6">
        <TabsList>
          <TabsTrigger value="scan" className="gap-1.5">
            <Scan className="h-4 w-4" />
            Účtenky a faktury
          </TabsTrigger>
          <TabsTrigger value="legacy" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Všechny dokumenty
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB: Účtenky a faktury (AI Vision) ===== */}
        <TabsContent value="scan">
          <div className="space-y-6">
            <DocumentScanner clientId={clientId} />
            <ScannedDocumentsList />
          </div>
        </TabsContent>

        {/* ===== TAB: Všechny dokumenty (legacy) ===== */}
        <TabsContent value="legacy">

      {/* Upload zone */}
      <div className="mb-6 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-[var(--card-text)]">Nahrát dokument</h2>
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--card-border)] p-8 transition-colors hover:border-blue-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
        >
          <Upload className="mb-3 h-8 w-8 text-[var(--card-text-dim)]" />
          <p className="text-sm text-[var(--card-text-muted)]">Přetáhněte soubor sem nebo</p>
          <label className="mt-2 cursor-pointer rounded-lg bg-[var(--table-header)] px-4 py-2 text-xs font-medium text-[var(--card-text-muted)] hover:bg-[var(--table-hover)]">
            Vyberte soubor
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }} />
          </label>
        </div>

        {uploadFile && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-blue-700">{uploadFile.name} ({formatSize(uploadFile.size)})</span>
              <button onClick={() => setUploadFile(null)} className="ml-auto text-xs text-blue-400 hover:text-blue-600">Odebrat</button>
            </div>
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleUpload} disabled={uploading} size="sm">
              {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}Nahrát
            </Button>
          </div>
        )}
      </div>

      {/* Documents list */}
      {docs.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <FolderOpen className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádné dokumenty</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => (
            <div key={d.id} className="rounded-xl border bg-[var(--card-bg)] p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-[var(--card-text)]">{d.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px]">{CATEGORY_LABELS[d.category] || d.category}</Badge>
                      <span className="text-xs text-[var(--card-text-muted)]">{new Date(d.created_at).toLocaleDateString("cs-CZ")}</span>
                      <span className="text-xs text-[var(--card-text-muted)]">{formatSize(d.file_size)}</span>
                      <span className="text-xs text-[var(--card-text-muted)]">{d.uploaded_by === "client" ? "Vy" : "Poradce"}</span>
                      {d.ocr_status === "done" && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">AI analyzováno</Badge>}
                      {(d.ocr_status === "processing" || ocrProcessing === d.id) && <Badge className="bg-amber-100 text-amber-700 text-[10px]">Zpracovává se...</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.ai_analysis && d.ocr_status === "done" && !('parse_error' in (d.ai_analysis as Record<string, unknown>)) && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setViewingAnalysis(d.ai_analysis)}>
                      <Eye className="mr-1.5 h-3 w-3" />AI analýza
                    </Button>
                  )}
                  {!d.ocr_status && !ocrProcessing && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => runOcr(d.id)}>
                      <Brain className="mr-1.5 h-3 w-3" />Analyzovat
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => handleDownload(d.file_path)}>Stáhnout</Button>
                </div>
              </div>

              {/* AI Analysis summary */}
              {d.ai_analysis && d.ocr_status === "done" && !('parse_error' in (d.ai_analysis as Record<string, unknown>)) && (
                <div className="mt-3 rounded-lg bg-violet-50 p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {Boolean((d.ai_analysis as Record<string, unknown>).type) && <div><span className="text-violet-500">Typ:</span> <span className="font-medium text-violet-800">{String((d.ai_analysis as Record<string, unknown>).type)}</span></div>}
                    {Boolean((d.ai_analysis as Record<string, unknown>).provider) && <div><span className="text-violet-500">Poskytovatel:</span> <span className="font-medium text-violet-800">{String((d.ai_analysis as Record<string, unknown>).provider)}</span></div>}
                    {Boolean((d.ai_analysis as Record<string, unknown>).total_amount) && <div><span className="text-violet-500">Částka:</span> <span className="font-medium text-violet-800">{Number((d.ai_analysis as Record<string, unknown>).total_amount).toLocaleString("cs-CZ")} Kč</span></div>}
                    {Boolean((d.ai_analysis as Record<string, unknown>).interest_rate) && <div><span className="text-violet-500">Úrok:</span> <span className="font-medium text-violet-800">{String((d.ai_analysis as Record<string, unknown>).interest_rate)} %</span></div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Analysis detail dialog */}
      <Dialog open={!!viewingAnalysis} onOpenChange={(open) => { if (!open) setViewingAnalysis(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI analýza dokumentu</DialogTitle>
            <DialogDescription>
              Shrnutí automaticky zpracovaného dokumentu a doporučených kroků.
            </DialogDescription>
          </DialogHeader>
          {viewingAnalysis && (
            <div className="space-y-3 text-sm">
              {Object.entries(viewingAnalysis).map(([key, value]) => {
                if (!value || key === "parse_error" || key === "raw_response") return null;
                const label = { type: "Typ", provider: "Poskytovatel", interest_rate: "Úroková sazba", monthly_payment: "Měsíční splátka", total_amount: "Celková částka", insured_amount: "Pojistná částka", start_date: "Začátek", end_date: "Konec", fixation_end: "Konec fixace", has_indexation: "Indexace", has_insurance: "Pojištění", key_findings: "Důležité nálezy", risks: "Rizika", opportunities: "Příležitosti" }[key] || key;
                return (
                  <div key={key} className="flex gap-3">
                    <span className="w-32 shrink-0 text-[var(--card-text-muted)]">{label}:</span>
                    <span className="text-[var(--card-text)] font-medium">
                      {Array.isArray(value) ? (value as string[]).join(", ") : typeof value === "boolean" ? (value ? "Ano" : "Ne") : typeof value === "number" ? value.toLocaleString("cs-CZ") : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

        </TabsContent>
      </Tabs>
    </PortalPageContainer>
  );
}
