"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import CookieBanner from "@/components/CookieBanner";
import StickyCTA from "@/components/StickyCTA";
import { PlanCard, type PlanData } from "@/components/PlanCard";
import {
  BarChart3,
  Users,
  Sparkles,
  Target,
  Zap,
  Calculator,
  Shield,
  ArrowRight,
  X,
  Menu,
  Check,
  Bell,
  TrendingUp,
  FileText,
  PieChart,
  Clock,
  Send,
  ChevronDown,
  LayoutDashboard,
  Settings,
  Search,
  Home,
} from "lucide-react";

/* ───────────────────────── TYPES ───────────────────────── */

type ServiceModalData = {
  title: string;
  description: string[];
  benefits: string[];
};

/* ───────────────────────── CONSTANTS ───────────────────── */

const SERVICES_MODAL_DATA: Record<string, ServiceModalData> = {
  crm: {
    title: "CRM Pipeline",
    description: [
      "Kanban board navržený speciálně pro finanční poradce. Každý deal sledujete od prvního kontaktu až po uzavření smlouvy.",
      "Pipeline se automaticky aktualizuje v reálném čase. Vidíte hodnotu každé fáze, průměrnou dobu konverze a predikci příjmů na další měsíc.",
      "Díky automatickým akcím vám systém sám přesouvá dealy, odesílá follow-up emaily a upozorňuje na stojící příležitosti.",
    ],
    benefits: [
      "Drag & drop přesouvání dealů mezi fázemi",
      "Automatické akce při změně stavu",
      "Vlastní tagy a pokročilé filtrování",
      "Real-time hodnota pipeline v každé fázi",
      "Hromadné operace s dealy",
      "Export dat do CSV a PDF",
      "Integrace s emailem a kalendářem",
      "Historie všech změn a aktivit",
    ],
  },
  portal: {
    title: "Klientský portál",
    description: [
      "Profesionální portál ve vašem brandu, kde klienti vidí kompletní přehled svých financí, smluv a investic.",
      "Klient se přihlásí a okamžitě vidí svou čistou hodnotu, aktivní smlouvy, nadcházející platby a finanční zdraví. Může nahrávat dokumenty a komunikovat s vámi.",
      "Portál zvyšuje důvěru klientů a šetří váš čas — klienti najdou odpovědi sami, místo aby volali.",
    ],
    benefits: [
      "Dashboard s přehledem čisté hodnoty",
      "Seznam aktivních smluv a plateb",
      "Nahrávání a sdílení dokumentů",
      "Finanční zdraví skóre klienta",
      "Interaktivní finanční kalkulačky",
      "Notifikace o důležitých změnách",
      "Vlastní logo a barvy vašeho brandu",
      "Mobilní přístup bez instalace aplikace",
    ],
  },
  ai: {
    title: "AI asistent",
    description: [
      "Umělá inteligence analyzuje data vašich klientů a automaticky detekuje příležitosti, které byste jinak přehlédli.",
      "Před každou schůzkou dostanete automatické shrnutí klienta — jeho portfolio, nedávné změny, expirující smlouvy a doporučení co nabídnout.",
      "AI se učí z vašich úspěšných dealů a navrhuje optimální postup pro každý typ klienta.",
    ],
    benefits: [
      "Automatická detekce upsell příležitostí",
      "Shrnutí klienta před schůzkou",
      "Predikce pravděpodobnosti konverze",
      "Doporučení dalšího kroku u dealu",
      "Analýza mezer v pojistném krytí",
      "Generování personalizovaných nabídek",
      "Upozornění na rizikové klienty",
      "Benchmark výkonu proti průměru",
    ],
  },
  meta: {
    title: "Meta Ads integrace",
    description: [
      "Leady z Facebooku a Instagramu automaticky v CRM pipeline. Žádné ruční přepisování, žádné ztracené kontakty.",
      "Systém trackuje celou cestu od kliknutí na reklamu přes vyplnění formuláře až po uzavření dealu. Data o konverzích posílá zpět do Meta pro optimalizaci kampaní.",
      "Vidíte přesně, kolik stojí jeden klient z Meta Ads a jaký je ROI každé kampaně.",
    ],
    benefits: [
      "Automatický import leadů z formulářů",
      "Tracking konverzí zpět do Meta",
      "ROI kalkulace na úrovni kampaně",
      "Automatické přiřazení leadu poradci",
      "Lead scoring podle aktivity",
      "A/B test tracking pro landing pages",
      "Retargeting audience synchronizace",
      "Detailní attribution reporting",
    ],
  },
  automations: {
    title: "Automatizace a připomínky",
    description: [
      "Nastavte pravidla jednou a systém za vás hlídá follow-upy, výročí smluv, stojící dealy a desítky dalších situací.",
      "Automatizace šetří hodiny týdně. Systém odesílá emaily, vytváří úkoly, přesouvá dealy a upozorňuje vás přesně ve chvíli, kdy je potřeba jednat.",
      "Každá automatizace má detailní log — vidíte co se spustilo, kdy a s jakým výsledkem.",
    ],
    benefits: [
      "Pravidla typu trigger → akce",
      "Automatické follow-up emaily",
      "Připomínky výročí a expirace smluv",
      "Upozornění na stojící dealy",
      "Automatické přiřazení úkolů",
      "Eskalace při nečinnosti",
      "Plánovač hromadných emailů",
      "Detailní log všech spuštěných akcí",
    ],
  },
  calculators: {
    title: "Finanční nástroje",
    description: [
      "Profesionální kalkulačky přímo v klientském portálu. Klient si sám spočítá hypotéku, spoření nebo důchod a výsledky rovnou vidíte v CRM.",
      "Každý výpočet je uložen v profilu klienta. Vidíte, o co se zajímá, a můžete nabídnout relevantní produkt dřív, než se klient ozve.",
      "Kalkulačky jsou brandované vaším logem a barvami. Fungují jako lead magnet i jako servisní nástroj pro stávající klienty.",
    ],
    benefits: [
      "Hypoteční kalkulačka s grafy",
      "Kalkulačka spoření a investic",
      "Důchodová kalkulačka",
      "Finanční zdraví skóre 0-100",
      "Porovnání scénářů Co kdyby",
      "Export výsledků do PDF",
      "Automatické uložení do profilu klienta",
      "Brandované vaším logem a barvami",
    ],
  },
};

const PLAN_DATA = [
  {
    name: "Základ",
    price: 359,
    maxClients: 50,
    slug: "zaklad",
    desc: "Pro začínající poradce",
    featured: false,
    features: [
      "CRM pipeline s drag & drop",
      "Klientský portál",
      "Správa smluv a plateb",
      "Emailové šablony",
      "Mobilní přístup (PWA)",
    ],
  },
  {
    name: "Profesionál",
    price: 599,
    maxClients: 200,
    slug: "profesional",
    desc: "Nejoblíbenější volba",
    featured: true,
    features: [
      "Vše ze Základu",
      "Meta Ads integrace",
      "OCR dokumentů",
      "Automatizace a připomínky",
      "Pokročilá analytika",
      "Klientský scoring",
      "Finanční kalkulačky",
    ],
  },
  {
    name: "Expert",
    price: 899,
    maxClients: 500,
    slug: "expert",
    desc: "Pro profesionály",
    featured: false,
    features: [
      "Vše z Profesionála",
      "AI asistent",
      "AI chatbot v portálu",
      "Finanční zdraví skóre",
      "Scénáře Co kdyby",
      "Kontrola pojistného krytí",
      "Dokumentový trezor",
      "Vlastní branding",
      "Prioritní podpora",
    ],
  },
];

const FOOTER_NAV = [
  { label: "Služby", href: "/funkce" },
  { label: "Proč my", href: "/proc-my" },
  { label: "Ceník", href: "/cenik" },
  { label: "Fakturace", href: "/fakturace" },
  { label: "Kontakt", href: "/kontakt" },
  { label: "Přihlášení", href: "/login" },
];

/* ───────────────────────── CSS MOCKUP COMPONENTS ──────── */

function MockupCRM() {
  const cols = [
    {
      name: "Nový",
      count: 3,
      color: "#3b82f6",
      cards: [
        { name: "Kovář M.", amount: "480 000" },
        { name: "Dvořáková L.", amount: "1 200 000" },
        { name: "Procházka J.", amount: "320 000" },
      ],
    },
    {
      name: "Schůzka",
      count: 2,
      color: "#a855f7",
      cards: [
        { name: "Svoboda T.", amount: "890 000" },
        { name: "Černá A.", amount: "2 100 000" },
      ],
    },
    {
      name: "Výhra",
      count: 1,
      color: "#22c55e",
      cards: [{ name: "Novotný P.", amount: "650 000" }],
    },
  ];

  return (
    <div className="bg-[#0f2035] border border-white/[.06] rounded-lg p-5 shadow-[0_0_80px_rgba(34,211,238,.06)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 font-mono text-[.6rem] text-white/30 tracking-wider">
          PIPELINE
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {cols.map((col) => (
          <div key={col.name} className="bg-white/[.02] rounded-md p-2.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-mono text-[.6rem] tracking-wider text-white/50 uppercase">
                {col.name}
              </span>
              <span
                className="text-[.55rem] font-mono px-1.5 py-0.5 rounded-full"
                style={{
                  color: col.color,
                  backgroundColor: col.color + "15",
                }}
              >
                {col.count}
              </span>
            </div>
            <div className="space-y-1.5">
              {col.cards.map((card) => (
                <div
                  key={card.name}
                  className="bg-white/[.04] rounded p-2 border-l-2"
                  style={{ borderColor: col.color }}
                >
                  <p className="text-[.6rem] text-white/70 font-medium">
                    {card.name}
                  </p>
                  <p className="text-[.55rem] text-white/35 font-mono">
                    {card.amount} Kč
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupPortal() {
  return (
    <div className="bg-[#0f2035] border border-white/[.06] rounded-lg p-5 shadow-[0_0_80px_rgba(34,211,238,.06)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 font-mono text-[.6rem] text-white/30 tracking-wider">
          PORTÁL
        </span>
      </div>
      <div className="bg-gradient-to-br from-[#22d3ee]/10 to-[#3b82f6]/10 rounded-md p-4 mb-3 border border-[#22d3ee]/10">
        <p className="text-[.6rem] text-white/40 font-mono uppercase tracking-wider mb-1">
          Čistá hodnota
        </p>
        <p className="text-xl font-bold text-white font-[Oswald]">
          1 247 000 <span className="text-sm text-white/40">Kč</span>
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white/[.03] rounded-md p-2.5 text-center">
          <p className="text-[.55rem] text-white/35 font-mono mb-0.5">
            Aktiva
          </p>
          <p className="text-[.7rem] text-green-400 font-bold">1.8M</p>
        </div>
        <div className="bg-white/[.03] rounded-md p-2.5 text-center">
          <p className="text-[.55rem] text-white/35 font-mono mb-0.5">
            Závazky
          </p>
          <p className="text-[.7rem] text-red-400 font-bold">553K</p>
        </div>
        <div className="bg-white/[.03] rounded-md p-2.5 text-center">
          <p className="text-[.55rem] text-white/35 font-mono mb-0.5">
            Platba
          </p>
          <p className="text-[.7rem] text-white/70 font-bold">15.3.</p>
        </div>
      </div>
      <div className="bg-white/[.02] rounded-md p-3">
        <p className="text-[.55rem] text-white/35 font-mono mb-2 uppercase tracking-wider">
          Finanční zdraví
        </p>
        <div className="w-full bg-white/[.06] rounded-full h-2">
          <div
            className="bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] h-2 rounded-full"
            style={{ width: "78%" }}
          />
        </div>
        <p className="text-right text-[.55rem] text-[#22d3ee] font-mono mt-1">
          78 / 100
        </p>
      </div>
    </div>
  );
}

function MockupAI() {
  const alerts = [
    {
      color: "#f59e0b",
      icon: <TrendingUp className="w-3 h-3" />,
      text: "Klient Novák: úrok 8.5% — nabídněte refinancování",
    },
    {
      color: "#ef4444",
      icon: <Clock className="w-3 h-3" />,
      text: "Klientce Dvořákové končí pojistka za 30 dní",
    },
    {
      color: "#3b82f6",
      icon: <Users className="w-3 h-3" />,
      text: "Nový lead z Meta Ads: Jan Procházka",
    },
  ];

  return (
    <div className="bg-[#0f2035] border border-white/[.06] rounded-lg p-5 shadow-[0_0_80px_rgba(34,211,238,.06)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 font-mono text-[.6rem] text-white/30 tracking-wider">
          AI ASISTENT
        </span>
      </div>
      <div className="space-y-2.5">
        {alerts.map((a, i) => (
          <div
            key={i}
            className="bg-white/[.03] rounded-md p-3 border-l-2 flex items-start gap-2.5"
            style={{ borderColor: a.color }}
          >
            <div
              className="mt-0.5 shrink-0"
              style={{ color: a.color }}
            >
              {a.icon}
            </div>
            <p className="text-[.65rem] text-white/60 leading-relaxed">
              {a.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupMeta() {
  const steps = [
    { label: "Meta reklama", icon: <Target className="w-3.5 h-3.5" /> },
    { label: "Lead v CRM", icon: <Users className="w-3.5 h-3.5" /> },
    { label: "Konverze", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { label: "Data do Meta", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-[#0f2035] border border-white/[.06] rounded-lg p-5 shadow-[0_0_80px_rgba(34,211,238,.06)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 font-mono text-[.6rem] text-white/30 tracking-wider">
          META ADS FLOW
        </span>
      </div>
      <div className="flex items-center justify-between gap-1">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div className="bg-white/[.04] border border-white/[.08] rounded-md p-3 flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div className="text-[#22d3ee]">{s.icon}</div>
              <p className="text-[.5rem] text-white/50 font-mono text-center leading-tight whitespace-nowrap">
                {s.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-3 h-3 text-white/20 shrink-0" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-white/[.03] rounded p-2 text-center">
          <p className="text-[.5rem] text-white/30 font-mono">CPL</p>
          <p className="text-[.7rem] text-[#22d3ee] font-bold">127 Kč</p>
        </div>
        <div className="bg-white/[.03] rounded p-2 text-center">
          <p className="text-[.5rem] text-white/30 font-mono">Leady</p>
          <p className="text-[.7rem] text-green-400 font-bold">48</p>
        </div>
        <div className="bg-white/[.03] rounded p-2 text-center">
          <p className="text-[.5rem] text-white/30 font-mono">ROAS</p>
          <p className="text-[.7rem] text-purple-400 font-bold">4.2x</p>
        </div>
      </div>
    </div>
  );
}

function MockupAutomation() {
  const rules = [
    {
      trigger: "Deal stojí 48h",
      action: "Upozornění poradci",
      triggerIcon: <Clock className="w-3 h-3" />,
      actionIcon: <Bell className="w-3 h-3" />,
    },
    {
      trigger: "Nový lead",
      action: "Uvítací email",
      triggerIcon: <Users className="w-3 h-3" />,
      actionIcon: <Send className="w-3 h-3" />,
    },
    {
      trigger: "Výročí smlouvy",
      action: "Připomínka",
      triggerIcon: <FileText className="w-3 h-3" />,
      actionIcon: <Bell className="w-3 h-3" />,
    },
  ];

  return (
    <div className="bg-[#0f2035] border border-white/[.06] rounded-lg p-5 shadow-[0_0_80px_rgba(34,211,238,.06)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 font-mono text-[.6rem] text-white/30 tracking-wider">
          AUTOMATIZACE
        </span>
      </div>
      <div className="space-y-2.5">
        {rules.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-white/[.02] rounded-md p-3"
          >
            <div className="flex items-center gap-1.5 bg-white/[.04] rounded px-2 py-1.5 flex-1 min-w-0">
              <span className="text-amber-400 shrink-0">{r.triggerIcon}</span>
              <span className="text-[.6rem] text-white/50 font-mono truncate">
                {r.trigger}
              </span>
            </div>
            <ArrowRight className="w-3 h-3 text-[#22d3ee] shrink-0" />
            <div className="flex items-center gap-1.5 bg-white/[.04] rounded px-2 py-1.5 flex-1 min-w-0">
              <span className="text-[#22d3ee] shrink-0">{r.actionIcon}</span>
              <span className="text-[.6rem] text-white/50 font-mono truncate">
                {r.action}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupCalc() {
  return (
    <div className="bg-[#0f2035] border border-white/[.06] rounded-lg p-5 shadow-[0_0_80px_rgba(34,211,238,.06)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 font-mono text-[.6rem] text-white/30 tracking-wider">
          KALKULAČKA
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="bg-white/[.03] rounded-md p-3">
          <p className="text-[.55rem] text-white/30 font-mono mb-1">
            Výše úvěru
          </p>
          <p className="text-sm text-white/80 font-medium">3 000 000 Kč</p>
        </div>
        <div className="bg-white/[.03] rounded-md p-3">
          <p className="text-[.55rem] text-white/30 font-mono mb-1">
            Úroková sazba
          </p>
          <p className="text-sm text-white/80 font-medium">4.5 %</p>
        </div>
        <div className="bg-gradient-to-r from-[#22d3ee]/10 to-[#3b82f6]/10 border border-[#22d3ee]/15 rounded-md p-3">
          <p className="text-[.55rem] text-[#22d3ee] font-mono mb-1">
            Měsíční splátka
          </p>
          <p className="text-lg text-white font-bold font-[Oswald]">
            15 200 Kč
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-end gap-1 h-12">
        {[35, 55, 45, 70, 60, 80, 65, 75, 90, 85, 95, 88].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-[#22d3ee]/40 to-[#3b82f6]/40"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── HERO CRM MOCKUP ────────────── */

function HeroCRMMockup() {
  return (
    <div
      className="bg-[#0f2035] border border-white/[.08] p-5 shadow-[0_0_80px_rgba(34,211,238,.06)]"
      style={{
        clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)",
      }}
    >
      {/* Mini sidebar + main */}
      <div className="flex gap-3">
        {/* Sidebar */}
        <div className="flex flex-col gap-3 py-2">
          <Home className="w-3.5 h-3.5 text-[#22d3ee]" />
          <LayoutDashboard className="w-3.5 h-3.5 text-white/30" />
          <Users className="w-3.5 h-3.5 text-white/30" />
          <FileText className="w-3.5 h-3.5 text-white/30" />
          <Settings className="w-3.5 h-3.5 text-white/30" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-blue-500/10 border border-blue-500/15 rounded-md p-2.5">
              <p className="text-[.5rem] text-blue-400/60 font-mono">
                Pipeline
              </p>
              <p className="text-sm font-bold text-blue-400 font-[Oswald]">
                2.4M Kč
              </p>
            </div>
            <div className="bg-green-500/10 border border-green-500/15 rounded-md p-2.5">
              <p className="text-[.5rem] text-green-400/60 font-mono">
                Klienti
              </p>
              <p className="text-sm font-bold text-green-400 font-[Oswald]">
                156
              </p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/15 rounded-md p-2.5">
              <p className="text-[.5rem] text-purple-400/60 font-mono">
                Konverze
              </p>
              <p className="text-sm font-bold text-purple-400 font-[Oswald]">
                67%
              </p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white/[.02] rounded-md p-3">
            <p className="text-[.5rem] text-white/25 font-mono mb-2 tracking-wider">
              MĚSÍČNÍ PŘEHLED
            </p>
            <div className="flex items-end gap-1 h-16">
              {[40, 65, 50, 80, 60, 90, 70, 85, 95, 75, 88, 92].map(
                (h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-[#22d3ee]/50 to-[#3b82f6]/50"
                    style={{ height: `${h}%` }}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── SCROLL REVEAL HOOK ─────────── */

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
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
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const { ref, visible } = useReveal();
  const transforms = {
    up: "translateY(40px)",
    left: "translateX(-40px)",
    right: "translateX(40px)",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate(0)" : transforms[direction],
        transition: `opacity 700ms ${delay}ms, transform 700ms ${delay}ms`,
        transitionTimingFunction: "cubic-bezier(.16,1,.3,1)",
      }}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── SERVICE MODAL ───────────────── */

function ServiceModal({
  serviceKey,
  onClose,
}: {
  serviceKey: string;
  onClose: () => void;
}) {
  const data = SERVICES_MODAL_DATA[serviceKey];
  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#0f2035] border border-white/[.08] max-w-3xl w-full max-h-[85vh] overflow-y-auto p-8 sm:p-10 relative"
        style={{
          clipPath:
            "polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 0 100%)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white mb-6">
          {data.title}
        </h2>

        <div className="space-y-4 mb-8">
          {data.description.map((p, i) => (
            <p
              key={i}
              className="font-[DM_Sans] text-white/50 leading-relaxed font-light"
            >
              {p}
            </p>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8">
          {data.benefits.map((b, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 bg-white/[.03] rounded-md px-4 py-3"
            >
              <Check className="w-4 h-4 text-[#22d3ee] shrink-0 mt-0.5" />
              <span className="font-[DM_Sans] text-sm text-white/60">
                {b}
              </span>
            </div>
          ))}
        </div>

        <Link
          href="/register"
          className="inline-flex items-center gap-2 bg-[#22d3ee] text-[#060d1a] font-[Oswald] uppercase tracking-[3px] text-sm px-8 py-3.5 font-bold hover:bg-[#22d3ee]/90 transition-colors"
          style={{
            clipPath:
              "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
          }}
        >
          Vyzkoušet zdarma
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

/* ───────────────────────── ROI CALCULATOR ────────────── */

function ROICalculator() {
  const [clients, setClients] = useState(30);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);

  const hourlyRate = 500;
  const monthlyHoursSaved = Math.round(hoursPerWeek * 0.6 * 4);
  const monthlySaving = monthlyHoursSaved * hourlyRate;

  return (
    <section className="bg-[#0b1629] py-24 relative border-t border-white/[.04]">
      <div className="max-w-4xl mx-auto px-6">
        <Reveal>
          <h2 className="font-[Oswald] text-4xl sm:text-5xl font-bold uppercase tracking-tight text-center mb-4">
            Kolik vám Finatiq <span className="text-[#22d3ee]">ušetří?</span>
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="font-[DM_Sans] text-white/40 text-center mb-14 font-light max-w-lg mx-auto">
            Nastavte si parametry a uvidíte reálnou úsporu.
          </p>
        </Reveal>

        <Reveal delay={200}>
          <div className="bg-white/[.02] border border-white/[.06] p-8 sm:p-10" style={{ clipPath: "polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))" }}>
            {/* Slider: počet klientů */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="font-[DM_Sans] text-sm text-white/60">Počet klientů</span>
                <span className="font-[JetBrains_Mono] text-sm text-[#22d3ee]">{clients}</span>
              </div>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={clients}
                onChange={(e) => setClients(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22d3ee] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                <span className="font-[DM_Sans] text-[.65rem] text-white/20">5</span>
                <span className="font-[DM_Sans] text-[.65rem] text-white/20">200</span>
              </div>
            </div>

            {/* Slider: hodiny admin týdně */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-3">
                <span className="font-[DM_Sans] text-sm text-white/60">Hodin administrativy týdně</span>
                <span className="font-[JetBrains_Mono] text-sm text-[#22d3ee]">{hoursPerWeek}h</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#22d3ee] [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between mt-1">
                <span className="font-[DM_Sans] text-[.65rem] text-white/20">2h</span>
                <span className="font-[DM_Sans] text-[.65rem] text-white/20">20h</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="mb-8 space-y-1.5">
              <p className="font-[DM_Sans] text-sm text-white/40">
                {hoursPerWeek} h/týden × 4 týdny = {hoursPerWeek * 4} h měsíčně
              </p>
              <p className="font-[DM_Sans] text-sm text-white/60">
                Finatiq ušetří 60 % → {Math.round(hoursPerWeek * 4 * 0.6)} h měsíčně
              </p>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white/[.03] border border-white/[.06] p-4 text-center">
                <p className="font-[JetBrains_Mono] text-[.6rem] tracking-[3px] text-white/30 uppercase mb-1">Úspora času</p>
                <p className="font-[Oswald] text-2xl font-bold text-[#22d3ee]">{monthlyHoursSaved}h / měsíc</p>
              </div>
              <div className="bg-white/[.03] border border-white/[.06] p-4 text-center">
                <p className="font-[JetBrains_Mono] text-[.6rem] tracking-[3px] text-white/30 uppercase mb-1">Finanční úspora</p>
                <p className="font-[Oswald] text-2xl font-bold text-white">{monthlySaving.toLocaleString("cs-CZ")} Kč / měsíc</p>
              </div>
              <div className="bg-[#22d3ee]/[.06] border border-[#22d3ee]/20 p-4 text-center">
                <p className="font-[JetBrains_Mono] text-[.6rem] tracking-[3px] text-white/30 uppercase mb-1">Cena Finatiq</p>
                <p className="font-[Oswald] text-2xl font-bold text-[#22d3ee]">od 0 Kč</p>
                <p className="font-[DM_Sans] text-[.65rem] text-white/25 mt-0.5">Free tier navždy</p>
              </div>
            </div>

            <p className="font-[DM_Sans] text-xs text-white/20 text-center mt-6">
              * Kalkulace předpokládá 60 % úsporu administrativního času při sazbě 500 Kč/h.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ───────────────────────── MAIN PAGE ──────────────────── */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  /* Fetch plans from API */
  useEffect(() => {
    fetch("/api/public/plans")
      .then((r) => r.json())
      .then((data) => { setPlans(data); setPlansLoading(false); })
      .catch(() => setPlansLoading(false));
  }, []);

  /* Scroll listener */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Body overflow lock for modal */
  useEffect(() => {
    if (activeModal || mobileMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeModal, mobileMenu]);

  /* Escape key handler */
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeModal) setActiveModal(null);
        if (mobileMenu) setMobileMenu(false);
      }
    },
    [activeModal, mobileMenu],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  /* Services data */
  const services = [
    {
      key: "crm",
      num: "01",
      label: "CRM PIPELINE",
      heading: "Každý deal pod kontrolou",
      desc: "Kanban board navržený pro finanční poradce. Sledujte dealy od prvního kontaktu po podpis smlouvy. Automatické akce, real-time hodnota pipeline a predikce příjmů.",
      benefits: [
        "Drag & drop správa dealů",
        "Automatické akce při změně stavu",
        "Tagy a pokročilé filtry",
        "Real-time hodnoty pipeline",
      ],
      mockup: <MockupCRM />,
    },
    {
      key: "portal",
      num: "02",
      label: "KLIENTSKÝ PORTÁL",
      heading: "Profesionální portál ve vašem brandu",
      desc: "Klient se přihlásí a vidí své finance, smlouvy, investice a platby. Nahrává dokumenty a komunikuje s vámi. Zvyšuje důvěru a šetří váš čas.",
      benefits: [
        "Dashboard čisté hodnoty",
        "Přehled smluv a plateb",
        "Sdílení dokumentů",
        "Finanční zdraví skóre",
      ],
      mockup: <MockupPortal />,
    },
    {
      key: "ai",
      num: "03",
      label: "AI ASISTENT",
      heading: "Příležitosti, které byste přehlédli",
      desc: "AI analyzuje data klientů a detekuje příležitosti. Před schůzkou dostanete shrnutí — portfolio, změny, expirující smlouvy a doporučení.",
      benefits: [
        "Detekce upsell příležitostí",
        "Shrnutí klienta před schůzkou",
        "Predikce konverze",
        "Generování nabídek",
      ],
      mockup: <MockupAI />,
    },
    {
      key: "meta",
      num: "04",
      label: "META ADS INTEGRACE",
      heading: "Z reklamy rovnou do pipeline",
      desc: "Leady z Facebooku a Instagramu automaticky v CRM. Tracking konverzí zpět do Meta pro optimalizaci. Přesný ROI každé kampaně.",
      benefits: [
        "Automatický import leadů",
        "Tracking konverzí do Meta",
        "ROI na úrovni kampaně",
        "Lead scoring",
      ],
      mockup: <MockupMeta />,
    },
    {
      key: "automations",
      num: "05",
      label: "AUTOMATIZACE",
      heading: "Systém pracuje za vás",
      desc: "Nastavte pravidla a systém hlídá follow-upy, výročí smluv, stojící dealy. Odesílá emaily, vytváří úkoly a upozorňuje přesně ve správný čas.",
      benefits: [
        "Pravidla trigger → akce",
        "Automatické follow-upy",
        "Připomínky výročí smluv",
        "Eskalace při nečinnosti",
      ],
      mockup: <MockupAutomation />,
    },
    {
      key: "calculators",
      num: "06",
      label: "FINANČNÍ NÁSTROJE",
      heading: "Kalkulačky přímo v portálu",
      desc: "Klient si spočítá hypotéku, spoření nebo důchod. Výsledky vidíte v CRM. Kalkulačky jsou brandované vaším logem a fungují jako lead magnet.",
      benefits: [
        "Hypoteční kalkulačka",
        "Kalkulačka spoření",
        "Důchodová kalkulačka",
        "Finanční zdraví skóre",
      ],
      mockup: <MockupCalc />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#060d1a] text-[#f0f4f8] overflow-x-hidden -mt-20 pt-20">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Finatiq",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: "Komplexní CRM a klientský portál pro finanční poradce. Správa klientů, pipeline, automatizace a AI doporučení.",
            url: "https://www.finatiq.cz",
            offers: [
              { "@type": "Offer", name: "Start", price: "0", priceCurrency: "CZK", description: "Zdarma — základní funkce" },
              { "@type": "Offer", name: "Professional", price: "990", priceCurrency: "CZK", description: "Pro profesionální poradce" },
              { "@type": "Offer", name: "Business", price: "1990", priceCurrency: "CZK", description: "Pro velké týmy a firmy" },
            ],
          }),
        }}
      />
      {/* ── Fonts ── */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap");

        /* Noise overlay */
        body::before {
          content: "";
          position: fixed;
          inset: 0;
          z-index: 40;
          pointer-events: none;
          opacity: 0.02;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px 256px;
        }

        /* Grid pattern */
        .grid-pattern {
          background-image: linear-gradient(
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.03) 1px,
              transparent 1px
            );
          background-size: 48px 48px;
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#060d1a]/95 backdrop-blur-xl border-b border-white/[.04]"
            : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-[Oswald] text-lg font-bold uppercase tracking-[4px] text-white"
          >
            FINATIQ
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="#sluzby"
              className="font-[Oswald] text-xs uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee] transition-colors"
            >
              Služby
            </a>
            <Link
              href="/proc-my"
              className="font-[Oswald] text-xs uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee] transition-colors"
            >
              Proč my
            </Link>
            <a
              href="#cenik"
              className="font-[Oswald] text-xs uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee] transition-colors"
            >
              Ceník
            </a>
            <Link
              href="/kontakt"
              className="font-[Oswald] text-xs uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee] transition-colors"
            >
              Kontakt
            </Link>
            <Link
              href="/fakturace"
              className="font-[Oswald] text-xs uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee] transition-colors"
            >
              Fakturace
            </Link>
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="font-[Oswald] text-xs uppercase tracking-[3px] text-white/60 hover:text-white transition-colors"
            >
              Přihlášení
            </Link>
            <Link
              href="/register"
              className="font-[Oswald] text-xs uppercase tracking-[3px] bg-[#22d3ee] text-[#060d1a] px-5 py-2 font-bold hover:bg-[#22d3ee]/90 transition-colors"
              style={{
                clipPath:
                  "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
              }}
            >
              Začít zdarma
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white/60"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-[#060d1a]/98 backdrop-blur-xl border-t border-white/[.04] px-6 py-6 space-y-4">
            <a
              href="#sluzby"
              onClick={() => setMobileMenu(false)}
              className="block font-[Oswald] text-sm uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee]"
            >
              Služby
            </a>
            <Link
              href="/proc-my"
              onClick={() => setMobileMenu(false)}
              className="block font-[Oswald] text-sm uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee]"
            >
              Proč my
            </Link>
            <a
              href="#cenik"
              onClick={() => setMobileMenu(false)}
              className="block font-[Oswald] text-sm uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee]"
            >
              Ceník
            </a>
            <Link
              href="/kontakt"
              onClick={() => setMobileMenu(false)}
              className="block font-[Oswald] text-sm uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee]"
            >
              Kontakt
            </Link>
            <Link
              href="/fakturace"
              onClick={() => setMobileMenu(false)}
              className="block font-[Oswald] text-sm uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee]"
            >
              Fakturace
            </Link>
            <div className="pt-4 border-t border-white/[.06] flex flex-col gap-3">
              <Link
                href="/login"
                className="font-[Oswald] text-sm uppercase tracking-[3px] text-white/60"
              >
                Přihlášení
              </Link>
              <Link
                href="/register"
                className="font-[Oswald] text-sm uppercase tracking-[3px] bg-[#22d3ee] text-[#060d1a] px-5 py-2.5 font-bold text-center"
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
                }}
              >
                Začít zdarma
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="min-h-screen flex items-center relative grid-pattern">
        {/* Gradient blobs */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-500/[.12] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-indigo-500/[.08] rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8 items-center py-20 lg:py-0">
          {/* Left — text (60%) */}
          <div className="lg:col-span-3">
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-2 border border-[#22d3ee]/20 rounded-full px-4 py-1.5 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22d3ee] animate-pulse" />
                <span className="font-[JetBrains_Mono] text-[.66rem] tracking-[3px] text-white/50 uppercase">
                  Finanční poradenství nové generace
                </span>
              </div>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="font-[Oswald] font-bold text-[clamp(4rem,10vw,8rem)] uppercase leading-[.9] tracking-tight">
                Spravujte
                <br />
                <span className="text-[#22d3ee] relative inline-block">
                  Finance
                  <span className="absolute -bottom-2 left-0 w-full h-2 bg-[#22d3ee]/20 -skew-x-12" />
                </span>
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="font-[DM_Sans] text-lg text-white/50 font-light mt-6 max-w-lg">
                CRM a klientský portál pro finančního poradce.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="flex flex-wrap gap-4 mt-8">
                <Link
                  href="/register"
                  className="font-[Oswald] uppercase tracking-[3px] text-sm bg-[#22d3ee] text-[#060d1a] px-8 py-3.5 font-bold hover:bg-[#22d3ee]/90 transition-colors flex items-center gap-2"
                  style={{
                    clipPath:
                      "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                  }}
                >
                  Vyzkoušet zdarma
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#sluzby"
                  className="font-[Oswald] uppercase tracking-[3px] text-sm border border-white/20 text-white px-8 py-3.5 font-bold hover:border-[#22d3ee] transition-colors"
                  style={{
                    clipPath:
                      "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                  }}
                >
                  Prozkoumat služby
                </a>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <p className="font-[DM_Sans] text-[.75rem] text-white/25 mt-4">
                Bez závazků · Zrušte kdykoliv
              </p>
              <Link
                href="/proc-my#meta-ads"
                className="inline-flex items-center gap-2 mt-4 border border-[#22d3ee]/20 rounded-full px-4 py-1.5 hover:border-[#22d3ee]/40 transition-colors group"
              >
                <Target className="w-3.5 h-3.5 text-[#22d3ee]" />
                <span className="font-[JetBrains_Mono] text-[.62rem] tracking-[2px] text-white/40 uppercase group-hover:text-white/60 transition-colors">
                  Meta Ads na klíč od 1 500 Kč/měs.
                </span>
              </Link>
            </Reveal>
          </div>

          {/* Right — CRM mockup (40%) */}
          <Reveal delay={400} direction="right" className="lg:col-span-2">
            <HeroCRMMockup />
          </Reveal>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="w-px h-8 bg-gradient-to-b from-transparent to-white/20 animate-pulse" />
          <span className="font-[JetBrains_Mono] text-[.55rem] tracking-[4px] text-white/20 uppercase">
            scroll
          </span>
        </div>
      </section>

      {/* ── SLUŽBY ── */}
      <section id="sluzby" className="relative grid-pattern">
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-8">
          <Reveal>
            <h2 className="font-[Oswald] text-4xl sm:text-5xl font-bold uppercase tracking-tight text-center">
              Co vám{" "}
              <span className="text-[#22d3ee]">přinese</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="font-[DM_Sans] text-white/40 text-center mt-4 max-w-lg mx-auto font-light">
              Kompletní sada nástrojů navržená speciálně pro finanční poradce.
            </p>
          </Reveal>
        </div>

        {services.map((s, i) => {
          const isEven = i % 2 === 1;
          const direction = isEven ? "right" : "left";

          return (
            <div
              key={s.key}
              className="border-t border-white/[.04] py-20"
            >
              <div className="max-w-7xl mx-auto px-6">
                <div
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                    isEven ? "lg:[direction:rtl]" : ""
                  }`}
                >
                  {/* Text side */}
                  <Reveal
                    direction={isEven ? "right" : "left"}
                    className={isEven ? "lg:[direction:ltr]" : ""}
                  >
                    <div>
                      <span className="font-[Oswald] text-[4rem] font-bold leading-none [-webkit-text-stroke:1px_rgba(255,255,255,.1)] text-transparent select-none">
                        {s.num}
                      </span>
                      <div className="flex items-center gap-2 mt-2 mb-3">
                        <span className="w-4 h-px bg-[#22d3ee]" />
                        <span className="font-[JetBrains_Mono] text-[.68rem] tracking-[4px] text-[#22d3ee]">
                          {s.label}
                        </span>
                      </div>
                      <h3 className="font-[Oswald] text-2xl sm:text-3xl font-bold uppercase mb-4">
                        {s.heading}
                      </h3>
                      <p className="font-[DM_Sans] text-white/50 font-light leading-relaxed mb-6">
                        {s.desc}
                      </p>
                      <div className="space-y-2.5 mb-6">
                        {s.benefits.map((b) => (
                          <div
                            key={b}
                            className="bg-white/[.03] border-l-2 border-[#22d3ee] px-4 py-3 flex items-center gap-2.5"
                          >
                            <Check className="w-3.5 h-3.5 text-[#22d3ee] shrink-0" />
                            <span className="font-[DM_Sans] text-sm text-white/60">
                              {b}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setActiveModal(s.key)}
                        className="font-[JetBrains_Mono] text-[.75rem] tracking-wider text-[#22d3ee] hover:text-[#22d3ee]/80 transition-colors flex items-center gap-2"
                      >
                        Zjistit více
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Reveal>

                  {/* Mockup side */}
                  <Reveal
                    direction={isEven ? "left" : "right"}
                    delay={150}
                    className={isEven ? "lg:[direction:ltr]" : ""}
                  >
                    {s.mockup}
                  </Reveal>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── ROI KALKULAČKA ── */}
      <ROICalculator />

      {/* ── PŘED vs PO ── */}
      <section className="bg-[#060d1a] py-24 relative">
        <div className="max-w-5xl mx-auto px-6">
          <Reveal>
            <h2 className="font-[Oswald] text-4xl sm:text-5xl font-bold uppercase tracking-tight text-center mb-4">
              Před vs <span className="text-[#22d3ee]">po Finatiq</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="font-[DM_Sans] text-white/40 text-center mb-16 font-light max-w-lg mx-auto">
              Porovnejte, jak vypadá práce finančního poradce bez a s Finatiq.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BEZ Finatiq */}
            <Reveal delay={100}>
              <div className="bg-white/[.02] border border-white/[.06] p-8" style={{ clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))" }}>
                <h3 className="font-[Oswald] text-lg uppercase tracking-[3px] text-red-400/80 mb-6 flex items-center gap-2">
                  <X className="w-5 h-5" /> Bez Finatiq
                </h3>
                <ul className="space-y-4">
                  {[
                    "Klienti v Excelu, kontakty v telefonu",
                    "Ruční follow-upy, na které zapomenete",
                    "Žádný klientský portál — vše přes email",
                    "Faktury ručně v PDF nebo Wordu",
                    "Žádné přehledy výkonnosti",
                    "Dokumenty roztroušené po discích",
                    "Marketing naslepo bez dat",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <X className="w-4 h-4 mt-0.5 text-red-400/60 shrink-0" />
                      <span className="font-[DM_Sans] text-sm text-white/50">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* S Finatiq */}
            <Reveal delay={200}>
              <div className="bg-[#22d3ee]/[.04] border border-[#22d3ee]/20 p-8" style={{ clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))" }}>
                <h3 className="font-[Oswald] text-lg uppercase tracking-[3px] text-[#22d3ee] mb-6 flex items-center gap-2">
                  <Check className="w-5 h-5" /> S Finatiq
                </h3>
                <ul className="space-y-4">
                  {[
                    "CRM pipeline — vše na jednom místě",
                    "Automatické remindery a follow-upy",
                    "Klientský portál s vlastním brandingem",
                    "Automatická fakturace na klik",
                    "Real-time dashboard s KPI metrikami",
                    "Centrální úložiště dokumentů",
                    "Meta Ads integrace s měřitelnými výsledky",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Check className="w-4 h-4 mt-0.5 text-[#22d3ee] shrink-0" />
                      <span className="font-[DM_Sans] text-sm text-white/60">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── CENÍK ── */}
      <section id="cenik" className="bg-[#0b1629] py-24 relative grid-pattern">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal>
            <h2 className="font-[Oswald] text-4xl sm:text-5xl font-bold uppercase tracking-tight text-center">
              Investice do vašeho{" "}
              <span className="text-[#22d3ee]">podnikání</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="font-[DM_Sans] text-white/40 text-center mt-4 mb-16 font-light">
              Transparentní ceny. Bez závazků. Zrušte kdykoliv.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {plansLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/[.06] bg-white/[.02] p-8 animate-pulse h-96" />
              ))
            ) : plans.length > 0 ? (
              plans.map((plan, i) => (
                <PlanCard key={plan.id || i} plan={plan} featured={i === 1} />
              ))
            ) : (
              PLAN_DATA.map((plan, i) => (
                <PlanCard
                  key={plan.slug}
                  plan={{
                    name: plan.name,
                    price_monthly: plan.price,
                    max_clients: plan.maxClients,
                    features: {},
                    description: plan.desc,
                    badge: plan.featured ? "Nejoblíbenější" : null,
                  }}
                  featured={plan.featured}
                />
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
              Průměrný finanční poradce ušetří s Finatiq 60 % administrativního času.
              Při sazbě 500 Kč/h se investice vrátí už za pár dní.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section
        className="relative py-20 bg-[#22d3ee] overflow-hidden"
        style={{
          clipPath:
            "polygon(0 24px, 100% 0, 100% calc(100% - 24px), 0 100%)",
        }}
      >
        {/* Striped overlay */}
        <div
          className="absolute inset-0 opacity-[.06] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.3) 10px, rgba(0,0,0,.3) 11px)",
          }}
        />
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <h2 className="font-[Oswald] text-3xl sm:text-4xl font-bold uppercase tracking-tight text-[#060d1a]">
            Připraveni na změnu?
          </h2>
          <p className="font-[DM_Sans] text-[#060d1a]/60 mt-3 text-lg font-light">
            Začněte spravovat finance svých klientů profesionálně. Meta Ads na klíč od 1 500 Kč/měs.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 mt-8 bg-[#060d1a] text-white font-[Oswald] uppercase tracking-[3px] text-sm px-10 py-4 font-bold hover:bg-[#060d1a]/90 transition-colors"
            style={{
              clipPath:
                "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
            }}
          >
            Začít zdarma
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0b1629] border-t border-white/[.04] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link
                href="/"
                className="font-[Oswald] text-lg font-bold uppercase tracking-[4px] text-white"
              >
                FINATIQ
              </Link>
              <p className="font-[DM_Sans] text-sm text-white/30 mt-4 leading-relaxed font-light">
                Kompletní platforma pro finanční poradce. CRM, klientský portál,
                automatizace a AI nástroje na jednom místě.
              </p>
              <div className="mt-4 space-y-1 font-[DM_Sans] text-xs text-white/20">
                <p>Harotas s.r.o. · IČO 21402027 · DIČ CZ21402027</p>
                <p>Školská 689/20, Nové Město, 110 00 Praha 1</p>
              </div>
            </div>

            {/* Navigace */}
            <div>
              <h4 className="font-[JetBrains_Mono] text-[.65rem] tracking-[4px] text-white/40 uppercase mb-4">
                Navigace
              </h4>
              <ul className="space-y-2.5">
                {FOOTER_NAV.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="font-[DM_Sans] text-sm text-white/40 hover:text-[#22d3ee] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kontakt */}
            <div>
              <h4 className="font-[JetBrains_Mono] text-[.65rem] tracking-[4px] text-white/40 uppercase mb-4">
                Kontakt
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="mailto:bartolomej@arbey.cz"
                    className="font-[DM_Sans] text-sm text-white/40 hover:text-[#22d3ee] transition-colors"
                  >
                    bartolomej@arbey.cz
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+420725932729"
                    className="font-[DM_Sans] text-sm text-white/40 hover:text-[#22d3ee] transition-colors"
                  >
                    +420 725 932 729
                  </a>
                </li>
                <li>
                  <span className="font-[DM_Sans] text-sm text-white/40">
                    Bartoloměj Rota, jednatel
                  </span>
                </li>
              </ul>
            </div>

            {/* Právní */}
            <div>
              <h4 className="font-[JetBrains_Mono] text-[.65rem] tracking-[4px] text-white/40 uppercase mb-4">
                Právní
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/podminky" className="font-[DM_Sans] text-sm text-white/40 hover:text-[#22d3ee] transition-colors">
                    Obchodní podmínky
                  </Link>
                </li>
                <li>
                  <Link href="/gdpr" className="font-[DM_Sans] text-sm text-white/40 hover:text-[#22d3ee] transition-colors">
                    Ochrana údajů
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[.04] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-[DM_Sans] text-xs text-white/20">
              © 2025 Harotas s.r.o. Všechna práva vyhrazena.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/gdpr"
                className="font-[DM_Sans] text-xs text-white/20 hover:text-white/40 transition-colors"
              >
                Ochrana osobních údajů
              </Link>
              <Link
                href="/podminky"
                className="font-[DM_Sans] text-xs text-white/20 hover:text-white/40 transition-colors"
              >
                Podmínky užívání
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── SERVICE MODAL ── */}
      {activeModal && (
        <ServiceModal
          serviceKey={activeModal}
          onClose={() => setActiveModal(null)}
        />
      )}
      <StickyCTA />
      <CookieBanner />
    </div>
  );
}
