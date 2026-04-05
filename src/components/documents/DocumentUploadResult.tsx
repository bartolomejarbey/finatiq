"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  PenLine,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import type { ExtractedData } from "@/lib/services/document-processor";
import { ManualOverrideForm } from "./ManualOverrideForm";

interface DocumentUploadResultProps {
  status: "ok" | "warning" | "rejected";
  documentId: string;
  data?: ExtractedData;
  summary?: string;
  documentType?: string;
  warningFields?: string[] | null;
  rejectionCode?: string | null;
  retryGuidance?: string | null;
  fileUrl?: string;
  modelUsed?: string;
  escalated?: boolean;
  onRetake?: () => void;
  onOverrideSuccess?: () => void;
  onClose?: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  merchant_name: "Obchod",
  merchant_ico: "IČO",
  merchant_dic: "DIČ",
  date: "Datum",
  total_amount: "Částka",
  currency: "Měna",
  vat_amount: "DPH",
  items: "Položky",
};

export function DocumentUploadResult({
  status,
  documentId,
  data,
  summary,
  documentType,
  warningFields,
  rejectionCode,
  retryGuidance,
  fileUrl,
  modelUsed,
  escalated,
  onRetake,
  onOverrideSuccess,
  onClose,
}: DocumentUploadResultProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // ---- OK ----
  if (status === "ok") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">
              Dokument úspěšně zpracován
            </p>
            {summary && (
              <p className="mt-1 text-xs text-emerald-700">{summary}</p>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-emerald-500 hover:text-emerald-700"
            >
              Zavřít
            </button>
          )}
        </div>

        {data && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {data.merchant_name && (
                <Field label="Obchod" value={data.merchant_name} />
              )}
              {data.date && (
                <Field
                  label="Datum"
                  value={new Date(data.date).toLocaleDateString("cs-CZ")}
                />
              )}
              {data.total_amount != null && (
                <Field
                  label="Částka"
                  value={`${data.total_amount.toLocaleString("cs-CZ")} ${data.currency ?? "CZK"}`}
                  bold
                />
              )}
              {data.vat_amount != null && (
                <Field
                  label="DPH"
                  value={`${data.vat_amount.toLocaleString("cs-CZ")} ${data.currency ?? "CZK"}`}
                />
              )}
              {data.merchant_ico && (
                <Field label="IČO" value={data.merchant_ico} />
              )}
              {data.merchant_dic && (
                <Field label="DIČ" value={data.merchant_dic} />
              )}
            </div>

            {data.items && data.items.length > 0 && (
              <div className="mt-3 border-t border-emerald-100 pt-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800"
                >
                  {showDetails ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {data.items.length} položek
                </button>
                {showDetails && (
                  <div className="mt-2 space-y-1">
                    {data.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-xs text-emerald-700"
                      >
                        <span>
                          {item.name}
                          {item.quantity != null ? ` (${item.quantity}×)` : ""}
                        </span>
                        {item.price != null && (
                          <span className="font-medium">
                            {item.price.toLocaleString("cs-CZ")} Kč
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {escalated && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-500">
            <Zap className="h-3 w-3" />
            Zpracováno rozšířeným modelem ({modelUsed})
          </div>
        )}
      </div>
    );
  }

  // ---- WARNING ----
  if (status === "warning") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">
              Dokument uložen — zkontroluj prosím zvýrazněná pole
            </p>
            {summary && (
              <p className="mt-1 text-xs text-amber-700">{summary}</p>
            )}
          </div>
        </div>

        {data && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {data.merchant_name && (
                <Field
                  label="Obchod"
                  value={data.merchant_name}
                  warning={warningFields?.includes("merchant_name")}
                />
              )}
              {data.date && (
                <Field
                  label="Datum"
                  value={new Date(data.date).toLocaleDateString("cs-CZ")}
                  warning={warningFields?.includes("date")}
                />
              )}
              {data.total_amount != null && (
                <Field
                  label="Částka"
                  value={`${data.total_amount.toLocaleString("cs-CZ")} ${data.currency ?? "CZK"}`}
                  bold
                  warning={warningFields?.includes("total_amount")}
                />
              )}
              {data.vat_amount != null && (
                <Field
                  label="DPH"
                  value={`${data.vat_amount.toLocaleString("cs-CZ")} ${data.currency ?? "CZK"}`}
                  warning={warningFields?.includes("vat_amount")}
                />
              )}
              {data.merchant_ico && (
                <Field
                  label="IČO"
                  value={data.merchant_ico}
                  warning={warningFields?.includes("merchant_ico")}
                />
              )}
              {data.merchant_dic && (
                <Field
                  label="DIČ"
                  value={data.merchant_dic}
                  warning={warningFields?.includes("merchant_dic")}
                />
              )}
            </div>

            {warningFields && warningFields.length > 0 && (
              <p className="mt-3 text-xs text-amber-600">
                Nejistá pole:{" "}
                {warningFields.map((f) => FIELD_LABELS[f] ?? f).join(", ")}
              </p>
            )}
          </div>
        )}

        {escalated && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-500">
            <Zap className="h-3 w-3" />
            Zpracováno rozšířeným modelem ({modelUsed})
          </div>
        )}
      </div>
    );
  }

  // ---- REJECTED ----
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-800">
            Dokument nelze zpracovat
          </p>
          {retryGuidance && (
            <p className="mt-1 text-sm text-red-700">{retryGuidance}</p>
          )}
        </div>
      </div>

      {/* Preview of uploaded image */}
      {fileUrl && (
        <div className="mt-4">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt="Nahraný dokument"
              className="max-h-48 rounded-lg border border-red-200 object-contain"
            />
          </a>
        </div>
      )}

      {!showOverride && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button onClick={onRetake} className="gap-2" size="default">
            <Camera className="h-4 w-4" />
            Vyfotit znovu
          </Button>
          <Button
            onClick={() => setShowOverride(true)}
            variant="ghost"
            size="sm"
            className="text-xs text-red-500 hover:text-red-700"
          >
            <PenLine className="mr-1 h-3 w-3" />
            Uložit stejně a doplnit ručně
          </Button>
        </div>
      )}

      {showOverride && (
        <div className="mt-4">
          <ManualOverrideForm
            documentId={documentId}
            fileUrl={fileUrl}
            onSuccess={() => {
              setShowOverride(false);
              onOverrideSuccess?.();
            }}
            onCancel={() => setShowOverride(false)}
          />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  bold,
  warning,
}: {
  label: string;
  value: string;
  bold?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-2 py-1 ${warning ? "bg-amber-100 ring-1 ring-amber-300" : ""}`}
    >
      <p className="text-[10px] text-[var(--card-text-muted)]">{label}</p>
      <p
        className={`text-sm text-[var(--card-text)] ${bold ? "font-semibold" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
