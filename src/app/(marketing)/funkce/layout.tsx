import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Služby",
  description: "CRM, klientský portál, AI asistent, automatizace a kalkulačky pro finanční poradce. Všechny nástroje na jednom místě.",
  openGraph: {
    title: "Služby | Finatiq",
    description: "CRM, klientský portál, AI asistent, automatizace a kalkulačky pro finanční poradce.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
