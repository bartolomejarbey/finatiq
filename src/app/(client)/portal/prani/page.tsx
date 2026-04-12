"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PortalPageContainer } from "@/components/portal/PortalPageContainer";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalForm } from "@/lib/forms/use-portal-form";
import { toast } from "sonner";
import { Star, Plus, Target, Gift, Trash2, AlertCircle } from "lucide-react";

interface Wish {
  id: string;
  title: string;
  description: string | null;
  target_amount: number | null;
  target_date: string | null;
  priority: string;
  status: string;
  advisor_note: string | null;
  created_at: string;
}

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(v);
}

function getPriorityConfig(priority: string) {
  switch (priority) {
    case "high":
      return { label: "Vysoká", color: "bg-red-100 text-red-800" };
    case "medium":
      return { label: "Střední", color: "bg-blue-100 text-blue-800" };
    case "low":
      return { label: "Nízká", color: "bg-[var(--table-header)] text-[var(--card-text)]" };
    default:
      return { label: priority, color: "bg-[var(--table-header)] text-[var(--card-text)]" };
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case "new":
      return { label: "Nové", color: "bg-[var(--table-header)] text-[var(--card-text)]" };
    case "planned":
      return { label: "Plánované", color: "bg-blue-100 text-blue-800" };
    case "in_progress":
      return { label: "Rozpracované", color: "bg-amber-100 text-amber-800" };
    case "achieved":
      return { label: "Splněno", color: "bg-green-100 text-green-800" };
    default:
      return { label: status, color: "bg-[var(--table-header)] text-[var(--card-text)]" };
  }
}

export default function WishlistPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const wishForm = usePortalForm<"title">();

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!client) {
      setLoading(false);
      return;
    }

    setClientId(client.id);

    const { data } = await supabase
      .from("client_wishes")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    setWishes(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!wishForm.validateRequired([{ name: "title", value: title }])) {
      return;
    }
    if (!clientId) return;

    const { error } = await supabase.from("client_wishes").insert({
      client_id: clientId,
      title: title.trim(),
      description: description.trim() || null,
      target_amount: targetAmount ? parseFloat(targetAmount) : null,
      target_date: targetDate || null,
      priority,
      status: "new",
    });

    if (error) {
      toast.error("Chyba při ukládání");
      return;
    }

    toast.success("Přání přidáno");
    setTitle("");
    setDescription("");
    setTargetAmount("");
    setTargetDate("");
    setPriority("medium");
    setDialogOpen(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Opravdu chcete smazat toto přání?")) return;

    const { error } = await supabase
      .from("client_wishes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("Přání smazáno");
    setWishes((prev) => prev.filter((w) => w.id !== id));
  }

  if (loading) {
    return (
      <PortalPageContainer className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </PortalPageContainer>
    );
  }

  return (
    <PortalPageContainer>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--card-text)]">
            <Star className="h-6 w-6 text-amber-500" />
            Má přání
          </h1>
          <p className="mt-1 text-sm text-[var(--card-text-muted)]">
            Sdílejte svá přání a cíle s poradcem
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Přidat přání
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nové přání</DialogTitle>
              <DialogDescription>
                Zadejte přání nebo cíl, který chcete sdílet se svým poradcem.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <FormField
                  id="wish-title"
                  label="Název"
                  requiredLabel
                  ref={wishForm.registerRef("title")}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    wishForm.clearError("title");
                  }}
                  placeholder="Např. Nové auto, dovolená..."
                  error={wishForm.errors.title}
                />
              </div>
              <div>
                <Label htmlFor="wish-desc">Popis</Label>
                <Textarea
                  id="wish-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bližší popis vašeho přání"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wish-amount">Cílová částka (CZK)</Label>
                  <Input
                    id="wish-amount"
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="wish-date">Cílový datum</Label>
                  <Input
                    id="wish-date"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Priorita</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Nízká</SelectItem>
                    <SelectItem value="medium">Střední</SelectItem>
                    <SelectItem value="high">Vysoká</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full">
                Přidat přání
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wishes list */}
      {wishes.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Gift className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Zatím žádná přání</p>
          <p className="mt-1 text-sm text-[var(--card-text-dim)]">
            Přidejte své první přání a cíle
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {wishes.map((w) => {
            const prioConfig = getPriorityConfig(w.priority);
            const statusConfig = getStatusConfig(w.status);
            return (
              <div
                key={w.id}
                className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-[var(--card-text)]">
                      {w.title}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Smazat přání ${w.title}`}
                    onClick={() => handleDelete(w.id)}
                    className="h-8 w-8 p-0 text-[var(--card-text-dim)] hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {w.description && (
                  <p className="mb-3 text-sm text-[var(--card-text-muted)]">{w.description}</p>
                )}

                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge className={`text-[10px] ${prioConfig.color}`}>
                    {prioConfig.label}
                  </Badge>
                  <Badge className={`text-[10px] ${statusConfig.color}`}>
                    {statusConfig.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  {w.target_amount != null && (
                    <span className="font-medium text-[var(--card-text)]">
                      {formatCZK(w.target_amount)}
                    </span>
                  )}
                  {w.target_date && (
                    <span className="text-xs text-[var(--card-text-muted)]">
                      Do: {new Date(w.target_date).toLocaleDateString("cs-CZ")}
                    </span>
                  )}
                </div>

                {w.advisor_note && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
                    <p className="text-xs text-yellow-800">
                      <span className="font-medium">Poradce připravuje plán:</span>{" "}
                      {w.advisor_note}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PortalPageContainer>
  );
}
