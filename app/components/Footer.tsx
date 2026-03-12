import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-gray-900 to-black text-white border-t border-cyan-500/20">
      {/* Hlavní footer */}
      <div className="max-w-7xl mx-auto px-4 pt-20 pb-16">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Logo + citát */}
          <div className="lg:col-span-5">
            <Link href="/" className="inline-block drop-shadow-[0_0_25px_rgba(6,182,212,0.25)]">
              <Image
                src="/logo.png"
                alt="Fachmani"
                width={448}
                height={140}
                className="h-24 w-auto brightness-0 invert"
              />
            </Link>
            <p className="mt-6 text-xl italic font-light bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent leading-relaxed">
              &ldquo;Spojujeme ty, kteří hledají, s&nbsp;těmi, kteří umí.&rdquo;
            </p>
            <p className="text-gray-500 mt-4 max-w-sm leading-relaxed">
              Platforma pro propojení zákazníků s ověřenými profesionály.
              Najděte fachmana snadno a rychle.
            </p>

            {/* Sociální sítě */}
            <div className="flex gap-3 mt-8">
              {[
                { icon: "📘", hover: "hover:bg-blue-600 hover:shadow-blue-600/30" },
                { icon: "📷", hover: "hover:bg-pink-600 hover:shadow-pink-600/30" },
                { icon: "🐦", hover: "hover:bg-sky-500 hover:shadow-sky-500/30" },
              ].map((social, i) => (
                <a
                  key={i}
                  href="#"
                  className={`w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-xl hover:scale-110 hover:shadow-lg transition-all duration-300 ${social.hover}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Linky */}
          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-8">
            {/* Pro zákazníky */}
            <div>
              <h4 className="font-semibold text-lg mb-5 text-white">Pro zákazníky</h4>
              <ul className="space-y-3">
                {[
                  { href: "/jak-to-funguje", label: "Jak to funguje" },
                  { href: "/poptavky", label: "Prohlížet poptávky" },
                  { href: "/fachmani", label: "Najít fachmana" },
                  { href: "/kategorie", label: "Kategorie služeb" },
                  { href: "/nova-poptavka", label: "Zadat poptávku" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-gray-400 hover:text-cyan-400 transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro fachmany */}
            <div>
              <h4 className="font-semibold text-lg mb-5 text-white">Pro fachmany</h4>
              <ul className="space-y-3">
                {[
                  { href: "/pro-fachmany", label: "Proč Fachmani" },
                  { href: "/cenik", label: "Ceník" },
                  { href: "/auth/register?role=provider", label: "Registrace fachmana" },
                  { href: "/overeni", label: "Ověření identity" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-gray-400 hover:text-cyan-400 transition-colors duration-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Podpora */}
            <div>
              <h4 className="font-semibold text-lg mb-5 text-white">Podpora</h4>
              <ul className="space-y-3">
                {[
                  { href: "/faq", label: "Časté dotazy" },
                  { href: "/kontakt", label: "Kontakt" },
                  { href: "/vop", label: "Obchodní podmínky" },
                  { href: "/gdpr", label: "Ochrana údajů" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-gray-400 hover:text-cyan-400 transition-colors duration-200">
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
            <h4 className="text-xl font-semibold text-white mb-2">Buďte v obraze</h4>
            <p className="text-gray-500 mb-6">Novinky, tipy a speciální nabídky přímo do vašeho emailu.</p>
            <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <input
                type="email"
                placeholder="vas@email.cz"
                className="flex-1 px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              />
              <button
                type="submit"
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5 transition-all duration-300"
              >
                Odebírat
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Spodní lišta */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm">
            © 2026 Fachmani. Všechna práva vyhrazena.
          </p>
          <div className="flex gap-6 text-sm text-gray-600">
            <Link href="/vop" className="hover:text-cyan-400 transition-colors duration-200">
              Podmínky
            </Link>
            <Link href="/gdpr" className="hover:text-cyan-400 transition-colors duration-200">
              Soukromí
            </Link>
            <Link href="/kontakt" className="hover:text-cyan-400 transition-colors duration-200">
              Kontakt
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
