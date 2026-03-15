"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

function validateIBAN(raw: string): { valid: boolean; cleaned: string } {
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  if (!cleaned) return { valid: true, cleaned: "" };
  if (!cleaned.startsWith("CZ")) return { valid: false, cleaned };
  if (cleaned.length !== 24) return { valid: false, cleaned };
  // Basic structure check: CZ + 2 digits + 20 alphanumeric
  if (!/^CZ\d{22}$/.test(cleaned)) return { valid: false, cleaned };
  return { valid: true, cleaned };
}

export default function PaymentSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [iban, setIban] = useState("");
  const [bankName, setBankName] = useState("");
  const [vsPrefix, setVsPrefix] = useState("");
  const [ibanError, setIbanError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: adv, error } = await supabase
          .from("advisors")
          .select("id, iban, bank_name, vs_prefix")
          .single();

        if (error) {
          console.error("Failed to load advisor:", error.message);
          toast.error("Nepodařilo se načíst data.");
          setLoading(false);
          return;
        }

        if (adv) {
          setAdvisorId(adv.id);
          setIban(adv.iban || "");
          setBankName(adv.bank_name || "");
          setVsPrefix(adv.vs_prefix || "");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        toast.error("Neočekávaná chyba při načítání.");
      }
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleIbanChange(value: string) {
    setIban(value);
    const { valid, cleaned } = validateIBAN(value);
    if (cleaned && !valid) {
      setIbanError("IBAN musí začínat CZ a mít 24 znaků (např. CZ6508000000192000145399)");
    } else {
      setIbanError("");
    }
  }

  async function handleSave() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }

    const { valid, cleaned } = validateIBAN(iban);
    if (!valid) {
      toast.error("IBAN není ve správném formátu.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("advisors")
        .update({
          iban: cleaned || null,
          bank_name: bankName.trim() || null,
          vs_prefix: vsPrefix.trim() || null,
        })
        .eq("id", advisorId);

      if (error) {
        console.error("Save error:", error.message);
        toast.error("Chyba při ukládání: " + error.message);
      } else {
        toast.success("Platební údaje uloženy.");
      }
    } catch (err) {
      console.error("Unexpected save error:", err);
      toast.error("Neočekávaná chyba při ukládání.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50" style={{ backgroundColor: "var(--accent-bg, rgb(239 246 255))" }}>
          <CreditCard className="h-5 w-5 text-blue-600" style={{ color: "var(--accent-text, rgb(37 99 235))" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--card-text, rgb(15 23 42))" }}>Platební údaje</h1>
          <p className="text-sm" style={{ color: "var(--card-muted, rgb(100 116 139))" }}>
            Nastavte bankovní účet pro QR platby vašich klientů
          </p>
        </div>
      </div>

      <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: "var(--card-bg, white)", borderColor: "var(--card-border, rgb(226 232 240))" }}>
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--card-text, rgb(15 23 42))" }}>
              IBAN
            </Label>
            <Input
              value={iban}
              onChange={(e) => handleIbanChange(e.target.value)}
              placeholder="CZ6508000000192000145399"
              className={`font-mono ${ibanError ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            />
            {ibanError && (
              <p className="text-xs text-red-500">{ibanError}</p>
            )}
            <p className="text-xs" style={{ color: "var(--card-muted, rgb(100 116 139))" }}>
              Zadejte IBAN bez mezer, musí začínat CZ
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--card-text, rgb(15 23 42))" }}>
              Název banky
            </Label>
            <Input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="např. Fio banka, Česká spořitelna, ČSOB..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "var(--card-text, rgb(15 23 42))" }}>
              Prefix variabilního symbolu
            </Label>
            <Input
              value={vsPrefix}
              onChange={(e) => setVsPrefix(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="např. 2024"
              maxLength={4}
            />
            <p className="text-xs" style={{ color: "var(--card-muted, rgb(100 116 139))" }}>
              Volitelné. Prefix se automaticky přidá na začátek variabilního symbolu.
            </p>
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} disabled={saving || !!ibanError} size="sm">
              {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Uložit platební údaje
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
