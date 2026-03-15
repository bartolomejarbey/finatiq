"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarClock, Plus, Power, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SeasonalReminder {
  id: string;
  advisor_id: string;
  title: string;
  description: string | null;
  month: number;
  day: number;
  target: string;
  is_active: boolean;
  created_at: string;
}

const monthNames: Record<number, string> = {
  1: "Leden",
  2: "Únor",
  3: "Březen",
  4: "Duben",
  5: "Květen",
  6: "Červen",
  7: "Červenec",
  8: "Srpen",
  9: "Září",
  10: "Říjen",
  11: "Listopad",
  12: "Prosinec",
};

const targetLabels: Record<string, string> = {
  all_clients: "Všichni klienti",
  osvc: "OSVČ",
  has_car_insurance: "Pojištění auta",
  has_property: "Vlastníci nemovitosti",
};

const defaultReminders = [
  {
    month: 1,
    day: 15,
    title: "Zkontrolujte pojištění auta",
    target: "has_car_insurance",
  },
  {
    month: 3,
    day: 1,
    title: "Nezapomeňte na daňové přiznání",
    target: "osvc",
  },
  {
    month: 9,
    day: 15,
    title: "Pojištění domácnosti před zimou",
    target: "has_property",
  },
  {
    month: 10,
    day: 1,
    title: "Zkontrolujte roční pojistné",
    target: "all_clients",
  },
];

export default function SeasonalRemindersPage() {
  const supabase = createClient();
  const [reminders, setReminders] = useState<SeasonalReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");
  const [target, setTarget] = useState("all_clients");
  const [isActive, setIsActive] = useState(true);

  async function fetchReminders(advId: string) {
    const { data } = await supabase
      .from("seasonal_reminders")
      .select("*")
      .eq("advisor_id", advId)
      .order("month")
      .order("day");
    setReminders(data || []);
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      const { data: advisor } = await supabase
        .from("advisors")
        .select("id")
        .single();
      if (!advisor) return;
      setAdvisorId(advisor.id);
      await fetchReminders(advisor.id);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePreSeed() {
    if (!advisorId) return;
    setSaving(true);

    const toInsert = defaultReminders.map((r) => ({
      ...r,
      advisor_id: advisorId,
      is_active: true,
      description: null,
    }));

    await supabase.from("seasonal_reminders").insert(toInsert);
    toast.success("Výchozí připomínky vytvořeny.");
    await fetchReminders(advisorId);
    setSaving(false);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setMonth("1");
    setDay("1");
    setTarget("all_clients");
    setIsActive(true);
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(r: SeasonalReminder) {
    setEditingId(r.id);
    setTitle(r.title);
    setDescription(r.description || "");
    setMonth(String(r.month));
    setDay(String(r.day));
    setTarget(r.target);
    setIsActive(r.is_active);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      advisor_id: advisorId,
      title,
      description: description || null,
      month: parseInt(month),
      day: parseInt(day),
      target,
      is_active: isActive,
    };

    if (editingId) {
      await supabase
        .from("seasonal_reminders")
        .update(payload)
        .eq("id", editingId);
      toast.success("Připomínka upravena.");
    } else {
      await supabase.from("seasonal_reminders").insert(payload);
      toast.success("Připomínka přidána.");
    }

    resetForm();
    setSaving(false);
    setDialogOpen(false);
    if (advisorId) await fetchReminders(advisorId);
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    await supabase
      .from("seasonal_reminders")
      .update({ is_active: !currentActive })
      .eq("id", id);
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, is_active: !currentActive } : r
      )
    );
    toast.success(
      !currentActive ? "Připomínka aktivována." : "Připomínka deaktivována."
    );
  }

  async function handleDelete(id: string) {
    await supabase.from("seasonal_reminders").delete().eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.success("Připomínka smazána.");
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-6 w-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold gradient-text">
              Sezónní připomínky
            </h1>
            <p className="mt-0.5 text-sm text-[var(--card-text-muted)]">
              {reminders.length} připomínek
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {reminders.length === 0 && (
            <Button variant="outline" onClick={handlePreSeed} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Načíst výchozí
            </Button>
          )}
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat
          </Button>
        </div>
      </div>

      {reminders.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <CalendarClock className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">
            Žádné sezónní připomínky
          </p>
          <p className="text-sm text-[var(--card-text-dim)]">
            Načtěte výchozí nebo vytvořte vlastní
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((r) => (
            <div
              key={r.id}
              className={`flex items-center gap-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm ${
                !r.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
                <span className="text-sm font-bold text-orange-600">
                  {r.day}.{r.month}.
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--card-text)]">{r.title}</p>
                {r.description && (
                  <p className="mt-0.5 text-xs text-[var(--card-text-muted)] truncate">
                    {r.description}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {monthNames[r.month]}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {targetLabels[r.target] || r.target}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(r.id, r.is_active)}
                  title={r.is_active ? "Deaktivovat" : "Aktivovat"}
                >
                  <Power
                    className={`h-4 w-4 ${
                      r.is_active ? "text-emerald-500" : "text-[var(--card-text-dim)]"
                    }`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(r)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(r.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Upravit připomínku" : "Nová sezónní připomínka"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Nadpis *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Název připomínky"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Popis</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Měsíc *</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {monthNames[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Den *</Label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cílová skupina *</Label>
                <Select value={target} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(targetLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--input-border)]"
              />
              <Label htmlFor="isActive" className="text-xs">
                Aktivní
              </Label>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId ? "Uložit" : "Přidat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
