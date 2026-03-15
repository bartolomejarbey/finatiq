"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
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
import { Plus, Receipt, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentUpload } from "@/components/document-upload";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface OsvcRecord {
  id: string;
  type: string;
  amount: number;
  date: string;
  category: string;
  description: string | null;
  document_id: string | null;
}

const CATEGORIES: Record<string, string> = {
  material: "Materiál",
  sluzby: "Služby",
  doprava: "Doprava",
  najemne: "Nájemné",
  telefon: "Telefon",
  pojisteni: "Pojištění",
  ostatni: "Ostatní",
};

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function EvidencePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<OsvcRecord[]>([]);
  const [clientId, setClientId] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number | null>(null);

  // Form
  const [recType, setRecType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("ostatni");
  const [description, setDescription] = useState("");
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: client } = await supabase.from("clients").select("id, advisor_id, is_osvc").eq("user_id", user.id).single();
      if (!client || !client.is_osvc) { setLoading(false); return; }
      setClientId(client.id);
      setAdvisorId(client.advisor_id);

      const { data } = await supabase.from("osvc_records").select("*").eq("client_id", client.id).order("date", { ascending: false });
      setRecords(data || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    if (!amount || !clientId) return;
    setSaving(true);
    const { data: rec } = await supabase.from("osvc_records").insert({
      client_id: clientId,
      advisor_id: advisorId,
      type: recType,
      amount: parseFloat(amount),
      date,
      category,
      description: description || null,
      document_id: docId,
    }).select().single();

    if (rec) setRecords((prev) => [rec, ...prev]);
    setSaving(false);
    setSheetOpen(false);
    setAmount(""); setDescription(""); setDocId(null);
    toast.success("Doklad přidán.");
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;

  // Yearly data
  const yearRecords = records.filter((r) => r.date.startsWith(String(viewYear)));
  const totalIncome = yearRecords.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const totalExpense = yearRecords.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  // Monthly breakdown for chart
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    const prefix = `${viewYear}-${m}`;
    const monthRecs = yearRecords.filter((r) => r.date.startsWith(prefix));
    return {
      month: new Date(viewYear, i).toLocaleDateString("cs-CZ", { month: "short" }),
      příjmy: monthRecs.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0),
      výdaje: monthRecs.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0),
    };
  });

  // Current view records
  const viewRecords = viewMonth !== null
    ? yearRecords.filter((r) => r.date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`))
    : yearRecords;

  const viewIncome = viewRecords.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const viewExpense = viewRecords.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Evidence OSVČ</h1>
          <div className="mt-1 flex items-center gap-2">
            <select
              value={viewYear}
              onChange={(e) => { setViewYear(parseInt(e.target.value)); setViewMonth(null); }}
              className="rounded border px-2 py-1 text-sm text-[var(--card-text)]"
            >
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Přidat doklad
        </Button>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-emerald-500" /><p className="text-xs text-[var(--card-text-muted)]">Příjmy {viewMonth !== null ? `(${monthlyData[viewMonth]?.month})` : `(${viewYear})`}</p></div>
          <p className="text-xl font-bold text-emerald-600">{formatCZK(viewIncome)}</p>
        </div>
        <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-red-500" /><p className="text-xs text-[var(--card-text-muted)]">Výdaje</p></div>
          <p className="text-xl font-bold text-red-600">{formatCZK(viewExpense)}</p>
        </div>
        <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
          <p className="text-xs text-[var(--card-text-muted)]">Rozdíl</p>
          <p className={`text-xl font-bold ${viewIncome - viewExpense >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCZK(viewIncome - viewExpense)}</p>
        </div>
      </div>

      {/* Year chart */}
      <div className="mb-6 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">Roční přehled {viewYear}</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatCZK(v as number)} />
            <Legend />
            <Bar dataKey="příjmy" fill="#22C55E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="výdaje" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month tabs */}
      <div className="mb-4 flex flex-wrap gap-1">
        <button
          onClick={() => setViewMonth(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${viewMonth === null ? "bg-blue-600 text-white" : "bg-[var(--table-header)] text-[var(--card-text-muted)] hover:bg-[var(--table-hover)]"}`}
        >Celý rok</button>
        {monthlyData.map((m, i) => (
          <button
            key={i}
            onClick={() => setViewMonth(i)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${viewMonth === i ? "bg-blue-600 text-white" : "bg-[var(--table-header)] text-[var(--card-text-muted)] hover:bg-[var(--table-hover)]"}`}
          >{m.month}</button>
        ))}
      </div>

      {/* Records list */}
      {viewRecords.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Receipt className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádné doklady</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-[var(--card-bg)] shadow-sm">
          <table className="w-full">
            <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-[var(--card-text)]"><th className="px-6 py-3">Datum</th><th className="px-6 py-3">Popis</th><th className="px-6 py-3">Kategorie</th><th className="px-6 py-3">Typ</th><th className="px-6 py-3 text-right">Částka</th></tr></thead>
            <tbody>
              {viewRecords.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-[var(--table-hover)]">
                  <td className="px-6 py-3 text-sm text-[var(--card-text-muted)]">{new Date(r.date).toLocaleDateString("cs-CZ")}</td>
                  <td className="px-6 py-3 text-sm text-[var(--card-text)]">{r.description || "—"}</td>
                  <td className="px-6 py-3 text-sm text-[var(--card-text-muted)]">{CATEGORIES[r.category] || r.category}</td>
                  <td className="px-6 py-3">
                    <Badge className={`text-[10px] ${r.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {r.type === "income" ? "Příjem" : "Výdaj"}
                    </Badge>
                  </td>
                  <td className={`px-6 py-3 text-sm font-bold text-right ${r.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                    {r.type === "income" ? "+" : "−"}{formatCZK(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Month summary */}
          <div className="flex justify-end gap-6 border-t px-6 py-3 text-xs">
            <span className="text-emerald-600 font-medium">Příjmy: {formatCZK(viewIncome)}</span>
            <span className="text-red-600 font-medium">Výdaje: {formatCZK(viewExpense)}</span>
            <span className={`font-bold ${viewIncome - viewExpense >= 0 ? "text-emerald-700" : "text-red-700"}`}>Rozdíl: {formatCZK(viewIncome - viewExpense)}</span>
          </div>
        </div>
      )}

      {/* Add record sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] overflow-y-auto">
          <SheetHeader><SheetTitle>Přidat doklad</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-4">
            {/* Type toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setRecType("income")}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-colors ${recType === "income" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-[var(--card-border)] text-[var(--card-text-muted)]"}`}
              ><TrendingUp className="mx-auto mb-1 h-5 w-5" />Příjem</button>
              <button
                onClick={() => setRecType("expense")}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-center text-sm font-medium transition-colors ${recType === "expense" ? "border-red-500 bg-red-50 text-red-700" : "border-[var(--card-border)] text-[var(--card-text-muted)]"}`}
              ><TrendingDown className="mx-auto mb-1 h-5 w-5" />Výdaj</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Částka (Kč) *</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Datum *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1"><Label className="text-xs">Popis</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>

            {/* Document upload with OCR */}
            <div className="space-y-1">
              <Label className="text-xs">Doklad (fotka/PDF)</Label>
              {clientId && advisorId && (
                <DocumentUpload
                  clientId={clientId}
                  advisorId={advisorId}
                  category="receipt"
                  runOcr
                  onUploaded={(id, ocrData) => {
                    setDocId(id);
                    if (ocrData) {
                      if (ocrData.amount && !amount) setAmount(String(ocrData.amount));
                      if (ocrData.date && date === new Date().toISOString().split("T")[0]) setDate(String(ocrData.date));
                      toast.success("OCR data načtena — zkontrolujte a upravte.");
                    }
                  }}
                />
              )}
            </div>

            <Button onClick={handleSave} disabled={saving || !amount} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Uložit doklad
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Loader2Icon(props: { className?: string }) {
  return <svg className={props.className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;
}
