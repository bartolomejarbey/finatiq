"use client";

import React, { useState, useRef, useEffect } from "react";

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

const SECTIONS = [
  {
    title: "1. Úvodní ustanovení",
    content: [
      "Tyto obchodní podmínky (dále jen \u201EPodmínky\u201C) upravují práva a povinnosti mezi společností Harotas s.r.o., IČO 21402027, se sídlem Školská 689/20, Nové Město, 110 00 Praha 1, zapsanou v obchodním rejstříku vedeném Městským soudem v Praze, spisová značka C 401433/MSPH (dále jen \u201EPoskytovatel\u201C), a uživatelem platformy Finatiq (dále jen \u201EUživatel\u201C).",
      "Platformou se rozumí webová aplikace Finatiq dostupná na adrese finatiq.cz, včetně všech jejích funkcí, modulů a souvisejících služeb.",
      "Registrací a používáním platformy Uživatel potvrzuje, že se s těmito Podmínkami seznámil a souhlasí s nimi.",
    ],
  },
  {
    title: "2. Popis služby",
    content: [
      "Finatiq je SaaS platforma určená pro finanční poradce a jejich klienty. Platforma poskytuje nástroje pro správu klientů (CRM), klientský portál, automatizaci procesů, AI asistenta, kalkulačky, a další funkce dle zvoleného tarifu.",
      "Poskytovatel si vyhrazuje právo rozšiřovat, upravovat nebo omezovat funkce platformy. O podstatných změnách bude Uživatel informován e-mailem s předstihem minimálně 14 dnů.",
    ],
  },
  {
    title: "3. Registrace a uživatelský účet",
    content: [
      "Pro používání platformy je nutná registrace. Uživatel je povinen uvést pravdivé a aktuální údaje.",
      "Uživatel odpovídá za bezpečnost svých přihlašovacích údajů a nesmí je sdílet s třetími osobami.",
      "Poskytovatel si vyhrazuje právo zablokovat nebo zrušit účet Uživatele, který porušuje tyto Podmínky nebo používá platformu v rozporu s právními předpisy.",
    ],
  },
  {
    title: "4. Tarify a platby",
    content: [
      "Platforma nabízí několik tarifů včetně bezplatného tarifu Starter. Podrobnosti o tarifech, jejich cenách a obsažených funkcích jsou uvedeny na stránce Ceník.",
      "Platby za placené tarify jsou účtovány měsíčně nebo ročně dle volby Uživatele. Platba je splatná předem na začátku každého fakturačního období.",
      "Ceny jsou uvedeny bez DPH, není-li výslovně uvedeno jinak.",
      "Poskytovatel si vyhrazuje právo změnit ceny tarifů. O změně cen bude Uživatel informován minimálně 30 dnů předem.",
    ],
  },
  {
    title: "5. Práva a povinnosti uživatele",
    content: [
      "Uživatel se zavazuje používat platformu v souladu s těmito Podmínkami a platnými právními předpisy České republiky.",
      "Uživatel nesmí: nahrávat škodlivý obsah, pokoušet se o neoprávněný přístup k systémům Poskytovatele, používat platformu pro nezákonné účely, sdílet přihlašovací údaje s třetími osobami.",
      "Uživatel odpovídá za veškerá data, která do platformy nahraje. Uživatel prohlašuje, že disponuje všemi potřebnými souhlasy ke zpracování osobních údajů svých klientů.",
    ],
  },
  {
    title: "6. Odpovědnost poskytovatele",
    content: [
      "Poskytovatel se zavazuje zajistit dostupnost platformy v rozsahu minimálně 99,5 % měsíčně, s výjimkou plánovaných odstávek pro údržbu.",
      "Poskytovatel neodpovídá za škody způsobené: výpadky na straně třetích stran (internetové připojení, hostingové služby), nesprávným použitím platformy Uživatelem, vyšší mocí.",
      "Celková odpovědnost Poskytovatele za škody je omezena na výši uhrazeného předplatného za posledních 12 měsíců.",
    ],
  },
  {
    title: "7. Ochrana dat a soukromí",
    content: [
      "Zpracování osobních údajů se řídí samostatným dokumentem Ochrana osobních údajů (GDPR), který je dostupný na stránce /gdpr.",
      "Poskytovatel zpracovává osobní údaje Uživatelů v souladu s Nařízením Evropského parlamentu a Rady (EU) 2016/679 (GDPR) a zákonem č. 110/2019 Sb., o zpracování osobních údajů.",
    ],
  },
  {
    title: "8. Ukončení smlouvy",
    content: [
      "Uživatel může svůj účet kdykoliv zrušit v nastavení platformy nebo kontaktováním Poskytovatele na bartolomej@arbey.cz.",
      "Při zrušení účtu bude Uživateli umožněno exportovat svá data po dobu 30 dnů od zrušení. Po uplynutí této lhůty budou data nevratně smazána.",
      "Poskytovatel může ukončit poskytování služby Uživateli v případě závažného porušení těchto Podmínek, a to s okamžitou účinností.",
    ],
  },
  {
    title: "9. Závěrečná ustanovení",
    content: [
      "Tyto Podmínky se řídí právním řádem České republiky.",
      "Případné spory budou řešeny přednostně smírnou cestou. Nedojde-li k dohodě, bude spor rozhodnut příslušným soudem České republiky.",
      "Poskytovatel si vyhrazuje právo tyto Podmínky jednostranně měnit. O změnách bude Uživatel informován e-mailem minimálně 14 dnů před nabytím účinnosti nové verze.",
      "Tyto Podmínky nabývají účinnosti dne 1. 1. 2025.",
      "Kontakt: bartolomej@arbey.cz | +420 725 932 729",
    ],
  },
];

export default function PodminkyPage() {
  return (
    <div className="grid-pattern">
      {/* HERO */}
      <section className="pt-24 pb-16 px-6 text-center">
        <Reveal>
          <h1 className="font-[Oswald] text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight">
            Obchodní{" "}
            <span className="text-[#22d3ee]">podmínky</span>
          </h1>
        </Reveal>
        <Reveal delay={100}>
          <p className="font-[DM_Sans] text-white/40 mt-4 max-w-lg mx-auto text-lg font-light">
            Platné od 1. 1. 2025
          </p>
        </Reveal>
      </section>

      {/* CONTENT */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto space-y-8">
          {SECTIONS.map((s, i) => (
            <Reveal key={i} delay={i * 50}>
              <div
                className="bg-[#0f2035] border border-white/[.08] p-8"
                style={{ clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%)" }}
              >
                <h2 className="font-[Oswald] text-lg font-bold uppercase tracking-wide mb-4">
                  {s.title}
                </h2>
                <div className="space-y-3">
                  {s.content.map((p, j) => (
                    <p key={j} className="font-[DM_Sans] text-sm text-white/50 leading-relaxed font-light">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}

          {/* Company info */}
          <Reveal delay={500}>
            <div className="border-t border-white/[.04] pt-8 mt-12">
              <p className="font-[DM_Sans] text-xs text-white/20 leading-relaxed text-center">
                Harotas s.r.o. · IČO 21402027 · DIČ CZ21402027<br />
                Školská 689/20, Nové Město, 110 00 Praha 1<br />
                Spisová značka C 401433/MSPH, Městský soud v Praze<br />
                Jednatel: Bartoloměj Rota
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
