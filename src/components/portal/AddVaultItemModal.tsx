"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePortalForm } from "@/lib/forms/use-portal-form";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  advisorId: string | null;
  onAdded: () => void;
};

export function AddVaultItemModal({ open, onOpenChange, clientId, advisorId, onAdded }: Props) {
  const supabase = createClient();
  const form = usePortalForm<"name">();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("document");
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit() {
    if (!form.validateRequired([{ name: "name", value: name }])) return;
    setSaving(true);

    let filePath: string | null = null;
    if (file) {
      filePath = `vault-items/${clientId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("deal-documents").upload(filePath, file);
      if (error) {
        setSaving(false);
        toast.error("Soubor se nepodařilo nahrát: " + error.message);
        return;
      }
    }

    const { error } = await supabase.from("vault_items").insert({
      client_id: clientId,
      advisor_id: advisorId,
      name: name.trim(),
      type,
      value: value.trim() || null,
      file_path: filePath,
    });

    setSaving(false);
    if (error) {
      toast.error("Položku se nepodařilo uložit: " + error.message);
      return;
    }

    toast.success("Položka přidána.");
    setName("");
    setType("document");
    setValue("");
    setFile(null);
    form.resetErrors();
    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přidat položku do trezoru</DialogTitle>
          <DialogDescription>Zadejte bezpečnou položku nebo přiložte soubor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField id="vault-item-name" label="Název" requiredLabel value={name} onChange={(e) => { setName(e.target.value); form.clearError("name"); }} ref={form.registerRef("name")} error={form.errors.name} />
          <div className="space-y-1">
            <Label htmlFor="vault-item-type" className="text-xs">Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="vault-item-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="password">Heslo</SelectItem>
                <SelectItem value="document">Dokument</SelectItem>
                <SelectItem value="key">Klíč</SelectItem>
                <SelectItem value="note">Poznámka</SelectItem>
                <SelectItem value="other">Jiné</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="vault-item-value" className="text-xs">Hodnota</Label>
            <Textarea id="vault-item-value" value={value} onChange={(e) => setValue(e.target.value)} rows={3} />
          </div>
          <FormField id="vault-item-file" label="Soubor" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button onClick={handleSubmit} disabled={saving} className="w-full">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Přidat položku
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
