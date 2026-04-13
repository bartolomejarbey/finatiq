"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PortalPageContainer } from "@/components/portal/PortalPageContainer";
import { ContactAdvisorButton } from "@/components/portal/ContactAdvisorButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Shield, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface Contract {
  id: string;
  title: string;
  status: string;
  type: string;
  provider: string | null;
  interest_rate: number | null;
  remaining_balance: number | null;
  monthly_payment: number | null;
  valid_from: string | null;
  valid_to: string | null;
  insurance_type: string | null;
  value: number | null;
  advisor_id: string;
  client_id: string;
}

interface LoanPayment {
  id: string;
  payment_date: string;
  total_amount: number;
  interest_amount: number;
  principal_amount: number;
  remaining_balance: number;
}

function formatCZK(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const contractId = params.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [interestThreshold, setInterestThreshold] = useState(5.0);
  const [documents, setDocuments] = useState<{ id: string; name: string; file_path: string }[]>([]);

  const fetchData = useCallback(async () => {
    const { data: c } = await supabase.from("contracts").select("*").eq("id", contractId).single();
    if (c) {
      setContract(c);
      const { data: adv } = await supabase.from("advisors").select("interest_rate_threshold").eq("id", c.advisor_id).single();
      if (adv?.interest_rate_threshold) setInterestThreshold(adv.interest_rate_threshold);
    }

    const { data: lp } = await supabase.from("loan_payments").select("*").eq("contract_id", contractId).order("payment_date", { ascending: false });
    setPayments(lp || []);

    const { data: docs } = await supabase.from("client_documents").select("id, name, file_path").eq("client_id", c?.client_id).limit(10);
    setDocuments(docs || []);

    setLoading(false);
  }, [contractId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handlePayment() {
    if (!contract || !contract.remaining_balance || !contract.monthly_payment || !contract.interest_rate) return;
    setPaying(true);

    const balance = contract.remaining_balance;
    const rate = contract.interest_rate;
    const monthly = contract.monthly_payment;

    const interestAmount = Math.round((balance * (rate / 100 / 12)) * 100) / 100;
    const principalAmount = Math.round((monthly - interestAmount) * 100) / 100;
    const newBalance = Math.max(0, Math.round((balance - principalAmount) * 100) / 100);

    const { error: insertError } = await supabase.from("loan_payments").insert({
      contract_id: contract.id,
      advisor_id: contract.advisor_id,
      client_id: contract.client_id,
      payment_date: new Date().toISOString().split("T")[0],
      total_amount: monthly,
      interest_amount: interestAmount,
      principal_amount: principalAmount,
      remaining_balance: newBalance,
    });

    if (insertError) {
      toast.error("Chyba při záznamu splátky: " + insertError.message);
      setPaying(false);
      return;
    }

    const { error: updateError } = await supabase.from("contracts").update({ remaining_balance: newBalance }).eq("id", contract.id);

    if (updateError) {
      toast.error("Chyba při aktualizaci smlouvy: " + updateError.message);
      setPaying(false);
      return;
    }

    setPaying(false);
    toast.success(
      `Splátka zaznamenána: ${formatCZK(monthly)} (úrok: ${formatCZK(interestAmount)}, jistina: ${formatCZK(principalAmount)})`
    );
    fetchData();
  }

  if (loading) return <PortalPageContainer className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 rounded-xl" /></PortalPageContainer>;
  if (!contract) return <PortalPageContainer><p className="text-[var(--card-text-muted)]">Smlouva nenalezena.</p></PortalPageContainer>;

  const isLoan = contract.type === "uver";
  const showAlert = isLoan && contract.interest_rate && contract.interest_rate > interestThreshold;
  const totalPaid = payments.reduce((s, p) => s + p.total_amount, 0);
  const totalInterest = payments.reduce((s, p) => s + p.interest_amount, 0);
  const totalPrincipal = payments.reduce((s, p) => s + p.principal_amount, 0);
  const progress = contract.value && contract.value > 0
    ? Math.round(((contract.value - (contract.remaining_balance || 0)) / contract.value) * 100)
    : 0;

  // Chart data from payments (reversed for chronological)
  const chartData = [...payments].reverse().map((p) => ({
    date: new Date(p.payment_date).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" }),
    balance: p.remaining_balance,
  }));

  // Last payment breakdown
  const lastPayment = payments[0];

  return (
    <PortalPageContainer>
      {/* Header: gradient card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
        <button onClick={() => router.push("/portal/contracts")} className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />Zpět na smlouvy
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${isLoan ? "bg-amber-500/20" : "bg-blue-500/20"}`}>
              {isLoan ? <CreditCard className="h-7 w-7 text-amber-400" /> : <Shield className="h-7 w-7 text-blue-400" />}
            </div>
            <div>
              <h1 className="text-xl font-bold">{contract.title}</h1>
              <p className="text-sm text-gray-400">{contract.provider || "—"}</p>
            </div>
          </div>
          <Badge variant={contract.status === "active" ? "default" : "secondary"} className="bg-white/10 text-white border-0">
            {contract.status === "active" ? "Aktivní" : contract.status}
          </Badge>
        </div>
      </div>

      {showAlert && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Vaše úroková sazba ({contract.interest_rate}%) je nad {interestThreshold}%.</p>
              <p className="mt-1 text-xs text-amber-700">Je možné, že můžete ušetřit refinancováním.</p>
              <div className="mt-2 flex gap-2">
                <ContactAdvisorButton clientId={contract.client_id} label="Kontaktovat poradce" className="text-xs" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract params */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoan ? (
          <>
            <ParamCard label="Výše úvěru" value={formatCZK(contract.value)} missing={contract.value == null} />
            <ParamCard label="Úroková sazba" value={contract.interest_rate ? `${contract.interest_rate}%` : undefined} missing={contract.interest_rate == null} />
            <ParamCard label="Měsíční splátka" value={formatCZK(contract.monthly_payment)} missing={contract.monthly_payment == null} />
            <ParamCard label="Aktuální zůstatek" value={formatCZK(contract.remaining_balance)} missing={contract.remaining_balance == null} highlight />
          </>
        ) : (
          <>
            <ParamCard label="Typ pojištění" value={insuranceTypeLabel(contract.insurance_type)} missing={!contract.insurance_type} />
            <ParamCard label="Měsíční pojistné" value={formatCZK(contract.monthly_payment)} missing={contract.monthly_payment == null} />
            <ParamCard label="Platnost od" value={contract.valid_from ? new Date(contract.valid_from).toLocaleDateString("cs-CZ") : undefined} missing={!contract.valid_from} />
            <ParamCard label="Platnost do" value={contract.valid_to ? new Date(contract.valid_to).toLocaleDateString("cs-CZ") : undefined} missing={!contract.valid_to} />
          </>
        )}
      </div>
      {/* Dates row */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoan && (
          <>
            <ParamCard label="Datum sjednání" value={contract.valid_from ? new Date(contract.valid_from).toLocaleDateString("cs-CZ") : undefined} missing={!contract.valid_from} />
            <ParamCard label="Datum splatnosti" value={contract.valid_to ? new Date(contract.valid_to).toLocaleDateString("cs-CZ") : undefined} missing={!contract.valid_to} />
          </>
        )}
      </div>

      {/* Loan-specific sections */}
      {isLoan && (
        <>
          {/* Progress bar */}
          <div className="mb-6 rounded-2xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--card-text)]">Vývoj vašeho dluhu</h2>
              {contract.value != null && contract.remaining_balance != null ? (
                <span className="text-sm font-bold text-[var(--card-text)]">{progress}% splaceno</span>
              ) : (
                <span className="text-xs text-amber-500">Chybí údaje pro výpočet</span>
              )}
            </div>
            {contract.value != null && contract.remaining_balance != null ? (
              <div className="h-4 w-full rounded-full bg-[var(--table-header)]">
                <div className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            ) : (
              <div className="h-4 w-full rounded-full bg-[var(--table-header)]" />
            )}
            {payments.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs text-[var(--card-text-muted)]">
                <div><p className="font-medium text-[var(--card-text)]">{formatCZK(totalPaid)}</p><p>Celkem splaceno</p></div>
                <div><p className="font-medium text-[var(--card-text)]">{formatCZK(totalInterest)}</p><p>Zaplacené úroky</p></div>
                <div><p className="font-medium text-[var(--card-text)]">{formatCZK(totalPrincipal)}</p><p>Splacená jistina</p></div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-[var(--card-text-muted)] text-center">
                Zatím nebyla zaznamenána žádná splátka. Klikněte na &quot;Splátka zaplacena&quot; pro zaznamenání platby.
              </p>
            )}
          </div>

          {/* Last payment breakdown */}
          {lastPayment && (
            <div className="mb-6 rounded-2xl border bg-[var(--card-bg)] p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-[var(--card-text)]">Poslední splátka</h2>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex h-4 overflow-hidden rounded-full">
                    <div className="bg-red-400" style={{ width: `${(lastPayment.interest_amount / lastPayment.total_amount) * 100}%` }} />
                    <div className="bg-emerald-400" style={{ width: `${(lastPayment.principal_amount / lastPayment.total_amount) * 100}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-[var(--card-text-muted)]">
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-400" />Úrok: {formatCZK(lastPayment.interest_amount)}</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />Jistina: {formatCZK(lastPayment.principal_amount)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-[var(--card-text)]">{formatCZK(lastPayment.total_amount)}</p>
                  <p className="text-[10px] text-[var(--card-text-dim)]">{new Date(lastPayment.payment_date).toLocaleDateString("cs-CZ")}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pay button */}
          <div className="mb-6">
            {contract.remaining_balance != null && contract.monthly_payment != null && contract.interest_rate != null ? (
              <button onClick={handlePayment} disabled={paying || (contract.remaining_balance || 0) <= 0}
                className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-white font-medium hover:bg-green-600 transition disabled:opacity-50">
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Splátka zaplacena
              </button>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">Nelze sledovat splátky</p>
                <p className="mt-1 text-xs text-amber-700">
                  Pro sledování splátek je nutné vyplnit {!contract.remaining_balance ? "zůstatek, " : ""}{!contract.monthly_payment ? "měsíční splátku, " : ""}{!contract.interest_rate ? "úrokovou sazbu" : ""}. Kontaktujte poradce pro doplnění.
                </p>
              </div>
            )}
          </div>

          {/* Balance chart */}
          {chartData.length > 1 && (
            <div className="mb-6 rounded-2xl border bg-[var(--card-bg)] p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-[var(--card-text)]">Vývoj zůstatku</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCZK(v as number)} />
                  <Line type="monotone" dataKey="balance" name="Zůstatek" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="rounded-2xl border bg-[var(--card-bg)] shadow-sm">
              <div className="border-b px-6 py-4"><h2 className="text-sm font-semibold text-[var(--card-text)]">Historie splátek</h2></div>
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-[var(--card-text)]"><th className="px-6 py-3">Datum</th><th className="px-6 py-3">Splátka</th><th className="px-6 py-3">Úrok</th><th className="px-6 py-3">Jistina</th><th className="px-6 py-3">Zůstatek</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-[var(--table-hover)]">
                      <td className="px-6 py-3 text-sm text-[var(--card-text-muted)]">{new Date(p.payment_date).toLocaleDateString("cs-CZ")}</td>
                      <td className="px-6 py-3 text-sm font-medium text-[var(--card-text)]">{formatCZK(p.total_amount)}</td>
                      <td className="px-6 py-3 text-sm text-red-500">{formatCZK(p.interest_amount)}</td>
                      <td className="px-6 py-3 text-sm text-emerald-600">{formatCZK(p.principal_amount)}</td>
                      <td className="px-6 py-3 text-sm text-[var(--card-text)]">{formatCZK(p.remaining_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-[var(--card-bg)] p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-[var(--card-text)]">Dokumenty</h2>
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg bg-[var(--table-hover)] px-3 py-2">
                <span className="text-sm text-[var(--card-text)]">{d.name}</span>
                <Button size="sm" variant="outline" className="text-xs" onClick={async () => {
                  const { data } = await supabase.storage.from("deal-documents").createSignedUrl(d.file_path, 3600);
                  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                }}>Stáhnout</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <h3 className="text-sm font-semibold text-blue-900">Potřebujete poradit?</h3>
        <p className="mt-1 text-xs text-blue-700">Kontaktujte svého finančního poradce pro konzultaci.</p>
        <div className="mt-3 flex gap-2">
          <ContactAdvisorButton clientId={contract.client_id} label="Kontaktovat poradce" className="text-xs" />
        </div>
      </div>
    </PortalPageContainer>
  );
}

function insuranceTypeLabel(type: string | null): string | undefined {
  if (!type) return undefined;
  const labels: Record<string, string> = { zivotni: "Životní", majetek: "Majetek", auto: "Auto", odpovednost: "Odpovědnost", dalsi: "Další" };
  return labels[type] || type;
}

function ParamCard({ label, value, highlight, missing }: { label: string; value?: string; highlight?: boolean; missing?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${highlight ? "bg-blue-50 border-blue-200" : "bg-[var(--card-bg)]"}`}>
      <p className="text-xs text-[var(--card-text-muted)]">{label}</p>
      {missing ? (
        <p className="text-sm text-amber-500 font-medium mt-0.5">Neuvedeno</p>
      ) : (
        <p className={`text-lg font-bold ${highlight ? "text-blue-700" : "text-[var(--card-text)]"}`}>{value || "—"}</p>
      )}
    </div>
  );
}
