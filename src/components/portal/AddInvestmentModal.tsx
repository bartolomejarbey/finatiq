"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePortalForm } from "@/lib/forms/use-portal-form";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  advisorId: string | null;
  onAdded: () => void;
};

export function AddInvestmentModal({ open, onOpenChange, clientId, advisorId, onAdded }: Props) {
  const supabase = createClient();
  const form = usePortalForm<"name" | "value">();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("fondy");
  const [currentValue, setCurrentValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");

  function reset() {
    setName("");
    setType("fondy");
    setCurrentValue("");
    setPurchaseDate("");
    form.resetErrors();
  }

  async function handleSubmit() {
    if (!form.validateRequired([
      { name: "name", value: name },
      { name: "value", value: currentValue },
    ])) return;

    const basePayload = {
      client_id: clientId,
      advisor_id: advisorId,
      instrument_name: name.trim(),
      type,
      current_value: Number(currentValue),
      purchase_value: Number(currentValue),
    };

    setSaving(true);
    const withDate = purchaseDate ? { ...basePayload, purchase_date: purchaseDate } : basePayload;
    let result = await supabase.from("investments").insert(withDate);

    if (result.error?.code === "42703" && purchaseDate) {
      result = await supabase.from("investments").insert(basePayload);
      toast.info("Datum nákupu se zatím neuložilo", {
        description: "Chybí DB sloupec investments.purchase_date. Připravil jsem migraci ke schválení.",
      });
    }

    setSaving(false);
    if (result.error) {
      toast.error("Investici se nepodařilo uložit: " + result.error.message);
      return;
    }

    toast.success("Investice přidána.");
    reset();
    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přidat investici</DialogTitle>
          <DialogDescription>Zadejte základní údaje o investici. Povinná pole jsou označena hvězdičkou.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField
            id="investment-name"
            label="Název"
            requiredLabel
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              form.clearError("name");
            }}
            ref={form.registerRef("name")}
            error={form.errors.name}
          />
          <div className="space-y-1">
            <Label htmlFor="investment-type" className="text-xs">Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="investment-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="akcie">Akcie</SelectItem>
                <SelectItem value="dluhopisy">Dluhopisy</SelectItem>
                <SelectItem value="fondy">Fondy</SelectItem>
                <SelectItem value="krypto">Krypto</SelectItem>
                <SelectItem value="jine">Jiné</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FormField
            id="investment-value"
            label="Aktuální hodnota Kč"
            requiredLabel
            type="number"
            value={currentValue}
            onChange={(e) => {
              setCurrentValue(e.target.value);
              form.clearError("value");
            }}
            ref={form.registerRef("value")}
            error={form.errors.value}
          />
          <FormField id="investment-purchase-date" label="Datum nákupu" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Přidat investici
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
