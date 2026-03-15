"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem("cookie-consent", "all");
    setVisible(false);
  }

  function acceptNecessary() {
    localStorage.setItem("cookie-consent", "necessary");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4"
      style={{
        animation: "cookieSlideUp 500ms cubic-bezier(.16,1,.3,1) forwards",
      }}
    >
      <style jsx>{`
        @keyframes cookieSlideUp {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="max-w-4xl mx-auto bg-[#0f2035] border border-white/[.08] p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ clipPath: "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))" }}
      >
        <div className="flex-1">
          <p className="font-[Oswald] text-sm font-bold uppercase tracking-wide mb-1">
            Cookies
          </p>
          <p className="font-[DM_Sans] text-xs text-white/40 leading-relaxed font-light">
            Používáme nezbytné cookies pro fungování webu a analytické cookies pro zlepšení služeb.{" "}
            <Link href="/gdpr" className="text-[#22d3ee] hover:text-[#22d3ee]/80 transition-colors">
              Více informací
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={acceptNecessary}
            className="font-[Oswald] text-xs uppercase tracking-[2px] text-white/40 hover:text-white transition-colors px-4 py-2 border border-white/[.08] hover:border-white/[.15]"
          >
            Jen nezbytné
          </button>
          <button
            onClick={accept}
            className="font-[Oswald] text-xs uppercase tracking-[2px] bg-[#22d3ee] text-[#060d1a] px-5 py-2 font-bold hover:bg-[#22d3ee]/90 transition-colors"
            style={{ clipPath: "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))" }}
          >
            Přijmout vše
          </button>
        </div>
      </div>
    </div>
  );
}
