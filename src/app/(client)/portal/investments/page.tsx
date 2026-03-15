"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
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

interface Investment {
  id: string;
  instrument_name: string;
  type: string;
  current_value: number;
  purchase_value: number | null;
}

export default function InvestmentsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [portfolioHistory, setPortfolioHistory] = useState<{ month: string; value: number }[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single();
      if (!client) { setLoading(false); return; }

      const { data } = await supabase.from("investments").select("id, instrument_name, type, current_value, purchase_value").eq("client_id", client.id);
      const invs = data || [];
      setInvestments(invs);

      const total = invs.reduce((s, i) => s + (i.current_value || 0), 0);
      const history: { month: string; value: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const factor = 0.85 + (0.15 * ((12 - i) / 12)) + (Math.random() * 0.05 - 0.025);
        history.push({
          month: d.toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" }),
          value: Math.round(total * factor),
        });
      }
      setPortfolioHistory(history);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="p-4 md:p-8 space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );

  const totalCurrent = investments.reduce((s, i) => s + i.current_value, 0);
  const totalPurchase = investments.reduce((s, i) => s + (i.purchase_value || i.current_value), 0);
  const totalReturn = totalCurrent - totalPurchase;
  const totalReturnPct = totalPurchase > 0 ? ((totalReturn / totalPurchase) * 100).toFixed(1) : "0";
  const isPositive = totalReturn >= 0;

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      {/* Hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 md:p-8 text-white mb-6">
        <p className="text-sm text-gray-400">Celková hodnota portfolia</p>
        <p className="mt-1 text-3xl md:text-4xl font-bold">{formatCZK(totalCurrent)}</p>
        <div className="mt-2 flex items-center gap-2">
          {isPositive ? <TrendingUp className="h-4 w-4 text-green-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}
          <span className={`text-sm font-medium ${isPositive ? "text-green-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{formatCZK(totalReturn)} ({isPositive ? "+" : ""}{totalReturnPct}%)
          </span>
        </div>
      </div>

      {/* Chart */}
      {portfolioHistory.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 hover:shadow-md transition-shadow">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-[var(--card-text-muted)]">Vývoj portfolia</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={portfolioHistory}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCZK(v as number)} />
              <Area type="monotone" dataKey="value" name="Hodnota" stroke="#3B82F6" strokeWidth={2} fill="url(#portfolioGrad)" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Investments list as cards */}
      {investments.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Wallet className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádné investice</p>
        </div>
      ) : (
        <div className="space-y-3">
          {investments.map((inv) => {
            const purchase = inv.purchase_value || inv.current_value;
            const ret = inv.current_value - purchase;
            const retPct = purchase > 0 ? ((ret / purchase) * 100).toFixed(1) : "0";
            const pos = ret >= 0;
            // Mini sparkline data
            const sparkData = Array.from({ length: 7 }, (_, i) => ({
              v: purchase + (ret * ((i + 1) / 7)) + (Math.random() * ret * 0.1),
            }));
            return (
              <div key={inv.id} className="flex items-center gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 hover:shadow-md transition-shadow">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--card-text)]">{inv.instrument_name}</p>
                  <p className="text-xs text-[var(--card-text-muted)]">{inv.type}</p>
                </div>
                {/* Mini sparkline */}
                <div className="w-20 h-8 hidden sm:block">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkData}>
                      <defs>
                        <linearGradient id={`spark-${inv.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={pos ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={pos ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke={pos ? "#22c55e" : "#ef4444"} strokeWidth={1.5} fill={`url(#spark-${inv.id})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--card-text)]">{formatCZK(inv.current_value)}</p>
                  <p className={`text-xs font-medium ${pos ? "text-emerald-600" : "text-red-600"}`}>
                    {pos ? "+" : ""}{retPct}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
