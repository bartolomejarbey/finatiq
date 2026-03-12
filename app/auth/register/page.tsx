"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

export default function Register() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get("role") === "provider") {
      setRole("provider");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Registrace uživatele
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (signUpError) {
        const msg = signUpError.message;
        if (msg.includes("User already registered")) {
          setError("Tento email je již zaregistrován");
        } else if (msg.includes("Password should be at least 6 characters")) {
          setError("Heslo musí mít alespoň 6 znaků");
        } else if (msg.includes("Unable to validate email address")) {
          setError("Neplatná emailová adresa");
        } else {
          setError("Při registraci došlo k chybě. Zkuste to prosím znovu.");
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // 2. Počkáme chvíli než se vytvoří profil triggerem
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Aktualizujeme profil s rolí
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            role: role, 
            full_name: fullName 
          })
          .eq("id", data.user.id);

        // Pokud update selhal (profil ještě neexistuje), zkusíme upsert
        if (updateError) {
          await supabase
            .from("profiles")
            .upsert({ 
              id: data.user.id,
              email: email,
              role: role, 
              full_name: fullName,
              is_verified: false,
              subscription_type: 'free',
              monthly_offers_count: 0
            });
        }

        // 4. Pro fachmana vytvoříme i provider_profiles záznam
        if (role === "provider") {
          await supabase
            .from("provider_profiles")
            .upsert({
              user_id: data.user.id,
              bio: null,
              locations: null,
              hourly_rate: null
            });
        }
      }

      setSuccess(true);
    } catch (err) {
      setError("Něco se pokazilo. Zkuste to prosím znovu.");
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <div className={`max-w-md w-full text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-emerald-600">{Icons.check}</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Registrace úspěšná!</h2>
            <p className="text-gray-600 mb-8">
              Váš účet byl vytvořen. Nyní se můžete přihlásit.
            </p>
            <Link 
              href="/auth/login" 
              className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-xl transition-all"
            >
              Přejít na přihlášení
              {Icons.arrowRight}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-float animation-delay-200"></div>

        <div className="max-w-md mx-auto px-4 relative z-10">
          <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <div className="text-center mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Vytvořte si účet
              </h1>
              <p className="text-gray-600">
                Připojte se k tisícům spokojených uživatelů
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Role selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      role === "customer" 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">🔍</div>
                    <div className="font-semibold text-gray-900">Hledám služby</div>
                    <div className="text-xs text-gray-500 mt-1">Chci zadat poptávku</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("provider")}
                    className={`p-4 rounded-2xl border-2 transition-all ${
                      role === "provider" 
                        ? "border-emerald-500 bg-emerald-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">🔧</div>
                    <div className="font-semibold text-gray-900">Jsem fachman</div>
                    <div className="text-xs text-gray-500 mt-1">Chci nabízet služby</div>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jméno a příjmení
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Jan Novák"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="jan@email.cz"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Heslo
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Minimálně 6 znaků"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full gradient-bg text-white py-4 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Registruji...
                    </>
                  ) : (
                    <>
                      Zaregistrovat se
                      {Icons.arrowRight}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Už máte účet?{" "}
                  <Link href="/auth/login" className="text-blue-600 font-semibold hover:text-blue-700">
                    Přihlaste se
                  </Link>
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              Registrací souhlasíte s{" "}
              <Link href="/vop" className="text-blue-600 hover:underline">obchodními podmínkami</Link>
              {" "}a{" "}
              <Link href="/gdpr" className="text-blue-600 hover:underline">zpracováním osobních údajů</Link>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}