"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Check,
  Plus,
  Clock,
  AlertTriangle,
  Calendar,
  Loader2,
  Phone,
  CreditCard,
  Users,
  Star,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Reminder {
  id: string;
  deal_id: string | null;
  client_id: string | null;
  type: string;
  title: string;
  description: string | null;
  due_date: string;
  is_completed: boolean;
  created_at: string;
}

const typeConfig: Record<string, { label: string; icon: typeof Phone; color: string; bg: string }> = {
  follow_up: { label: "Follow-up", icon: Phone, color: "text-blue-600", bg: "bg-blue-50" },
  payment: { label: "Platba", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
  meeting: { label: "Schůzka", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
  custom: { label: "Vlastní", icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
};

function getDueStatus(dueDate: string, isCompleted: boolean) {
  if (isCompleted) return { label: "Splněno", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, urgency: 0 };
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)} dní po termínu`, className: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle, urgency: 3 };
  if (diffDays === 0) return { label: "Dnes", className: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock, urgency: 2 };
  if (diffDays <= 3) return { label: `Za ${diffDays} dní`, className: "bg-orange-50 text-orange-600 border-orange-200", icon: Clock, urgency: 1 };
  return { label: `Za ${diffDays} dní`, className: "bg-[var(--table-hover)] text-[var(--card-text-muted)] border-[var(--card-border)]", icon: Calendar, urgency: 0 };
}

export default function RemindersPage() {
  const supabase = createClient();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState("follow_up");

  async function fetchReminders() {
    const { data } = await supabase.from("reminders").select("*").order("due_date");
    setReminders(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchReminders(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = reminders.filter((r) => {
    const now = new Date();
    const due = new Date(r.due_date);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    switch (filter) {
      case "today": return !r.is_completed && due <= new Date(today.getTime() + 24 * 60 * 60 * 1000);
      case "week": return !r.is_completed && due <= endOfWeek;
      case "completed": return r.is_completed;
      case "active":
      default: return !r.is_completed;
    }
  });

  async function handleComplete(id: string) {
    await supabase.from("reminders").update({ is_completed: true }).eq("id", id);
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, is_completed: true } : r));
    toast.success("Připomínka splněna.");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: advisor } = await supabase.from("advisors").select("id").single();
    if (!advisor) { setSaving(false); return; }
    await supabase.from("reminders").insert({
      advisor_id: advisor.id,
      title, description: description || null,
      due_date: new Date(dueDate).toISOString(),
      type,
    });
    setTitle(""); setDescription(""); setDueDate(""); setType("follow_up");
    setSaving(false); setDialogOpen(false);
    toast.success("Připomínka vytvořena.");
    fetchReminders();
  }

  async function handleDelete(id: string) {
    await supabase.from("reminders").delete().eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.success("Připomínka smazána.");
  }

  const overdueCount = reminders.filter((r) => !r.is_completed && new Date(r.due_date) < new Date()).length;
  const todayCount = reminders.filter((r) => !r.is_completed && new Date(r.due_date).toDateString() === new Date().toDateString()).length;

  if (loading) return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Připomínky</h1>
          <p className="mt-1 text-sm text-[var(--card-text-muted)]">Sledujte termíny a úkoly pro vaše klienty</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="rounded-xl shadow-md shadow-blue-500/20">
          <Plus className="mr-2 h-4 w-4" />
          Nová připomínka
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`rounded-2xl border p-5 shadow-sm ${overdueCount > 0 ? "border-red-200 bg-red-50/50" : "border-[var(--card-border)] bg-[var(--card-bg)]"}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${overdueCount > 0 ? "bg-red-100" : "bg-red-50"}`}>
              <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? "text-red-600" : "text-red-400"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{overdueCount}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Po termínu</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{todayCount}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Dnes</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">
                {reminders.filter((r) => r.is_completed).length}
              </p>
              <p className="text-xs text-[var(--card-text-muted)]">Splněné</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: "active", label: "Aktivní", count: reminders.filter((r) => !r.is_completed).length },
          { key: "today", label: "Dnes", count: todayCount },
          { key: "week", label: "Tento týden", count: reminders.filter((r) => {
            if (r.is_completed) return false;
            const due = new Date(r.due_date);
            const now = new Date();
            const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
            return due <= endOfWeek;
          }).length },
          { key: "completed", label: "Splněné", count: reminders.filter((r) => r.is_completed).length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-blue-500/20"
                : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--card-text-muted)] hover:bg-[var(--table-hover)]"
            }`}
          >
            {f.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${filter === f.key ? "bg-white/20" : "bg-[var(--table-hover)]"}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Reminders list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] py-20 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--table-hover)]">
            <Bell className="h-8 w-8 text-[var(--card-text-dim)]" />
          </div>
          <p className="mt-4 text-lg font-medium text-[var(--card-text-dim)]">Žádné připomínky</p>
          <p className="mt-1 text-sm text-[var(--card-text-dim)]">
            {filter === "completed" ? "Zatím jste nesplnili žádnou připomínku" : "Vytvořte první připomínku"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const status = getDueStatus(r.due_date, r.is_completed);
            const StatusIcon = status.icon;
            const tc = typeConfig[r.type] || typeConfig.custom;
            const TypeIcon = tc.icon;

            return (
              <div
                key={r.id}
                className={`group rounded-2xl border bg-[var(--card-bg)] p-5 shadow-sm transition-all hover:shadow-md ${
                  status.urgency >= 3 ? "border-red-200" :
                  status.urgency >= 2 ? "border-amber-200" :
                  "border-[var(--card-border)]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Completion checkbox */}
                  <button
                    onClick={() => !r.is_completed && handleComplete(r.id)}
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                      r.is_completed
                        ? "border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-500/30"
                        : "border-[var(--card-border)] hover:border-blue-400 hover:bg-blue-50"
                    }`}
                  >
                    {r.is_completed && <Check className="h-4 w-4 text-white" />}
                  </button>

                  {/* Type icon */}
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tc.bg}`}>
                    <TypeIcon className={`h-4 w-4 ${tc.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${r.is_completed ? "text-[var(--card-text-dim)] line-through" : "text-[var(--card-text)]"}`}>
                      {r.title}
                    </p>
                    {r.description && (
                      <p className="mt-1 text-sm text-[var(--card-text-muted)] line-clamp-2">{r.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <Badge variant="outline" className={`text-[10px] ${tc.bg} ${tc.color} border`}>
                        {tc.label}
                      </Badge>
                      <span className="text-xs text-[var(--card-text-dim)]">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        {new Date(r.due_date).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Status & delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium ${status.className}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--card-text-dim)] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="Smazat připomínku"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Nová připomínka</DialogTitle>
            <p className="text-sm text-[var(--card-text-muted)]">Vytvořte si připomínku pro sledování termínů</p>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nadpis *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Např. Zavolat klientovi" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Popis</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Volitelný popis..." className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Termín *</Label>
                <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Typ</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          <v.icon className={`h-3.5 w-3.5 ${v.color}`} />
                          {v.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Zrušit</Button>
              <Button type="submit" disabled={saving} className="rounded-xl shadow-md shadow-blue-500/20">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vytvořit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
