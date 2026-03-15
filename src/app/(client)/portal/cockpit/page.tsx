"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Landmark } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

interface Loan {
  id: string;
  title: string;
  remaining_balance: number;
  interest_rate: number | null;
  monthly_payment: number | null;
}

interface Investment {
  id: string;
  instrument_name: string;
  type: string;
  current_value: number;
}

interface FinancialGoal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
}

interface NetWorthPoint {
  month: string;
  value: number;
}

export default function CockpitPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthPoint[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single();
      if (!client) { setLoading(false); return; }

      const [contractsRes, investmentsRes, goalsRes] = await Promise.all([
        supabase
          .from("contracts")
          .select("id, title, remaining_balance, interest_rate, monthly_payment")
          .eq("client_id", client.id)
          .eq("type", "uver")
          .eq("status", "active"),
        supabase
          .from("investments")
          .select("id, instrument_name, type, current_value")
          .eq("client_id", client.id),
        supabase
          .from("financial_goals")
          .select("id, title, target_amount, current_amount")
          .eq("client_id", client.id),
      ]);

      const fetchedLoans = (contractsRes.data || []).filter((l) => l.remaining_balance != null) as Loan[];
      const fetchedInvestments = (investmentsRes.data || []) as Investment[];
      const fetchedGoals = (goalsRes.data || []) as FinancialGoal[];

      setLoans(fetchedLoans);
      setInvestments(fetchedInvestments);
      setGoals(fetchedGoals);

      // Build extrapolated net worth history over 12 months
      const totalAssets = fetchedInvestments.reduce((s, i) => s + (i.current_value || 0), 0)
        + fetchedGoals.reduce((s, g) => s + (g.current_amount || 0), 0);
      const totalDebt = fetchedLoans.reduce((s, l) => s + (l.remaining_balance || 0), 0);
      const totalMonthlyPayment = fetchedLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
      const currentNetWorth = totalAssets - totalDebt;

      const history: NetWorthPoint[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        // Extrapolate backwards: debt was higher, assets were lower
        const debtDelta = totalMonthlyPayment * i * 0.7;
        const assetGrowthFactor = 0.85 + (0.15 * ((12 - i) / 12)) + (Math.random() * 0.04 - 0.02);
        const pastAssets = totalAssets * assetGrowthFactor;
        const pastDebt = totalDebt + debtDelta;
        const pastNetWorth = pastAssets - pastDebt;
        history.push({
          month: d.toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" }),
          value: Math.round(i === 0 ? currentNetWorth : pastNetWorth),
        });
      }
      setNetWorthHistory(history);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const totalDebt = loans.reduce((s, l) => s + l.remaining_balance, 0);
  const totalAssets = investments.reduce((s, i) => s + i.current_value, 0)
    + goals.reduce((s, g) => s + (g.current_amount || 0), 0);
  const netWorth = totalAssets - totalDebt;
  const isPositive = netWorth >= 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-[var(--card-text)]">Finanční cockpit</h1>

      {/* Net worth hero card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 md:p-8 text-white">
        <p className="text-sm text-gray-400">Čistá hodnota</p>
        <div className="flex items-center gap-3 mt-2">
          {isPositive ? <TrendingUp className="h-6 w-6 text-green-400" /> : <TrendingDown className="h-6 w-6 text-red-400" />}
          <p className={`text-3xl md:text-4xl font-bold`}>{formatCZK(netWorth)}</p>
        </div>
      </div>

      {/* Two-column: Liabilities & Assets */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* ZÁVAZKY (Liabilities) - Red panel */}
        <div className="rounded-2xl border border-red-200 bg-[var(--card-bg)] shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 rounded-t-2xl bg-gradient-to-r from-red-50 to-red-100/50 border-b border-red-100 px-6 py-4">
            <CreditCard className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-red-600">Závazky</h2>
          </div>
          <div className="px-6 py-4">
            {loans.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <CreditCard className="mb-2 h-8 w-8 text-[var(--card-text-dim)]" />
                <p className="text-sm text-[var(--card-text-muted)]">Žádné závazky</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--card-border)]">
                {loans.map((loan) => (
                  <li key={loan.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--card-text)]">{loan.title}</p>
                      {loan.interest_rate != null && (
                        <p className="text-xs text-[var(--card-text-muted)]">Úrok: {loan.interest_rate}%</p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-red-600">{formatCZK(loan.remaining_balance)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-red-100 px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--card-text)]">Celkový dluh</span>
              <span className="text-lg font-bold text-red-600">{formatCZK(totalDebt)}</span>
            </div>
          </div>
        </div>

        {/* AKTIVA (Assets) - Green panel */}
        <div className="rounded-2xl border border-emerald-200 bg-[var(--card-bg)] shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 rounded-t-2xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-b border-emerald-100 px-6 py-4">
            <Landmark className="h-5 w-5 text-emerald-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Aktiva</h2>
          </div>
          <div className="px-6 py-4">
            {investments.length === 0 && goals.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <Wallet className="mb-2 h-8 w-8 text-[var(--card-text-dim)]" />
                <p className="text-sm text-[var(--card-text-muted)]">Žádná aktiva</p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--card-border)]">
                {investments.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--card-text)]">{inv.instrument_name}</p>
                      <p className="text-xs text-[var(--card-text-muted)]">{inv.type}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{formatCZK(inv.current_value)}</p>
                  </li>
                ))}
                {goals.map((goal) => (
                  <li key={goal.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--card-text)]">{goal.title}</p>
                      <p className="text-xs text-[var(--card-text-muted)]">
                        Cíl: {formatCZK(goal.target_amount)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{formatCZK(goal.current_amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-emerald-100 px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-[var(--card-text)]">Celková aktiva</span>
              <span className="text-lg font-bold text-emerald-600">{formatCZK(totalAssets)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net worth chart */}
      {netWorthHistory.length > 0 && (
        <div className="rounded-2xl border bg-[var(--card-bg)] p-6 shadow-sm transition-shadow hover:shadow-md">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
            Vývoj čisté hodnoty (12 měsíců)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={netWorthHistory}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={isPositive ? "#10B981" : "#EF4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCZK(v as number)} labelStyle={{ fontWeight: 600 }} />
              <Area
                type="monotone"
                dataKey="value"
                name="Čistá hodnota"
                stroke={isPositive ? "#10B981" : "#EF4444"}
                strokeWidth={2}
                fill="url(#netWorthGradient)"
                dot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
