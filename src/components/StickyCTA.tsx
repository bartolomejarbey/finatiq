"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY;
      const pricingEl = document.getElementById("cenik");
      if (pricingEl) {
        const rect = pricingEl.getBoundingClientRect();
        // Hide when pricing section is visible
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setVisible(false);
          return;
        }
      }
      setVisible(scrollY > 600);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        pointerEvents: visible ? "auto" : "none",
        background: "rgba(15,32,53,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <span
          className="hidden md:block text-sm text-white/50"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          14 dní zdarma · Bez kreditní karty · Bez závazků
        </span>
        <Link
          href="/register"
          className="font-[Oswald] text-sm tracking-[2px] uppercase text-[#22d3ee] hover:text-white transition-colors md:ml-auto"
        >
          Začít zdarma →
        </Link>
      </div>
    </div>
  );
}
