"use client";

import { useEffect, useState, useRef } from "react";
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
import {
  FolderOpen, Upload, FileText, Loader2, Camera,
  Receipt, FileSpreadsheet, ScrollText, TrendingUp,
  TrendingDown, ArrowUpDown, Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { DocumentUploadResult } from "@/components/documents/DocumentUploadResult";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VisionDoc {
  id: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  document_type: string | null;
  merchant_name: string | null;
  document_date: string | null;
  total_amount: number | null;
  currency: string | null;
  quality_status: string | null;
  summary: string | null;
  created_at: string;
  manually_overridden: boolean;
  thumbnail_url: string | null;
}

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_CONFIG: Record<string, {
  label: string;
  icon: typeof Receipt;
  color: string;
  bgColor: string;
  flow: "income" | "expense" | "neutral";
}> = {
  invoice: {
    label: "Faktura",
    icon: FileSpreadsheet,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    flow: "income",
  },
  receipt: {
    label: "Účtenka",
    icon: Receipt,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    flow: "expense",
  },
  contract: {
    label: "Smlouva",
    icon: ScrollText,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    flow: "neutral",
  },
  statement: {
    label: "Výpis",
    icon: FileText,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    flow: "neutral",
  },
  other: {
    label: "Jiné",
    icon: FileText,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    flow: "neutral",
  },
};

const FILTER_TABS = [
  { key: "all", label: "Vše" },
  { key: "invoice", label: "Faktury" },
  { key: "receipt", label: "Účtenky" },
  { key: "contract", label: "Smlouvy" },
  { key: "statement", label: "Výpisy" },
  { key: "other", label: "Jiné" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-emerald-100 text-emerald-700" },
  warning: { label: "Ke kontrole", className: "bg-amber-100 text-amber-700" },
  rejected: { label: "Odmítnuto", className: "bg-red-100 text-red-700" },
  manual_override: { label: "Ručně", className: "bg-orange-100 text-orange-700" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function compressImage(file: File): Promise<File> {
  if (file.type === "application/pdf") return file;
  try {
    return await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
  } catch {
    return file;
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<VisionDoc[]>([]);
  const [clientId, setClientId] = useState("");
  const [filter, setFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [viewingDoc, setViewingDoc] = useState<VisionDoc | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch documents ──
  async function fetchData() {
    setLoading(true);
    setError(null);

    const meRes = await fetch("/api/portal/me");
    if (!meRes.ok) { setError("Nepodařilo se načíst klientský profil."); setLoading(false); return; }
    const client = (await meRes.json()).client;
    if (!client) { setLoading(false); return; }
    setClientId(client.id);

    try {
      const res = await fetch("/api/scanned-documents/list");
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {
      setError("Nepodařilo se načíst dokumenty.");
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Upload handler ──
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Soubor je příliš velký (max 10 MB).");
      return;
    }

    setCompressing(true);
    const compressed = await compressImage(file);
    setCompressing(false);

    if (compressed.size > 10 * 1024 * 1024) {
      toast.error("Soubor je příliš velký i po kompresi.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", compressed);
      if (clientId) formData.append("client_id", clientId);

      const response = await fetch("/api/scanned-documents/upload", { method: "POST", body: formData });
      const data: UploadResult = await response.json();

      if (!response.ok) {
        toast.error((data as { error?: string }).error ?? "Chyba při zpracování.");
      } else {
        setUploadResult(data);
        fetchData(); // refresh list
      }
    } catch {
      toast.error("Chyba při nahrávání.");
    }

    setUploading(false);
    if (cameraRef.current) cameraRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleRetake() {
    if (uploadResult?.document_id) {
      fetch(`/api/scanned-documents/${uploadResult.document_id}/retake`, { method: "POST" }).catch(() => {});
    }
    setUploadResult(null);
    cameraRef.current?.click();
  }

  // ── Computed ──
  const filtered = filter === "all" ? docs : docs.filter((d) => d.document_type === filter);
  const okDocs = docs.filter((d) => d.quality_status === "ok" || d.quality_status === "manual_override");
  const totalIncome = okDocs
    .filter((d) => d.document_type === "invoice" && d.total_amount)
    .reduce((sum, d) => sum + (d.total_amount || 0), 0);
  const totalExpense = okDocs
    .filter((d) => (d.document_type === "receipt") && d.total_amount)
    .reduce((sum, d) => sum + (d.total_amount || 0), 0);

  const categoryCounts = docs.reduce<Record<string, number>>((acc, d) => {
    const cat = d.document_type || "other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // ── Render ──
  if (loading) return (
    <PortalPageContainer className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </PortalPageContainer>
  );
  if (error) return <PortalPageContainer><ErrorState description={error} onRetry={fetchData} /></PortalPageContainer>;

  // Show upload result screen
  if (uploadResult) {
    return (
      <PortalPageContainer>
        <h1 className="mb-6 text-2xl font-bold text-[var(--card-text)]">Dokumenty</h1>
        <DocumentUploadResult
          status={uploadResult.status}
          documentId={uploadResult.document_id}
          data={uploadResult.data as never}
          summary={uploadResult.summary}
          documentType={uploadResult.document_type}
          warningFields={uploadResult.warning_fields}
          rejectionCode={uploadResult.rejection_code}
          retryGuidance={uploadResult.message}
          fileUrl={uploadResult.file_url ?? undefined}
          modelUsed={uploadResult.model_used}
          escalated={uploadResult.escalated}
          onRetake={handleRetake}
          onOverrideSuccess={() => { setUploadResult(null); fetchData(); }}
          onClose={() => { setUploadResult(null); fetchData(); }}
        />
      </PortalPageContainer>
    );
  }

  return (
    <PortalPageContainer>
      <h1 className="mb-6 text-2xl font-bold text-[var(--card-text)]">Dokumenty</h1>

      {/* ── Income / Expense summary ── */}
      {docs.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--card-text-muted)]">Příjmy (faktury)</p>
              <p className="text-lg font-bold text-emerald-600">{formatCZK(totalIncome)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--card-text-muted)]">Výdaje (účtenky)</p>
              <p className="text-lg font-bold text-red-600">{formatCZK(totalExpense)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <ArrowUpDown className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--card-text-muted)]">Bilance</p>
              <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCZK(totalIncome - totalExpense)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload zone ── */}
      <div className="mb-6 rounded-xl border-2 border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-6 transition-colors hover:border-blue-300">
        {/* Hidden inputs */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFile} className="hidden" />

        {uploading || compressing ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm text-[var(--card-text-muted)]">
              {compressing ? "Komprese obrázku..." : "AI zpracovává dokument..."}
            </p>
            <p className="text-xs text-[var(--card-text-dim)]">
              Automaticky rozpoznám typ dokumentu, částku a datum
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Upload className="h-8 w-8 text-[var(--card-text-dim)]" />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--card-text)]">Nahrajte dokument</p>
              <p className="mt-1 text-xs text-[var(--card-text-muted)]">
                AI automaticky rozpozná typ (faktura, účtenka, smlouva) a vytáhne klíčové údaje
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => cameraRef.current?.click()} className="gap-2" size="lg">
                <Camera className="h-4 w-4" />
                Vyfotit
              </Button>
              <Button onClick={() => fileRef.current?.click()} variant="outline" className="gap-2" size="lg">
                <Upload className="h-4 w-4" />
                Nahrát soubor
              </Button>
            </div>
            <p className="text-[10px] text-[var(--card-text-dim)]">
              JPG, PNG nebo PDF do 10 MB
            </p>
          </div>
        )}
      </div>

      {/* ── Filter tabs ── */}
      {docs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const count = tab.key === "all" ? docs.length : (categoryCounts[tab.key] || 0);
            if (tab.key !== "all" && count === 0) return null;
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-primary,#2563eb)] text-white"
                    : "bg-[var(--table-header)] text-[var(--card-text-muted)] hover:bg-[var(--table-hover)]"
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Documents list ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <FolderOpen className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">
            {docs.length === 0 ? "Žádné dokumenty" : "Žádné dokumenty v této kategorii"}
          </p>
          <p className="mt-1 text-sm text-[var(--card-text-muted)]">
            Nahrajte první dokument — AI ho automaticky zařadí
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const cat = CATEGORY_CONFIG[doc.document_type ?? "other"] ?? CATEGORY_CONFIG.other;
            const CatIcon = cat.icon;
            const statusBadge = STATUS_BADGE[doc.quality_status ?? ""];
            const flowLabel = cat.flow === "income" ? "Příjem" : cat.flow === "expense" ? "Výdaj" : null;
            const flowColor = cat.flow === "income" ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50";

            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => setViewingDoc(doc)}
              >
                {/* Thumbnail or icon */}
                {doc.thumbnail_url && doc.mime_type?.startsWith("image/") ? (
                  <img
                    src={doc.thumbnail_url}
                    alt={doc.file_name ?? "Dokument"}
                    className="h-14 w-14 shrink-0 rounded-lg border object-cover"
                  />
                ) : (
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ${cat.bgColor}`}>
                    <CatIcon className={`h-6 w-6 ${cat.color}`} />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--card-text)] truncate">
                      {doc.merchant_name || doc.file_name || "Dokument"}
                    </p>
                    <Badge className={`text-[10px] ${cat.bgColor} ${cat.color} border-0`}>
                      {cat.label}
                    </Badge>
                    {flowLabel && (
                      <Badge className={`text-[10px] ${flowColor} border-0`}>
                        {flowLabel}
                      </Badge>
                    )}
                    {statusBadge && (
                      <Badge className={`text-[10px] ${statusBadge.className}`}>
                        {statusBadge.label}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-[var(--card-text-muted)]">
                    {doc.document_date && (
                      <span>{new Date(doc.document_date).toLocaleDateString("cs-CZ")}</span>
                    )}
                    {doc.total_amount != null && (
                      <>
                        <span className="text-[var(--card-text-dim)]">·</span>
                        <span className="font-semibold text-[var(--card-text)]">
                          {doc.total_amount.toLocaleString("cs-CZ")} {doc.currency ?? "CZK"}
                        </span>
                      </>
                    )}
                    {doc.summary && (
                      <>
                        <span className="text-[var(--card-text-dim)]">·</span>
                        <span className="truncate">{doc.summary}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Date */}
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-xs text-[var(--card-text-muted)]">
                    {new Date(doc.created_at).toLocaleDateString("cs-CZ")}
                  </p>
                  <p className="text-[10px] text-[var(--card-text-dim)]">
                    {formatSize(doc.file_size_bytes)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Document detail dialog ── */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => { if (!open) setViewingDoc(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.merchant_name || viewingDoc?.file_name || "Detail dokumentu"}</DialogTitle>
            <DialogDescription>
              AI analýza nahraného dokumentu
            </DialogDescription>
          </DialogHeader>
          {viewingDoc && (
            <div className="space-y-4">
              {/* Category + flow */}
              <div className="flex items-center gap-2">
                {(() => {
                  const cat = CATEGORY_CONFIG[viewingDoc.document_type ?? "other"] ?? CATEGORY_CONFIG.other;
                  return (
                    <>
                      <Badge className={`${cat.bgColor} ${cat.color} border-0`}>{cat.label}</Badge>
                      {cat.flow === "income" && <Badge className="bg-emerald-50 text-emerald-600 border-0">Příjem</Badge>}
                      {cat.flow === "expense" && <Badge className="bg-red-50 text-red-600 border-0">Výdaj</Badge>}
                    </>
                  );
                })()}
                {STATUS_BADGE[viewingDoc.quality_status ?? ""] && (
                  <Badge className={`text-[10px] ${STATUS_BADGE[viewingDoc.quality_status ?? ""].className}`}>
                    {STATUS_BADGE[viewingDoc.quality_status ?? ""].label}
                  </Badge>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {viewingDoc.document_date && (
                  <div>
                    <p className="text-xs text-[var(--card-text-muted)]">Datum</p>
                    <p className="font-medium text-[var(--card-text)]">
                      {new Date(viewingDoc.document_date).toLocaleDateString("cs-CZ")}
                    </p>
                  </div>
                )}
                {viewingDoc.total_amount != null && (
                  <div>
                    <p className="text-xs text-[var(--card-text-muted)]">Částka</p>
                    <p className="font-medium text-[var(--card-text)]">
                      {viewingDoc.total_amount.toLocaleString("cs-CZ")} {viewingDoc.currency ?? "CZK"}
                    </p>
                  </div>
                )}
                {viewingDoc.merchant_name && (
                  <div>
                    <p className="text-xs text-[var(--card-text-muted)]">Obchodník / dodavatel</p>
                    <p className="font-medium text-[var(--card-text)]">{viewingDoc.merchant_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-[var(--card-text-muted)]">Soubor</p>
                  <p className="font-medium text-[var(--card-text)] truncate">{viewingDoc.file_name}</p>
                </div>
              </div>

              {/* Summary */}
              {viewingDoc.summary && (
                <div className="rounded-lg bg-[var(--table-hover)] p-3">
                  <p className="text-xs font-medium text-[var(--card-text-muted)] mb-1">AI shrnutí</p>
                  <p className="text-sm text-[var(--card-text)]">{viewingDoc.summary}</p>
                </div>
              )}

              {/* Preview */}
              {viewingDoc.thumbnail_url && (
                <a
                  href={viewingDoc.thumbnail_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <Eye className="h-4 w-4" />
                  Zobrazit dokument
                </a>
              )}

              {/* Manual category change */}
              <div className="flex items-center gap-3 border-t pt-3">
                <p className="text-xs text-[var(--card-text-muted)]">Změnit kategorii:</p>
                <Select
                  value={viewingDoc.document_type ?? "other"}
                  onValueChange={async (newType) => {
                    const res = await fetch(`/api/scanned-documents/${viewingDoc.id}/override`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        document_date: viewingDoc.document_date || new Date().toISOString().split("T")[0],
                        total_amount: viewingDoc.total_amount ?? 0,
                        document_type: newType,
                      }),
                    });
                    if (res.ok) {
                      toast.success("Kategorie změněna.");
                      setViewingDoc(null);
                      fetchData();
                    } else {
                      toast.error("Nepodařilo se změnit kategorii.");
                    }
                  }}
                >
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalPageContainer>
  );
}
