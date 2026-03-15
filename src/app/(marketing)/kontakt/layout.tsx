import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontaktujte společnost Harotas s.r.o., provozovatele platformy Finatiq. Rádi zodpovíme vaše dotazy a pomůžeme vám začít.",
  openGraph: {
    title: "Kontakt | Finatiq",
    description: "Kontaktujte společnost Harotas s.r.o., provozovatele platformy Finatiq. Rádi zodpovíme vaše dotazy a pomůžeme vám začít.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
