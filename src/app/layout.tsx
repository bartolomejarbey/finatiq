import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Finatiq — Platforma pro finanční poradce",
    template: "%s | Finatiq",
  },
  description: "Komplexní CRM a klientský portál pro finanční poradce. Správa klientů, pipeline, automatizace a AI doporučení.",
  manifest: "/manifest.json",
  themeColor: "#0F172A",
  metadataBase: new URL("https://www.finatiq.cz"),
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: "https://www.finatiq.cz",
    siteName: "Finatiq",
    title: "Finatiq — Platforma pro finanční poradce",
    description: "Komplexní CRM a klientský portál pro finanční poradce. Správa klientů, pipeline, automatizace a AI doporučení.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Finatiq — Platforma pro finanční poradce",
    description: "Komplexní CRM a klientský portál pro finanční poradce.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finatiq",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AnalyticsProvider />
        {children}
        <Toaster position="bottom-right" richColors closeButton />

      </body>
    </html>
  );
}
