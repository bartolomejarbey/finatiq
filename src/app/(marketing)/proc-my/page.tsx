"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Target,
  Users,
  Zap,
  Check,
  X as XIcon,
  BarChart3,
  Shield,
  Lock,
  Database,
  UserCheck,
  Globe,
  FileCheck,
  ArrowRight,
  Rocket,
  Award,
  Building2,
  Minus,
  AlertTriangle,
} from "lucide-react";

/* ── Scroll reveal ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
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

/* ── Comparison table ── */
const COMPARISON_ROWS = [
  { feature: "CRM pro finanční poradce", fa: "check", excel: "x", foreign: "partial" },
  { feature: "Klientský portál", fa: "check", excel: "x", foreign: "x" },
  { feature: "Meta Ads integrace", fa: "check", excel: "x", foreign: "x" },
  { feature: "Conversions API zpět do Meta", fa: "check", excel: "x", foreign: "x" },
  { feature: "AI detekce příležitostí", fa: "check", excel: "x", foreign: "partial" },
  { feature: "Automatizace workflow", fa: "check", excel: "x", foreign: "partial" },
  { feature: "Vlastní branding portálu", fa: "check", excel: "x", foreign: "x" },
  { feature: "České prostředí a podpora", fa: "check", excel: "check", foreign: "x" },
  { feature: "Smluvní garance bezpečnosti", fa: "check", excel: "x", foreign: "partial" },
  { feature: "Cena od 359 Kč/měs.", fa: "check", excel: "free", foreign: "expensive" },
];

function CellIcon({ type }: { type: string }) {
  if (type === "check") return <Check className="w-4 h-4 text-green-400 mx-auto" />;
  if (type === "x") return <XIcon className="w-4 h-4 text-red-400/50 mx-auto" />;
  if (type === "partial") return <AlertTriangle className="w-4 h-4 text-amber-400/60 mx-auto" />;
  if (type === "free") return <span className="text-[.7rem] text-white/30 font-[JetBrains_Mono]">zdarma</span>;
  if (type === "expensive") return <span className="text-[.7rem] text-white/30 font-[JetBrains_Mono]">$$</span>;
  return <Minus className="w-4 h-4 text-white/20 mx-auto" />;
}

/* ── Security items ── */
const SECURITY_ITEMS = [
  { icon: <Lock className="w-5 h-5" />, title: "Šifrovaná komunikace", desc: "Veškerá komunikace probíhá přes HTTPS/TLS. Data jsou šifrována při přenosu i v klidu na serveru." },
  { icon: <Shield className="w-5 h-5" />, title: "Hashovaná hesla", desc: "Hesla jsou ukládána pomocí bcrypt hashování. Ani my jako provozovatel nemáme přístup k vašim heslům v čitelné podobě." },
  { icon: <Database className="w-5 h-5" />, title: "Oddělená data (RLS)", desc: "Row Level Security na databázi. Každý poradce vidí pouze svá data. Klient vidí pouze své. Technicky není možné vidět data jiného poradce." },
  { icon: <UserCheck className="w-5 h-5" />, title: "Expert na bezpečnost", desc: "Spolupracujeme s certifikovaným odborníkem na kybernetickou bezpečnost, který pravidelně audituje náš systém a infrastrukturu." },
  { icon: <Globe className="w-5 h-5" />, title: "Data v EU (Frankfurt)", desc: "Všechna data jsou uložena v datovém centru ve Frankfurtu, Německo. Plně v souladu s GDPR a evropskou legislativou." },
  { icon: <FileCheck className="w-5 h-5" />, title: "Smluvní garance", desc: "Bezpečnost vašich dat garantujeme smluvně. Součástí každé smlouvy je NDA a zpracovatelská smlouva (DPA) dle GDPR." },
];

export default function ProcMyPage() {
  return (
    <div className="grid-pattern">
      {/* ═══ HERO ═══ */}
      <section className="pt-24 pb-16 px-6 text-center">
        <Reveal>
          <h1 className="font-[Oswald] text-4xl sm:text-5xl lg:text-6xl font-bold uppercase tracking-tight">
            Proč právě{" "}
            <span className="text-[#22d3ee]">Finatiq</span>
          </h1>
        </Reveal>
        <Reveal delay={100}>
          <p className="font-[DM_Sans] text-white/40 mt-4 max-w-xl mx-auto text-lg font-light">
            Nejsme jen další software. Rozumíme vašemu podnikání.
          </p>
        </Reveal>
      </section>

      {/* ═══ SEKCE 1: NÁŠ PŘÍBĚH ═══ */}
      <section className="border-t border-white/[.04] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-px bg-[#22d3ee]" />
              <span className="font-[JetBrains_Mono] text-[.68rem] tracking-[4px] text-[#22d3ee]">
                01 // KDO ZA TÍM STOJÍ
              </span>
            </div>
            <h2 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase mb-8">
              Postaveno marketérem pro poradce
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <Reveal delay={100}>
              <div className="space-y-5 font-[DM_Sans] text-white/50 font-light leading-relaxed max-w-2xl">
                <p>
                  Finatiq je projekt společnosti Harotas s.r.o., za kterou stojí Bartoloměj Rota — marketingový specialista s letitými zkušenostmi v digitálním marketingu pro finanční sektor.
                </p>
                <p>
                  Jako marketér jsem roky řešil kampaně pro finančního poradce a viděl jsem problém na vlastní oči. Leady z Meta Ads přicházely, ale ztrácely se v excelu. Poradce nevěděl který lead přišel z které reklamy. Klienti neměli přehled o svých financích. Komunikace probíhala přes email, telefon, WhatsApp — bez systému.
                </p>
                <p>
                  Proto jsem postavil Finatiq. Ne jako vývojářská firma která nerozumí finančnímu poradenství — ale jako člověk který zná oba světy: marketing i potřeby poradce.
                </p>
                <p>
                  Ano, Finatiq je postavený pomocí moderních AI nástrojů. A to je jeho síla — ne slabina. Díky tomu dokážeme iterovat rychleji, přidávat funkce rychleji a reagovat na vaše potřeby rychleji než tradiční vývojářské firmy. Důležité je že to funguje, je to bezpečné a řeší to vaše problémy.
                </p>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: <Target className="w-5 h-5 text-[#22d3ee]" />, title: "Marketér", desc: "Rozumím jak fungují kampaně, leady a konverze. Vím co poradce potřebuje měřit." },
                  { icon: <Users className="w-5 h-5 text-[#22d3ee]" />, title: "Praktik", desc: "Znám bolesti finančních poradců z první ruky. Finatiq řeší reálné problémy." },
                  { icon: <Zap className="w-5 h-5 text-[#22d3ee]" />, title: "Inovace", desc: "Využíváme nejmodernější technologie. Rychlý vývoj, rychlé nasazení nových funkcí." },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="bg-white/[.02] border border-white/[.06] p-6"
                    style={{ clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))" }}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/15 flex items-center justify-center mb-4">
                      {card.icon}
                    </div>
                    <h4 className="font-[Oswald] text-sm font-bold uppercase tracking-wide text-white mb-2">{card.title}</h4>
                    <p className="font-[DM_Sans] text-xs text-white/40 font-light leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ SEKCE 2: META ADS VÝHODA ═══ */}
      <section className="border-t border-white/[.04] py-20 bg-[#0b1629]">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-px bg-[#22d3ee]" />
              <span className="font-[JetBrains_Mono] text-[.68rem] tracking-[4px] text-[#22d3ee]">02 // MARKETINGOVÁ VÝHODA</span>
            </div>
            <h2 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase mb-3">
              Proč CRM napojené na Meta Ads <span className="text-[#22d3ee]">mění hru</span>
            </h2>
            <p className="font-[DM_Sans] text-white/40 font-light mb-12 max-w-3xl">
              Většina CRM systémů neumí to co Finatiq — propojit reklamu přímo s pipeline a poslat data o konverzích zpět do Meta. To mění ekonomiku vašich kampaní.
            </p>
          </Reveal>

          {/* Flow diagram */}
          <Reveal delay={100}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {[
                { num: "01", icon: <Target className="w-5 h-5" />, title: "Meta reklama", desc: "Spustíte kampaň na Facebooku nebo Instagramu cílenou na vaši cílovou skupinu." },
                { num: "02", icon: <Users className="w-5 h-5" />, title: "Lead v CRM", desc: "Lead se automaticky objeví v pipeline jako nový deal. Žádné kopírování, žádný excel." },
                { num: "03", icon: <Check className="w-5 h-5" />, title: "Konverze", desc: "Poradce uzavře deal. Systém automaticky zaznamená konverzi a propojí ji s původní kampaní." },
                { num: "04", icon: <BarChart3 className="w-5 h-5" />, title: "Zpětná optimalizace", desc: "Data o konverzi se pošlou zpět do Meta přes Conversions API. Algoritmus se naučí kdo skutečně konvertuje." },
              ].map((step, i) => (
                <div key={step.num} className="relative">
                  <div className="bg-[#0f2035] border border-white/[.06] p-6 rounded-lg h-full">
                    <div className="w-10 h-10 bg-[#22d3ee]/10 border border-[#22d3ee]/20 rounded-lg flex items-center justify-center text-[#22d3ee] mb-4 relative">
                      {step.icon}
                      <span className="absolute -top-2 -right-2 font-[JetBrains_Mono] text-[.5rem] bg-[#22d3ee] text-[#060d1a] w-5 h-5 rounded-full flex items-center justify-center font-bold">{step.num}</span>
                    </div>
                    <h4 className="font-[Oswald] text-sm font-bold uppercase tracking-wide text-white mb-2">{step.title}</h4>
                    <p className="font-[DM_Sans] text-xs text-white/40 font-light leading-relaxed">{step.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 z-10">
                      <ArrowRight className="w-5 h-5 text-[#22d3ee]/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Reveal>

          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { stat: "30–50 %", title: "Nižší cena za lead", desc: "Meta optimalizuje na skutečné konverze, ne jen kliknutí. Poradci hlásí snížení ceny za kvalitního leada o 30–50 %." },
              { stat: "0 %", title: "Nulové ztráty leadů", desc: "Každý lead se automaticky zapíše do CRM. Žádný se neztratí v emailu, excelu nebo na papírku." },
              { stat: "ROI", title: "Měřitelný ROI", desc: "Přesně víte kolik stála každá konverze z každé kampaně. Konec hádání, začátek rozhodování na základě dat." },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="bg-white/[.02] border-l-2 border-[#22d3ee] p-6">
                  <span className="font-[Oswald] text-3xl font-bold text-[#22d3ee]">{item.stat}</span>
                  <h4 className="font-[Oswald] text-sm font-bold uppercase tracking-wide text-white mt-2 mb-2">{item.title}</h4>
                  <p className="font-[DM_Sans] text-sm text-white/40 font-light leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SEKCE 3: META ADS NA KLÍČ ═══ */}
      <section className="border-t border-white/[.04] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-px bg-[#22d3ee]" />
              <span className="font-[JetBrains_Mono] text-[.68rem] tracking-[4px] text-[#22d3ee]">03 // META ADS NA KLÍČ</span>
            </div>
            <h2 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase mb-3">
              Nechcete řešit reklamu sami? <span className="text-[#22d3ee]">Uděláme to za vás.</span>
            </h2>
            <p className="font-[DM_Sans] text-white/40 font-light mb-12 max-w-3xl">
              Kompletní správa Meta Ads kampaní pro finanční poradce. Od strategie přes kreativy až po optimalizaci — vše napojené na Finatiq CRM.
            </p>
          </Reveal>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { stat: "50+", label: "Spravovaných kampaní" },
              { stat: "30–50 %", label: "Nižší cena za lead" },
              { stat: "100 %", label: "Napojení na CRM" },
              { stat: "24h", label: "Doba reakce" },
            ].map((m, i) => (
              <Reveal key={m.label} delay={i * 80}>
                <div className="bg-white/[.02] border border-white/[.06] p-5 text-center">
                  <span className="font-[Oswald] text-2xl font-bold text-[#22d3ee]">{m.stat}</span>
                  <p className="font-[DM_Sans] text-xs text-white/40 font-light mt-1">{m.label}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* 4 steps */}
          <Reveal delay={100}>
            <h3 className="font-[Oswald] text-lg font-bold uppercase tracking-wide mb-6">Jak to funguje</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {[
                { num: "01", title: "Úvodní konzultace", desc: "Probereme vaši cílovou skupinu, rozpočet a cíle. Navrhneme strategii na míru." },
                { num: "02", title: "Kreativy a nastavení", desc: "Připravíme reklamní vizuály, videa a texty. Nastavíme kampaně a tracking." },
                { num: "03", title: "Spuštění a optimalizace", desc: "Spustíme kampaně a průběžně optimalizujeme na základě dat z CRM." },
                { num: "04", title: "Reporting a škálování", desc: "Měsíční reporty s přehledem výkonu. Škálujeme co funguje, vypínáme co nefunguje." },
              ].map((step) => (
                <div key={step.num} className="bg-[#0f2035] border border-white/[.06] p-6 rounded-lg">
                  <span className="font-[JetBrains_Mono] text-[.6rem] text-[#22d3ee] tracking-[3px]">{step.num}</span>
                  <h4 className="font-[Oswald] text-sm font-bold uppercase tracking-wide text-white mt-2 mb-2">{step.title}</h4>
                  <p className="font-[DM_Sans] text-xs text-white/40 font-light leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Service list */}
          <Reveal delay={150}>
            <h3 className="font-[Oswald] text-lg font-bold uppercase tracking-wide mb-6">Co je v ceně</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {[
                "Kompletní správa Meta Ads kampaní",
                "Tvorba reklamních videí a grafik",
                "A/B testování kreativ a cílení",
                "Napojení na Finatiq CRM + Conversions API",
                "Měsíční reporting s doporučeními",
                "Průběžná optimalizace rozpočtu",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#22d3ee]" />
                  </div>
                  <span className="font-[DM_Sans] text-sm text-white/50 font-light">{item}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Pricing block */}
          <Reveal delay={200}>
            <div
              className="bg-[#0f2035] border border-[#22d3ee]/20 p-8 max-w-xl"
              style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}
            >
              <h3 className="font-[Oswald] text-lg font-bold uppercase tracking-wide mb-4">Ceník správy Meta Ads</h3>
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
              <p className="font-[DM_Sans] text-xs text-white/30 leading-relaxed mb-6">
                Cena správy závisí na rozsahu kampaní a počtu cílových skupin. Rozpočet na reklamu jde přímo do Meta — nebereme z něj provizi.
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

      {/* ═══ SEKCE 4: BEZPEČNOST ═══ */}
      <section className="border-t border-white/[.04] py-20 bg-[#0b1629]">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-px bg-[#22d3ee]" />
              <span className="font-[JetBrains_Mono] text-[.68rem] tracking-[4px] text-[#22d3ee]">04 // KYBERNETICKÁ BEZPEČNOST</span>
            </div>
            <h2 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase mb-3">
              Vaše data jsou v bezpečí. Garantujeme to <span className="text-[#22d3ee]">smluvně</span>.
            </h2>
            <p className="font-[DM_Sans] text-white/40 font-light mb-12 max-w-3xl">
              Bezpečnost není u nás fráze v marketingu. Je to smluvní závazek. Spolupracujeme s certifikovaným odborníkem na kybernetickou bezpečnost.
            </p>
          </Reveal>

          <div className="flex flex-col items-center mb-12">
            <Reveal>
              <div className="w-24 h-24 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/15 flex items-center justify-center mb-10">
                <Shield className="w-10 h-10 text-[#22d3ee]" />
              </div>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {SECURITY_ITEMS.map((item, i) => (
                <Reveal key={item.title} delay={i * 80}>
                  <div className="bg-[#0f2035] border border-white/[.06] p-6 rounded-lg hover:border-[#22d3ee]/30 hover:shadow-[0_0_30px_rgba(34,211,238,.04)] transition-all h-full">
                    <div className="w-10 h-10 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/15 flex items-center justify-center text-[#22d3ee] mb-4">{item.icon}</div>
                    <h4 className="font-[Oswald] text-sm font-bold uppercase tracking-wide text-white mb-2">{item.title}</h4>
                    <p className="font-[DM_Sans] text-xs text-white/40 font-light leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal>
            <div className="bg-[#22d3ee]/[.06] border border-[#22d3ee]/20 rounded-lg p-8 text-center">
              <p className="font-[DM_Sans] text-white/60 mb-4">
                Chcete vidět bezpečnostní dokumentaci? Rádi vám poskytneme detailní technickou specifikaci zabezpečení.
              </p>
              <Link href="/kontakt" className="inline-flex items-center gap-2 font-[Oswald] uppercase tracking-[3px] text-sm text-[#22d3ee] hover:text-[#22d3ee]/80 transition-colors">
                Kontaktovat nás <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ SEKCE 4: SROVNÁNÍ ═══ */}
      <section className="border-t border-white/[.04] py-20 bg-[#0b1629]">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-px bg-[#22d3ee]" />
              <span className="font-[JetBrains_Mono] text-[.68rem] tracking-[4px] text-[#22d3ee]">05 // FINATIQ VS OSTATNÍ</span>
            </div>
            <h2 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase mb-10">Co nás odlišuje</h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="bg-[#0f2035] border border-white/[.06] overflow-hidden overflow-x-auto" style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}>
              <table className="w-full min-w-[550px]">
                <thead>
                  <tr className="bg-white/[.03]">
                    <th className="text-left font-[Oswald] text-xs uppercase tracking-wider text-white/50 px-6 py-4 w-2/5">Funkce</th>
                    <th className="text-center font-[Oswald] text-xs uppercase tracking-wider text-[#22d3ee] px-4 py-4 bg-[#22d3ee]/[.04]">Finatiq</th>
                    <th className="text-center font-[Oswald] text-xs uppercase tracking-wider text-white/40 px-4 py-4">Excel + email</th>
                    <th className="text-center font-[Oswald] text-xs uppercase tracking-wider text-white/40 px-4 py-4">Zahraniční CRM</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature} className="border-t border-white/[.04] hover:bg-white/[.02] transition-colors">
                      <td className="font-[DM_Sans] text-sm text-white/50 px-6 py-3">{row.feature}</td>
                      <td className="text-center px-4 py-3 bg-[#22d3ee]/[.04]"><CellIcon type={row.fa} /></td>
                      <td className="text-center px-4 py-3"><CellIcon type={row.excel} /></td>
                      <td className="text-center px-4 py-3"><CellIcon type={row.foreign} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ SEKCE 5: PRO KOHO ═══ */}
      <section className="border-t border-white/[.04] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-px bg-[#22d3ee]" />
              <span className="font-[JetBrains_Mono] text-[.68rem] tracking-[4px] text-[#22d3ee]">06 // PRO KOHO JE FINATIQ</span>
            </div>
            <h2 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase mb-10">Ideální pro</h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <Rocket className="w-6 h-6" />, title: "Začínající poradce", desc: "Právě začínáte a potřebujete profesionální nástroje od prvního dne. Žádné excely, žádný chaos. Klienti uvidí profesionální portál a vy budete vypadat jako velká firma.", badge: "Plán Základ od 359 Kč/měs." },
              { icon: <Award className="w-6 h-6" />, title: "Zkušený poradce", desc: "Máte desítky až stovky klientů. Ručně to už nezvládáte. Potřebujete automatizaci, Meta Ads napojení a přehled o pipeline. Finatiq vám ušetří hodiny týdně.", badge: "Plán Profesionál od 599 Kč/měs." },
              { icon: <Building2 className="w-6 h-6" />, title: "Poradenská firma", desc: "Řídíte tým poradců a potřebujete škálovatelné řešení. Přehled o výkonu, fakturace, branding pro každého poradce, API napojení.", badge: "Plán Expert od 899 Kč/měs." },
            ].map((card, i) => (
              <Reveal key={card.title} delay={i * 100}>
                <div
                  className="bg-[#0f2035] border border-white/[.06] p-8 hover:border-[#22d3ee]/20 hover:shadow-[0_0_40px_rgba(34,211,238,.04)] transition-all h-full flex flex-col"
                  style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}
                >
                  <div className="w-12 h-12 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/15 flex items-center justify-center text-[#22d3ee] mb-5">{card.icon}</div>
                  <h3 className="font-[Oswald] text-lg font-bold uppercase tracking-wide text-white mb-3">{card.title}</h3>
                  <p className="font-[DM_Sans] text-sm text-white/40 font-light leading-relaxed flex-1">{card.desc}</p>
                  <span className="inline-block bg-[#22d3ee]/10 text-[#22d3ee] font-[JetBrains_Mono] text-[.7rem] tracking-[2px] px-3 py-1 mt-5 self-start">{card.badge}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="border-t border-white/[.04] py-24 text-center">
        <Reveal>
          <h2 className="font-[Oswald] text-3xl sm:text-4xl font-bold uppercase tracking-tight">
            Přesvědčte se <span className="text-[#22d3ee]">sami</span>
          </h2>
          <p className="font-[DM_Sans] text-white/40 mt-3 font-light">
            14 dní zdarma. Bez kreditní karty. Bez závazků.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <Link
              href="/register"
              className="font-[Oswald] uppercase tracking-[3px] text-sm bg-[#22d3ee] text-[#060d1a] px-8 py-3.5 font-bold hover:bg-[#22d3ee]/90 transition-colors flex items-center gap-2"
              style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))" }}
            >
              Vytvořit účet <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/cenik"
              className="font-[Oswald] uppercase tracking-[3px] text-sm border border-white/20 text-white px-8 py-3.5 font-bold hover:border-[#22d3ee] transition-colors"
              style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))" }}
            >
              Zobrazit ceník
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
