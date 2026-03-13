"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Check, X as XIcon, ChevronDown, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ── Types ── */
type Plan = {
  id: string;
  name: string;
  price_monthly: number;
  max_clients: number;
  features: Record<string, boolean> | null;
};

/* ── Scroll reveal ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 700ms ${delay}ms, transform 700ms ${delay}ms`,
        transitionTimingFunction: "cubic-bezier(.16,1,.3,1)",
      }}
    >
      {children}
    </div>
  );
}

/* ── Constants ── */
const PLAN_SLUG_MAP: Record<string, string> = {
  "Základ": "zaklad",
  "Profesionál": "profesional",
  "Expert": "expert",
};

const PLAN_DESCRIPTIONS: Record<string, string> = {
  "Základ": "Pro začínající poradce",
  "Profesionál": "Nejoblíbenější volba",
  "Expert": "Pro profesionály",
};

const FEATURE_LABELS: Record<string, string> = {
  crm: "CRM Pipeline",
  portal: "Klientský portál",
  contracts: "Správa smluv a plateb",
  templates: "Emailové šablony",
  pwa: "Mobilní přístup (PWA)",
  meta: "Meta Ads integrace",
  ocr: "OCR rozpoznávání dokumentů",
  automations: "Automatizace a připomínky",
  analytics: "Pokročilá analytika",
  scoring: "Klientský scoring",
  calculators: "Finanční kalkulačky",
  ai: "AI asistent",
  chatbot: "AI chatbot v portálu",
  health: "Finanční zdraví skóre",
  scenarios: "Scénáře Co kdyby",
  coverage: "Kontrola pojistného krytí",
  vault: "Dokumentový trezor",
  branding: "Vlastní branding",
  priority: "Prioritní podpora",
};

const FEATURE_DETAILS: Record<string, string> = {
  crm: "CRM Pipeline — Vizuální kanban board kde přetahujete obchodní příležitosti mezi fázemi. Vidíte celkovou hodnotu pipeline a konverzní poměr v reálném čase.",
  portal: "Klientský portál — Profesionální portál ve vašem brandu. Klient vidí smlouvy, platby, investice a finanční zdraví. Může nahrávat dokumenty.",
  contracts: "Správa smluv a plateb — Kompletní přehled smluv klientů s automatickým sledováním splátek a upozorněním na končící smlouvy.",
  templates: "Emailové šablony — Předpřipravené šablony pro běžné situace s proměnnými pro personalizaci. Úspora hodin týdně.",
  pwa: "Mobilní přístup — Progressive Web App dostupná z telefonu i tabletu bez instalace. Plná funkcionalita odkudkoliv.",
  meta: "Meta Ads integrace — Leady z Facebooku a Instagramu automaticky v pipeline. Tracking konverzí zpět do Meta pro optimalizaci kampaní.",
  ocr: "OCR rozpoznávání — Klient nahraje smlouvu a systém automaticky přečte klíčové údaje. Šetří ruční přepisování.",
  automations: "Automatizace — Pravidla typu trigger → akce. Systém hlídá follow-upy, výročí, stojící dealy a desítky dalších situací automaticky.",
  analytics: "Pokročilá analytika — Detailní přehledy výkonu, konverzních poměrů, hodnoty pipeline a predikce příjmů na další měsíc.",
  scoring: "Klientský scoring — Automatické hodnocení klientů 0-100 podle aktivity, hodnoty smluv a engagement. Segmentace do skupin.",
  calculators: "Finanční kalkulačky — Hypoteční, spořicí a důchodová kalkulačka přímo v portálu. Výpočty se ukládají do profilu klienta.",
  ai: "AI asistent — Automatická detekce upsell příležitostí, shrnutí klienta před schůzkou, predikce konverze a generování nabídek.",
  chatbot: "AI chatbot — Klient se může v portálu zeptat na své finance a dostane okamžitou odpověď na základě svých dat.",
  health: "Finanční zdraví — Automatické hodnocení finanční situace klienta na stupnici 0-100 s doporučeními ke zlepšení.",
  scenarios: "Scénáře Co kdyby — Interaktivní modelování finančních situací. Co když zvýším spoření? Co když refinancuji hypotéku?",
  coverage: "Kontrola pojistného krytí — AI analyzuje mezery v pojistném zabezpečení klienta a navrhne optimální řešení.",
  vault: "Dokumentový trezor — Bezpečné šifrované úložiště dokumentů s kategorizací, expirací a sdílením mezi klientem a poradcem.",
  branding: "Vlastní branding — Logo, barvy a texty ve vašem portálu. Klienti vidí vaši značku, ne naši.",
  priority: "Prioritní podpora — Garantovaná odpověď do 4 hodin, dedikovaný kontakt a přednostní řešení požadavků.",
};

const PLAN_FEATURES: Record<string, string[]> = {
  "Základ": ["crm", "portal", "contracts", "templates", "pwa"],
  "Profesionál": ["crm", "portal", "contracts", "templates", "pwa", "meta", "ocr", "automations", "analytics", "scoring", "calculators"],
  "Expert": ["crm", "portal", "contracts", "templates", "pwa", "meta", "ocr", "automations", "analytics", "scoring", "calculators", "ai", "chatbot", "health", "scenarios", "coverage", "vault", "branding", "priority"],
};

const COMPARISON_FEATURES = [
  "crm", "portal", "templates", "meta", "ocr", "automations", "scoring", "calculators", "ai", "chatbot", "health", "scenarios", "coverage", "vault", "branding", "priority",
];

const FAQ_ITEMS = [
  { q: "Mohu zrušit předplatné kdykoliv?", a: "Ano, můžete zrušit kdykoliv bez penále. Váš účet zůstane aktivní do konce zaplaceného období." },
  { q: "Jak funguje fakturace?", a: "Fakturu vystavujeme měsíčně. Platba převodem na základě vystavené faktury se splatností 14 dní." },
  { q: "Mohu změnit plán později?", a: "Samozřejmě. Upgrade nebo downgrade plánu můžete provést kdykoliv v nastavení. Změna se projeví od dalšího fakturačního období." },
  { q: "Je to bezpečné?", a: "Ano. Data jsou šifrovaná, uložená v EU (Frankfurt), s row-level security na databázi. Každý poradce vidí pouze svá data." },
  { q: "Potřebuji technické znalosti?", a: "Ne. Celý systém je navržený pro finanční poradce, ne pro programátory. Nastavení zabere 5 minut." },
  { q: "Nabízíte podporu?", a: "Ano. Všechny plány zahrnují emailovou podporu. Plán Expert má prioritní podporu s garantovanou dobou odpovědi." },
  { q: "Kolik klientů mohu mít?", a: "Záleží na plánu: Základ až 50, Profesionál až 200, Expert až 500. Pro více kontaktujte náš obchodní tým." },
  { q: "Můžu si platformu vyzkoušet?", a: "Ano. Všechny plány zahrnují 14 dní zdarma bez omezení funkcí." },
];

/* ── Component ── */
export default function CenikPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("subscription_plans")
      .select("id, name, price_monthly, max_clients, features")
      .eq("is_active", true)
      .order("price_monthly")
      .then(({ data }) => {
        if (data && data.length > 0) setPlans(data);
        setLoading(false);
      });
  }, []);

  const displayPlans = plans.length > 0
    ? plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price_monthly,
        maxClients: p.max_clients,
        slug: PLAN_SLUG_MAP[p.name] || p.name.toLowerCase(),
        desc: PLAN_DESCRIPTIONS[p.name] || "",
        featured: p.name === "Profesionál",
        featureKeys: PLAN_FEATURES[p.name] || [],
      }))
    : [
        { id: "1", name: "Základ", price: 359, maxClients: 50, slug: "zaklad", desc: "Pro začínající poradce", featured: false, featureKeys: PLAN_FEATURES["Základ"] },
        { id: "2", name: "Profesionál", price: 599, maxClients: 200, slug: "profesional", desc: "Nejoblíbenější volba", featured: true, featureKeys: PLAN_FEATURES["Profesionál"] },
        { id: "3", name: "Expert", price: 899, maxClients: 500, slug: "expert", desc: "Pro profesionály", featured: false, featureKeys: PLAN_FEATURES["Expert"] },
      ];

  return (
    <div className="grid-pattern">
      {/* HERO */}
      <section className="pt-24 pb-16 px-6 text-center">
        <Reveal>
          <h1 className="font-[Oswald] text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight">
            Vyberte si{" "}
            <span className="text-[#22d3ee]">plán</span>
          </h1>
        </Reveal>
        <Reveal delay={100}>
          <p className="font-[DM_Sans] text-white/40 mt-4 max-w-lg mx-auto text-lg font-light">
            Transparentní ceny. Bez skrytých poplatků. Zrušte kdykoliv.
          </p>
        </Reveal>
      </section>

      {/* PRICING CARDS */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/[.02] border border-white/[.06] p-8 animate-pulse" style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}>
                <div className="h-6 bg-white/[.06] rounded w-24 mb-4" />
                <div className="h-10 bg-white/[.06] rounded w-32 mb-6" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-4 bg-white/[.04] rounded w-full" />
                  ))}
                </div>
              </div>
            ))
          ) : (
            displayPlans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 100}>
                <div
                  className={`p-8 transition-all duration-300 ${
                    plan.featured
                      ? "bg-[#22d3ee]/[.04] border border-[#22d3ee]/20 shadow-[0_0_60px_rgba(34,211,238,.08)] md:scale-[1.03]"
                      : "bg-white/[.02] border border-white/[.06]"
                  }`}
                  style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}
                >
                  {plan.featured && (
                    <span className="inline-block bg-[#22d3ee] text-[#060d1a] text-[.6rem] font-bold px-3 py-1 mb-5 font-[Oswald] uppercase tracking-[3px]">
                      Nejoblíbenější
                    </span>
                  )}
                  <h3 className="font-[Oswald] text-xl font-bold uppercase tracking-wide text-white">{plan.name}</h3>
                  <p className="font-[DM_Sans] text-sm text-white/40 mt-1">{plan.desc}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-[Oswald] text-4xl font-bold text-white">{plan.price}</span>
                    <span className="font-[DM_Sans] text-white/40 text-sm">Kč / měsíc</span>
                  </div>
                  <p className="font-[DM_Sans] text-xs text-white/25 mt-1">bez DPH · až {plan.maxClients} klientů</p>

                  <div className="h-px bg-white/[.04] my-6" />

                  <ul className="space-y-3">
                    {plan.featureKeys.map((key) => (
                      <li key={key} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.featured ? "text-[#22d3ee]" : "text-white/30"}`} />
                        <span className="font-[DM_Sans] text-sm text-white/50">{FEATURE_LABELS[key]}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Expandable details */}
                  <button
                    onClick={() => setExpandedPlan(expandedPlan === plan.slug ? null : plan.slug)}
                    className="flex items-center gap-1.5 mt-5 text-xs text-white/30 hover:text-[#22d3ee] transition-colors font-[JetBrains_Mono] tracking-wider"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedPlan === plan.slug ? "rotate-180" : ""}`} />
                    Zobrazit podrobnosti
                  </button>

                  {expandedPlan === plan.slug && (
                    <div className="mt-4 space-y-3 border-t border-white/[.04] pt-4">
                      {plan.featureKeys.map((key) => (
                        <div key={key}>
                          <p className="font-[DM_Sans] text-xs text-white/60 leading-relaxed">
                            {FEATURE_DETAILS[key]}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/register?plan=${plan.slug}`}
                    className={`mt-8 block text-center py-3 font-[Oswald] uppercase tracking-[2px] text-sm font-bold transition-all ${
                      plan.featured
                        ? "bg-[#22d3ee] text-[#060d1a] hover:bg-[#22d3ee]/90"
                        : "border border-white/[.1] text-white hover:border-[#22d3ee]"
                    }`}
                    style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}
                  >
                    Vybrat {plan.name}
                  </Link>
                </div>
              </Reveal>
            ))
          )}
        </div>

        <Reveal delay={300}>
          <p className="text-center text-white/30 font-[DM_Sans] text-sm mt-10">
            Všechny plány zahrnují 14 dní zdarma na vyzkoušení.
          </p>
        </Reveal>
        <Reveal delay={400}>
          <p className="text-center text-white/20 font-[DM_Sans] text-xs mt-4 max-w-xl mx-auto">
            Průměrný finanční poradce ušetří s Finatiq 12+ hodin týdně na administrativě.
            Při hodinové sazbě 800 Kč to je úspora přes 38 000 Kč měsíčně — investice se vrátí už v prvním týdnu.
          </p>
        </Reveal>
      </section>

      {/* COMPARISON TABLE */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase text-center mb-10">
              Porovnání <span className="text-[#22d3ee]">plánů</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="bg-[#0f2035] border border-white/[.08] rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-white/[.03]">
                    <th className="text-left font-[Oswald] text-sm uppercase tracking-wider text-white/50 px-6 py-4">Funkce</th>
                    <th className="text-center font-[Oswald] text-sm uppercase tracking-wider text-white/50 px-4 py-4">Základ</th>
                    <th className="text-center font-[Oswald] text-sm uppercase tracking-wider text-[#22d3ee] px-4 py-4">Profesionál</th>
                    <th className="text-center font-[Oswald] text-sm uppercase tracking-wider text-white/50 px-4 py-4">Expert</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((key) => {
                    const inZaklad = PLAN_FEATURES["Základ"].includes(key);
                    const inPro = PLAN_FEATURES["Profesionál"].includes(key);
                    const inExpert = PLAN_FEATURES["Expert"].includes(key);
                    return (
                      <tr key={key} className="border-t border-white/[.04] hover:bg-white/[.02] transition-colors">
                        <td className="font-[DM_Sans] text-sm text-white/50 px-6 py-3">{FEATURE_LABELS[key]}</td>
                        <td className="text-center px-4 py-3">
                          {inZaklad ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <XIcon className="w-4 h-4 text-white/15 mx-auto" />}
                        </td>
                        <td className="text-center px-4 py-3">
                          {inPro ? <Check className="w-4 h-4 text-[#22d3ee] mx-auto" /> : <XIcon className="w-4 h-4 text-white/15 mx-auto" />}
                        </td>
                        <td className="text-center px-4 py-3">
                          {inExpert ? <Check className="w-4 h-4 text-green-400 mx-auto" /> : <XIcon className="w-4 h-4 text-white/15 mx-auto" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* META ADS ADDON */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div
              className="bg-[#0f2035] border border-[#22d3ee]/20 p-10 relative overflow-hidden"
              style={{ clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))" }}
            >
              <div className="absolute top-0 right-0 bg-[#22d3ee] text-[#060d1a] font-[JetBrains_Mono] text-[.6rem] tracking-[3px] uppercase px-4 py-1.5 font-bold">
                Addon
              </div>
              <h3 className="font-[Oswald] text-xl font-bold uppercase tracking-wide mb-2">
                Meta Ads na klíč
              </h3>
              <p className="font-[DM_Sans] text-sm text-white/40 font-light mb-6">
                Kompletní správa Meta Ads kampaní pro finanční poradce. Kreativy, videa, optimalizace — vše v ceně.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-baseline justify-between">
                  <span className="font-[DM_Sans] text-sm text-white/50">Správa kampaní</span>
                  <span className="font-[Oswald] text-lg font-bold text-[#22d3ee]">1 500 – 5 000 Kč/měs.</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-[DM_Sans] text-sm text-white/50">Reklamní videa a grafiky</span>
                  <span className="font-[Oswald] text-sm font-bold text-white/60">V ceně správy</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-[DM_Sans] text-sm text-white/50">Min. rozpočet na reklamu</span>
                  <span className="font-[Oswald] text-sm font-bold text-white/60">od 5 000 Kč/měs.</span>
                </div>
              </div>
              <p className="font-[DM_Sans] text-xs text-white/25 leading-relaxed mb-6">
                Cena správy závisí na rozsahu kampaní. Rozpočet na reklamu jde přímo do Meta — nebereme z něj provizi.
              </p>
              <Link
                href="/kontakt?predmet=meta-ads"
                className="inline-flex items-center gap-2 font-[Oswald] uppercase tracking-[3px] text-sm bg-[#22d3ee] text-[#060d1a] px-6 py-3 font-bold hover:bg-[#22d3ee]/90 transition-colors"
                style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}
              >
                Nezávazná konzultace <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <h2 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase text-center mb-10">
              Časté dotazy
            </h2>
          </Reveal>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <Reveal key={i} delay={i * 50}>
                <div className="bg-white/[.02] border border-white/[.06] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="font-[Oswald] text-sm font-medium uppercase tracking-wide text-white">{item.q}</span>
                    <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 ml-4 transition-transform ${expandedFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {expandedFaq === i && (
                    <div className="px-6 pb-5">
                      <p className="font-[DM_Sans] text-sm text-white/50 leading-relaxed font-light">{item.a}</p>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <Reveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-[Oswald] text-2xl font-bold uppercase">
              Stále váháte? <span className="text-[#22d3ee]">Napište nám.</span>
            </h2>
            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 mt-6 bg-[#22d3ee] text-[#060d1a] font-[Oswald] uppercase tracking-[3px] text-sm px-8 py-3.5 font-bold hover:bg-[#22d3ee]/90 transition-colors"
              style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))" }}
            >
              Kontaktovat
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
