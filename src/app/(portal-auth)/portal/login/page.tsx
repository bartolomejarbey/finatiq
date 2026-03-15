"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

interface AdvisorBrand {
  app_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent_color: string | null;
  company_name: string | null;
  custom_login_title: string | null;
  custom_login_subtitle: string | null;
  login_slug: string | null;
}

function useCustomDomainBrand() {
  const [brand, setBrand] = useState<AdvisorBrand | null>(null);
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname.replace(/^www\./, "");
    const mainDomains = ["localhost", "finatiq.cz"];
    if (mainDomains.includes(hostname) || hostname.includes("vercel.app")) return;

    setIsCustomDomain(true);
    fetch(`/api/advisor-brand?domain=${encodeURIComponent(hostname)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setBrand(data); })
      .catch(() => {});
  }, []);

  return { brand, isCustomDomain };
}

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { brand, isCustomDomain } = useCustomDomainBrand();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Nesprávný email nebo heslo.");
      setLoading(false);
      return;
    }

    // Detect role server-side (bypasses RLS)
    const roleRes = await fetch("/api/auth/me");
    const { role } = await roleRes.json();

    if (role !== "client") {
      toast.error("Tento účet není klientský. Přihlaste se na stránce pro poradce.");
      await supabase.auth.signOut();
      setLoading(false);
      setTimeout(() => router.push("/login"), 1500);
      return;
    }

    window.location.href = "/portal";
  }

  const accent = isCustomDomain
    ? (brand?.brand_primary || brand?.brand_accent_color || "#22d3ee")
    : "#3B82F6";
  const displayName = brand?.app_name || brand?.company_name || "Klientský portál";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060d1a] px-4 relative overflow-hidden">
      {/* Glow blobs */}
      <div
        className="pointer-events-none fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px]"
        style={{ backgroundColor: `${accent}12` }}
      />
      <div
        className="pointer-events-none fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[120px]"
        style={{ backgroundColor: `${accent}08` }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          {isCustomDomain && brand?.logo_url ? (
            <img src={brand.logo_url} alt={displayName} className="mx-auto mb-4 h-14 w-auto object-contain" />
          ) : (
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: `${accent}20`,
                borderColor: `${accent}20`,
              }}
            >
              <Lock className="h-6 w-6" style={{ color: accent }} />
            </div>
          )}
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: isCustomDomain ? "Oswald, sans-serif" : "'Syne', sans-serif" }}
          >
            {isCustomDomain ? (brand?.custom_login_title || displayName) : "Klientský portál"}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {isCustomDomain && brand?.custom_login_subtitle
              ? brand.custom_login_subtitle
              : "Přihlaste se do svého portálu"}
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="portal-email" className="block text-sm font-medium text-gray-400 mb-1.5">
                Email
              </label>
              <input
                id="portal-email"
                type="email"
                placeholder="vas@email.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:ring-2"
                style={{ borderColor: undefined }}
              />
            </div>

            <div>
              <label htmlFor="portal-password" className="block text-sm font-medium text-gray-400 mb-1.5">
                Heslo
              </label>
              <input
                id="portal-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:ring-2"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: accent,
                color: isCustomDomain ? "#060d1a" : "#fff",
                fontFamily: isCustomDomain ? "Oswald, sans-serif" : undefined,
                fontWeight: isCustomDomain ? 700 : 500,
                letterSpacing: isCustomDomain ? "2px" : undefined,
                textTransform: isCustomDomain ? "uppercase" : undefined,
              } as React.CSSProperties}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Přihlásit se
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Jste poradce?{" "}
            <Link
              href="/login"
              className="font-medium transition-colors"
              style={{ color: accent }}
            >
              Přihlaste se zde
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-white/15" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {isCustomDomain ? (
            <>
              Provozováno na platformě{" "}
              <a href="https://www.finatiq.cz" className="text-white/25 hover:text-white/40 transition-colors">Finatiq</a>
            </>
          ) : (
            <>&copy; 2026 FinAdvisor</>
          )}
        </p>
      </div>
    </div>
  );
}
