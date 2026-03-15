"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

export interface PlanData {
  id?: string;
  name: string;
  tier?: string;
  price_monthly: number;
  max_clients: number;
  features: Record<string, boolean>;
  description?: string | null;
  perks?: string[] | null;
  badge?: string | null;
  trial_days?: number | null;
}

const FEATURE_LABELS: Record<string, string> = {
  crm: "CRM & Pipeline",
  portal: "Klientský portál",
  templates: "Šablony smluv",
  scoring: "Lead scoring",
  automations: "Automatizace",
  meta_ads: "Meta Ads integrace",
  ocr: "OCR dokumentů",
  ai_assistant: "AI asistent",
  osvc: "OSVČ modul",
  calendar: "Kalendář & sync",
};

export function PlanCard({
  plan,
  featured = false,
  showCta = true,
}: {
  plan: PlanData;
  featured?: boolean;
  showCta?: boolean;
}) {
  const enabledFeatures = Object.entries(plan.features || {})
    .filter(([, v]) => v)
    .map(([k]) => FEATURE_LABELS[k] || k);

  return (
    <div
      className={`relative rounded-2xl border p-8 flex flex-col ${
        featured
          ? "border-[#22d3ee]/40 bg-[#22d3ee]/[.04] ring-1 ring-[#22d3ee]/20"
          : "border-white/[.06] bg-white/[.02]"
      }`}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-6 bg-[#22d3ee] text-[#060d1a] font-[Oswald] text-[.65rem] uppercase tracking-[3px] px-3 py-1 font-bold">
          {plan.badge}
        </span>
      )}
      <h3 className="font-[Oswald] text-xl font-bold uppercase tracking-[2px] text-white">
        {plan.name}
      </h3>
      {plan.description && (
        <p className="font-[DM_Sans] text-sm text-white/40 mt-2">{plan.description}</p>
      )}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-[Oswald] text-4xl font-bold text-white">
          {plan.price_monthly === 0 ? "Zdarma" : `${plan.price_monthly.toLocaleString("cs-CZ")} Kč`}
        </span>
        {plan.price_monthly > 0 && (
          <span className="font-[DM_Sans] text-sm text-white/30">/měsíc</span>
        )}
      </div>
      <p className="font-[DM_Sans] text-xs text-white/30 mt-1">
        max {plan.max_clients} klientů
      </p>
      <ul className="mt-6 space-y-2 flex-1">
        {enabledFeatures.map((f) => (
          <li key={f} className="flex items-center gap-2 font-[DM_Sans] text-sm text-white/60">
            <span className="text-[#22d3ee]">&#10003;</span> {f}
          </li>
        ))}
      </ul>
      {plan.perks && plan.perks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[.06] space-y-1.5">
          {plan.perks.map((perk, i) => (
            <p key={i} className="font-[DM_Sans] text-xs text-[#22d3ee]/80">
              ★ {perk}
            </p>
          ))}
        </div>
      )}
      {showCta && (
        <Link
          href="/register"
          className={`mt-6 flex items-center justify-center gap-2 font-[Oswald] text-sm uppercase tracking-[2px] px-6 py-3 font-bold transition-colors ${
            featured
              ? "bg-[#22d3ee] text-[#060d1a] hover:bg-[#22d3ee]/90"
              : "border border-white/10 text-white/60 hover:text-white hover:border-white/20"
          }`}
          style={{
            clipPath:
              "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
          }}
        >
          Začít {plan.trial_days ? `${plan.trial_days} dní zdarma` : "zdarma"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
