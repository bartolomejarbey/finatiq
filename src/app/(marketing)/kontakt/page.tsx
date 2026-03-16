"use client";

import React, { useState, useEffect } from "react";
import { Mail, Phone, Building2, MapPin, Clock, Send, ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";

const TYPES = ["Obecný", "Technická podpora", "Obchodní", "Fakturace", "Meta Ads na klíč"];

export default function KontaktPage() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("Obecný");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const predmet = searchParams.get("predmet");
    if (predmet === "meta-ads") setType("Meta Ads na klíč");
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, type, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nepodařilo se odeslat.");
        return;
      }
      setSent(true);
    } catch {
      setError("Nepodařilo se odeslat zprávu.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="min-h-screen py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="font-[JetBrains_Mono] text-[.65rem] tracking-[5px] text-[#22d3ee]/60 uppercase mb-4">
            Kontakt
          </p>
          <h1 className="font-[Oswald] text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            Ozvěte se nám
          </h1>
          <p className="font-[DM_Sans] text-white/40 text-lg max-w-xl mx-auto">
            Rádi zodpovíme vaše dotazy. Napište nám přes formulář nebo využijte přímý kontakt.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* LEFT — Contact info */}
          <div className="bg-[#0f2035] border border-white/[.08] p-10 rounded-lg">
            <h2 className="font-[Oswald] text-2xl font-semibold text-white mb-8">
              Kontaktní údaje
            </h2>

            <div className="space-y-6">
              <a
                href="mailto:bartolomej@arbey.cz"
                className="flex items-start gap-4 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#22d3ee]/10 flex items-center justify-center shrink-0 group-hover:bg-[#22d3ee]/20 transition-colors duration-150">
                  <Mail className="w-5 h-5 text-[#22d3ee]" />
                </div>
                <div>
                  <p className="font-[DM_Sans] text-xs text-white/30 uppercase tracking-wider mb-1">Email</p>
                  <p className="font-[DM_Sans] text-white group-hover:text-[#22d3ee] transition-colors duration-150">
                    bartolomej@arbey.cz
                  </p>
                </div>
              </a>

              <a
                href="tel:+420725932729"
                className="flex items-start gap-4 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-[#22d3ee]/10 flex items-center justify-center shrink-0 group-hover:bg-[#22d3ee]/20 transition-colors duration-150">
                  <Phone className="w-5 h-5 text-[#22d3ee]" />
                </div>
                <div>
                  <p className="font-[DM_Sans] text-xs text-white/30 uppercase tracking-wider mb-1">Telefon</p>
                  <p className="font-[DM_Sans] text-white group-hover:text-[#22d3ee] transition-colors duration-150">
                    +420 725 932 729
                  </p>
                </div>
              </a>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#22d3ee]/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[#22d3ee]" />
                </div>
                <div>
                  <p className="font-[DM_Sans] text-xs text-white/30 uppercase tracking-wider mb-1">Firma</p>
                  <p className="font-[DM_Sans] text-white">Harotas s.r.o.</p>
                  <p className="font-[DM_Sans] text-white/50 text-sm">IČO: 21402027</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#22d3ee]/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-[#22d3ee]" />
                </div>
                <div>
                  <p className="font-[DM_Sans] text-xs text-white/30 uppercase tracking-wider mb-1">Adresa</p>
                  <p className="font-[DM_Sans] text-white">Školská 689/20</p>
                  <p className="font-[DM_Sans] text-white/50 text-sm">Nové Město, 110 00 Praha 1</p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/[.06] flex items-center gap-3">
              <Clock className="w-4 h-4 text-white/20" />
              <p className="font-[DM_Sans] text-sm text-white/30">
                Odpovídáme do 24 hodin v pracovní dny.
              </p>
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="bg-[#0f2035] border border-white/[.08] p-10 rounded-lg">
            {sent ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <div className="w-16 h-16 rounded-full bg-[#22d3ee]/10 flex items-center justify-center mb-6">
                  <Send className="w-7 h-7 text-[#22d3ee]" />
                </div>
                <h2 className="font-[Oswald] text-2xl font-semibold text-white mb-3">
                  Zpráva odeslána
                </h2>
                <p className="font-[DM_Sans] text-white/40 max-w-sm">
                  Děkujeme za váš dotaz. Ozveme se do 24 hodin v pracovní dny.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="font-[Oswald] text-2xl font-semibold text-white mb-8">
                  Napište nám
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="font-[DM_Sans] text-xs text-white/40 uppercase tracking-wider block mb-2">
                      Jméno
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      className="w-full bg-transparent border-b border-white/[.1] focus:border-[#22d3ee] text-white font-[DM_Sans] py-3 px-1 outline-none transition-colors duration-150 placeholder:text-white/20"
                      placeholder="Vaše jméno"
                    />
                  </div>

                  <div>
                    <label className="font-[DM_Sans] text-xs text-white/40 uppercase tracking-wider block mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-transparent border-b border-white/[.1] focus:border-[#22d3ee] text-white font-[DM_Sans] py-3 px-1 outline-none transition-colors duration-150 placeholder:text-white/20"
                      placeholder="vas@email.cz"
                    />
                  </div>

                  <div>
                    <label className="font-[DM_Sans] text-xs text-white/40 uppercase tracking-wider block mb-2">
                      Typ dotazu
                    </label>
                    <div className="relative">
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full bg-transparent border-b border-white/[.1] focus:border-[#22d3ee] text-white font-[DM_Sans] py-3 px-1 outline-none transition-colors duration-150 appearance-none cursor-pointer"
                      >
                        {TYPES.map((t) => (
                          <option key={t} value={t} className="bg-[#0f2035] text-white">
                            {t}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="font-[DM_Sans] text-xs text-white/40 uppercase tracking-wider block mb-2">
                      Zpráva
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      minLength={10}
                      rows={4}
                      className="w-full bg-transparent border-b border-white/[.1] focus:border-[#22d3ee] text-white font-[DM_Sans] py-3 px-1 outline-none transition-colors duration-150 resize-none placeholder:text-white/20"
                      placeholder="Váš dotaz..."
                    />
                  </div>

                  {error && (
                    <p className="font-[DM_Sans] text-sm text-red-400">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-[#22d3ee] text-[#060d1a] font-[Oswald] text-sm uppercase tracking-[3px] font-bold py-3.5 px-6 hover:bg-[#22d3ee]/90 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
                    }}
                  >
                    {sending ? "Odesílám..." : "Odeslat"}
                    {!sending && <Send className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
