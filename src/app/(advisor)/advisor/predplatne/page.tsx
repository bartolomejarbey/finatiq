"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface PlanInfo {
  id: string;
  name: string;
  price_monthly: number;
}

interface SubStatus {
  status: string;
  trial_ends_at: string | null;
  days_remaining: number | null;
  selected_plan: PlanInfo | null;
}

export default function PredplatnePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [data, setData] = useState<SubStatus | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [gdprAccepted, setGdprAccepted] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/advisor/subscription-status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleActivate() {
    if (!termsAccepted || !gdprAccepted) {
      toast.error("Musíte souhlasit s obchodními podmínkami a zpracováním osobních údajů.");
      return;
    }

    setActivating(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Nepřihlášen.");
      setActivating(false);
      return;
    }

    const { error } = await supabase
      .from("advisors")
      .update({
        subscription_status: "active",
        subscription_accepted_at: new Date().toISOString(),
        subscription_terms_accepted: true,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Chyba při aktivaci. Zkuste to znovu.");
      setActivating(false);
      return;
    }

    toast.success("Předplatné aktivováno. Faktura vám bude zaslána emailem.");
    setTimeout(() => {
      router.push("/advisor");
      router.refresh();
    }, 1000);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (data?.status === "active") {
    return (
      <div className="mx-auto max-w-lg mt-12 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Předplatné je aktivní</h1>
        <p className="mt-2 text-sm text-slate-500">Vaše předplatné je v pořádku.</p>
        <button
          onClick={() => router.push("/advisor")}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Zpět na dashboard
        </button>
      </div>
    );
  }

  const plan = data?.selected_plan;

  return (
    <div className="mx-auto max-w-lg mt-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Aktivace předplatného</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data?.status === "expired"
            ? "Vaše zkušební období skončilo. Pro pokračování aktivujte předplatné."
            : "Aktivujte předplatné pro plný přístup k platformě."}
        </p>
      </div>

      {/* Plan summary */}
      <div className="rounded-xl border bg-white p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
            Váš plán
          </h2>
        </div>
        {plan ? (
          <div>
            <p className="text-lg font-bold text-slate-900">
              Plán {plan.name}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {plan.price_monthly.toLocaleString("cs-CZ")} Kč/měsíc bez DPH
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Plán nebyl vybrán. Kontaktujte podporu.</p>
        )}
      </div>

      {/* Terms */}
      <div className="rounded-xl border bg-white p-6 shadow-sm mb-6 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">
            Souhlasím s{" "}
            <Link href="/podminky" target="_blank" className="text-blue-600 hover:underline">
              obchodními podmínkami
            </Link>
            {" "}*
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={gdprAccepted}
            onChange={(e) => setGdprAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">
            Souhlasím se{" "}
            <Link href="/gdpr" target="_blank" className="text-blue-600 hover:underline">
              zpracováním osobních údajů
            </Link>
            {" "}*
          </span>
        </label>
      </div>

      {/* Activate button */}
      <button
        onClick={handleActivate}
        disabled={activating || !termsAccepted || !gdprAccepted}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {activating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Aktivuji...
          </>
        ) : (
          "Aktivovat předplatné"
        )}
      </button>

      <p className="mt-4 text-xs text-slate-400 text-center">
        Po aktivaci vám bude zaslána faktura na email. Platba je splatná do 14 dnů.
      </p>
    </div>
  );
}
