import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proč my",
  description: "Zjistěte, proč si finanční poradci v České republice vybírají Finatiq. Moderní platforma navržená přímo pro potřeby finančních profesionálů.",
  openGraph: {
    title: "Proč my | Finatiq",
    description: "Zjistěte, proč si finanční poradci v České republice vybírají Finatiq. Moderní platforma navržená přímo pro potřeby finančních profesionálů.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
