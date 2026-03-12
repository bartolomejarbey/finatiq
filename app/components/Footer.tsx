"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await supabase.from("newsletter_subscribers").insert({ email });
    setSubscribed(true);
    setEmail("");
  };

  return (
    <footer className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white overflow-hidden">
      {/* Dekorativní pozadí */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* CTA sekce */}
        <div className="border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="relative bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-white/10 rounded-3xl p-10 md:p-14 text-center backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-3xl" />
              <div className="relative">
                <h3 className="text-3xl md:text-4xl font-bold mb-4">
                  Připraveni najít svého <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">fachmana</span>?
                </h3>
                <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                  Tisíce profesionálů čekají na vaši poptávku. Začněte zdarma ještě dnes.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/nova-poptavka" className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-cyan-500/25 hover:-translate-y-1 transition-all duration-300 text-lg">
                    Zadat poptávku zdarma →
                  </Link>
                  <Link href="/auth/register?role=provider" className="px-8 py-4 bg-white/5 border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 text-lg">
                    Jsem fachman
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hlavní footer */}
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Logo + citát */}
            <div className="lg:col-span-5">
              <Link href="/" className="inline-block">
                <Image
                  src="/logo.png"
                  alt="Fachmani"
                  width={500}
                  height={160}
                  className="h-48 md:h-56 w-auto drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                  style={{ filter: "none" }}
                />
              </Link>
              <p className="mt-8 text-2xl italic font-light text-white/80 leading-relaxed">
                &ldquo;Spojujeme ty, kteří hledají, s&nbsp;těmi, kteří umí.&rdquo;
              </p>
              <p className="text-gray-500 mt-6 max-w-sm leading-relaxed text-base">
                Platforma pro propojení zákazníků s&nbsp;ověřenými profesionály.
                Najděte fachmana snadno a&nbsp;rychle.
              </p>

              {/* Sociální sítě */}
              <div className="flex gap-4 mt-8">
                {[
                  { href: "https://facebook.com", label: "Facebook", icon: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  ), hover: "hover:bg-blue-600 hover:shadow-blue-600/40" },
                  { href: "https://instagram.com", label: "Instagram", icon: (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  ), hover: "hover:bg-pink-600 hover:shadow-pink-600/40" },
                ].map((social, i) => (
                  <a key={i} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}
                    className={`w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white hover:scale-110 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${social.hover}`}>
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Linky */}
            <div className="lg:col-span-7 grid sm:grid-cols-3 gap-10">
              <div>
                <h4 className="font-bold text-lg mb-6 text-white flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent rounded-full" />
                  Pro zákazníky
                </h4>
                <ul className="space-y-4">
                  {[
                    { href: "/jak-to-funguje", label: "Jak to funguje" },
                    { href: "/poptavky", label: "Prohlížet poptávky" },
                    { href: "/fachmani", label: "Najít fachmana" },
                    { href: "/kategorie", label: "Kategorie služeb" },
                    { href: "/nova-poptavka", label: "Zadat poptávku" },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-gray-400 hover:text-cyan-400 hover:translate-x-1 transition-all duration-200 inline-block">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-lg mb-6 text-white flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent rounded-full" />
                  Pro fachmany
                </h4>
                <ul className="space-y-4">
                  {[
                    { href: "/pro-fachmany", label: "Proč Fachmani" },
                    { href: "/cenik", label: "Ceník" },
                    { href: "/auth/register?role=provider", label: "Registrace fachmana" },
                    { href: "/overeni", label: "Ověření identity" },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-gray-400 hover:text-cyan-400 hover:translate-x-1 transition-all duration-200 inline-block">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-lg mb-6 text-white flex items-center gap-2">
                  <span className="w-8 h-0.5 bg-gradient-to-r from-cyan-400 to-transparent rounded-full" />
                  Podpora
                </h4>
                <ul className="space-y-4">
                  {[
                    { href: "/faq", label: "Časté dotazy" },
                    { href: "/kontakt", label: "Kontakt" },
                    { href: "/vop", label: "Obchodní podmínky" },
                    { href: "/gdpr", label: "Ochrana údajů" },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-gray-400 hover:text-cyan-400 hover:translate-x-1 transition-all duration-200 inline-block">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="mt-16 pt-12 border-t border-white/5">
            <div className="max-w-2xl mx-auto text-center">
              <h4 className="text-xl font-bold text-white mb-2">📬 Buďte v obraze</h4>
              <p className="text-gray-500 mb-6">Novinky, tipy a speciální nabídky přímo do vašeho emailu.</p>
              {subscribed ? (
                <p className="text-cyan-400 font-semibold text-lg">✓ Děkujeme za přihlášení k odběru!</p>
              ) : (
                <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.cz" required
                    className="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all" />
                  <button type="submit" className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 transition-all duration-300">
                    Odebírat
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Spodní lišta */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              © 2026 Fachmani. Všechna práva vyhrazena.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/vop" className="text-gray-600 hover:text-cyan-400 transition-colors duration-200">Podmínky</Link>
              <Link href="/gdpr" className="text-gray-600 hover:text-cyan-400 transition-colors duration-200">Soukromí</Link>
              <Link href="/kontakt" className="text-gray-600 hover:text-cyan-400 transition-colors duration-200">Kontakt</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
