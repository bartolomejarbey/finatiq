"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  CreditCard,
  Shield,
  Search,
  Info,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface ClientContract {
  id: string;
  title: string;
  type: string;
  status: string;
  processing_status: string;
  client_uploaded: boolean;
  created_at: string;
  client_name: string;
  client_id: string;
  provider: string | null;
  value: number | null;
  interest_rate: number | null;
  monthly_payment: number | null;
  valid_from: string | null;
  valid_to: string | null;
}

function formatCZK(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function ClientContractsQueue() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [filter, setFilter] = useState("new");
  const [docs, setDocs] = useState<Record<string, { id: string; name: string; file_path: string }[]>>({});
  const [threshold, setThreshold] = useState(5.0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      // Fetch advisor threshold
      const { data: adv } = await supabase.from("advisors").select("interest_rate_threshold").single();
      if (adv?.interest_rate_threshold) setThreshold(adv.interest_rate_threshold);

      const [contractsRes, clientsRes, docsRes] = await Promise.all([
        supabase.from("contracts").select("id, title, type, status, processing_status, client_uploaded, created_at, client_id, provider, value, interest_rate, monthly_payment, valid_from, valid_to").eq("client_uploaded", true).order("created_at", { ascending: false }),
        supabase.from("clients").select("id, first_name, last_name"),
        supabase.from("client_documents").select("id, name, file_path, client_id").eq("category", "contract"),
      ]);

      const clientMap: Record<string, string> = {};
      (clientsRes.data || []).forEach((c) => { clientMap[c.id] = `${c.first_name} ${c.last_name}`; });

      const docMap: Record<string, { id: string; name: string; file_path: string }[]> = {};
      (docsRes.data || []).forEach((d) => {
        if (!docMap[d.client_id]) docMap[d.client_id] = [];
        docMap[d.client_id].push(d);
      });
      setDocs(docMap);

      setContracts(
        (contractsRes.data || []).map((c) => ({
          ...c,
          client_name: clientMap[c.client_id] || "—",
          processing_status: c.processing_status || "new",
        }))
      );
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from("contracts").update({ processing_status: newStatus }).eq("id", id);
    setContracts((prev) => prev.map((c) => c.id === id ? { ...c, processing_status: newStatus } : c));
  }

  const filtered = contracts
    .filter((c) => filter === "all" ? true : c.processing_status === filter)
    .filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return c.client_name.toLowerCase().includes(q) || (c.provider?.toLowerCase().includes(q) ?? false) || c.title.toLowerCase().includes(q);
    });

  const newCount = contracts.filter((c) => c.processing_status === "new").length;
  const highRateCount = contracts.filter((c) => c.type === "uver" && c.interest_rate && c.interest_rate > threshold).length;

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    new: { label: "Nové", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: <Clock className="h-3.5 w-3.5" /> },
    in_progress: { label: "Rozpracované", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    resolved: { label: "Vyřešené", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  };

  if (loading) return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Smlouvy od klientů</h1>
          <p className="mt-1 text-sm text-[var(--card-text-muted)]">
            Přehled smluv nahraných klienty přes portál
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--card-text-dim)]" />
          <input
            type="text"
            placeholder="Hledat klienta, poskytovatele..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-72 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] pl-10 pr-4 text-sm text-[var(--card-text)] placeholder:text-[var(--card-text-dim)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{newCount}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Nových ke zpracování</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${highRateCount > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
              <AlertTriangle className={`h-5 w-5 ${highRateCount > 0 ? "text-red-500" : "text-emerald-500"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{highRateCount}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Vysoký úrok (&gt;{threshold}%)</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{contracts.length}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Celkem smluv</p>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
          <Info className="h-3.5 w-3.5" />
          <span className="font-medium">Legenda:</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-[var(--card-text-muted)]">Vysoký úrok</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-[var(--card-text-muted)]">Chybí údaje</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-[var(--card-text-muted)]">Kompletní</span>
        </div>
        <div className="ml-auto text-xs text-[var(--card-text-dim)]">
          Práh úrokové sazby: <span className="font-semibold text-[var(--card-text)]">{threshold}%</span>
          <span className="ml-1">(nastavení)</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Vše", count: contracts.length },
          { key: "new", label: "Nové", count: newCount },
          { key: "in_progress", label: "Rozpracované", count: contracts.filter((c) => c.processing_status === "in_progress").length },
          { key: "resolved", label: "Vyřešené", count: contracts.filter((c) => c.processing_status === "resolved").length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-[var(--color-primary)] text-white shadow-md shadow-blue-500/20"
                : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--card-text-muted)] hover:bg-[var(--table-hover)] hover:border-[var(--card-text-dim)]"
            }`}
          >
            {f.label}
            <span className={`rounded-full px-2 py-0.5 text-xs ${
              filter === f.key ? "bg-white/20" : "bg-[var(--table-hover)]"
            }`}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Contract cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] py-20 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--table-hover)]">
            <FileText className="h-8 w-8 text-[var(--card-text-dim)]" />
          </div>
          <p className="mt-4 text-lg font-medium text-[var(--card-text-dim)]">Žádné smlouvy</p>
          <p className="mt-1 text-sm text-[var(--card-text-dim)]">V tomto filtru nejsou žádné smlouvy k zobrazení</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const isHighRate = c.type === "uver" && c.interest_rate != null && c.interest_rate > threshold;
            const isCriticalRate = c.type === "uver" && c.interest_rate != null && c.interest_rate > threshold * 1.5;
            const missingData = c.type === "uver" && (!c.interest_rate || !c.monthly_payment);
            const status = statusConfig[c.processing_status] || statusConfig.new;

            return (
              <div
                key={c.id}
                className={`group rounded-2xl border bg-[var(--card-bg)] p-5 shadow-sm transition-all hover:shadow-md ${
                  isCriticalRate ? "border-red-300 bg-red-50/30" :
                  isHighRate ? "border-amber-300 bg-amber-50/20" :
                  missingData ? "border-amber-200" :
                  "border-[var(--card-border)]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Type icon */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    c.type === "uver" ? "bg-blue-50" : "bg-green-50"
                  }`}>
                    {c.type === "uver" ? (
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Shield className="h-5 w-5 text-green-600" />
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--card-text)]">{c.client_name}</span>
                      <span className="text-[var(--card-text-dim)]">·</span>
                      <span className="text-sm text-[var(--card-text-muted)]">{c.title || "Bez názvu"}</span>
                      {isHighRate && (
                        <Badge className={`text-[10px] ${isCriticalRate ? "bg-red-100 text-red-700 border-red-300" : "bg-amber-100 text-amber-700 border-amber-300"}`}>
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {isCriticalRate ? "Kritický úrok" : "Vysoký úrok"}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-4 flex-wrap">
                      {/* Type badge */}
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {c.type === "uver" ? "Úvěr" : c.type === "pojisteni" ? "Pojištění" : c.type}
                      </Badge>

                      {/* Provider */}
                      {c.provider && (
                        <span className="text-xs text-[var(--card-text-muted)]">{c.provider}</span>
                      )}

                      {/* Value */}
                      <span className="text-sm font-semibold text-[var(--card-text)]">
                        {c.value ? formatCZK(c.value) : <span className="text-amber-500 font-normal text-xs">částka neuvedena</span>}
                      </span>

                      {/* Interest rate */}
                      {c.type === "uver" && (
                        <>
                          {c.interest_rate ? (
                            <span className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                              isCriticalRate ? "bg-red-100 text-red-700" :
                              isHighRate ? "bg-amber-100 text-amber-700" :
                              "bg-emerald-50 text-emerald-700"
                            }`}>
                              <TrendingUp className="h-3 w-3" />
                              {c.interest_rate}%
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-500">
                              <AlertTriangle className="h-3 w-3" />
                              úrok chybí
                            </span>
                          )}
                        </>
                      )}

                      {/* Monthly payment */}
                      {c.type === "uver" && (
                        <>
                          {c.monthly_payment ? (
                            <span className="text-xs text-[var(--card-text-muted)]">
                              Splátka: {formatCZK(c.monthly_payment)}/měs
                            </span>
                          ) : (
                            <span className="text-xs text-amber-500">splátka chybí</span>
                          )}
                        </>
                      )}

                      {/* Date */}
                      <span className="text-xs text-[var(--card-text-dim)]">
                        {new Date(c.created_at).toLocaleDateString("cs-CZ")}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Document */}
                    {(docs[c.client_id] || []).length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-lg text-xs"
                        onClick={async () => {
                          const d = docs[c.client_id][0];
                          const { data } = await supabase.storage.from("deal-documents").createSignedUrl(d.file_path, 3600);
                          if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                        }}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Dokument
                      </Button>
                    )}

                    {/* Status select */}
                    <Select value={c.processing_status} onValueChange={(v) => updateStatus(c.id, v)}>
                      <SelectTrigger className={`h-9 w-40 rounded-lg text-xs font-medium border ${status.bg} ${status.color}`}>
                        <div className="flex items-center gap-1.5">
                          {status.icon}
                          {status.label}
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            Nové
                          </div>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                            Rozpracované
                          </div>
                        </SelectItem>
                        <SelectItem value="resolved">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Vyřešené
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Link to client */}
                    <Link href={`/advisor/clients/${c.client_id}`}>
                      <Button size="sm" variant="ghost" className="h-9 w-9 rounded-lg p-0">
                        <ChevronRight className="h-4 w-4 text-[var(--card-text-dim)]" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
