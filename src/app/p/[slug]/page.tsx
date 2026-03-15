"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LogIn, User, Loader2 } from "lucide-react";

interface AdvisorBrand {
  app_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent_color: string | null;
  company_name: string | null;
  custom_login_title: string | null;
  custom_login_subtitle: string | null;
}

export default function AdvisorLandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [advisor, setAdvisor] = useState<AdvisorBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/advisor-brand?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setAdvisor(data);
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060d1a]">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (notFound || !advisor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1a] px-4">
        <p
          className="text-[6rem] font-bold leading-none text-white/10"
          style={{ fontFamily: "Oswald, sans-serif" }}
        >
          404
        </p>
        <p
          className="mt-4 text-lg text-white/40"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Poradce nebyl nalezen.
        </p>
        <Link
          href="/"
          className="mt-6 text-sm text-[#22d3ee] hover:text-[#22d3ee]/80 transition-colors"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Zpět na hlavní stránku
        </Link>
      </div>
    );
  }

  const accent = advisor.brand_primary || advisor.brand_accent_color || "#22d3ee";
  const displayName = advisor.app_name || advisor.company_name || "Finanční poradce";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060d1a] px-4 relative overflow-hidden">
      {/* Gradient blobs */}
      <div
        className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{ backgroundColor: `${accent}12` }}
      />
      <div
        className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
        style={{ backgroundColor: `${accent}08` }}
      />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo */}
        {advisor.logo_url ? (
          <img
            src={advisor.logo_url}
            alt={displayName}
            className="mx-auto mb-6 h-16 w-auto object-contain"
          />
        ) : (
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl border text-2xl font-bold"
            style={{
              fontFamily: "Oswald, sans-serif",
              backgroundColor: `${accent}15`,
              borderColor: `${accent}30`,
              color: accent,
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name */}
        <h1
          className="text-2xl font-bold uppercase tracking-wide text-white"
          style={{ fontFamily: "Oswald, sans-serif" }}
        >
          {displayName}
        </h1>
        {advisor.custom_login_subtitle && (
          <p
            className="mt-2 text-sm text-white/40"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            {advisor.custom_login_subtitle}
          </p>
        )}

        {/* Buttons */}
        <div className="mt-10 space-y-4">
          <Link
            href={`/login?advisor=${encodeURIComponent(slug)}`}
            className="flex w-full items-center justify-center gap-3 py-4 font-bold uppercase tracking-[3px] text-sm transition-all hover:opacity-90"
            style={{
              fontFamily: "Oswald, sans-serif",
              backgroundColor: accent,
              color: "#060d1a",
              clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
            }}
          >
            <LogIn className="h-4 w-4" />
            Jsem poradce
          </Link>

          <Link
            href={`/portal/login?advisor=${encodeURIComponent(slug)}`}
            className="flex w-full items-center justify-center gap-3 border py-4 font-bold uppercase tracking-[3px] text-sm text-white transition-all hover:opacity-80"
            style={{
              fontFamily: "Oswald, sans-serif",
              borderColor: `${accent}40`,
              clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
            }}
          >
            <User className="h-4 w-4" />
            Jsem klient
          </Link>
        </div>

        {/* Footer */}
        <p
          className="mt-12 text-xs text-white/15"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          Provozováno na platformě{" "}
          <Link href="/" className="text-white/25 hover:text-white/40 transition-colors">
            Finatiq
          </Link>
        </p>
      </div>
    </div>
  );
}
