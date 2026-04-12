"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { PortalPageContainer } from "@/components/portal/PortalPageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  PiggyBank,
  Zap,
  TrendingUp,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(v);
}

function pmt(rate: number, nper: number, pv: number) {
  if (rate === 0) return pv / nper;
  const r = rate / 12;
  return (pv * r * Math.pow(1 + r, nper)) / (Math.pow(1 + r, nper) - 1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MortgageContract {
  id: string;
  title: string;
  interest_rate: number | null;
  remaining_balance: number | null;
  monthly_payment: number | null;
  valid_to: string | null;
}

type ScenarioId = 1 | 2 | 3 | 4;

const SCENARIOS: {
  id: ScenarioId;
  title: string;
  description: string;
  icon: typeof RefreshCw;
  color: string;
  bg: string;
}[] = [
  {
    id: 1,
    title: "Refinancování hypotéky",
    description:
      "Zjistěte, kolik můžete ušetřit při nižším úroku.",
    icon: RefreshCw,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: 2,
    title: "Pravidelné spoření",
    description:
      "Podívejte se, jak vaše spoření poroste v čase.",
    icon: PiggyBank,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    id: 3,
    title: "Předčasné splacení",
    description:
      "Spočítejte, kolik ušetříte při mimořádné splátce.",
    icon: Zap,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    id: 4,
    title: "Jednorázová investice",
    description:
      "Modelujte růst vaší investice v čase.",
    icon: TrendingUp,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
];

// Fix diacritics in display (keep variable names ASCII-safe)
const DISPLAY: Record<ScenarioId, { title: string; description: string }> = {
  1: {
    title: "Refinancování hypotéky",
    description:
      "Zjistěte, kolik můžete ušetřit při nižším úroku.",
  },
  2: {
    title: "Pravidelné spoření",
    description:
      "Podívejte se, jak vaše spoření poroste v čase.",
  },
  3: {
    title: "Předčasné splacení",
    description:
      "Spočítejte, kolik ušetříte při mimořádné splátce.",
  },
  4: {
    title: "Jednorázová investice",
    description:
      "Modelujte růst vaší investice v čase.",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScenarePage() {
  const supabase = createClient();

  // Auth & data
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [advisorId, setAdvisorId] = useState("");
  const [mortgages, setMortgages] = useState<MortgageContract[]>([]);

  // Scenario selection
  const [selected, setSelected] = useState<ScenarioId | null>(null);

  // Scenario 1 – Refinancování
  const [newRate, setNewRate] = useState("");
  const [selectedMortgage, setSelectedMortgage] = useState<string>("");

  // Scenario 2 – Pravidelné spoření
  const [monthlyAmount, setMonthlyAmount] = useState("");

  // Scenario 3 – Předčasné splacení
  const [lumpSum, setLumpSum] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<string>("");

  // Scenario 4 – Jednorázová investice
  const [investAmount, setInvestAmount] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");

  // CTA state
  const [sending, setSending] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: client } = await supabase
        .from("clients")
        .select("id, advisor_id")
        .eq("user_id", user.id)
        .single();
      if (!client) {
        setLoading(false);
        return;
      }

      setClientId(client.id);
      setAdvisorId(client.advisor_id);

      const { data: contracts } = await supabase
        .from("contracts")
        .select(
          "id, title, interest_rate, remaining_balance, monthly_payment, valid_to"
        )
        .eq("client_id", client.id)
        .in("type", ["loan", "mortgage", "uver"])
        .eq("status", "active");

      const m = (contracts || []) as MortgageContract[];
      setMortgages(m);
      if (m.length > 0) {
        setSelectedMortgage(m[0].id);
        setSelectedLoan(m[0].id);
      }

      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // CTA handler
  // -------------------------------------------------------------------------

  async function handleCTA(scenarioTitle: string, detail: string) {
    if (!clientId || !advisorId) return;
    setSending(true);
    const { error } = await supabase.from("notifications").insert({
      advisor_id: advisorId,
      client_id: clientId,
      title: `Klient chce řešit: ${scenarioTitle}`,
      message: detail,
      type: "scenario_request",
    });
    setSending(false);
    if (error) {
      toast.error("Chyba při odesílání požadavku: " + error.message);
      return;
    }
    toast.success("Požadavek odeslán vašemu poradci.");
  }

  // -------------------------------------------------------------------------
  // Scenario 1 calculations
  // -------------------------------------------------------------------------

  const refinanceResult = useMemo(() => {
    const m = mortgages.find((c) => c.id === selectedMortgage);
    if (!m || !m.remaining_balance || !m.interest_rate || !m.monthly_payment)
      return null;
    const nr = parseFloat(newRate);
    if (!nr || nr <= 0) return null;

    const balance = m.remaining_balance;
    const oldPayment = m.monthly_payment;
    const oldRate = m.interest_rate;

    // Estimate remaining months from old payment
    const oldMonthlyRate = oldRate / 100 / 12;
    let remainingMonths = 0;
    if (oldMonthlyRate > 0 && oldPayment > balance * oldMonthlyRate) {
      remainingMonths = Math.ceil(
        Math.log(oldPayment / (oldPayment - balance * oldMonthlyRate)) /
          Math.log(1 + oldMonthlyRate)
      );
    } else {
      remainingMonths = balance > 0 && oldPayment > 0 ? Math.ceil(balance / oldPayment) : 240;
    }

    const newPayment = pmt(nr / 100, remainingMonths, balance);
    const totalOld = oldPayment * remainingMonths;
    const totalNew = newPayment * remainingMonths;

    return {
      oldPayment,
      newPayment: Math.round(newPayment),
      oldRate,
      newRateVal: nr,
      remainingMonths,
      totalSaved: Math.round(totalOld - totalNew),
      balance,
    };
  }, [mortgages, selectedMortgage, newRate]);

  // -------------------------------------------------------------------------
  // Scenario 2 calculations
  // -------------------------------------------------------------------------

  const savingsData = useMemo(() => {
    const monthly = parseFloat(monthlyAmount);
    if (!monthly || monthly <= 0) return null;

    const annualReturn = 0.05;
    const monthlyReturn = annualReturn / 12;
    const years = [5, 10, 20];
    const data: { rok: number; "5 let": number; "10 let": number; "20 let": number }[] = [];

    for (let y = 0; y <= 20; y++) {
      const months = y * 12;
      const fv = (amount: number, n: number) => {
        if (monthlyReturn === 0) return amount * n;
        return amount * ((Math.pow(1 + monthlyReturn, n) - 1) / monthlyReturn);
      };

      data.push({
        rok: y,
        "5 let": y <= 5 ? Math.round(fv(monthly, months)) : Math.round(fv(monthly, 60)),
        "10 let": y <= 10 ? Math.round(fv(monthly, months)) : Math.round(fv(monthly, 120)),
        "20 let": Math.round(fv(monthly, months)),
      });
    }

    const totals = years.map((yr) => {
      const n = yr * 12;
      const fv = monthly * ((Math.pow(1 + monthlyReturn, n) - 1) / monthlyReturn);
      return { years: yr, total: Math.round(fv), invested: monthly * n };
    });

    return { data, totals };
  }, [monthlyAmount]);

  // -------------------------------------------------------------------------
  // Scenario 3 calculations
  // -------------------------------------------------------------------------

  const earlyPayResult = useMemo(() => {
    const m = mortgages.find((c) => c.id === selectedLoan);
    if (!m || !m.remaining_balance || !m.interest_rate || !m.monthly_payment)
      return null;
    const lump = parseFloat(lumpSum);
    if (!lump || lump <= 0) return null;

    const balance = m.remaining_balance;
    const payment = m.monthly_payment;
    const rate = m.interest_rate / 100 / 12;

    if (lump >= balance) {
      return {
        newBalance: 0,
        oldMonths: rate > 0 ? Math.ceil(
          Math.log(payment / (payment - balance * rate)) / Math.log(1 + rate)
        ) : Math.ceil(balance / payment),
        newMonths: 0,
        savedInterest: Math.round(
          (rate > 0
            ? payment *
              Math.ceil(
                Math.log(payment / (payment - balance * rate)) /
                  Math.log(1 + rate)
              )
            : balance) - balance
        ),
        oldBalance: balance,
      };
    }

    const newBalance = balance - lump;

    const calcMonths = (b: number) => {
      if (rate <= 0) return b > 0 && payment > 0 ? Math.ceil(b / payment) : 0;
      if (payment <= b * rate) return 999;
      return Math.ceil(
        Math.log(payment / (payment - b * rate)) / Math.log(1 + rate)
      );
    };

    const oldMonths = calcMonths(balance);
    const newMonths = calcMonths(newBalance);

    const totalOld = payment * oldMonths;
    const totalNew = payment * newMonths + lump;

    return {
      newBalance: Math.round(newBalance),
      oldMonths,
      newMonths,
      savedInterest: Math.round(totalOld - totalNew),
      oldBalance: balance,
    };
  }, [mortgages, selectedLoan, lumpSum]);

  // -------------------------------------------------------------------------
  // Scenario 4 calculations
  // -------------------------------------------------------------------------

  const investData = useMemo(() => {
    const amount = parseFloat(investAmount);
    const ret = parseFloat(expectedReturn);
    if (!amount || amount <= 0 || !ret) return null;

    const annualRate = ret / 100;
    const years = [5, 10, 20, 30];
    const data: { rok: number; hodnota: number }[] = [];

    for (let y = 0; y <= 30; y++) {
      data.push({
        rok: y,
        hodnota: Math.round(amount * Math.pow(1 + annualRate, y)),
      });
    }

    const projections = years.map((yr) => ({
      years: yr,
      value: Math.round(amount * Math.pow(1 + annualRate, yr)),
      gain: Math.round(amount * Math.pow(1 + annualRate, yr) - amount),
    }));

    return { data, projections };
  }, [investAmount, expectedReturn]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const chartTooltipFormatter = (value: number | undefined) => formatCZK(value ?? 0);

  function renderMortgageSelect(
    value: string,
    onChange: (v: string) => void
  ) {
    if (mortgages.length === 0)
      return (
        <p className="text-sm text-[var(--card-text-muted)]">
          Nemáte žádné aktivní úvěry. Přidejte je v sekci Smlouvy.
        </p>
      );

    return (
      <div className="space-y-1">
        <Label className="text-xs">Úvěr / Hypotéka</Label>
        <select
          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {mortgages.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title} &mdash;{" "}
              {m.remaining_balance
                ? formatCZK(m.remaining_balance)
                : "bez zůstatku"}{" "}
              ({m.interest_rate ?? "?"}%)
            </option>
          ))}
        </select>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (loading)
    return (
      <PortalPageContainer className="space-y-4">
        <Skeleton className="h-8 w-64" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </PortalPageContainer>
    );

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <PortalPageContainer>
      <h1 className="mb-1 text-2xl font-bold gradient-text">
        &bdquo;Co kdyby&ldquo; scénáře
      </h1>
      <p className="mb-8 text-sm text-[var(--card-text-muted)]">
        Prozkoumejte různé finanční scénáře a zjistěte, jak optimalizovat vaše finance.
      </p>

      {/* ----- Scenario cards / expanded view ----- */}
      {selected === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SCENARIOS.map((s) => {
            const d = DISPLAY[s.id];
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className="group cursor-pointer rounded-xl border bg-[var(--card-bg)] p-6 text-left shadow-sm transition-all hover:shadow-md hover:bg-[var(--table-hover)]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}
                  >
                    <Icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-[var(--card-text)]">
                      {d.title}
                    </span>
                    <p className="mt-0.5 text-xs text-[var(--card-text-muted)]">
                      {d.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          {/* Back button */}
          <button
            onClick={() => setSelected(null)}
            className="mb-6 flex items-center gap-2 text-sm text-[var(--card-text-muted)] hover:text-[var(--card-text)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Zpět na scénáře
          </button>

          {/* ============================================================= */}
          {/* SCENARIO 1 – Refinancování hypotéky */}
          {/* ============================================================= */}
          {selected === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-[var(--card-text)]">
                  {DISPLAY[1].title}
                </h2>
              </div>

              <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm space-y-4">
                {renderMortgageSelect(selectedMortgage, setSelectedMortgage)}
                <div className="space-y-1">
                  <Label className="text-xs">Nový úrok (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="např. 4.5"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                  />
                </div>
              </div>

              {refinanceResult && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Old */}
                  <div className="rounded-xl border bg-red-50/50 p-6 shadow-sm">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-red-400">
                      Současná splátka
                    </p>
                    <p className="text-2xl font-bold text-red-700">
                      {formatCZK(refinanceResult.oldPayment)}
                    </p>
                    <p className="mt-1 text-xs text-red-400">
                      úrok {refinanceResult.oldRate}% &middot;{" "}
                      {refinanceResult.remainingMonths} měsíců
                    </p>
                  </div>
                  {/* New */}
                  <div className="rounded-xl border bg-emerald-50/50 p-6 shadow-sm">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-emerald-400">
                      Nová splátka
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {formatCZK(refinanceResult.newPayment)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-400">
                      úrok {refinanceResult.newRateVal}% &middot;{" "}
                      {refinanceResult.remainingMonths} měsíců
                    </p>
                  </div>
                  {/* Summary */}
                  <div className="col-span-full rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm text-center">
                    <p className="text-xs text-[var(--card-text-muted)]">
                      Celková úspora za dobu splácení
                    </p>
                    <p className="mt-1 text-3xl font-bold text-emerald-600">
                      {formatCZK(refinanceResult.totalSaved)}
                    </p>
                  </div>
                </div>
              )}

              {refinanceResult && (
                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      handleCTA(
                        DISPLAY[1].title,
                        `Refinancování z ${refinanceResult.oldRate}% na ${refinanceResult.newRateVal}%, úspora ${formatCZK(refinanceResult.totalSaved)}`
                      )
                    }
                    disabled={sending}
                  >
                    {sending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Chci to řešit
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* SCENARIO 2 – Pravidelné spoření */}
          {/* ============================================================= */}
          {selected === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <PiggyBank className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-[var(--card-text)]">
                  {DISPLAY[2].title}
                </h2>
              </div>

              <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Měsíční částka (Kč)</Label>
                  <Input
                    type="number"
                    placeholder="např. 5000"
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(e.target.value)}
                  />
                  <p className="text-[11px] text-[var(--card-text-dim)]">
                    Předpokládaný roční výnos: 5 %
                  </p>
                </div>
              </div>

              {savingsData && (
                <>
                  {/* Chart */}
                  <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
                    <p className="mb-4 text-sm font-semibold text-[var(--card-text)]">
                      Růst spoření v čase
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={savingsData.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="rok"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v} r.`}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) =>
                            `${Math.round(v / 1000)}k`
                          }
                        />
                        <Tooltip formatter={chartTooltipFormatter} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="5 let"
                          stroke="#3b82f6"
                          fill="#dbeafe"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="10 let"
                          stroke="#10b981"
                          fill="#d1fae5"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="20 let"
                          stroke="#8b5cf6"
                          fill="#ede9fe"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {savingsData.totals.map((t) => (
                      <div
                        key={t.years}
                        className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm text-center"
                      >
                        <p className="text-xs text-[var(--card-text-muted)]">
                          Za {t.years} let
                        </p>
                        <p className="mt-1 text-xl font-bold text-[var(--card-text)]">
                          {formatCZK(t.total)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-emerald-500">
                          vloženo {formatCZK(t.invested)} &middot; výnos{" "}
                          {formatCZK(t.total - t.invested)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() =>
                        handleCTA(
                          DISPLAY[2].title,
                          `Pravidelné spoření ${formatCZK(parseFloat(monthlyAmount))} měsíčně`
                        )
                      }
                      disabled={sending}
                    >
                      {sending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Chci to řešit
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* SCENARIO 3 – Předčasné splacení */}
          {/* ============================================================= */}
          {selected === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <Zap className="h-5 w-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-[var(--card-text)]">
                  {DISPLAY[3].title}
                </h2>
              </div>

              <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm space-y-4">
                {renderMortgageSelect(selectedLoan, setSelectedLoan)}
                <div className="space-y-1">
                  <Label className="text-xs">Jednorázová splátka (Kč)</Label>
                  <Input
                    type="number"
                    placeholder="např. 200000"
                    value={lumpSum}
                    onChange={(e) => setLumpSum(e.target.value)}
                  />
                </div>
              </div>

              {earlyPayResult && (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Before */}
                    <div className="rounded-xl border bg-[var(--table-hover)] p-6 shadow-sm">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--card-text-dim)]">
                        Před splátkou
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--card-text-muted)]">Zůstatek</span>
                          <span className="font-semibold text-[var(--card-text)]">
                            {formatCZK(earlyPayResult.oldBalance)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--card-text-muted)]">
                            Zbývající měsíce
                          </span>
                          <span className="font-semibold text-[var(--card-text)]">
                            {earlyPayResult.oldMonths}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* After */}
                    <div className="rounded-xl border bg-emerald-50/50 p-6 shadow-sm">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-emerald-400">
                        Po splátce
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-600">
                            Nový zůstatek
                          </span>
                          <span className="font-semibold text-emerald-800">
                            {formatCZK(earlyPayResult.newBalance)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-600">
                            Zbývající měsíce
                          </span>
                          <span className="font-semibold text-emerald-800">
                            {earlyPayResult.newMonths}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm text-center">
                      <p className="text-xs text-[var(--card-text-muted)]">
                        Zkrácení doby splácení
                      </p>
                      <p className="mt-1 text-2xl font-bold text-blue-600">
                        {earlyPayResult.oldMonths - earlyPayResult.newMonths}{" "}
                        měsíců
                      </p>
                    </div>
                    <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm text-center">
                      <p className="text-xs text-[var(--card-text-muted)]">
                        Úspora na úrocích
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-600">
                        {formatCZK(
                          earlyPayResult.savedInterest > 0
                            ? earlyPayResult.savedInterest
                            : 0
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() =>
                        handleCTA(
                          DISPLAY[3].title,
                          `Mimořádná splátka ${formatCZK(parseFloat(lumpSum))}, úspora ${formatCZK(earlyPayResult.savedInterest > 0 ? earlyPayResult.savedInterest : 0)}`
                        )
                      }
                      disabled={sending}
                    >
                      {sending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Chci to řešit
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* SCENARIO 4 – Jednorázová investice */}
          {/* ============================================================= */}
          {selected === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                  <TrendingUp className="h-5 w-5 text-violet-600" />
                </div>
                <h2 className="text-lg font-bold text-[var(--card-text)]">
                  {DISPLAY[4].title}
                </h2>
              </div>

              <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Částka (Kč)</Label>
                  <Input
                    type="number"
                    placeholder="např. 500000"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">
                    Očekávaný roční výnos (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="např. 7"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(e.target.value)}
                  />
                </div>
              </div>

              {investData && (
                <>
                  {/* Chart */}
                  <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
                    <p className="mb-4 text-sm font-semibold text-[var(--card-text)]">
                      Projekce růstu investice
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={investData.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="rok"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v} r.`}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) =>
                            `${Math.round(v / 1000)}k`
                          }
                        />
                        <Tooltip formatter={chartTooltipFormatter} />
                        <Line
                          type="monotone"
                          dataKey="hodnota"
                          stroke="#8b5cf6"
                          strokeWidth={2.5}
                          dot={false}
                          name="Hodnota"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Projections */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {investData.projections.map((p) => (
                      <div
                        key={p.years}
                        className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm text-center"
                      >
                        <p className="text-xs text-[var(--card-text-muted)]">
                          Za {p.years} let
                        </p>
                        <p className="mt-1 text-lg font-bold text-[var(--card-text)]">
                          {formatCZK(p.value)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-violet-500">
                          +{formatCZK(p.gain)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={() =>
                        handleCTA(
                          DISPLAY[4].title,
                          `Investice ${formatCZK(parseFloat(investAmount))} s očekávaným výnosem ${expectedReturn}%`
                        )
                      }
                      disabled={sending}
                    >
                      {sending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Chci to řešit
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </PortalPageContainer>
  );
}
