import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white overflow-hidden">
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
                  className="h-20 w-auto drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]"
                  style={{ filter: "none" }}
                />
              </Link>
              <p className="mt-8 text-2xl italic font-light leading-relaxed">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  &ldquo;Spojujeme ty, kteří hledají,
                </span>
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  s&nbsp;těmi, kteří umí.&rdquo;
                </span>
              </p>
              <p className="text-gray-500 mt-6 max-w-sm leading-relaxed text-base">
                Platforma pro propojení zákazníků s&nbsp;ověřenými profesionály.
                Najděte fachmana snadno a&nbsp;rychle.
              </p>

              {/* Sociální sítě */}
              <div className="flex gap-4 mt-8">
                {[
                  { icon: "📘", label: "Facebook", hover: "hover:bg-blue-600 hover:shadow-blue-600/40 hover:border-blue-500" },
                  { icon: "📷", label: "Instagram", hover: "hover:bg-pink-600 hover:shadow-pink-600/40 hover:border-pink-500" },
                  { icon: "🐦", label: "Twitter", hover: "hover:bg-sky-500 hover:shadow-sky-500/40 hover:border-sky-400" },
                ].map((social, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label={social.label}
                    className={`w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl hover:scale-110 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${social.hover}`}
                  >
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
              <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <input
                  type="email"
                  placeholder="vas@email.cz"
                  className="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
                <button type="submit" className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 transition-all duration-300">
                  Odebírat
                </button>
              </form>
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
