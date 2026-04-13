"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ContactAdvisorButton } from "@/components/portal/ContactAdvisorButton";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  Wallet,
  CreditCard,
  FileText,
  Target,
  Bell,
  Phone,
  Upload,
  Plus,
  TrendingUp,
  CalendarDays,
  Heart,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from "recharts";

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

interface AdvisorContact {
  company_name: string;
}

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  href?: string;
}

export default function ClientDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [activeContracts, setActiveContracts] = useState(0);
  const [nextPayment, setNextPayment] = useState<{ amount: number; date: string; daysLeft: number } | null>(null);
  const [goalProgress, setGoalProgress] = useState(0);
  const [totalGoals, setTotalGoals] = useState(0);
  const [onTrackGoals, setOnTrackGoals] = useState(0);
  const [portfolioHistory, setPortfolioHistory] = useState<{ month: string; value: number }[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; title: string; type: string; created_at: string }[]>([]);
  const [advisor, setAdvisor] = useState<AdvisorContact | null>(null);
  const [clientId, setClientId] = useState("");
  const [totalDebt, setTotalDebt] = useState(0);
  const [financialHealth, setFinancialHealth] = useState(0);
  const [monthlyChange, setMonthlyChange] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const meRes = await fetch("/api/portal/me");
      const client = meRes.ok ? (await meRes.json()).client : null;
      if (!client) { setLoading(false); return; }
      if (!client.onboarding_completed) { router.push("/portal/vitejte"); return; }

      setClientId(client.id);
      setClientName(`${client.first_name} ${client.last_name}`);

      // Load checklist progress
      const { data: progress } = await supabase.from("onboarding_progress").select("steps, completed_at").eq("user_id", user.id).eq("role", "client").single();
      if (progress && progress.completed_at) {
        const steps = (progress.steps || {}) as Record<string, boolean>;
        const items: ChecklistItem[] = [
          { key: "profile", label: "Doplnit profil", done: !!steps.profile, href: "/portal/vitejte" },
          { key: "first_contract", label: "Přidat smlouvu", done: !!(steps.first_contract || steps.first_contract_skipped), href: "/portal/contracts" },
          { key: "document", label: "Nahrát dokument", done: !!steps.document, href: "/portal/documents" },
        ];
        const allDone = items.every((i) => i.done);
        if (!allDone) {
          setChecklist(items);
          setShowChecklist(true);
        }
      }

      const [investRes, contractsRes, paymentsRes, goalsRes, notifsRes, advisorRes, loansRes] = await Promise.all([
        supabase.from("investments").select("current_value").eq("client_id", client.id),
        supabase.from("contracts").select("id, status").eq("client_id", client.id),
        supabase.from("payments").select("amount, due_date, status").eq("client_id", client.id).eq("status", "pending").order("due_date").limit(1),
        supabase.from("financial_goals").select("target_amount, current_amount").eq("client_id", client.id),
        supabase.from("client_notifications").select("id, title, type, created_at").eq("client_id", client.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("advisors").select("company_name").eq("id", client.advisor_id).single(),
        supabase.from("contracts").select("remaining_balance").eq("client_id", client.id).eq("type", "uver").eq("status", "active"),
      ]);

      const totalPortfolio = (investRes.data || []).reduce((s, i) => s + (i.current_value || 0), 0);
      setPortfolioValue(totalPortfolio);
      setActiveContracts((contractsRes.data || []).filter((c) => c.status === "active").length);

      const debt = (loansRes.data || []).reduce((s, l) => s + (l.remaining_balance || 0), 0);
      setTotalDebt(debt);

      if (paymentsRes.data && paymentsRes.data.length > 0) {
        const p = paymentsRes.data[0];
        const daysLeft = Math.ceil((new Date(p.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        setNextPayment({ amount: p.amount, date: p.due_date, daysLeft });
      }

      const goals = goalsRes.data || [];
      setTotalGoals(goals.length);
      if (goals.length > 0) {
        const onTrack = goals.filter((g) => g.current_amount >= g.target_amount * 0.5).length;
        setOnTrackGoals(onTrack);
        setGoalProgress(Math.round((onTrack / goals.length) * 100));
      }

      // Financial health score (0-100)
      const netWorth = totalPortfolio - debt;
      const healthScore = Math.min(100, Math.max(0, Math.round(50 + (netWorth > 0 ? 30 : -20) + (goals.length > 0 ? goalProgress * 0.2 : 0))));
      setFinancialHealth(healthScore);

      setNotifications(notifsRes.data || []);
      if (advisorRes.data) setAdvisor(advisorRes.data);

      // Portfolio history
      const history: { month: string; value: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const factor = 0.85 + (0.15 * ((6 - i) / 6));
        history.push({
          month: d.toLocaleDateString("cs-CZ", { month: "short" }),
          value: Math.round(totalPortfolio * factor),
        });
      }
      setPortfolioHistory(history);
      if (history.length >= 2) {
        setMonthlyChange(history[history.length - 1].value - history[history.length - 2].value);
      }

      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="p-4 md:p-8 space-y-6">
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  );

  const netWorth = portfolioValue - totalDebt;

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      {/* HERO CARD */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 md:p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-400">Dobrý den, {clientName}</p>
            <p className="mt-0.5 text-xs text-gray-500">Váš finanční přehled na jednom místě — vše pod kontrolou.</p>
            <p className="mt-2 text-3xl md:text-4xl font-bold">{formatCZK(netWorth)}</p>
            <p className={`mt-1 text-sm ${monthlyChange > 0 ? "text-green-400" : monthlyChange < 0 ? "text-red-400" : "text-gray-400"}`}>
              {monthlyChange > 0 ? "+" : ""}{formatCZK(monthlyChange)} tento měsíc
            </p>
          </div>
          {/* Mini sparkline */}
          <div className="hidden md:block w-48 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioHistory}>
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={2} fill="url(#heroGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* BENTO GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {/* Aktiva */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 hover:shadow-md transition-shadow">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--card-text)]">{formatCZK(portfolioValue)}</p>
          <p className="text-xs text-[var(--card-text-muted)]">celková hodnota aktiv</p>
        </div>

        {/* Závazky */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 hover:shadow-md transition-shadow">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
            <CreditCard className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--card-text)]">{formatCZK(totalDebt)}</p>
          <p className="text-xs text-[var(--card-text-muted)]">celkové závazky</p>
        </div>

        {/* Další platba */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 hover:shadow-md transition-shadow">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <CalendarDays className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--card-text)]">{nextPayment ? formatCZK(nextPayment.amount) : "—"}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[var(--card-text-muted)]">další platba</p>
            {nextPayment && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">za {nextPayment.daysLeft} dní</span>
            )}
          </div>
        </div>

        {/* Finanční zdraví - gauge */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={financialHealth >= 70 ? "#22c55e" : financialHealth >= 40 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${financialHealth * 0.9425} 94.25`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--card-text)]">
                {financialHealth}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--card-text)]">Finanční zdraví</p>
              <p className="text-xs text-[var(--card-text-muted)]">skóre 0–100</p>
            </div>
          </div>
        </div>

        {/* Plnění cílů */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 hover:shadow-md transition-shadow">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
            <Target className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-sm font-semibold text-[var(--card-text)]">{onTrackGoals} z {totalGoals} cílů</p>
          <div className="mt-2 h-2 w-full rounded-full bg-[var(--table-header)]">
            <div className="h-2 rounded-full bg-violet-500 transition-all" style={{ width: `${goalProgress}%` }} />
          </div>
        </div>

        {/* Smlouvy */}
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 hover:shadow-md transition-shadow">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-[var(--card-text)]">{activeContracts}</p>
          <p className="text-xs text-[var(--card-text-muted)]">aktivních smluv</p>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/portal/contracts", label: "Přidat smlouvu", icon: Plus, },
          { href: "/portal/payments", label: "Zaplatit splátku", icon: CreditCard },
          { href: "contact-advisor", label: "Kontaktovat poradce", icon: Phone },
          { href: "/portal/documents", label: "Nahrát dokument", icon: Upload },
        ].map((item) => (
          item.href === "contact-advisor" ? (
            <div key={item.label} className="flex flex-col items-center gap-2 rounded-2xl p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--table-header)]">
                <item.icon className="h-5 w-5 text-[var(--card-text-muted)]" />
              </div>
              <ContactAdvisorButton clientId={clientId} label={item.label} variant="ghost" className="h-auto whitespace-normal p-0 text-center text-xs text-[var(--card-text-muted)] hover:bg-transparent hover:text-blue-600" />
            </div>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="flex flex-col items-center gap-2 rounded-2xl p-4 transition-colors hover:bg-blue-50 group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--table-header)] group-hover:bg-blue-100 transition-colors">
                <item.icon className="h-5 w-5 text-[var(--card-text-muted)] group-hover:text-blue-600 transition-colors" />
              </div>
              <span className="text-xs text-[var(--card-text-muted)] text-center">{item.label}</span>
            </Link>
          )
        ))}
      </div>

      {/* NOTIFICATIONS */}
      {notifications.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--card-text-muted)] mb-3">Poslední oznámení</h2>
          <div className="space-y-2">
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 hover:shadow-sm transition-shadow">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                  n.type === "payment" ? "bg-amber-100" : n.type === "contract" ? "bg-blue-100" : "bg-[var(--table-header)]"
                }`}>
                  <Bell className={`h-4 w-4 ${
                    n.type === "payment" ? "text-amber-600" : n.type === "contract" ? "text-blue-600" : "text-[var(--card-text-muted)]"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--card-text)] truncate">{n.title}</p>
                  <p className="text-xs text-[var(--card-text-dim)]">{new Date(n.created_at).toLocaleDateString("cs-CZ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onboarding checklist */}
      {showChecklist && (
        <div className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--card-text-muted)]">Dokončete nastavení</h2>
            <span className="text-xs text-[var(--card-text-dim)]">{checklist.filter((i) => i.done).length}/{checklist.length}</span>
          </div>
          <div className="mb-3 h-2 rounded-full bg-[var(--table-header)]">
            <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${(checklist.filter((i) => i.done).length / checklist.length) * 100}%` }} />
          </div>
          <div className="space-y-2">
            {checklist.map((item) => (
              <button
                key={item.key}
                onClick={() => item.href && !item.done && router.push(item.href)}
                disabled={item.done}
                aria-disabled={item.done || undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${item.done ? "cursor-default opacity-60" : item.href ? "hover:bg-[var(--table-hover)] cursor-pointer" : ""}`}
              >
                {item.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <Circle className="h-5 w-5 text-[var(--card-text-dim)] shrink-0" />}
                <span className={`text-sm ${item.done ? "text-[var(--card-text-dim)] line-through" : "text-[var(--card-text)]"}`}>{item.label}</span>
                {!item.done && item.href && <ArrowRight className="ml-auto h-3.5 w-3.5 text-[var(--card-text-dim)]" />}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowChecklist(false)}
            className="mt-3 text-xs text-[var(--card-text-dim)] hover:text-[var(--card-text-muted)] transition-colors"
          >
            Skrýt
          </button>
        </div>
      )}
    </div>
  );
}
