import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ceník",
  description: "Přehled cenových plánů Finatiq pro finanční poradce. Vyberte si plán, který odpovídá velikosti vašeho podnikání.",
  openGraph: {
    title: "Ceník | Finatiq",
    description: "Přehled cenových plánů Finatiq pro finanční poradce. Vyberte si plán, který odpovídá velikosti vašeho podnikání.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
