"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  PiggyBank,
  Landmark,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(v);
}

function formatNum(v: number) {
  return new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(v);
}

const czTooltipFormatter = (value: number | undefined) => formatCZK(value ?? 0);

async function sendAdvisorNotification(calcType: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!client) return;

  await supabase.from("client_notifications").insert({
    client_id: client.id,
    type: "calculator_cta",
    message: `Klient má zájem o konzultaci – kalkulačka: ${calcType}`,
  });
}

/* ------------------------------------------------------------------ */
/*  InputField                                                        */
/* ------------------------------------------------------------------ */

function InputField({
  label,
  value,
  onChange,
  step,
  suffix,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-[var(--card-text)]">
        {label}
        {suffix && (
          <span className="ml-1 text-xs font-normal text-[var(--card-text-dim)]">
            ({suffix})
          </span>
        )}
      </Label>
      <Input
        type="number"
        step={step ?? 1}
        min={min ?? 0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                         */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  accent = "blue",
}: {
  label: string;
  value: string;
  accent?: "blue" | "green" | "red" | "amber";
}) {
  const colors = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-green-200 bg-green-50 text-green-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${colors[accent]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA button                                                        */
/* ------------------------------------------------------------------ */

function CTAButton({ calcType }: { calcType: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Button
      disabled={sent || loading}
      onClick={async () => {
        setLoading(true);
        await sendAdvisorNotification(calcType);
        setSent(true);
        setLoading(false);
      }}
      className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-white hover:bg-blue-700"
    >
      <MessageSquare className="mr-2 h-4 w-4" />
      {sent ? "Odesláno poradci" : loading ? "Odesílám..." : "Chci to řešit s poradcem"}
    </Button>
  );
}

/* ================================================================== */
/*  TAB 1 — HYPOTEČNÍ KALKULAČKA                                     */
/* ================================================================== */

function MortgageCalculator() {
  const [principal, setPrincipal] = useState(3000000);
  const [rate, setRate] = useState(5.5);
  const [years, setYears] = useState(25);
  const [expanded, setExpanded] = useState(false);

  const calc = useMemo(() => {
    const r = rate / 100 / 12;
    const n = years * 12;
    if (r === 0) {
      const payment = principal / n;
      return {
        payment,
        totalPaid: principal,
        interestPaid: 0,
        balanceData: Array.from({ length: n }, (_, i) => ({
          month: i + 1,
          balance: Math.max(0, principal - payment * (i + 1)),
        })),
        yearlyData: [],
        amortization: [],
      };
    }
    const payment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPaid = payment * n;
    const interestPaid = totalPaid - principal;

    let balance = principal;
    const balanceData: { month: number; balance: number }[] = [];
    const amortization: {
      month: number;
      payment: number;
      principalPart: number;
      interestPart: number;
      balance: number;
    }[] = [];
    const yearlyMap: Record<number, { year: number; interest: number; principal: number }> = {};

    for (let i = 1; i <= n; i++) {
      const interestPart = balance * r;
      const principalPart = payment - interestPart;
      balance = Math.max(0, balance - principalPart);

      balanceData.push({ month: i, balance: Math.round(balance) });
      amortization.push({
        month: i,
        payment: Math.round(payment),
        principalPart: Math.round(principalPart),
        interestPart: Math.round(interestPart),
        balance: Math.round(balance),
      });

      const yr = Math.ceil(i / 12);
      if (!yearlyMap[yr]) yearlyMap[yr] = { year: yr, interest: 0, principal: 0 };
      yearlyMap[yr].interest += interestPart;
      yearlyMap[yr].principal += principalPart;
    }

    const yearlyData = Object.values(yearlyMap).map((d) => ({
      year: `${d.year}. rok`,
      interest: Math.round(d.interest),
      principal: Math.round(d.principal),
    }));

    return { payment, totalPaid, interestPaid, balanceData, yearlyData, amortization };
  }, [principal, rate, years]);

  const visibleRows = expanded ? calc.amortization : calc.amortization.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField
          label="Částka úvěru"
          value={principal}
          onChange={setPrincipal}
          step={100000}
          suffix="Kč"
          min={100000}
        />
        <InputField
          label="Úroková sazba"
          value={rate}
          onChange={setRate}
          step={0.1}
          suffix="%"
          min={0}
        />
        <InputField
          label="Doba splácení"
          value={years}
          onChange={setYears}
          suffix="let"
          min={1}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Měsíční splátka" value={formatCZK(calc.payment)} accent="blue" />
        <StatCard label="Celkem zaplaceno" value={formatCZK(calc.totalPaid)} accent="green" />
        <StatCard
          label="Přeplaceno na úrocích"
          value={formatCZK(calc.interestPaid)}
          accent="red"
        />
      </div>

      {/* Line chart — balance */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[var(--card-text)]">
          Vývoj zůstatku úvěru v čase
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={calc.balanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              label={{ value: "Měsíc", position: "insideBottomRight", offset: -5, fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v: number) => `${formatNum(v / 1000)} tis`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip formatter={czTooltipFormatter} />
            <Line
              type="monotone"
              dataKey="balance"
              name="Zůstatek"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart — interest vs principal per year */}
      {calc.yearlyData.length > 0 && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[var(--card-text)]">
            Poměr úrok vs jistina dle roku
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={calc.yearlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis
                tickFormatter={(v: number) => `${formatNum(v / 1000)} tis`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip formatter={czTooltipFormatter} />
              <Legend />
              <Bar dataKey="principal" name="Jistina" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="interest" name="Úrok" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Amortization table */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
        <h3 className="border-b px-4 py-3 text-sm font-semibold text-[var(--card-text)]">
          Amortizační tabulka
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--table-hover)] text-left text-xs font-medium uppercase tracking-wide text-[var(--card-text-muted)]">
                <th className="px-4 py-2">Měsíc</th>
                <th className="px-4 py-2 text-right">Splátka</th>
                <th className="px-4 py-2 text-right">Jistina</th>
                <th className="px-4 py-2 text-right">Úrok</th>
                <th className="px-4 py-2 text-right">Zůstatek</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.month} className="border-b last:border-0 hover:bg-[var(--table-hover)]">
                  <td className="px-4 py-2 text-[var(--card-text-muted)]">{row.month}</td>
                  <td className="px-4 py-2 text-right">{formatCZK(row.payment)}</td>
                  <td className="px-4 py-2 text-right text-green-700">
                    {formatCZK(row.principalPart)}
                  </td>
                  <td className="px-4 py-2 text-right text-red-600">
                    {formatCZK(row.interestPart)}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{formatCZK(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {calc.amortization.length > 12 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-center gap-1 border-t py-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            {expanded ? (
              <>
                Zobrazit méně <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Zobrazit všech {calc.amortization.length} měsíců{" "}
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>

      <CTAButton calcType="Hypotéka" />
    </div>
  );
}

/* ================================================================== */
/*  TAB 2 — SPOŘICÍ KALKULAČKA                                       */
/* ================================================================== */

function SavingsCalculator() {
  const [monthlyDeposit, setMonthlyDeposit] = useState(5000);
  const [annualRate, setAnnualRate] = useState(4.0);
  const [savingYears, setSavingYears] = useState(10);
  const [initialDeposit, setInitialDeposit] = useState(50000);

  const calc = useMemo(() => {
    const r = annualRate / 100 / 12;
    const n = savingYears * 12;
    let balance = initialDeposit;
    let totalDeposits = initialDeposit;

    const chartData: { month: number; deposits: number; interest: number }[] = [];

    for (let i = 1; i <= n; i++) {
      const interestGain = balance * r;
      balance += interestGain + monthlyDeposit;
      totalDeposits += monthlyDeposit;

      if (i % 12 === 0 || i === n) {
        chartData.push({
          month: i,
          deposits: Math.round(totalDeposits),
          interest: Math.round(balance - totalDeposits),
        });
      }
    }

    return {
      total: balance,
      totalInterest: balance - totalDeposits,
      totalDeposits,
      chartData,
    };
  }, [monthlyDeposit, annualRate, savingYears, initialDeposit]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InputField
          label="Počáteční vklad"
          value={initialDeposit}
          onChange={setInitialDeposit}
          step={10000}
          suffix="Kč"
        />
        <InputField
          label="Měsíční vklad"
          value={monthlyDeposit}
          onChange={setMonthlyDeposit}
          step={500}
          suffix="Kč"
        />
        <InputField
          label="Roční úrok"
          value={annualRate}
          onChange={setAnnualRate}
          step={0.1}
          suffix="%"
        />
        <InputField
          label="Doba spoření"
          value={savingYears}
          onChange={setSavingYears}
          suffix="let"
          min={1}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Celkem naspořeno" value={formatCZK(calc.total)} accent="green" />
        <StatCard label="Z toho vklady" value={formatCZK(calc.totalDeposits)} accent="blue" />
        <StatCard label="Z toho úroky" value={formatCZK(calc.totalInterest)} accent="amber" />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[var(--card-text)]">
          Růst úspor v čase
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={calc.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickFormatter={(v: number) => `${Math.round(v / 12)}. rok`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v: number) => `${formatNum(v / 1000)} tis`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip formatter={czTooltipFormatter} />
            <Legend />
            <Area
              type="monotone"
              dataKey="deposits"
              name="Vklady"
              stackId="1"
              stroke="#2563eb"
              fill="#93c5fd"
            />
            <Area
              type="monotone"
              dataKey="interest"
              name="Úroky"
              stackId="1"
              stroke="#16a34a"
              fill="#86efac"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <CTAButton calcType="Spoření" />
    </div>
  );
}

/* ================================================================== */
/*  TAB 3 — DŮCHODOVÁ KALKULAČKA                                     */
/* ================================================================== */

function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);
  const [monthlyIncome, setMonthlyIncome] = useState(25000);
  const [currentSavings, setCurrentSavings] = useState(200000);

  const calc = useMemo(() => {
    const retirementYears = 20;
    const annualReturn = 0.04;
    const monthlyReturn = annualReturn / 12;

    const totalNeeded = monthlyIncome * 12 * retirementYears;

    const yearsToRetirement = Math.max(1, retirementAge - currentAge);
    const monthsToRetirement = yearsToRetirement * 12;

    // Future value of current savings
    const fvCurrent = currentSavings * Math.pow(1 + monthlyReturn, monthsToRetirement);

    // How much more we need
    const gap = Math.max(0, totalNeeded - fvCurrent);

    // Monthly payment needed (future value of annuity)
    let monthlySaving = 0;
    if (gap > 0 && monthlyReturn > 0) {
      monthlySaving =
        gap / ((Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn);
    } else if (gap > 0) {
      monthlySaving = gap / monthsToRetirement;
    }

    // Projection chart data
    const chartData: {
      year: number;
      savings: number;
      needed: number;
    }[] = [];

    let balance = currentSavings;
    for (let y = 0; y <= yearsToRetirement; y++) {
      const yearLabel = currentAge + y;
      chartData.push({
        year: yearLabel,
        savings: Math.round(balance),
        needed: Math.round(totalNeeded),
      });
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyReturn) + monthlySaving;
      }
    }

    return { totalNeeded, monthlySaving, fvCurrent, gap, chartData };
  }, [currentAge, retirementAge, monthlyIncome, currentSavings]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InputField
          label="Aktuální věk"
          value={currentAge}
          onChange={setCurrentAge}
          suffix="let"
          min={18}
        />
        <InputField
          label="Plánovaný odchod do důchodu"
          value={retirementAge}
          onChange={setRetirementAge}
          suffix="věk"
          min={currentAge + 1}
        />
        <InputField
          label="Cílový měsíční příjem"
          value={monthlyIncome}
          onChange={setMonthlyIncome}
          step={1000}
          suffix="Kč/měs"
        />
        <InputField
          label="Aktuální úspory"
          value={currentSavings}
          onChange={setCurrentSavings}
          step={10000}
          suffix="Kč"
        />
      </div>

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--table-hover)] p-4 text-xs text-[var(--card-text-muted)]">
        Předpoklady: 20 let v důchodu, průměrný roční výnos 4 %.
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Celkem potřebujete"
          value={formatCZK(calc.totalNeeded)}
          accent="amber"
        />
        <StatCard
          label="Měsíčně odkládat"
          value={formatCZK(calc.monthlySaving)}
          accent="blue"
        />
        <StatCard
          label="Zbývá doplnit"
          value={formatCZK(calc.gap)}
          accent={calc.gap > 0 ? "red" : "green"}
        />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-[var(--card-text)]">
          Projekce úspor do důchodu
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={calc.chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: "Věk", position: "insideBottomRight", offset: -5, fontSize: 11 }} />
            <YAxis
              tickFormatter={(v: number) =>
                v >= 1000000 ? `${(v / 1000000).toFixed(1)} mil` : `${formatNum(v / 1000)} tis`
              }
              tick={{ fontSize: 11 }}
            />
            <Tooltip formatter={czTooltipFormatter} />
            <Legend />
            <Area
              type="monotone"
              dataKey="savings"
              name="Vaše úspory"
              stroke="#2563eb"
              fill="#bfdbfe"
            />
            <Area
              type="monotone"
              dataKey="needed"
              name="Cílová částka"
              stroke="#f59e0b"
              fill="#fef3c7"
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <CTAButton calcType="Důchod" />
    </div>
  );
}

/* ================================================================== */
/*  PAGE                                                              */
/* ================================================================== */

export default function KalkulackyPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--card-text)]">Finanční kalkulačky</h1>
      <p className="mb-6 text-sm text-[var(--card-text-muted)]">
        Spočítejte si hypotéku, spoření nebo důchodový plán
      </p>

      <Tabs defaultValue="mortgage">
        <TabsList className="mb-6 w-full sm:w-auto rounded-full bg-[var(--table-header)] p-1">
          <TabsTrigger value="mortgage" className="rounded-full data-[state=active]:bg-[var(--card-bg)] data-[state=active]:shadow-sm gap-1.5 px-4 py-2">
            <Calculator className="h-4 w-4" />
            Hypotéka
          </TabsTrigger>
          <TabsTrigger value="savings" className="rounded-full data-[state=active]:bg-[var(--card-bg)] data-[state=active]:shadow-sm gap-1.5 px-4 py-2">
            <PiggyBank className="h-4 w-4" />
            Spoření
          </TabsTrigger>
          <TabsTrigger value="retirement" className="rounded-full data-[state=active]:bg-[var(--card-bg)] data-[state=active]:shadow-sm gap-1.5 px-4 py-2">
            <Landmark className="h-4 w-4" />
            Důchod
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mortgage">
          <MortgageCalculator />
        </TabsContent>
        <TabsContent value="savings">
          <SavingsCalculator />
        </TabsContent>
        <TabsContent value="retirement">
          <RetirementCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
