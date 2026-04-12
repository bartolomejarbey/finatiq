"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const PORTAL_TITLES: Record<string, string> = {
  "/portal": "Přehled",
  "/portal/cockpit": "Finanční přehled",
  "/portal/contracts": "Smlouvy",
  "/portal/payments": "Platby",
  "/portal/investments": "Investice",
  "/portal/goals": "Finanční plán",
  "/portal/zdravi": "Finanční zdraví",
  "/portal/kalkulacky": "Kalkulačky",
  "/portal/scenare": "Scénáře",
  "/portal/ochrana": "Pojistné krytí",
  "/portal/documents": "Dokumenty",
  "/portal/trezor": "Trezor",
  "/portal/doporuceni": "Doporučení",
  "/portal/prani": "Přání",
  "/portal/clanky": "Články",
  "/portal/novinky": "Novinky",
  "/portal/uspechy": "Úspěchy",
  "/portal/zivotni-udalosti": "Životní události",
  "/portal/rodina": "Rodina",
  "/portal/kalendar": "Kalendář",
  "/portal/evidence": "Evidence",
  "/portal/notifications": "Oznámení",
  "/portal/nastaveni": "Nastavení",
  "/portal/vitejte": "Vítejte",
};

function getPortalTitle(pathname: string) {
  if (pathname.startsWith("/portal/contracts/")) return "Detail smlouvy";
  return PORTAL_TITLES[pathname] || "Finatiq";
}

export function PortalTitleManager() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = `${getPortalTitle(pathname)} | Finatiq`;
  }, [pathname]);

  return null;
}
