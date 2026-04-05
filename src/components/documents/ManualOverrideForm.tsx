"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface ManualOverrideFormProps {
  documentId: string;
  fileUrl?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ManualOverrideForm({
  documentId,
  fileUrl,
  onSuccess,
  onCancel,
}: ManualOverrideFormProps) {
  const [merchantName, setMerchantName] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [currency, setCurrency] = useState("CZK");
  const [vatAmount, setVatAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!documentDate) {
      toast.error("Datum je povinné.");
      return;
    }
    if (!totalAmount || isNaN(Number(totalAmount)) || Number(totalAmount) <= 0) {
      toast.error("Zadej platnou částku.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/scanned-documents/${documentId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_name: merchantName || undefined,
          document_date: documentDate,
          total_amount: Number(totalAmount),
          currency,
          vat_amount: vatAmount ? Number(vatAmount) : undefined,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Dokument uložen ručně.");
        onSuccess?.();
      } else {
        toast.error(result.error || "Chyba při ukládání.");
      }
    } catch {
      toast.error("Chyba při ukládání.");
    }

    setSubmitting(false);
  }

  return (
    <div className="flex gap-4">
      {/* Image preview */}
      {fileUrl && (
        <div className="hidden shrink-0 sm:block">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt="Nahraný dokument"
              className="h-64 rounded-lg border object-contain"
            />
          </a>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 space-y-3">
        <div>
          <Label htmlFor="override-merchant">Obchod / firma</Label>
          <Input
            id="override-merchant"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="např. Albert, Kaufland..."
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="override-date">
              Datum <span className="text-red-500">*</span>
            </Label>
            <Input
              id="override-date"
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="override-amount">
              Částka <span className="text-red-500">*</span>
            </Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="override-amount"
                type="number"
                step="0.01"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                required
                className="flex-1"
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CZK">CZK</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="override-vat">DPH (nepovinné)</Label>
          <Input
            id="override-vat"
            type="number"
            step="0.01"
            min="0"
            value={vatAmount}
            onChange={(e) => setVatAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={submitting} size="sm" className="gap-2">
            {submitting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Uložit ručně
          </Button>
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="ghost"
              size="sm"
            >
              Zrušit
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
