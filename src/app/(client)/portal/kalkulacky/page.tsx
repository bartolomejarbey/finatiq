"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  PiggyBank,
  Landmark,
  Car,
  CreditCard,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Info,
  ArrowRight,
  Sparkles,
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
  const { data: { user } } = await supabase.auth.getUser();
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
/*  Shared UI components                                               */
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
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? String(value) : formatNum(value);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[var(--card-text-muted)]">{label}</Label>
      <div className="relative">
        <Input
          type={focused ? "number" : "text"}
          step={step ?? 1}
          min={min ?? 0}
          value={displayValue}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded-xl pr-12 h-11"
          inputMode="decimal"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--card-text-dim)]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

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
    blue: "from-blue-500/10 to-blue-500/5 border-blue-200 text-blue-700",
    green: "from-green-500/10 to-green-500/5 border-green-200 text-green-700",
    red: "from-red-500/10 to-red-500/5 border-red-200 text-red-700",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${colors[accent]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function CTAButton({ calcType, message }: { calcType: string; message: string }) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{message}</p>
          <p className="mt-1 text-xs text-blue-100">
            Váš poradce může zajistit lepší podmínky díky přístupu k více poskytovatelům.
          </p>
          <Button
            disabled={sent || loading}
            onClick={async () => {
              setLoading(true);
              await sendAdvisorNotification(calcType);
              setSent(true);
              setLoading(false);
            }}
            className="mt-3 bg-white text-blue-700 hover:bg-blue-50 font-medium"
            size="sm"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {sent ? "Odesláno poradci" : loading ? "Odesílám..." : "Chci konzultaci zdarma"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CalcSection({ children }: { children: React.ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

/* ================================================================== */
/*  1. HYPOTEČNÍ KALKULAČKA                                           */
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
      return { payment, totalPaid: principal, interestPaid: 0, balanceData: [], yearlyData: [], amortization: [] };
    }
    const payment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPaid = payment * n;
    const interestPaid = totalPaid - principal;

    let balance = principal;
    const balanceData: { month: number; balance: number }[] = [];
    const amortization: { month: number; payment: number; principalPart: number; interestPart: number; balance: number }[] = [];
    const yearlyMap: Record<number, { year: number; interest: number; principal: number }> = {};

    for (let i = 1; i <= n; i++) {
      const interestPart = balance * r;
      const principalPart = payment - interestPart;
      balance = Math.max(0, balance - principalPart);
      balanceData.push({ month: i, balance: Math.round(balance) });
      amortization.push({ month: i, payment: Math.round(payment), principalPart: Math.round(principalPart), interestPart: Math.round(interestPart), balance: Math.round(balance) });
      const yr = Math.ceil(i / 12);
      if (!yearlyMap[yr]) yearlyMap[yr] = { year: yr, interest: 0, principal: 0 };
      yearlyMap[yr].interest += interestPart;
      yearlyMap[yr].principal += principalPart;
    }
    const yearlyData = Object.values(yearlyMap).map((d) => ({ year: `${d.year}. rok`, interest: Math.round(d.interest), principal: Math.round(d.principal) }));
    return { payment, totalPaid, interestPaid, balanceData, yearlyData, amortization };
  }, [principal, rate, years]);

  const visibleRows = expanded ? calc.amortization : calc.amortization.slice(0, 12);

  return (
    <CalcSection>
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField label="Částka úvěru" value={principal} onChange={setPrincipal} step={100000} suffix="Kč" min={100000} />
        <InputField label="Úroková sazba" value={rate} onChange={setRate} step={0.1} suffix="%" min={0} />
        <InputField label="Doba splácení" value={years} onChange={setYears} suffix="let" min={1} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Měsíční splátka" value={formatCZK(calc.payment)} accent="blue" />
        <StatCard label="Celkem zaplaceno" value={formatCZK(calc.totalPaid)} accent="green" />
        <StatCard label="Přeplaceno na úrocích" value={formatCZK(calc.interestPaid)} accent="red" />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Vývoj zůstatku úvěru</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={calc.balanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #e5e7eb)" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={59} tickFormatter={(v: number) => `${Math.ceil(v / 12)}. rok`} />
            <YAxis tickFormatter={(v: number) => `${formatNum(v / 1000)} tis`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={czTooltipFormatter} />
            <Line type="monotone" dataKey="balance" name="Zůstatek" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {calc.yearlyData.length > 0 && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Poměr úrok vs jistina dle roku</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={calc.yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #e5e7eb)" />
              <XAxis dataKey="year" tick={{ fontSize: 9 }} interval={4} />
              <YAxis tickFormatter={(v: number) => `${formatNum(v / 1000)} tis`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={czTooltipFormatter} />
              <Legend />
              <Bar dataKey="principal" name="Jistina" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="interest" name="Úrok" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Amortization */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm overflow-hidden">
        <h3 className="border-b px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Amortizační tabulka</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--table-hover)] text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">
                <th className="px-5 py-2.5">Měsíc</th>
                <th className="px-5 py-2.5 text-right">Splátka</th>
                <th className="px-5 py-2.5 text-right">Jistina</th>
                <th className="px-5 py-2.5 text-right">Úrok</th>
                <th className="px-5 py-2.5 text-right">Zůstatek</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.month} className="border-b last:border-0 hover:bg-[var(--table-hover)]">
                  <td className="px-5 py-2 text-[var(--card-text-muted)]">{row.month}</td>
                  <td className="px-5 py-2 text-right">{formatCZK(row.payment)}</td>
                  <td className="px-5 py-2 text-right text-green-700">{formatCZK(row.principalPart)}</td>
                  <td className="px-5 py-2 text-right text-red-600">{formatCZK(row.interestPart)}</td>
                  <td className="px-5 py-2 text-right font-medium">{formatCZK(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {calc.amortization.length > 12 && (
          <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-center gap-1 border-t py-3 text-xs font-medium text-blue-600 hover:bg-[var(--table-hover)] cursor-pointer">
            {expanded ? (<>Zobrazit méně <ChevronUp className="h-3.5 w-3.5" /></>) : (<>Zobrazit všech {calc.amortization.length} měsíců <ChevronDown className="h-3.5 w-3.5" /></>)}
          </button>
        )}
      </div>

      <CTAButton calcType="Hypotéka" message="Chcete lepší sazbu na hypotéku?" />
    </CalcSection>
  );
}

/* ================================================================== */
/*  2. OSOBNÍ ÚVĚR                                                    */
/* ================================================================== */

function LoanCalculator() {
  const [amount, setAmount] = useState(200000);
  const [rate, setRate] = useState(8.9);
  const [months, setMonths] = useState(36);

  const calc = useMemo(() => {
    const r = rate / 100 / 12;
    const n = months;
    if (r === 0) return { payment: amount / n, totalPaid: amount, interestPaid: 0, chartData: [] };
    const payment = amount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPaid = payment * n;
    const interestPaid = totalPaid - amount;

    let balance = amount;
    const chartData: { month: number; balance: number; paid: number }[] = [];
    for (let i = 1; i <= n; i++) {
      const interestPart = balance * r;
      balance = Math.max(0, balance - (payment - interestPart));
      if (i % 3 === 0 || i === n) {
        chartData.push({ month: i, balance: Math.round(balance), paid: Math.round(totalPaid - balance - interestPaid * (balance / amount)) });
      }
    }
    return { payment, totalPaid, interestPaid, chartData };
  }, [amount, rate, months]);

  return (
    <CalcSection>
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField label="Výše úvěru" value={amount} onChange={setAmount} step={10000} suffix="Kč" min={10000} />
        <InputField label="Úroková sazba (RPSN)" value={rate} onChange={setRate} step={0.1} suffix="%" min={0} />
        <InputField label="Doba splácení" value={months} onChange={setMonths} suffix="měs" min={3} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Měsíční splátka" value={formatCZK(calc.payment)} accent="blue" />
        <StatCard label="Celkem zaplaceno" value={formatCZK(calc.totalPaid)} accent="amber" />
        <StatCard label="Přeplaceno" value={formatCZK(calc.interestPaid)} accent="red" />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Splácení úvěru</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={calc.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #e5e7eb)" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}. měs`} />
            <YAxis tickFormatter={(v: number) => `${formatNum(v / 1000)} tis`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={czTooltipFormatter} />
            <Area type="monotone" dataKey="balance" name="Zůstatek" stroke="#ef4444" fill="#fecaca" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <CTAButton calcType="Osobní úvěr" message="Platíte zbytečně moc na úvěru?" />
    </CalcSection>
  );
}

/* ================================================================== */
/*  3. SPOŘICÍ KALKULAČKA                                             */
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
      balance += balance * r + monthlyDeposit;
      totalDeposits += monthlyDeposit;
      if (i % 12 === 0 || i === n) {
        chartData.push({ month: i, deposits: Math.round(totalDeposits), interest: Math.round(balance - totalDeposits) });
      }
    }
    return { total: balance, totalInterest: balance - totalDeposits, totalDeposits, chartData };
  }, [monthlyDeposit, annualRate, savingYears, initialDeposit]);

  return (
    <CalcSection>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InputField label="Počáteční vklad" value={initialDeposit} onChange={setInitialDeposit} step={10000} suffix="Kč" />
        <InputField label="Měsíční vklad" value={monthlyDeposit} onChange={setMonthlyDeposit} step={500} suffix="Kč" />
        <InputField label="Roční úrok" value={annualRate} onChange={setAnnualRate} step={0.1} suffix="%" />
        <InputField label="Doba spoření" value={savingYears} onChange={setSavingYears} suffix="let" min={1} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Celkem naspořeno" value={formatCZK(calc.total)} accent="green" />
        <StatCard label="Z toho vklady" value={formatCZK(calc.totalDeposits)} accent="blue" />
        <StatCard label="Z toho úroky" value={formatCZK(calc.totalInterest)} accent="amber" />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Růst úspor v čase</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={calc.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #e5e7eb)" />
            <XAxis dataKey="month" tickFormatter={(v: number) => `${Math.round(v / 12)}. rok`} tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v: number) => `${formatNum(v / 1000)} tis`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={czTooltipFormatter} />
            <Legend />
            <Area type="monotone" dataKey="deposits" name="Vklady" stackId="1" stroke="#2563eb" fill="#93c5fd" />
            <Area type="monotone" dataKey="interest" name="Úroky" stackId="1" stroke="#16a34a" fill="#86efac" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <CTAButton calcType="Spoření" message="Chcete najít lepší spořicí účet?" />
    </CalcSection>
  );
}

/* ================================================================== */
/*  4. POJIŠTĚNÍ AUTA                                                  */
/* ================================================================== */

function CarInsuranceCalculator() {
  const [carValue, setCarValue] = useState(400000);
  const [carAge, setCarAge] = useState(3);
  const [driverAge, setDriverAge] = useState(35);

  const calc = useMemo(() => {
    // Simplified estimate
    const depreciatedValue = carValue * Math.pow(0.85, carAge);
    const baseRate = 0.035;
    const ageFactor = driverAge < 25 ? 1.5 : driverAge < 30 ? 1.2 : 1.0;
    const carAgeFactor = carAge > 10 ? 0.7 : carAge > 5 ? 0.85 : 1.0;

    const havarieYearly = Math.round(depreciatedValue * baseRate * ageFactor * carAgeFactor);
    const povinneYearly = Math.round(2800 + (carValue > 500000 ? 1200 : 0) + (driverAge < 25 ? 2000 : 0));

    return {
      depreciatedValue: Math.round(depreciatedValue),
      havarieYearly,
      havarieMonthly: Math.round(havarieYearly / 12),
      povinneYearly,
      povinneMonthly: Math.round(povinneYearly / 12),
      totalYearly: havarieYearly + povinneYearly,
      totalMonthly: Math.round((havarieYearly + povinneYearly) / 12),
    };
  }, [carValue, carAge, driverAge]);

  return (
    <CalcSection>
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField label="Pořizovací cena auta" value={carValue} onChange={setCarValue} step={50000} suffix="Kč" min={50000} />
        <InputField label="Stáří auta" value={carAge} onChange={setCarAge} suffix="let" min={0} />
        <InputField label="Věk řidiče" value={driverAge} onChange={setDriverAge} suffix="let" min={18} />
      </div>

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--table-hover)] p-4">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 text-[var(--card-text-muted)] shrink-0" />
          <p className="text-xs text-[var(--card-text-muted)]">
            Odhad je orientační — skutečná cena závisí na pojišťovně, bonusu, typu vozidla a dalších faktorech.
            Aktuální hodnota auta: <strong>{formatCZK(calc.depreciatedValue)}</strong>
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Povinné ručení / rok" value={formatCZK(calc.povinneYearly)} accent="blue" />
        <StatCard label="Havarijní pojištění / rok" value={formatCZK(calc.havarieYearly)} accent="amber" />
        <StatCard label="Celkem měsíčně" value={formatCZK(calc.totalMonthly)} accent="green" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Povinné ručení</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{formatCZK(calc.povinneMonthly)}<span className="text-sm font-normal text-[var(--card-text-muted)]">/měs</span></p>
          <p className="mt-1 text-xs text-[var(--card-text-dim)]">{formatCZK(calc.povinneYearly)} ročně</p>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Havarijní pojištění</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{formatCZK(calc.havarieMonthly)}<span className="text-sm font-normal text-[var(--card-text-muted)]">/měs</span></p>
          <p className="mt-1 text-xs text-[var(--card-text-dim)]">{formatCZK(calc.havarieYearly)} ročně</p>
        </div>
      </div>

      <CTAButton calcType="Pojištění auta" message="Chcete levnější pojištění auta?" />
    </CalcSection>
  );
}

/* ================================================================== */
/*  5. DŮCHODOVÁ KALKULAČKA                                           */
/* ================================================================== */

function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);
  const [monthlyIncome, setMonthlyIncome] = useState(25000);
  const [currentSavings, setCurrentSavings] = useState(200000);

  const calc = useMemo(() => {
    const retirementYears = 20;
    const monthlyReturn = 0.04 / 12;
    const totalNeeded = monthlyIncome * 12 * retirementYears;
    const yearsToRetirement = Math.max(1, retirementAge - currentAge);
    const monthsToRetirement = yearsToRetirement * 12;
    const fvCurrent = currentSavings * Math.pow(1 + monthlyReturn, monthsToRetirement);
    const gap = Math.max(0, totalNeeded - fvCurrent);
    let monthlySaving = 0;
    if (gap > 0 && monthlyReturn > 0) {
      monthlySaving = gap / ((Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn);
    }

    const chartData: { year: number; savings: number; needed: number }[] = [];
    let balance = currentSavings;
    for (let y = 0; y <= yearsToRetirement; y++) {
      chartData.push({ year: currentAge + y, savings: Math.round(balance), needed: Math.round(totalNeeded) });
      for (let m = 0; m < 12; m++) balance = balance * (1 + monthlyReturn) + monthlySaving;
    }
    return { totalNeeded, monthlySaving, gap, chartData };
  }, [currentAge, retirementAge, monthlyIncome, currentSavings]);

  return (
    <CalcSection>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InputField label="Aktuální věk" value={currentAge} onChange={setCurrentAge} suffix="let" min={18} />
        <InputField label="Odchod do důchodu" value={retirementAge} onChange={setRetirementAge} suffix="věk" min={currentAge + 1} />
        <InputField label="Cílový příjem v důchodu" value={monthlyIncome} onChange={setMonthlyIncome} step={1000} suffix="Kč/měs" />
        <InputField label="Aktuální úspory" value={currentSavings} onChange={setCurrentSavings} step={10000} suffix="Kč" />
      </div>

      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--table-hover)] p-4">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 text-[var(--card-text-muted)] shrink-0" />
          <p className="text-xs text-[var(--card-text-muted)]">Předpoklady: 20 let v důchodu, průměrný roční výnos 4%. Jedná se o orientační výpočet.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Celkem potřebujete" value={formatCZK(calc.totalNeeded)} accent="amber" />
        <StatCard label="Měsíčně odkládat" value={formatCZK(calc.monthlySaving)} accent="blue" />
        <StatCard label="Zbývá doplnit" value={formatCZK(calc.gap)} accent={calc.gap > 0 ? "red" : "green"} />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Projekce úspor do důchodu</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={calc.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #e5e7eb)" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)} mil` : `${formatNum(v / 1000)} tis`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={czTooltipFormatter} />
            <Legend />
            <Area type="monotone" dataKey="savings" name="Vaše úspory" stroke="#2563eb" fill="#bfdbfe" />
            <Area type="monotone" dataKey="needed" name="Cílová částka" stroke="#f59e0b" fill="#fef3c7" strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <CTAButton calcType="Důchod" message="Připravte se na důchod s odborníkem" />
    </CalcSection>
  );
}

/* ================================================================== */
/*  6. INFLAČNÍ KALKULAČKA                                             */
/* ================================================================== */

function InflationCalculator() {
  const [amount, setAmount] = useState(100000);
  const [inflationRate, setInflationRate] = useState(3.0);
  const [years, setYears] = useState(10);

  const calc = useMemo(() => {
    const chartData: { year: number; nominal: number; real: number }[] = [];
    for (let y = 0; y <= years; y++) {
      const realValue = amount / Math.pow(1 + inflationRate / 100, y);
      chartData.push({ year: y, nominal: amount, real: Math.round(realValue) });
    }
    const finalReal = amount / Math.pow(1 + inflationRate / 100, years);
    const lostValue = amount - finalReal;
    const lostPercent = ((lostValue / amount) * 100).toFixed(1);

    return { finalReal: Math.round(finalReal), lostValue: Math.round(lostValue), lostPercent, chartData };
  }, [amount, inflationRate, years]);

  return (
    <CalcSection>
      <div className="grid gap-4 sm:grid-cols-3">
        <InputField label="Částka dnes" value={amount} onChange={setAmount} step={10000} suffix="Kč" min={1000} />
        <InputField label="Roční inflace" value={inflationRate} onChange={setInflationRate} step={0.5} suffix="%" min={0} />
        <InputField label="Za kolik let" value={years} onChange={setYears} suffix="let" min={1} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Reálná hodnota" value={formatCZK(calc.finalReal)} accent="amber" />
        <StatCard label="Ztráta kupní síly" value={formatCZK(calc.lostValue)} accent="red" />
        <StatCard label="Pokles o" value={`${calc.lostPercent} %`} accent="red" />
      </div>

      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--card-text-muted)]">Jak inflace sežere vaše peníze</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={calc.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border, #e5e7eb)" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}. rok`} />
            <YAxis tickFormatter={(v: number) => `${formatNum(v / 1000)} tis`} tick={{ fontSize: 10 }} />
            <Tooltip formatter={czTooltipFormatter} />
            <Legend />
            <Area type="monotone" dataKey="nominal" name="Nominální hodnota" stroke="#9ca3af" fill="#f3f4f6" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="real" name="Reálná hodnota" stroke="#ef4444" fill="#fecaca" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <CTAButton calcType="Inflace" message="Chcete ochránit peníze před inflací?" />
    </CalcSection>
  );
}

/* ================================================================== */
/*  PAGE                                                              */
/* ================================================================== */

const CALCULATORS = [
  { key: "mortgage", label: "Hypotéka", icon: Landmark, desc: "Spočítejte si splátku, přeplatek a amortizaci." },
  { key: "loan", label: "Osobní úvěr", icon: CreditCard, desc: "Kolik přeplatíte na spotřebitelském úvěru?" },
  { key: "savings", label: "Spoření", icon: PiggyBank, desc: "Za kolik let naspořím cílovou částku?" },
  { key: "car", label: "Pojištění auta", icon: Car, desc: "Odhad povinného ručení a havarijního pojištění." },
  { key: "retirement", label: "Důchod", icon: Landmark, desc: "Kolik musím odkládat, abych si užil důchod?" },
  { key: "inflation", label: "Inflace", icon: TrendingDown, desc: "Jak inflace sežere vaše úspory?" },
] as const;

type CalcKey = (typeof CALCULATORS)[number]["key"];

export default function KalkulackyPage() {
  const [active, setActive] = useState<CalcKey>("mortgage");

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--card-text)]">Finanční kalkulačky</h1>
            <p className="text-sm text-[var(--card-text-muted)]">
              Orientační výpočty vám pomohou lépe porozumět vašim financím
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-6 mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />
          <div>
            <p className="text-xs text-blue-800">
              <strong>Jak to funguje:</strong> Zadejte parametry a kalkulačka spočítá odhad. Výsledky jsou orientační — váš poradce vám najde konkrétní nabídky s lepšími podmínkami díky přístupu k více poskytovatelům.
            </p>
          </div>
        </div>
      </div>

      {/* Calculator selector — card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {CALCULATORS.map((calc) => {
          const isActive = active === calc.key;
          return (
            <button
              key={calc.key}
              onClick={() => setActive(calc.key)}
              className={`rounded-2xl border-2 p-4 text-left transition-all ${
                isActive
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-[var(--card-border)] bg-[var(--card-bg)] hover:border-blue-200 hover:shadow-sm"
              }`}
            >
              <calc.icon className={`h-6 w-6 mb-2 ${isActive ? "text-blue-600" : "text-[var(--card-text-muted)]"}`} />
              <p className={`text-xs font-semibold ${isActive ? "text-blue-700" : "text-[var(--card-text)]"}`}>
                {calc.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active calculator description */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--card-text)]">
          {CALCULATORS.find((c) => c.key === active)?.label}
        </h2>
        <p className="mt-1 text-sm text-[var(--card-text-muted)]">
          {CALCULATORS.find((c) => c.key === active)?.desc}
        </p>
      </div>

      {/* Calculator content */}
      {active === "mortgage" && <MortgageCalculator />}
      {active === "loan" && <LoanCalculator />}
      {active === "savings" && <SavingsCalculator />}
      {active === "car" && <CarInsuranceCalculator />}
      {active === "retirement" && <RetirementCalculator />}
      {active === "inflation" && <InflationCalculator />}
    </div>
  );
}
