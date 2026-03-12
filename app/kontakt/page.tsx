"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";
import { supabase } from "@/lib/supabase";

export default function Kontakt() {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");

    const { error: insertError } = await supabase
      .from("contact_messages")
      .insert({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });

    if (insertError) {
      setError("Zprávu se nepodařilo odeslat. Zkuste to prosím znovu.");
      setSending(false);
      return;
    }

    setSent(true);
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl animate-float animation-delay-200"></div>

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className={`text-center ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
            <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
              PODPORA
            </span>
            <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
              Kontaktujte nás
            </h1>
            <p className="text-lg text-gray-600 max-w-xl mx-auto">
              Máte dotaz nebo potřebujete pomoc? Jsme tu pro vás.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className={`${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Jak nás můžete kontaktovat</h2>

              <div className="space-y-6">
                {[
                  { icon: "📧", title: "Email", main: "podpora@fachmani.cz", sub: "Odpovídáme do 24 hodin" },
                  { icon: "💬", title: "Live chat", main: "Dostupný v pracovní dny 9-17h", sub: "Klikněte na bublinu vpravo dole" },
                  { icon: "📍", title: "Adresa", main: "Fachmani s.r.o.", sub: "Příkladná 123, 110 00 Praha 1" },
                  { icon: "🕐", title: "Provozní doba", main: "Pondělí - Pátek: 9:00 - 17:00", sub: "Víkendy: pouze email" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-2xl flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-gray-700">{item.main}</p>
                      <p className="text-sm text-gray-500">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* FAQ Link */}
              <div className="mt-8 p-6 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-100">
                <h3 className="font-semibold text-gray-900 mb-2">💡 Hledáte rychlou odpověď?</h3>
                <p className="text-gray-600 mb-4">
                  Podívejte se do našich často kladených dotazů.
                </p>
                <Link
                  href="/faq"
                  className="inline-flex items-center gap-2 text-cyan-600 font-semibold hover:text-cyan-700"
                >
                  Přejít na FAQ
                  {Icons.arrowRight}
                </Link>
              </div>
            </div>

            {/* Contact Form */}
            <div className={`${mounted ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Napište nám</h2>

                {sent ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-emerald-600 text-3xl">✓</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Zpráva odeslána!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Děkujeme za váš dotaz. Odpovíme vám co nejdříve.
                    </p>
                    <button
                      onClick={() => {
                        setSent(false);
                        setFormData({ name: "", email: "", subject: "", message: "" });
                      }}
                      className="text-cyan-600 font-semibold hover:text-cyan-700"
                    >
                      Odeslat další zprávu
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
                        {error}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jméno *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        placeholder="Jan Novák"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        placeholder="jan@email.cz"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Předmět *
                      </label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                      >
                        <option value="">Vyberte předmět</option>
                        <option value="general">Obecný dotaz</option>
                        <option value="technical">Technický problém</option>
                        <option value="billing">Fakturace a platby</option>
                        <option value="complaint">Stížnost</option>
                        <option value="partnership">Spolupráce</option>
                        <option value="other">Jiné</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zpráva *
                      </label>
                      <textarea
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                        rows={5}
                        placeholder="Popište váš dotaz nebo problém..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full gradient-bg text-white py-4 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {sending ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Odesílám...
                        </>
                      ) : (
                        <>
                          Odeslat zprávu
                          {Icons.arrowRight}
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}