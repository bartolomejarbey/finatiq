"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";

interface AdvisorBrand {
  app_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent_color: string | null;
  company_name: string | null;
  custom_login_title: string | null;
  custom_login_subtitle: string | null;
  login_slug: string | null;
  allow_client_registration: boolean | null;
}

export default function PortalRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#060d1a]">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const advisorSlug = searchParams.get("advisor") || "";

  const [brand, setBrand] = useState<AdvisorBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!advisorSlug) {
      setLoading(false);
      setNotAllowed(true);
      return;
    }
    fetch(`/api/advisor-brand?slug=${encodeURIComponent(advisorSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !data.allow_client_registration) {
          setNotAllowed(true);
        } else {
          setBrand(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotAllowed(true);
        setLoading(false);
      });
  }, [advisorSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Vyplňte email a heslo.");
      return;
    }
    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hesla se neshodují.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/clients/self-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advisor_slug: advisorSlug,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nepodařilo se dokončit registraci.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Nepodařilo se dokončit registraci.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060d1a]">
        <Loader2 className="h-8 w-8 animate-spin text-white/30" />
      </div>
    );
  }

  if (notAllowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#060d1a] px-4">
        <p className="text-lg text-white/40" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Registrace klientů není k dispozici.
        </p>
        <Link
          href="/"
          className="mt-6 text-sm text-[#22d3ee] hover:text-[#22d3ee]/80 transition-colors"
        >
          Zpět na hlavní stránku
        </Link>
      </div>
    );
  }

  const accent = brand?.brand_primary || brand?.brand_accent_color || "#22d3ee";
  const displayName = brand?.app_name || brand?.company_name || "Finanční poradce";

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060d1a] px-4 relative overflow-hidden">
        <div
          className="pointer-events-none fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ backgroundColor: `${accent}12` }}
        />
        <div className="relative z-10 w-full max-w-md text-center">
          {brand?.logo_url && (
            <img src={brand.logo_url} alt={displayName} className="mx-auto mb-6 h-14 w-auto object-contain" />
          )}
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-8">
            <h2 className="text-xl font-bold text-green-400" style={{ fontFamily: "Oswald, sans-serif" }}>
              Registrace úspěšná!
            </h2>
            <p className="mt-3 text-sm text-green-300/70" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Váš účet byl vytvořen. Nyní se můžete přihlásit do klientského portálu.
            </p>
            <Link
              href={`/portal/login?advisor=${encodeURIComponent(advisorSlug)}`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 font-bold uppercase tracking-[2px] text-sm transition hover:opacity-90"
              style={{
                fontFamily: "Oswald, sans-serif",
                backgroundColor: accent,
                color: "#060d1a",
              }}
            >
              Přihlásit se
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060d1a] px-4 relative overflow-hidden">
      {/* Glow */}
      <div
        className="pointer-events-none fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px]"
        style={{ backgroundColor: `${accent}12` }}
      />
      <div
        className="pointer-events-none fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[120px]"
        style={{ backgroundColor: `${accent}08` }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt={displayName} className="mx-auto mb-4 h-14 w-auto object-contain" />
          ) : (
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
              style={{
                backgroundColor: `${accent}20`,
                borderColor: `${accent}20`,
              }}
            >
              <UserPlus className="h-6 w-6" style={{ color: accent }} />
            </div>
          )}
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "Oswald, sans-serif" }}
          >
            Registrace klienta
          </h1>
          <p className="mt-2 text-sm text-white/40" style={{ fontFamily: "DM Sans, sans-serif" }}>
            {displayName} — vytvořte si přístup do klientského portálu
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-8 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Jméno</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jan"
                  className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-[color:var(--accent)] focus:ring-2 focus:ring-white/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Příjmení</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Novák"
                  className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:ring-2 focus:ring-white/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                required
                className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:ring-2 focus:ring-white/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+420 ..."
                className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:ring-2 focus:ring-white/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Heslo *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 znaků"
                required
                className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:ring-2 focus:ring-white/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Potvrzení hesla *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Zopakujte heslo"
                required
                className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:ring-2 focus:ring-white/10"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold uppercase tracking-[2px] text-sm transition hover:opacity-90 disabled:opacity-50"
              style={{
                fontFamily: "Oswald, sans-serif",
                backgroundColor: accent,
                color: "#060d1a",
              }}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Zaregistrovat se
            </button>
          </form>
        </div>

        {/* Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Už máte účet?{" "}
            <Link
              href={`/portal/login?advisor=${encodeURIComponent(advisorSlug)}`}
              className="font-medium transition-colors"
              style={{ color: accent }}
            >
              Přihlaste se
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-white/15" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Provozováno na platformě{" "}
          <a href="https://www.finatiq.cz" className="text-white/25 hover:text-white/40 transition-colors">
            Finatiq
          </a>
        </p>
      </div>
    </div>
  );
}
