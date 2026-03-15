import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Obchodní podmínky",
  description: "Obchodní podmínky platformy Finatiq provozované společností Harotas s.r.o. Přečtěte si pravidla užívání našich služeb.",
  openGraph: {
    title: "Obchodní podmínky | Finatiq",
    description: "Obchodní podmínky platformy Finatiq provozované společností Harotas s.r.o. Přečtěte si pravidla užívání našich služeb.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
