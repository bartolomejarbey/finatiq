import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ochrana osobních údajů",
  description: "Zásady ochrany osobních údajů platformy Finatiq. Informace o tom, jak zpracováváme a chráníme vaše osobní údaje v souladu s nařízením GDPR.",
  openGraph: {
    title: "Ochrana osobních údajů | Finatiq",
    description: "Zásady ochrany osobních údajů platformy Finatiq. Informace o tom, jak zpracováváme a chráníme vaše osobní údaje v souladu s nařízením GDPR.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
