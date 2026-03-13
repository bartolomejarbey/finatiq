import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fakturace — Transparentní platby bez kreditní karty",
  description: "Platíte na fakturu bankovním převodem. Žádná kreditní karta, žádné automatické strhávání. Finatiq je plně daňově uznatelný náklad.",
};

export default function FakturaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
