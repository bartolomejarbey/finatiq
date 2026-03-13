"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";

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

/* ── FAQ data ── */
const FAQ_ITEMS = [
  { q: "Musím zadat kreditní kartu?", a: "Ne. Nikdy. Platíte na fakturu bankovním převodem." },
  { q: "Kdy přijde první faktura?", a: "Po skončení 14denního zkušebního období. Pokud službu nechcete, nemusíte nic platit." },
  { q: "Mohu platit ročně se slevou?", a: "Připravujeme. Kontaktujte nás pro individuální nabídku." },
  { q: "Je DPH v ceně?", a: "Ceny jsou uvedeny bez DPH. DPH 21 % se připočítá na faktuře." },
  { q: "Mohu to dát do nákladů?", a: "Ano. Finatiq je softwarová služba (SaaS) a je plně daňově uznatelný provozní náklad." },
];

/* ── Pricing data ── */
const PLANS = [
  {
    name: "Základ",
    price: 359,
    slug: "zaklad",
    featured: false,
    features: ["CRM Pipeline", "Klientský portál", "Správa smluv", "Emailové šablony"],
  },
  {
    name: "Profesionál",
    price: 599,
    slug: "profesional",
    featured: true,
    features: ["Vše ze Základu", "Meta Ads integrace", "OCR dokumentů", "Automatizace", "Pokročilá analytika"],
  },
  {
    name: "Expert",
    price: 899,
    slug: "expert",
    featured: false,
    features: ["Vše z Profesionála", "AI asistent", "AI chatbot", "Vlastní branding", "Prioritní podpora"],
  },
];

/* ── Component ── */
export default function FakturacePage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="grid-pattern">
      {/* HERO */}
      <section className="pt-24 pb-16 px-6 text-center">
        <Reveal>
          <h1
            className="text-5xl md:text-7xl font-bold uppercase tracking-wide"
            style={{ fontFamily: "'Oswald', sans-serif" }}
          >
            <span className="text-white">TRANSPARENTNÍ</span>{" "}
            <span className="text-[#22d3ee]">FAKTURACE</span>
          </h1>
        </Reveal>
        <Reveal delay={100}>
          <p
            className="text-white/40 mt-4 max-w-xl mx-auto text-lg font-light"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Žádná kreditní karta. Žádné automatické strhávání. Platíte na fakturu.
          </p>
        </Reveal>
      </section>

      {/* SECTION 1 — Payment flow */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="text-xs tracking-[4px] text-[#22d3ee]/60 uppercase mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              01 // BEZ KREDITNÍ KARTY
            </p>
          </Reveal>
          <Reveal delay={50}>
            <h2
              className="text-2xl md:text-3xl font-bold uppercase tracking-wide text-white mb-4"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              PLATÍTE NA FAKTURU, NE KREDITKOU
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p
              className="text-white/50 max-w-2xl text-base font-light leading-relaxed mb-10"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Žádné automatické strhávání z karty. Žádné překvapení na výpisu. Každý měsíc vám vystavíme fakturu se splatností 14 dní. Platíte klasickým bankovním převodem — tak jak jste zvyklí.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Vystavíme fakturu", desc: "Na začátku měsíce vám přijde faktura emailem. Jasná částka, jasné období." },
              { num: "02", title: "Zaplatíte převodem", desc: "Klasický bankovní převod. Splatnost 14 dní. Žádné karty, žádné PayPal." },
              { num: "03", title: "Hotovo", desc: "Platba připsána, služba běží dál. Žádné starosti." },
            ].map((step, i) => (
              <Reveal key={step.num} delay={150 + i * 100}>
                <div className="bg-[#0f2035] border border-white/[.06] rounded-lg p-6">
                  <span
                    className="text-[#22d3ee] text-2xl font-bold"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {step.num}
                  </span>
                  <h3
                    className="text-white font-bold uppercase tracking-wide mt-3 mb-2"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-white/50 text-sm font-light leading-relaxed"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {step.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2 — Tax benefits */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="text-xs tracking-[4px] text-[#22d3ee]/60 uppercase mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              02 // NÁKLAD FIRMY
            </p>
          </Reveal>
          <Reveal delay={50}>
            <h2
              className="text-2xl md:text-3xl font-bold uppercase tracking-wide text-white mb-4"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              FINATIQ JDE DO NÁKLADŮ
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p
              className="text-white/50 max-w-2xl text-base font-light leading-relaxed mb-10"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Finatiq je softwarová služba (SaaS). Pro OSVČ i firmy je to plně daňově uznatelný náklad. Snižujete si daňový základ a zároveň získáváte profesionální nástroj.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "OSVČ",
                rate: "15 %",
                saving: `${Math.round(599 * 12 * 0.15)} Kč`,
                desc: "Roční daňová úspora při sazbě 15 %",
              },
              {
                title: "s.r.o.",
                rate: "19 %",
                saving: `${Math.round(599 * 12 * 0.19)} Kč`,
                desc: "Roční daňová úspora při sazbě 19 %",
              },
              {
                title: "Paušál",
                rate: "—",
                saving: "Konzultujte",
                desc: "Záleží na typu paušálu. Poraďte se s účetním.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={150 + i * 100}>
                <div className="bg-[#0f2035] border border-white/[.06] rounded-lg p-6">
                  <h3
                    className="text-white font-bold uppercase tracking-wide mb-1"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-xs text-white/30 mb-4"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    Sazba {item.rate}
                  </p>
                  <p
                    className="text-[#22d3ee] text-2xl font-bold mb-2"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {item.saving}
                  </p>
                  <p
                    className="text-white/50 text-sm font-light leading-relaxed"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {item.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={450}>
            <p
              className="text-xs text-white/20 mt-6 max-w-2xl"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Daňové dopady závisí na vaší konkrétní situaci. Doporučujeme konzultaci s daňovým poradcem.
            </p>
          </Reveal>
        </div>
      </section>

      {/* SECTION 3 — Invoice mockup */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="text-xs tracking-[4px] text-[#22d3ee]/60 uppercase mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              03 // CO JE NA FAKTUŘE
            </p>
          </Reveal>
          <Reveal delay={50}>
            <h2
              className="text-2xl md:text-3xl font-bold uppercase tracking-wide text-white mb-10"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              PŘEHLEDNÁ FAKTURA
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="bg-white text-gray-900 rounded-lg p-8 max-w-lg mx-auto">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-2xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>
                  FAKTURA
                </h3>
              </div>
              <p className="text-gray-500 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Harotas s.r.o. · IČO 21402027
              </p>

              <div className="h-px bg-gray-200 my-5" />

              <div className="space-y-3 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <div className="flex justify-between">
                  <span className="text-gray-500">Odběratel:</span>
                  <span className="text-gray-900 font-medium">Jan Novák — finanční poradce</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Položka:</span>
                  <span className="text-gray-900 font-medium">Finatiq — plán Profesionál (březen 2026)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Základ:</span>
                  <span className="text-gray-900">599,00 Kč</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">DPH 21%:</span>
                  <span className="text-gray-900">125,79 Kč</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-gray-700">Celkem:</span>
                  <span className="text-gray-900">724,79 Kč</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Splatnost:</span>
                  <span className="text-gray-900">14 dní</span>
                </div>
              </div>

              <div className="h-px bg-gray-200 my-5" />

              <p className="text-xs text-gray-400" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Bankovní spojení: 123456789/0100 · VS: 2026030001
              </p>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <p
              className="text-sm text-white/40 text-center mt-6"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Faktury archivujeme. Stáhnete si je kdykoliv v nastavení účtu.
            </p>
          </Reveal>
        </div>
      </section>

      {/* SECTION 4 — Pricing */}
      <section id="cenik" className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <p
              className="text-xs tracking-[4px] text-[#22d3ee]/60 uppercase mb-4"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              04 // KOLIK TO STOJÍ
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.slug} delay={100 + i * 100}>
                <div
                  className={`rounded-lg p-6 ${
                    plan.featured
                      ? "bg-[#0f2035] border-2 border-[#22d3ee]/40 shadow-[0_0_40px_rgba(34,211,238,.06)]"
                      : "bg-[#0f2035] border border-white/[.06]"
                  }`}
                >
                  <h3
                    className="text-lg font-bold uppercase tracking-wide text-white"
                    style={{ fontFamily: "'Oswald', sans-serif" }}
                  >
                    {plan.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span
                      className="text-3xl font-bold text-white"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {plan.price}
                    </span>
                    <span
                      className="text-white/40 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Kč
                    </span>
                  </div>
                  <p
                    className="text-xs text-white/25 mt-1"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    měsíčně bez DPH
                  </p>

                  <div className="h-px bg-white/[.04] my-4" />

                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.featured ? "text-[#22d3ee]" : "text-white/30"}`} />
                        <span
                          className="text-sm text-white/50"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/register?plan=${plan.slug}`}
                    className={`mt-6 block text-center py-3 text-sm font-bold uppercase tracking-[2px] transition-all ${
                      plan.featured
                        ? "bg-[#22d3ee] text-[#060d1a] hover:bg-[#22d3ee]/90"
                        : "border border-white/[.1] text-white hover:border-[#22d3ee]"
                    }`}
                    style={{
                      fontFamily: "'Oswald', sans-serif",
                      clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
                    }}
                  >
                    Vybrat {plan.name}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={400}>
            <p
              className="text-center text-white/30 text-sm font-light max-w-lg mx-auto mt-8"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Jedna smlouva na životní pojištění pokryje Finatiq na 3 roky.
            </p>
          </Reveal>
        </div>
      </section>

      {/* SECTION 5 — FAQ */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <h2
              className="text-2xl sm:text-3xl font-bold uppercase text-center mb-10 text-white"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
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
                    <span
                      className="text-sm font-medium uppercase tracking-wide text-white"
                      style={{ fontFamily: "'Oswald', sans-serif" }}
                    >
                      {item.q}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-white/30 shrink-0 ml-4 transition-transform ${expandedFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {expandedFaq === i && (
                    <div className="px-6 pb-5">
                      <p
                        className="text-sm text-white/50 leading-relaxed font-light"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="px-6 pb-24">
        <Reveal>
          <div className="max-w-2xl mx-auto text-center">
            <p
              className="text-white/40 mb-6"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              14 dní zdarma. Bez kreditní karty. Platíte až když se rozhodnete.
            </p>
            <Link
              href="/register"
              className="inline-block bg-[#22d3ee] text-[#060d1a] px-10 py-4 font-bold uppercase tracking-[3px] text-sm hover:bg-[#22d3ee]/90 transition-colors"
              style={{
                fontFamily: "'Oswald', sans-serif",
                clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
              }}
            >
              Začít zdarma
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
