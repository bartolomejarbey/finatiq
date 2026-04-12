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

export function AddGoalModal({ open, onOpenChange, clientId, advisorId, onAdded }: Props) {
  const supabase = createClient();
  const form = usePortalForm<"title" | "amount">();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState("medium");

  async function handleSubmit() {
    if (!form.validateRequired([
      { name: "title", value: title },
      { name: "amount", value: amount },
    ])) return;

    const basePayload = {
      client_id: clientId,
      advisor_id: advisorId,
      title: title.trim(),
      target_amount: Number(amount),
      current_amount: 0,
      deadline: deadline || null,
    };

    setSaving(true);
    let result = await supabase.from("financial_goals").insert({ ...basePayload, priority });
    if (result.error?.code === "42703") {
      result = await supabase.from("financial_goals").insert(basePayload);
      toast.info("Priorita se zatím neuložila", {
        description: "Chybí DB sloupec financial_goals.priority. Připravil jsem migraci ke schválení.",
      });
    }
    setSaving(false);

    if (result.error) {
      toast.error("Cíl se nepodařilo uložit: " + result.error.message);
      return;
    }

    toast.success("Cíl přidán.");
    setTitle("");
    setAmount("");
    setDeadline("");
    setPriority("medium");
    form.resetErrors();
    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přidat cíl</DialogTitle>
          <DialogDescription>Zadejte finanční cíl, částku a případný termín.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField id="goal-title" label="Název cíle" requiredLabel value={title} onChange={(e) => { setTitle(e.target.value); form.clearError("title"); }} ref={form.registerRef("title")} error={form.errors.title} />
          <FormField id="goal-amount" label="Cílová částka Kč" requiredLabel type="number" value={amount} onChange={(e) => { setAmount(e.target.value); form.clearError("amount"); }} ref={form.registerRef("amount")} error={form.errors.amount} />
          <FormField id="goal-deadline" label="Datum cíle" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <div className="space-y-1">
            <Label htmlFor="goal-priority" className="text-xs">Priorita</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="goal-priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Nízká</SelectItem>
                <SelectItem value="medium">Střední</SelectItem>
                <SelectItem value="high">Vysoká</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Přidat cíl
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
