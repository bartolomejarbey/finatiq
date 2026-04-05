"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  FolderOpen,
  Receipt,
  FileSpreadsheet,
  ScrollText,
} from "lucide-react";

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

const DOC_TYPE_LABELS: Record<string, string> = {
  receipt: "Účtenka",
  invoice: "Faktura",
  contract: "Smlouva",
  statement: "Výpis",
  other: "Jiné",
};

const DOC_TYPE_ICONS: Record<string, typeof Receipt> = {
  receipt: Receipt,
  invoice: FileSpreadsheet,
  contract: ScrollText,
  statement: FileText,
  other: FileText,
};

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  ok: {
    label: "OK",
    className: "bg-emerald-100 text-emerald-700",
  },
  warning: {
    label: "Ke kontrole",
    className: "bg-amber-100 text-amber-700",
  },
  rejected: {
    label: "Odmítnuto",
    className: "bg-red-100 text-red-700",
  },
  manual_override: {
    label: "Ručně doplněno",
    className: "bg-orange-100 text-orange-700",
  },
  failed: {
    label: "Chyba",
    className: "bg-gray-100 text-gray-700",
  },
};

export function ScannedDocumentsList() {
  const [docs, setDocs] = useState<VisionDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    try {
      const res = await fetch("/api/scanned-documents/list");
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {
      // Silently fail — user sees empty state
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <FolderOpen className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
        <p className="text-sm font-medium text-[var(--card-text-dim)]">
          Zatím žádné naskenované dokumenty
        </p>
        <p className="mt-1 text-xs text-[var(--card-text-muted)]">
          Vyfoť účtenku nebo nahraj soubor výše
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--card-text)]">
        Zpracované dokumenty ({docs.length})
      </h3>

      {docs.map((doc) => {
        const Icon =
          DOC_TYPE_ICONS[doc.document_type ?? "other"] ?? FileText;
        const statusBadge =
          STATUS_BADGE[doc.quality_status ?? ""] ?? null;

        return (
          <div
            key={doc.id}
            className="flex items-center gap-4 rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-4 shadow-sm transition-colors hover:bg-[var(--table-hover,#f8fafc)]"
          >
            {/* Thumbnail */}
            {doc.thumbnail_url && doc.mime_type?.startsWith("image/") ? (
              <a
                href={doc.thumbnail_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.thumbnail_url}
                  alt={doc.file_name ?? "Dokument"}
                  className="h-14 w-14 rounded-lg border object-cover"
                />
              </a>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Icon className="h-6 w-6 text-blue-500" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--card-text)] truncate">
                  {doc.merchant_name || doc.file_name || "Dokument"}
                </p>
                {statusBadge && (
                  <Badge className={`text-[10px] ${statusBadge.className}`}>
                    {statusBadge.label}
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--card-text-muted)]">
                {doc.document_type && (
                  <span>
                    {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                  </span>
                )}
                {doc.document_date && (
                  <>
                    <span className="text-[var(--card-text-dim)]">|</span>
                    <span>
                      {new Date(doc.document_date).toLocaleDateString("cs-CZ")}
                    </span>
                  </>
                )}
                {doc.total_amount != null && (
                  <>
                    <span className="text-[var(--card-text-dim)]">|</span>
                    <span className="font-medium">
                      {doc.total_amount.toLocaleString("cs-CZ")}{" "}
                      {doc.currency ?? "CZK"}
                    </span>
                  </>
                )}
              </div>
              {doc.summary && (
                <p className="mt-1 text-xs text-[var(--card-text-dim)] line-clamp-1">
                  {doc.summary}
                </p>
              )}
            </div>

            {/* Date */}
            <span className="hidden text-xs text-[var(--card-text-muted)] sm:block">
              {new Date(doc.created_at).toLocaleDateString("cs-CZ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
