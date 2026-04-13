"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { FilterButton, FilterGroup } from "@/components/ui/filter-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard, CheckCircle2, Clock, AlertTriangle,
  Wallet, Plus, Loader2, CalendarClock, Repeat,
} from "lucide-react";
import { toast } from "sonner";

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

interface Payment {
  id: string;
  title: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  contract_id: string | null;
  is_recurring: boolean;
  recurrence_interval: string | null;
  note: string | null;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  monthly_payment: number | null;
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [contractId, setContractId] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState("monthly");
  const [note, setNote] = useState("");

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/payments");
      if (!res.ok) { setError("Nepodařilo se načíst platby."); setLoading(false); return; }
      const data = await res.json();
      setPayments(data.payments || []);
      setContracts(data.contracts || []);
    } catch {
      setError("Nepodařilo se načíst platby.");
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();

  // Auto-detect overdue
  const enriched = payments.map((p) => {
    if (p.status === "pending" && p.due_date && new Date(p.due_date) < now) {
      return { ...p, status: "overdue" };
    }
    return p;
  });

  const filtered = enriched.filter((p) => {
    if (filter === "all") return true;
    if (filter === "pending") return p.status === "pending";
    if (filter === "paid") return p.status === "paid";
    if (filter === "overdue") return p.status === "overdue";
    return true;
  });

  const pendingCount = enriched.filter((p) => p.status === "pending").length;
  const overdueCount = enriched.filter((p) => p.status === "overdue").length;
  const paidCount = enriched.filter((p) => p.status === "paid").length;

  const totalPending = enriched
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((s, p) => s + p.amount, 0);

  function resetForm() {
    setTitle(""); setAmount(""); setDueDate(""); setContractId("");
    setIsRecurring(false); setRecurrenceInterval("monthly"); setNote("");
  }

  async function handleAdd() {
    if (!title.trim() || !amount) {
      toast.error("Vyplňte název a částku.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/portal/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: parseFloat(amount),
          due_date: dueDate || null,
          contract_id: contractId || null,
          is_recurring: isRecurring,
          recurrence_interval: isRecurring ? recurrenceInterval : null,
          recurrence_day: dueDate ? new Date(dueDate).getDate() : null,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Chyba při ukládání.");
      } else {
        toast.success("Platba přidána.");
        setShowAdd(false);
        resetForm();
        fetchData();
      }
    } catch {
      toast.error("Chyba při ukládání.");
    }
    setSaving(false);
  }

  async function markAsPaid(paymentId: string) {
    try {
      const res = await fetch("/api/portal/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: paymentId, status: "paid" }),
      });
      if (res.ok) {
        toast.success("Platba označena jako uhrazená.");
        fetchData();
      } else {
        toast.error("Chyba při aktualizaci.");
      }
    } catch {
      toast.error("Chyba při aktualizaci.");
    }
  }

  // Fill from contract
  function fillFromContract(cId: string) {
    setContractId(cId);
    const c = contracts.find((x) => x.id === cId);
    if (c) {
      if (!title) setTitle(c.title);
      if (!amount && c.monthly_payment) setAmount(String(c.monthly_payment));
      setIsRecurring(true);
      setRecurrenceInterval("monthly");
    }
  }

  function getStatusInfo(p: Payment) {
    if (p.status === "paid") return { icon: CheckCircle2, label: "Uhrazeno", bg: "bg-[color-mix(in_srgb,var(--accent-success)_14%,transparent)]", text: "text-[var(--accent-success)]" };
    if (p.status === "overdue") return { icon: AlertTriangle, label: "Po splatnosti", bg: "bg-destructive/10", text: "text-destructive" };
    return { icon: Clock, label: "Čeká na úhradu", bg: "bg-[color-mix(in_srgb,var(--accent-warning)_14%,transparent)]", text: "text-[var(--accent-warning)]" };
  }

  if (loading) return (
    <div className="p-4 md:p-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" />
      </div>
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );
  if (error) return <div className="p-4 md:p-8"><ErrorState description={error} onRetry={fetchData} /></div>;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--card-text)]">Platby</h1>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Přidat platbu
        </Button>
      </div>

      {/* Summary cards */}
      {payments.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--card-text-muted)]">K úhradě</p>
              <p className="text-lg font-bold text-amber-600">{formatCZK(totalPending)}</p>
              <p className="text-[10px] text-[var(--card-text-dim)]">{pendingCount + overdueCount} plateb</p>
            </div>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-600">Po splatnosti</p>
                <p className="text-lg font-bold text-red-600">{overdueCount}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--card-text-muted)]">Uhrazeno</p>
              <p className="text-lg font-bold text-emerald-600">{paidCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <FilterGroup value={filter} onChange={setFilter} className="mb-4">
        {[
          { key: "all", label: "Vše" },
          { key: "pending", label: "Čekající" },
          { key: "paid", label: "Uhrazené" },
          { key: "overdue", label: "Po splatnosti" },
        ].map((f) => (
          <FilterButton key={f.key} value={f.key}>
            {f.label}
          </FilterButton>
        ))}
      </FilterGroup>

      {/* Payment list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-12 w-12" />}
          title="Žádné platby"
          description={payments.length === 0
            ? "Přidejte platbu a sledujte své závazky a termíny."
            : "V tomto filtru nejsou žádné platby."
          }
          action={payments.length === 0 ? (
            <div className="flex gap-3">
              <Button onClick={() => { resetForm(); setShowAdd(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Přidat platbu
              </Button>
              <Button variant="outline" asChild>
                <Link href="/portal/contracts">Přidat smlouvu</Link>
              </Button>
            </div>
          ) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const status = getStatusInfo(p);
            const StatusIcon = status.icon;
            const daysUntil = p.due_date
              ? Math.ceil((new Date(p.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <div key={p.id} className="flex items-center gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 hover:shadow-sm transition-shadow">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${status.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${status.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--card-text)]">{p.title}</p>
                    {p.is_recurring && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Repeat className="h-3 w-3" />
                        {p.recurrence_interval === "monthly" ? "Měsíčně" : p.recurrence_interval === "quarterly" ? "Čtvrtletně" : "Ročně"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-[var(--card-text-muted)]">
                      {p.due_date ? `Splatnost: ${new Date(p.due_date).toLocaleDateString("cs-CZ")}` : "Bez termínu"}
                    </p>
                    {p.status === "pending" && daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0">
                        <CalendarClock className="mr-1 h-3 w-3" />
                        {daysUntil === 0 ? "Dnes" : daysUntil === 1 ? "Zítra" : `za ${daysUntil} dní`}
                      </Badge>
                    )}
                    {p.status === "paid" && p.paid_date && (
                      <span className="text-[10px] text-emerald-600">
                        uhrazeno {new Date(p.paid_date).toLocaleDateString("cs-CZ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-[var(--card-text)]">{formatCZK(p.amount)}</p>
                    <span className={`text-[10px] font-medium ${status.text}`}>{status.label}</span>
                  </div>
                  {(p.status === "pending" || p.status === "overdue") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                      onClick={(e) => { e.stopPropagation(); markAsPaid(p.id); }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Uhrazeno
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add payment sheet */}
      <Sheet open={showAdd} onOpenChange={(o) => { if (!o) setShowAdd(false); }}>
        <SheetContent className="w-[500px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Přidat platbu</SheetTitle>
            <SheetDescription>
              Zadejte údaje o platbě. Můžete ji propojit se smlouvou a nastavit opakování.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Link to contract */}
            {contracts.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Propojit se smlouvou (nepovinné)</Label>
                <Select value={contractId} onValueChange={fillFromContract}>
                  <SelectTrigger><SelectValue placeholder="Vyberte smlouvu..." /></SelectTrigger>
                  <SelectContent>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title} {c.monthly_payment ? `(${formatCZK(c.monthly_payment)}/měs)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Název platby *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="např. Splátka hypotéky, Pojistné"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Částka (Kč) *</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Datum splatnosti</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* Recurring toggle */}
            <div className="rounded-lg border border-[var(--card-border)] p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--card-text)]">Opakující se platba</p>
                  <p className="text-xs text-[var(--card-text-muted)]">
                    Po uhrazení se automaticky vytvoří další platba
                  </p>
                </div>
              </label>
              {isRecurring && (
                <div className="mt-3">
                  <Select value={recurrenceInterval} onValueChange={setRecurrenceInterval}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Měsíčně</SelectItem>
                      <SelectItem value="quarterly">Čtvrtletně</SelectItem>
                      <SelectItem value="yearly">Ročně</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Poznámka (nepovinné)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="např. VS 1234567890"
              />
            </div>

            <Button onClick={handleAdd} disabled={saving} className="w-full mt-4">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Přidat platbu
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
