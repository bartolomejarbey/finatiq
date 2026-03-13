"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import CookieBanner from "@/components/CookieBanner";
import StickyCTA from "@/components/StickyCTA";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenu]);

  const links = [
    { href: "/funkce", label: "Služby" },
    { href: "/proc-my", label: "Proč my" },
    { href: "/cenik", label: "Ceník" },
    { href: "/fakturace", label: "Fakturace" },
    { href: "/kontakt", label: "Kontakt" },
  ];

  return (
    <div className="min-h-screen bg-[#060d1a] text-[#f0f4f8]">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap");

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

        .grid-pattern {
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 48px 48px;
        }
      `}</style>

      {/* NAVBAR */}
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

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`font-[Oswald] text-xs uppercase tracking-[3px] transition-colors ${
                  pathname === l.href
                    ? "text-[#22d3ee]"
                    : "text-white/60 hover:text-[#22d3ee]"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

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

          <button
            className="md:hidden text-white/60"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-[#060d1a]/98 backdrop-blur-xl border-t border-white/[.04] px-6 py-6 space-y-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenu(false)}
                className="block font-[Oswald] text-sm uppercase tracking-[3px] text-white/60 hover:text-[#22d3ee]"
              >
                {l.label}
              </Link>
            ))}
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

      {/* MAIN */}
      <main className="pt-16">{children}</main>

      {/* FOOTER */}
      <footer className="bg-[#0b1629] border-t border-white/[.04] pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
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
                <p>Spisová značka C 401433/MSPH, Městský soud v Praze</p>
              </div>
            </div>
            <div>
              <h4 className="font-[JetBrains_Mono] text-[.65rem] tracking-[4px] text-white/40 uppercase mb-4">
                Navigace
              </h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Služby", href: "/funkce" },
                  { label: "Proč my", href: "/proc-my" },
                  { label: "Ceník", href: "/cenik" },
                  { label: "Fakturace", href: "/fakturace" },
                  { label: "Kontakt", href: "/kontakt" },
                  { label: "Přihlášení", href: "/login" },
                ].map((item) => (
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
                Obchodní podmínky
              </Link>
            </div>
          </div>
        </div>
      </footer>
      <StickyCTA />
      <CookieBanner />
    </div>
  );
}
