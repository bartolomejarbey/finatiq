"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getRoleRedirectPath } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/roles";
import { Loader2 } from "lucide-react";

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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmed = searchParams.get("confirmed") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
      if (authError.message.includes("Email not confirmed")) {
        setError("Váš email ještě nebyl ověřen. Zkontrolujte svou emailovou schránku a klikněte na potvrzovací odkaz.");
      } else if (authError.message.includes("Invalid login credentials")) {
        setError("Nesprávný email nebo heslo.");
      } else {
        setError("Při přihlášení došlo k chybě. Zkuste to prosím znovu.");
      }
      setLoading(false);
      return;
    }

    const user = data.user;

    // Check if 2FA is enabled for this advisor
    if (user) {
      const { data: adv } = await supabase
        .from("advisors")
        .select("id, two_factor_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adv?.two_factor_enabled) {
        // Sign out temporarily — user must verify 2FA first
        await supabase.auth.signOut();
        // Send 2FA code
        await fetch("/api/auth/send-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, type: "2fa", email }),
        });
        // Redirect to 2FA page
        router.push(`/verify-2fa?uid=${user.id}&email=${encodeURIComponent(email)}`);
        return;
      }
    }

    const roleRes = await fetch("/api/auth/me");
    const { role } = await roleRes.json() as { role: UserRole };
    window.location.href = getRoleRedirectPath(role);
  }

  // ── Custom domain: full-screen branded login ──
  if (isCustomDomain) {
    const accent = brand?.brand_primary || brand?.brand_accent_color || "#22d3ee";
    const displayName = brand?.app_name || brand?.company_name || "Finanční poradce";

    return (
      <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[#060d1a] px-4 overflow-hidden">
        {/* Glow blobs */}
        <div
          className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
          style={{ backgroundColor: `${accent}12` }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none"
          style={{ backgroundColor: `${accent}08` }}
        />

        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            {brand?.logo_url ? (
              <img src={brand.logo_url} alt={displayName} className="mx-auto mb-4 h-14 w-auto object-contain" />
            ) : (
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border text-2xl font-bold"
                style={{ backgroundColor: `${accent}15`, borderColor: `${accent}30`, color: accent, fontFamily: "Oswald, sans-serif" }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Oswald, sans-serif" }}>
              {brand?.custom_login_title || displayName}
            </h1>
            <p className="mt-2 text-sm text-white/40" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {brand?.custom_login_subtitle || "Přihlášení pro poradce"}
            </p>
          </div>

          {confirmed && (
            <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              Email byl úspěšně ověřen! Nyní se můžete přihlásit.
            </div>
          )}

          {/* Form */}
          <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-8 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                <input
                  id="email" type="email" placeholder="vas@email.cz" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1.5">Heslo</label>
                <input
                  id="password" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} required
                  className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold uppercase tracking-[2px] text-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accent, color: "#060d1a", fontFamily: "Oswald, sans-serif" }}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Přihlásit se
              </button>
            </form>
          </div>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-gray-500 transition hover:text-gray-300">
              Zapomněli jste heslo?
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-gray-600">nebo</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="mt-4 text-center text-sm">
            <p className="text-gray-500">
              Jste klient?{" "}
              <Link href="/portal/login" className="font-medium transition-colors" style={{ color: accent }}>
                Přihlaste se zde
              </Link>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-white/15" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Provozováno na platformě{" "}
            <a href="https://www.finatiq.cz" className="text-white/25 hover:text-white/40 transition-colors">Finatiq</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Default Finatiq login ──
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Přihlášení pro poradce</h2>
      <p className="mt-2 text-gray-500">Zadejte své přihlašovací údaje</p>

      {confirmed && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Email byl úspěšně ověřen! Nyní se můžete přihlásit.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            id="email" type="email" placeholder="vas@email.cz" value={email}
            onChange={(e) => setEmail(e.target.value)} required
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Heslo</label>
          <input
            id="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Přihlásit se
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="text-sm text-gray-500 transition hover:text-gray-700">
          Zapomněli jste heslo?
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">nebo</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="mt-4 space-y-2 text-center text-sm">
        <p className="text-gray-500">
          Jste klient?{" "}
          <Link href="/portal/login" className="font-medium text-blue-600 hover:underline">Přihlaste se zde</Link>
        </p>
        <p className="text-gray-500">
          Nemáte účet?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:underline">Zaregistrujte se</Link>
        </p>
      </div>
    </div>
  );
}
