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

const typeLabels: Record<string, string> = {
  follow_up: "Follow-up",
  payment: "Platba",
  meeting: "Schůzka",
  custom: "Vlastní",
};

function getDueStatus(dueDate: string, isCompleted: boolean) {
  if (isCompleted) return { label: "Splněno", className: "bg-emerald-100 text-emerald-700", icon: Check };
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Po termínu", className: "bg-red-100 text-red-700", icon: AlertTriangle };
  if (diffDays === 0) return { label: "Dnes", className: "bg-amber-100 text-amber-700", icon: Clock };
  return { label: `Za ${diffDays} dní`, className: "bg-[var(--table-hover)] text-[var(--card-text-muted)]", icon: Calendar };
}

export default function RemindersPage() {
  const supabase = createClient();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState("follow_up");

  async function fetchReminders() {
    let query = supabase.from("reminders").select("*").order("due_date");
    const { data } = await query;
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
      title,
      description: description || null,
      due_date: new Date(dueDate).toISOString(),
      type,
    });

    setTitle(""); setDescription(""); setDueDate(""); setType("follow_up");
    setSaving(false);
    setDialogOpen(false);
    toast.success("Připomínka vytvořena.");
    fetchReminders();
  }

  async function handleDelete(id: string) {
    await supabase.from("reminders").delete().eq("id", id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    toast.success("Připomínka smazána.");
  }

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-8 w-48" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--card-text)]">Připomínky</h1>
          <p className="mt-0.5 text-sm text-[var(--card-text-muted)]">{filtered.length} připomínek</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Aktivní</SelectItem>
              <SelectItem value="today">Dnes</SelectItem>
              <SelectItem value="week">Tento týden</SelectItem>
              <SelectItem value="completed">Splněné</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Nová připomínka</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Bell className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádné připomínky</p>
          <p className="text-sm text-[var(--card-text-dim)]">Vytvořte první připomínku</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const status = getDueStatus(r.due_date, r.is_completed);
            const StatusIcon = status.icon;
            return (
              <div key={r.id} className="flex items-center gap-4 rounded-xl border bg-[var(--card-bg)] p-4 shadow-sm">
                <button
                  onClick={() => !r.is_completed && handleComplete(r.id)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${r.is_completed ? "border-emerald-500 bg-emerald-500" : "border-[var(--card-border)] hover:border-blue-400"}`}
                >
                  {r.is_completed && <Check className="h-4 w-4 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${r.is_completed ? "text-[var(--card-text-dim)] line-through" : "text-[var(--card-text)]"}`}>{r.title}</p>
                  {r.description && <p className="mt-0.5 text-xs text-[var(--card-text-muted)] truncate">{r.description}</p>}
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{typeLabels[r.type] || r.type}</Badge>
                    <span className="text-[10px] text-[var(--card-text-dim)]">{new Date(r.due_date).toLocaleDateString("cs-CZ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                    <StatusIcon className="h-3 w-3" />{status.label}
                  </span>
                  <button onClick={() => handleDelete(r.id)} className="text-xs text-[var(--card-text-muted)] hover:text-red-500">Smazat</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nová připomínka</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Nadpis *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Např. Zavolat klientovi" /></div>
            <div className="space-y-1"><Label className="text-xs">Popis</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Termín *</Label><Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></div>
              <div className="space-y-1"><Label className="text-xs">Typ</Label>
                <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Vytvořit</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
