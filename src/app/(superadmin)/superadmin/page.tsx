"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, DollarSign, TrendingUp, FileText, Mail, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function SuperadminDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [advisorCount, setAdvisorCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [dealCount, setDealCount] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [regData, setRegData] = useState<{ month: string; count: number }[]>([]);
  const [mrrData, setMrrData] = useState<{ month: string; mrr: number }[]>([]);
  const [recentAdvisors, setRecentAdvisors] = useState<{ id: string; company_name: string; created_at: string; subscription_tier: string }[]>([]);
  const [topAdvisors, setTopAdvisors] = useState<{ company_name: string; client_count: number }[]>([]);
  const [recentTickets, setRecentTickets] = useState<any[]>([]);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [advisorsRes, clientsRes, dealsRes, plansRes, ticketsRes, errorsRes] = await Promise.all([
        supabase.from("advisors").select("id, company_name, created_at, subscription_tier, subscription_status, is_active, email"),
        supabase.from("clients").select("id, advisor_id"),
        supabase.from("deals").select("id", { count: "exact", head: true }),
        supabase.from("subscription_plans").select("tier, price_monthly"),
        supabase
          .from("tickets")
          .select("id, subject, status, created_at, advisors(company_name)")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("error_logs")
          .select("id, message, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const advisorsData = advisorsRes.data || [];
      const clients = clientsRes.data || [];
      const plans = plansRes.data || [];

      setAdvisors(advisorsData);
      setAdvisorCount(advisorsData.length);
      setClientCount(clients.length);
      setDealCount(dealsRes.count || 0);
      setRecentTickets(ticketsRes.data || []);
      setRecentErrors(errorsRes.data || []);

      const planPrices: Record<string, number> = {};
      plans.forEach((p) => { planPrices[p.tier] = p.price_monthly; });
      const totalMrr = advisorsData.filter((a) => a.is_active).reduce((s, a) => s + (planPrices[a.subscription_tier] || 0), 0);
      setMrr(totalMrr);

      // Registration trend (last 12 months)
      const now = new Date();
      const reg: { month: string; count: number }[] = [];
      const mrrTrend: { month: string; mrr: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthStr = d.toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" });
        const count = advisorsData.filter((a) => a.created_at >= d.toISOString() && a.created_at < end.toISOString()).length;
        reg.push({ month: monthStr, count });
        const activeByThen = advisorsData.filter((a) => a.created_at < end.toISOString());
        const monthMrr = activeByThen.reduce((s, a) => s + (planPrices[a.subscription_tier] || 0), 0);
        mrrTrend.push({ month: monthStr, mrr: monthMrr });
      }
      setRegData(reg);
      setMrrData(mrrTrend);

      // Recent registrations
      setRecentAdvisors(
        [...advisorsData].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10)
      );

      // Top advisors by client count
      const clientCounts: Record<string, number> = {};
      clients.forEach((c) => { clientCounts[c.advisor_id] = (clientCounts[c.advisor_id] || 0) + 1; });
      const top = Object.entries(clientCounts)
        .map(([id, count]) => ({ company_name: advisorsData.find((a) => a.id === id)?.company_name || "—", client_count: count }))
        .sort((a, b) => b.client_count - a.client_count)
        .slice(0, 10);
      setTopAdvisors(top);

      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Computed metrics
  const activeCount = advisors.filter((a: any) => a.subscription_status === "active").length;
  const trialCount = advisors.filter((a: any) => a.subscription_status === "trial").length;
  const expiredCount = advisors.filter((a: any) => a.subscription_status === "expired").length;
  const avgPrice = activeCount > 0 ? Math.round(mrr / activeCount) : 0;

  // Churn this month
  const churnCount = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return advisors.filter(
      (a: any) => a.subscription_status === "expired" && a.created_at < monthStart
    ).length;
  }, [advisors]);

  // Trial -> paid conversion chart data
  const conversionData = useMemo(() => {
    const months: Record<string, { trials: number; converted: number }> = {};
    advisors.forEach((a: any) => {
      const created = a.created_at?.slice(0, 7);
      if (created) {
        months[created] = months[created] || { trials: 0, converted: 0 };
        months[created].trials++;
        if (a.subscription_status === "active") months[created].converted++;
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([m, d]) => ({
        month: m,
        rate: d.trials > 0 ? Math.round((d.converted / d.trials) * 100) : 0,
      }));
  }, [advisors]);

  // Quick action handlers
  async function generateInvoices() {
    try {
      const res = await fetch("/api/cron/monthly-invoices", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}` },
      });
      if (res.ok) {
        toast.success("Faktury byly vygenerovány");
      } else {
        toast.error("Chyba při generování faktur");
      }
    } catch {
      toast.error("Chyba při generování faktur");
    }
  }

  function exportAdvisors() {
    const headers = ["ID", "Firma", "Email", "Tier", "Status", "Vytvořeno"];
    const rows = advisors.map((a: any) => [
      a.id,
      a.company_name,
      a.email || "",
      a.subscription_tier || "",
      a.subscription_status || "",
      a.created_at || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r: string[]) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "poradci-export.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export stažen");
  }

  async function sendBulkEmail() {
    if (!bulkSubject.trim() || !bulkBody.trim()) {
      toast.error("Vyplňte předmět i text");
      return;
    }
    setSending(true);
    const activeAdvisors = advisors.filter((a: any) => a.subscription_status === "active");
    let sent = 0;
    for (const a of activeAdvisors) {
      try {
        await fetch("/api/tickets/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "bulk",
            email: a.email,
            subject: bulkSubject,
            body: bulkBody,
          }),
        });
        sent++;
      } catch {
        // skip failed
      }
    }
    setSending(false);
    setBulkEmailOpen(false);
    setBulkSubject("");
    setBulkBody("");
    toast.success(`Odesláno ${sent} z ${activeAdvisors.length} emailů`);
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div></div>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold gradient-text">Administrace</h1>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={DollarSign} label="MRR" value={formatCZK(mrr)} color="text-amber-600" bg="bg-amber-50" />
        <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Poradců</p>
              <p className="text-lg font-bold text-slate-900">{advisorCount}</p>
              <p className="text-[10px] text-slate-400">{activeCount} aktivních / {trialCount} trial / {expiredCount} expired</p>
            </div>
          </div>
        </div>
        <KpiCard icon={Briefcase} label="Klientů" value={String(clientCount)} color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard icon={TrendingUp} label="Ø cena / poradce" value={formatCZK(avgPrice)} color="text-violet-600" bg="bg-violet-50" />
        <KpiCard icon={TrendingUp} label="Churn (tento měsíc)" value={String(churnCount)} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Noví poradci</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={regData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Registrace" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">MRR trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={mrrData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCZK(v as number)} />
              <Line type="monotone" dataKey="mrr" name="MRR" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion chart */}
      <div className="mb-6 border rounded-xl p-6 shadow-sm bg-white">
        <h3 className="font-semibold text-sm mb-4">Konverze trial &rarr; placený (%)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={conversionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="rate" fill="#22d3ee" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 border rounded-xl p-6 shadow-sm bg-white">
        <h3 className="font-semibold text-sm mb-3">Rychlé akce</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={generateInvoices}>
            <FileText className="w-4 h-4 mr-2" /> Generovat faktury
          </Button>
          <Button variant="outline" onClick={() => setBulkEmailOpen(true)}>
            <Mail className="w-4 h-4 mr-2" /> Hromadný email
          </Button>
          <Button variant="outline" onClick={exportAdvisors}>
            <Download className="w-4 h-4 mr-2" /> Export poradců
          </Button>
        </div>
      </div>

      {/* Activity sections */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent tickets */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Poslední tikety</h2>
          <div className="space-y-2">
            {recentTickets.length === 0 && <p className="text-sm text-slate-400">Žádné tikety</p>}
            {recentTickets.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-900 truncate block">{t.subject}</span>
                  <span className="text-[10px] text-slate-400">{(t.advisors as any)?.company_name || "—"}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={t.status === "open" ? "destructive" : t.status === "closed" ? "secondary" : "default"}>
                    {t.status}
                  </Badge>
                  <span className="text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString("cs-CZ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent errors */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Poslední chyby</h2>
          <div className="space-y-2">
            {recentErrors.length === 0 && <p className="text-sm text-slate-400">Žádné chyby</p>}
            {recentErrors.map((e: any) => (
              <div key={e.id} className="rounded-lg bg-red-50 px-3 py-2">
                <p className="text-sm text-red-800 truncate">{e.message}</p>
                <p className="text-[10px] text-red-400">{new Date(e.created_at).toLocaleString("cs-CZ")}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Existing tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Posledních 10 registrací</h2>
          <div className="space-y-2">
            {recentAdvisors.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-900">{a.company_name}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{a.subscription_tier}</span>
                  <span className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString("cs-CZ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Top poradci (klienti)</h2>
          <div className="space-y-2">
            {topAdvisors.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-sm font-medium text-slate-900">{a.company_name}</span>
                <span className="text-sm font-bold text-slate-700">{a.client_count} klientů</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Email Dialog */}
      <Dialog open={bulkEmailOpen} onOpenChange={setBulkEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hromadný email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Předmět</label>
              <Input
                value={bulkSubject}
                onChange={(e) => setBulkSubject(e.target.value)}
                placeholder="Předmět emailu"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Text</label>
              <Textarea
                value={bulkBody}
                onChange={(e) => setBulkBody(e.target.value)}
                placeholder="Text emailu..."
                rows={6}
              />
            </div>
            <p className="text-xs text-slate-400">Odešle se {activeCount} aktivním poradcům</p>
            <Button onClick={sendBulkEmail} disabled={sending} className="w-full">
              {sending ? "Odesílám..." : "Odeslat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, bg }: { icon: typeof Users; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
        <div><p className="text-xs text-slate-500">{label}</p><p className="text-lg font-bold text-slate-900">{value}</p></div>
      </div>
    </div>
  );
}
