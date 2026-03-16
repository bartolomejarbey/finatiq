"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Briefcase, StickyNote } from "lucide-react";
import type { Stage } from "./page";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  onCreated: () => void;
}

export function NewDealSheet({ open, onOpenChange, stages, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [value, setValue] = useState("");
  const [source, setSource] = useState("manual");
  const [stageId, setStageId] = useState("");
  const [note, setNote] = useState("");

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Název dealu je povinný";
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.contactEmail = "Neplatný formát emailu";
    }
    if (value && isNaN(parseFloat(value))) {
      newErrors.value = "Hodnota musí být číslo";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function resetForm() {
    setTitle("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setValue("");
    setSource("manual");
    setStageId("");
    setNote("");
    setErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: advisor } = await supabase
      .from("advisors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!advisor) {
      setLoading(false);
      return;
    }

    const selectedStage = stageId || stages[0]?.id;

    const { data: deal } = await supabase
      .from("deals")
      .insert({
        advisor_id: advisor.id,
        title,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        value: value ? parseFloat(value) : 0,
        stage_id: selectedStage,
        source,
      })
      .select("id")
      .single();

    // Add initial note if provided
    if (note.trim() && deal) {
      await supabase.from("deal_activities").insert({
        deal_id: deal.id,
        advisor_id: advisor.id,
        type: "note",
        title: "Počáteční poznámka",
        description: note,
      });
    }

    resetForm();
    setLoading(false);
    onOpenChange(false);
    onCreated();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <SheetContent className="w-[440px] overflow-y-auto sm:w-[520px]">
        <SheetHeader>
          <SheetTitle className="text-xl">Nový deal</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Section: Contact */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h3 className="text-sm font-semibold text-[var(--card-text)]">Kontakt</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nd-name" className="text-xs">Kontaktní osoba</Label>
                <Input
                  id="nd-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Jan Novák"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="nd-email" className="text-xs">Email</Label>
                  <Input
                    id="nd-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => { setContactEmail(e.target.value); setErrors((p) => ({ ...p, contactEmail: "" })); }}
                    placeholder="jan@email.cz"
                    className={errors.contactEmail ? "border-red-300 focus-visible:ring-red-300" : ""}
                  />
                  {errors.contactEmail && (
                    <p className="text-xs text-red-500">{errors.contactEmail}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nd-phone" className="text-xs">Telefon</Label>
                  <Input
                    id="nd-phone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+420 123 456 789"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section: Deal */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h3 className="text-sm font-semibold text-[var(--card-text)]">Deal</h3>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nd-title" className="text-xs">Název dealu *</Label>
                <Input
                  id="nd-title"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: "" })); }}
                  placeholder="Např. Investiční portfolio"
                  className={errors.title ? "border-red-300 focus-visible:ring-red-300" : ""}
                />
                {errors.title && (
                  <p className="text-xs text-red-500">{errors.title}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="nd-value" className="text-xs">Hodnota (Kč)</Label>
                  <Input
                    id="nd-value"
                    type="number"
                    min="0"
                    step="1"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setErrors((p) => ({ ...p, value: "" })); }}
                    placeholder="100 000"
                    className={errors.value ? "border-red-300 focus-visible:ring-red-300" : ""}
                  />
                  {errors.value && (
                    <p className="text-xs text-red-500">{errors.value}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Zdroj</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manuální</SelectItem>
                      <SelectItem value="meta">Meta Ads</SelectItem>
                      <SelectItem value="referral">Doporučení</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fáze pipeline</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte fázi" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Section: Note */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h3 className="text-sm font-semibold text-[var(--card-text)]">
                Poznámka <span className="font-normal text-[var(--card-text-dim)]">(volitelná)</span>
              </h3>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Přidejte počáteční poznámku k dealu..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vytvořit deal
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
