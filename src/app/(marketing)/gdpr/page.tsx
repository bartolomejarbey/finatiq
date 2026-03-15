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
    title: "1. Správce osobních údajů",
    content: [
      "Správcem osobních údajů je společnost Harotas s.r.o., IČO 21402027, se sídlem Školská 689/20, Nové Město, 110 00 Praha 1, zapsaná v obchodním rejstříku vedeném Městským soudem v Praze, spisová značka C 401433/MSPH (dále jen \u201ESprávce\u201C).",
      "Kontaktní osoba pro ochranu osobních údajů: Bartoloměj Rota, bartolomej@arbey.cz, +420 725 932 729.",
    ],
  },
  {
    title: "2. Jaké údaje zpracováváme",
    content: [
      "Identifikační údaje: jméno, příjmení, IČO, DIČ.",
      "Kontaktní údaje: e-mailová adresa, telefonní číslo, adresa.",
      "Přihlašovací údaje: e-mail a heslo (heslo je ukládáno výhradně v hashované podobě).",
      "Údaje o využívání služby: datum registrace, zvolený tarif, historie přihlášení, aktivita v platformě.",
      "Fakturační údaje: údaje potřebné pro vystavení daňového dokladu.",
      "Údaje klientů poradce: v rámci CRM funkcionality platforma zpracovává údaje klientů finančních poradců, které do systému vloží sám poradce.",
    ],
  },
  {
    title: "3. Účely zpracování",
    content: [
      "Poskytování služby: zpracování je nezbytné pro plnění smlouvy o poskytování platformy Finatiq.",
      "Správa uživatelského účtu: autentizace, autorizace, bezpečnost účtu.",
      "Fakturace a účetnictví: splnění zákonných povinností dle zákona o účetnictví a zákona o DPH.",
      "Komunikace: odpovědi na dotazy, technická podpora, oznámení o změnách služby.",
      "Zlepšování služby: anonymizovaná analytická data pro vylepšení uživatelského zážitku.",
      "Marketing: zasílání obchodních sdělení (pouze se souhlasem, s možností odhlášení).",
    ],
  },
  {
    title: "4. Právní základ zpracování",
    content: [
      "Plnění smlouvy (čl. 6 odst. 1 písm. b) GDPR): zpracování nezbytné pro poskytování služby.",
      "Plnění právní povinnosti (čl. 6 odst. 1 písm. c) GDPR): účetní a daňové povinnosti.",
      "Oprávněný zájem (čl. 6 odst. 1 písm. f) GDPR): zabezpečení platformy, prevence podvodů.",
      "Souhlas (čl. 6 odst. 1 písm. a) GDPR): marketingová komunikace, cookies.",
    ],
  },
  {
    title: "5. Doba uchování údajů",
    content: [
      "Údaje spojené s uživatelským účtem: po dobu trvání účtu a 30 dnů po jeho zrušení.",
      "Fakturační údaje: 10 let od konce účetního období dle zákonných požadavků.",
      "Komunikace: 3 roky od posledního kontaktu.",
      "Analytická data: ukládána v anonymizované podobě bez časového omezení.",
      "Marketingový souhlas: do odvolání souhlasu.",
    ],
  },
  {
    title: "6. Příjemci osobních údajů",
    content: [
      "Supabase Inc. — poskytovatel databáze a autentizace (servery v EU).",
      "Vercel Inc. — poskytovatel hostingu webové aplikace.",
      "Poskytovatel platební brány — pro zpracování plateb (pouze fakturační údaje).",
      "Státní orgány — pokud je to vyžadováno zákonem (finanční úřad, soudy).",
      "Osobní údaje nejsou předávány do třetích zemí mimo EU/EHP bez odpovídajících záruk dle GDPR.",
    ],
  },
  {
    title: "7. Vaše práva",
    content: [
      "Právo na přístup: máte právo získat potvrzení, zda jsou vaše osobní údaje zpracovávány, a pokud ano, získat k nim přístup.",
      "Právo na opravu: máte právo na opravu nepřesných osobních údajů.",
      "Právo na výmaz: máte právo požádat o vymazání osobních údajů, pokud pominul účel zpracování.",
      "Právo na omezení zpracování: máte právo požádat o omezení zpracování v určitých případech.",
      "Právo na přenositelnost: máte právo získat své údaje ve strukturovaném, strojově čitelném formátu.",
      "Právo vznést námitku: máte právo vznést námitku proti zpracování založenému na oprávněném zájmu.",
      "Právo odvolat souhlas: udělený souhlas můžete kdykoliv odvolat bez vlivu na zákonnost dřívějšího zpracování.",
    ],
  },
  {
    title: "8. Zabezpečení údajů",
    content: [
      "Veškerá data jsou přenášena pomocí šifrovaného protokolu HTTPS/TLS.",
      "Hesla jsou ukládána výhradně v hashované podobě (bcrypt).",
      "Přístup k databázi je omezen pomocí Row Level Security (RLS) — každý uživatel vidí pouze svá data.",
      "Pravidelné zálohy databáze s šifrováním.",
      "Přístupy zaměstnanců jsou omezeny na minimum nezbytné pro plnění jejich pracovních úkolů.",
    ],
  },
  {
    title: "9. Cookies",
    content: [
      "Platforma používá nezbytné cookies pro zajištění funkčnosti (přihlášení, session management).",
      "Analytické cookies jsou použity pouze se souhlasem uživatele.",
      "Podrobnosti o používaných cookies a možnostech jejich správy jsou uvedeny v cookie banneru při první návštěvě platformy.",
    ],
  },
  {
    title: "10. Kontakt a stížnosti",
    content: [
      "V případě dotazů ohledně zpracování osobních údajů nás kontaktujte:",
      "E-mail: bartolomej@arbey.cz",
      "Telefon: +420 725 932 729",
      "Adresa: Školská 689/20, Nové Město, 110 00 Praha 1",
      "Máte-li pocit, že vaše práva byla porušena, máte právo podat stížnost u dozorového úřadu: Úřad pro ochranu osobních údajů, Pplk. Sochora 27, 170 00 Praha 7, www.uoou.cz.",
      "Tyto zásady nabývají účinnosti dne 1. 1. 2025.",
    ],
  },
];

export default function GdprPage() {
  return (
    <div className="grid-pattern">
      {/* HERO */}
      <section className="pt-24 pb-16 px-6 text-center">
        <Reveal>
          <h1 className="font-[Oswald] text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight">
            Ochrana{" "}
            <span className="text-[#22d3ee]">osobních údajů</span>
          </h1>
        </Reveal>
        <Reveal delay={100}>
          <p className="font-[DM_Sans] text-white/40 mt-4 max-w-lg mx-auto text-lg font-light">
            Zásady zpracování osobních údajů dle GDPR — platné od 1. 1. 2025
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
          <Reveal delay={550}>
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
