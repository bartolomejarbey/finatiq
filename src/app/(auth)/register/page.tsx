"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Check,
  ArrowRight,
  ArrowLeft,
  Shield,
  Zap,
  Sparkles,
  Mail,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  max_clients: number;
  features: Record<string, boolean> | string[];
}

const PLAN_ICONS: Record<string, typeof Shield> = {
  "Základ": Shield,
  "Profesionál": Zap,
  "Expert": Sparkles,
};

const PLAN_SLUG_MAP: Record<string, string> = {
  zdarma: "Zdarma",
  zaklad: "Základ",
  profesional: "Profesionál",
  expert: "Expert",
};

const MODULE_DISPLAY: Record<string, string> = {
  crm: "CRM Pipeline",
  portal: "Klientský portál",
  meta_ads: "Meta Ads",
  ai_assistant: "AI asistent",
  automations: "Automatizace",
  ocr: "OCR rozpoznávání",
  scoring: "Klientský scoring",
  email_templates: "Emailové šablony",
  calendar: "Kalendář",
  osvc: "OSVČ modul",
  calculators: "Kalkulačky",
  vault: "Dokumentový trezor",
  chatbot: "AI chatbot",
  referral: "Doporučení",
  life_events: "Životní události",
  milestones: "Úspěchy",
  news_feed: "Novinky",
  health_score: "Finanční zdraví",
  scenarios: "Scénáře",
  coverage_check: "Pojistné krytí",
  family: "Rodina",
  activity_tracking: "Sledování aktivit",
  wishlist: "Přání",
  articles: "Články",
  seasonal_reminders: "Sezónní připomínky",
  satisfaction: "Spokojenost",
  comparison: "Srovnávání",
  duplicate_detection: "Detekce duplicit",
  qr_payments: "QR platby",
};

const STEPS = ["Účet", "Plán", "Fakturace", "Hotovo"];

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-white/30" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPlan = searchParams.get("plan");

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // Step 2
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);

  // Step 3
  const [companyName, setCompanyName] = useState("");
  const [ico, setIco] = useState("");
  const [dic, setDic] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [phone, setPhone] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  // Fetch plans
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("subscription_plans")
      .select("id, name, price_monthly, max_clients, features")
      .eq("is_active", true)
      .order("price_monthly")
      .then(({ data }) => {
        if (data) {
          setPlans(data);
          if (preselectedPlan && PLAN_SLUG_MAP[preselectedPlan]) {
            const match = data.find(
              (p) => p.name === PLAN_SLUG_MAP[preselectedPlan],
            );
            if (match) setSelectedPlanId(match.id);
          }
        }
        setPlansLoading(false);
      });
  }, [preselectedPlan]);

  // Pre-fill billing email
  useEffect(() => {
    if (step === 3 && !billingEmail) {
      setBillingEmail(email);
    }
  }, [step, email, billingEmail]);

  function validateStep1() {
    setError("");
    if (!email || !password || !passwordConfirm) {
      setError("Vyplňte všechna pole.");
      return false;
    }
    if (password.length < 8) {
      setError("Heslo musí mít alespoň 8 znaků.");
      return false;
    }
    if (password !== passwordConfirm) {
      setError("Hesla se neshodují.");
      return false;
    }
    return true;
  }

  function validateStep2() {
    setError("");
    if (!selectedPlanId) {
      setError("Vyberte plán.");
      return false;
    }
    return true;
  }

  function validateStep3() {
    setError("");
    if (!companyName.trim()) {
      setError("Vyplňte název firmy.");
      return false;
    }
    if (!ico.trim() || !/^\d{8}$/.test(ico.trim())) {
      setError("IČO musí obsahovat přesně 8 číslic.");
      return false;
    }
    return true;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
    else if (step === 3 && validateStep3()) handleSubmit();
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          companyName,
          ico: ico.trim(),
          dic: dic.trim() || null,
          billingStreet: street.trim() || null,
          billingCity: city.trim() || null,
          billingZip: zip.trim() || null,
          billingEmail: billingEmail.trim() || email,
          phone: phone.trim() || null,
          selectedPlanId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registrace selhala.");
        setLoading(false);
        return;
      }

      setStep(4);
      setLoading(false);
    } catch {
      setError("Něco se pokazilo. Zkuste to znovu.");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-transparent border-b border-white/[.1] text-white py-4 outline-none focus:border-[#22d3ee] transition-colors placeholder:text-white/20";
  const labelClass =
    "block text-[.6rem] tracking-[3px] uppercase text-white/30 mb-2";

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div className="flex items-center w-full">
                {i > 0 && (
                  <div
                    className="flex-1 h-px"
                    style={{
                      background:
                        step > i ? "#22d3ee" : "rgba(255,255,255,0.06)",
                    }}
                  />
                )}
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shrink-0"
                  style={{
                    background:
                      step > i + 1
                        ? "#22d3ee"
                        : step === i + 1
                          ? "#22d3ee"
                          : "transparent",
                    border:
                      step <= i
                        ? "1px solid rgba(255,255,255,0.15)"
                        : "1px solid #22d3ee",
                    color:
                      step > i
                        ? "#060d1a"
                        : step === i + 1
                          ? "#060d1a"
                          : "rgba(255,255,255,0.3)",
                    fontFamily: "Oswald, sans-serif",
                  }}
                >
                  {step > i + 1 ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="flex-1 h-px"
                    style={{
                      background:
                        step > i + 1
                          ? "#22d3ee"
                          : "rgba(255,255,255,0.06)",
                    }}
                  />
                )}
              </div>
              <span
                className="text-[.6rem] tracking-[2px] uppercase hidden sm:block"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  color:
                    step === i + 1
                      ? "#22d3ee"
                      : "rgba(255,255,255,0.3)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Account */}
      {step === 1 && (
        <div>
          <h2
            className="text-2xl font-bold uppercase tracking-wide text-white"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            Vytvořte účet
          </h2>
          <p
            className="mt-2 text-white/40"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Zadejte přihlašovací údaje
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label
                className={labelClass}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="vas@email.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
            <div>
              <label
                className={labelClass}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Heslo
              </label>
              <input
                type="password"
                placeholder="Min. 8 znaků"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
            <div>
              <label
                className={labelClass}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Potvrzení hesla
              </label>
              <input
                type="password"
                placeholder="Zopakujte heslo"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={inputClass}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Plan */}
      {step === 2 && (
        <div>
          <h2
            className="text-2xl font-bold uppercase tracking-wide text-white"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            Vyberte plán
          </h2>
          <p
            className="mt-2 text-white/40"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Můžete kdykoliv změnit
          </p>

          <div className="mt-8 space-y-3">
            {plansLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-white/30" />
              </div>
            ) : (
              plans.map((plan) => {
                const Icon = PLAN_ICONS[plan.name] || Shield;
                const selected = selectedPlanId === plan.id;
                const isFeatured = plan.name === "Profesionál";
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full text-left p-5 transition-all border ${
                      selected
                        ? "border-[#22d3ee]/40 bg-[#22d3ee]/[.04] shadow-[0_0_30px_rgba(34,211,238,.06)]"
                        : "border-white/[.06] bg-white/[.02] hover:border-white/[.12]"
                    }`}
                    style={{
                      clipPath:
                        "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{
                            background: selected
                              ? "rgba(34,211,238,0.15)"
                              : "rgba(255,255,255,0.04)",
                            border: selected
                              ? "1px solid rgba(34,211,238,0.2)"
                              : "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{
                              color: selected ? "#22d3ee" : "rgba(255,255,255,0.4)",
                            }}
                          />
                        </div>
                        <div>
                          <div
                            className="font-bold text-white flex items-center gap-2"
                            style={{ fontFamily: "Oswald, sans-serif" }}
                          >
                            {plan.name}
                            {isFeatured && (
                              <span className="text-[.5rem] bg-[#22d3ee] text-[#060d1a] px-2 py-0.5 uppercase tracking-wider font-bold">
                                Nejoblíbenější
                              </span>
                            )}
                          </div>
                          <div
                            className="text-sm text-white/40"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            Až {plan.max_clients} klientů
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-2xl font-bold text-white"
                          style={{ fontFamily: "Oswald, sans-serif" }}
                        >
                          {plan.price_monthly === 0 ? "Zdarma" : plan.price_monthly}
                        </div>
                        {plan.price_monthly > 0 && (
                        <div
                          className="text-xs text-white/30"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          Kč/měs.
                        </div>
                        )}
                      </div>
                    </div>
                    {selected && plan.features && (
                      <ul className="mt-4 space-y-1.5 border-t border-white/[.06] pt-4">
                        {(Array.isArray(plan.features)
                          ? plan.features
                          : Object.entries(plan.features)
                              .filter(([, v]) => v)
                              .map(
                                ([k]) => MODULE_DISPLAY[k] || k,
                              )
                        ).map((f, j) => (
                          <li
                            key={j}
                            className="flex items-center gap-2 text-sm text-white/50"
                            style={{ fontFamily: "DM Sans, sans-serif" }}
                          >
                            <Check className="w-3.5 h-3.5 text-[#22d3ee] shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Step 3: Billing */}
      {step === 3 && (
        <div>
          <h2
            className="text-2xl font-bold uppercase tracking-wide text-white"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            Fakturační údaje
          </h2>
          <p
            className="mt-2 text-white/40"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Pro vystavení faktury
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label
                className={labelClass}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Název firmy *
              </label>
              <input
                type="text"
                placeholder="Vaše firma s.r.o."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClass}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className={labelClass}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  IČO *
                </label>
                <input
                  type="text"
                  placeholder="12345678"
                  value={ico}
                  onChange={(e) =>
                    setIco(e.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  maxLength={8}
                  className={inputClass}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                />
              </div>
              <div>
                <label
                  className={labelClass}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  DIČ
                </label>
                <input
                  type="text"
                  placeholder="CZ12345678"
                  value={dic}
                  onChange={(e) => setDic(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                />
              </div>
            </div>
            <div>
              <label
                className={labelClass}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Ulice
              </label>
              <input
                type="text"
                placeholder="Hlavní 123"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className={inputClass}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className={labelClass}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  Město
                </label>
                <input
                  type="text"
                  placeholder="Praha"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                />
              </div>
              <div>
                <label
                  className={labelClass}
                  style={{ fontFamily: "JetBrains Mono, monospace" }}
                >
                  PSČ
                </label>
                <input
                  type="text"
                  placeholder="110 00"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className={inputClass}
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                />
              </div>
            </div>
            <div>
              <label
                className={labelClass}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Telefon
              </label>
              <input
                type="tel"
                placeholder="+420 123 456 789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
            <div>
              <label
                className={labelClass}
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Fakturační email
              </label>
              <input
                type="email"
                placeholder="fakturace@firma.cz"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className={inputClass}
                style={{ fontFamily: "DM Sans, sans-serif" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="text-center py-12">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#22d3ee]/20 border border-[#22d3ee]/30"
            style={{
              animation: "scaleIn 500ms cubic-bezier(.16,1,.3,1)",
            }}
          >
            <Check className="h-8 w-8 text-[#22d3ee]" />
          </div>
          <style>{`
            @keyframes scaleIn {
              from { transform: scale(0.5); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <h2
            className="text-2xl font-bold uppercase tracking-wide text-white"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            Účet vytvořen
          </h2>
          <p
            className="mt-3 text-white/40"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Váš účet je připravený. Na email jsme odeslali uvítací zprávu s ověřovacím kódem.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 bg-[#22d3ee] text-[#060d1a] px-8 py-3 font-bold uppercase tracking-[3px] text-sm hover:bg-[#22d3ee]/90 transition-colors"
            style={{
              fontFamily: "Oswald, sans-serif",
              clipPath:
                "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
            }}
          >
            Přejít na přihlášení
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Error */}
      {error && step < 4 && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      {/* Navigation buttons */}
      {step < 4 && (
        <div className="mt-8 flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
              className="flex items-center gap-2 border border-white/[.1] px-5 py-3 text-sm font-medium text-white/60 transition hover:border-white/[.2]"
              style={{
                fontFamily: "Oswald, sans-serif",
                clipPath:
                  "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Zpět
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 bg-[#22d3ee] text-[#060d1a] py-3 font-bold uppercase tracking-[3px] text-sm hover:bg-[#22d3ee]/90 disabled:opacity-50 transition-all"
            style={{
              fontFamily: "Oswald, sans-serif",
              clipPath:
                "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
            }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === 3 ? "Vytvořit účet" : "Pokračovat"}
            {!loading && step < 3 && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Login link */}
      {step === 1 && (
        <>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/[.06]" />
            <span className="text-xs text-white/20">nebo</span>
            <div className="h-px flex-1 bg-white/[.06]" />
          </div>
          <p
            className="mt-4 text-center text-sm text-white/40"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Už máte účet?{" "}
            <Link
              href="/login"
              className="font-medium text-[#22d3ee] hover:text-[#22d3ee]/80"
            >
              Přihlaste se
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
