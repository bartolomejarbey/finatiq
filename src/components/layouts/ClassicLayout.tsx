"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export interface LayoutNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface ClassicLayoutProps {
  children: React.ReactNode;
  navItems: LayoutNavItem[];
  logoUrl?: string | null;
  logoIconUrl?: string | null;
  appName: string;
  primaryColor: string;
  sidebarBg: string;
  sidebarText?: string;
  sidebarActiveText?: string;
  accentColor: string;
  mainBg?: string;
  mainText?: string;
  onLogout: () => void;
  bottomContent?: React.ReactNode;
  logoSize?: number;
  logoShape?: "original" | "square" | "circle";
  logoPosition?: "sidebar_top" | "sidebar_center" | "above_nav";
}

/* Group nav items into sections */
const SECTION_MAP: Record<string, string> = {
  "Přehled": "PŘEHLED",
  "Obchodní příležitosti": "PŘEHLED",
  "Klienti": "PŘEHLED",
  "Nové smlouvy": "PŘEHLED",
  "Připomínky": "PŘEHLED",
  "Automatizace": "NÁSTROJE",
  "Šablony": "NÁSTROJE",
  "Kampaně": "NÁSTROJE",
  "Články": "NÁSTROJE",
  "Novinky": "NÁSTROJE",
  "Sezónní připomínky": "NÁSTROJE",
  "Spokojenost": "NÁSTROJE",
  "Import klientů": "NÁSTROJE",
  "Kalendář": "NÁSTROJE",
  "Nastavení": "NASTAVENÍ",
  "Finanční přehled": "PŘEHLED",
  "Smlouvy": "FINANCE",
  "Platby": "FINANCE",
  "Investice": "FINANCE",
  "Finanční plán": "FINANCE",
  "Finanční zdraví": "FINANCE",
  "Kalkulačky": "FINANCE",
  "Scénáře": "FINANCE",
  "Pojistné krytí": "FINANCE",
  "Dokumenty": "DOKUMENTY",
  "Trezor": "DOKUMENTY",
  "Doporučení": "DOKUMENTY",
  "Přání": "DOKUMENTY",
  "Úspěchy": "DOKUMENTY",
  "Životní události": "DOKUMENTY",
  "Rodina": "DOKUMENTY",
  "Evidence": "DOKUMENTY",
  "Oznámení": "DOKUMENTY",
};

function groupNavItems(items: LayoutNavItem[]) {
  const sectionMap = new Map<string, LayoutNavItem[]>();
  const sectionOrder: string[] = [];

  items.forEach((item) => {
    const section = SECTION_MAP[item.label] || "OSTATNÍ";
    if (!sectionMap.has(section)) {
      sectionMap.set(section, []);
      sectionOrder.push(section);
    }
    sectionMap.get(section)!.push(item);
  });

  return sectionOrder.map((label) => ({ label, items: sectionMap.get(label)! }));
}

/* Determine if a background color is dark */
function isDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export function ClassicLayout({
  children,
  navItems,
  logoUrl,
  appName,
  primaryColor,
  sidebarBg,
  sidebarText,
  sidebarActiveText,
  accentColor,
  mainBg,
  onLogout,
  bottomContent,
  logoSize = 40,
  logoShape = "original",
  logoPosition = "sidebar_top",
}: ClassicLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const dark = isDark(sidebarBg);
  const textColor = sidebarText || (dark ? "#9CA3AF" : "#374151");
  const activeTextColor = sidebarActiveText || (dark ? "#F9FAFB" : "#111827");
  const borderColor = dark ? "rgba(255,255,255,0.08)" : "var(--card-border, #E2E8F0)";
  const hoverBg = dark ? "rgba(255,255,255,0.05)" : "var(--table-hover, #F9FAFB)";
  const sectionLabelColor = dark ? "rgba(255,255,255,0.3)" : "var(--card-text-dim, #9CA3AF)";
  const logoutColor = dark ? "rgba(255,255,255,0.4)" : "var(--card-text-muted, #6B7280)";
  const logoutHoverBg = dark ? "rgba(255,255,255,0.05)" : "var(--table-hover, #F9FAFB)";
  const contentBg = mainBg || "var(--color-background, #f8fafc)";

  const logoStyle: React.CSSProperties = {
    height: `${Math.min(logoSize, 48)}px`,
    objectFit: logoShape !== "original" ? "cover" : "contain",
    borderRadius: logoShape === "circle" ? "50%" : logoShape === "square" ? "4px" : "0",
    aspectRatio: logoShape !== "original" ? "1/1" : "auto",
  };

  function renderLogo(maxH?: number) {
    const style = maxH ? { ...logoStyle, height: `${Math.min(logoSize, maxH)}px` } : logoStyle;
    return logoUrl ? (
      <img src={logoUrl} alt={appName} style={style} />
    ) : (
      <span className="text-xl font-bold" style={{ color: primaryColor }}>{appName}</span>
    );
  }

  function isActive(href: string, basePath: string) {
    return href === basePath ? pathname === basePath : pathname.startsWith(href);
  }

  const basePath = navItems[0]?.href || "/";
  const sections = groupNavItems(navItems);

  function renderNav(closeSidebar?: () => void) {
    return sections.map((section) => (
      <div key={section.label}>
        <p
          className="px-6 mt-6 mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: sectionLabelColor }}
        >
          {section.label}
        </p>
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const active = isActive(item.href, basePath);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                aria-current={active ? "page" : undefined}
                className="flex items-center gap-3 mx-3 px-3 py-2.5 rounded-md text-sm transition-colors duration-150"
                style={
                  active
                    ? {
                        backgroundColor: hexToRgba(primaryColor, dark ? 0.2 : 0.1),
                        color: dark ? activeTextColor : primaryColor,
                        fontWeight: 500,
                      }
                    : {
                        color: textColor,
                      }
                }
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span style={{ color: active ? (dark ? activeTextColor : primaryColor) : textColor }}>
                  <item.icon className="h-5 w-5" />
                </span>
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    ));
  }

  return (
    <div className="flex h-screen">
      {/* Mobile top bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 px-4 md:hidden"
        style={{ backgroundColor: sidebarBg, borderBottom: `1px solid ${borderColor}` }}
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Otevřít navigaci"
          style={{ color: textColor }}
          className="cursor-pointer"
        >
          <Menu className="h-6 w-6" />
        </button>
        {renderLogo(32)}
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex h-full w-[260px] flex-col" style={{ backgroundColor: sidebarBg }}>
            <div
              className="flex h-16 items-center justify-between px-6"
              style={{ borderBottom: `1px solid ${borderColor}` }}
            >
              {renderLogo(40)}
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Zavřít navigaci"
                className="cursor-pointer transition-opacity duration-150 hover:opacity-70"
                style={{ color: textColor }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Hlavní navigace" className="flex-1 overflow-y-auto py-2">
              {renderNav(() => setSidebarOpen(false))}
            </nav>
            {bottomContent && <div className="px-3 pb-2">{bottomContent}</div>}
            <div style={{ borderTop: `1px solid ${borderColor}` }} className="pt-4 mt-4 px-3 pb-3">
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer"
                style={{ color: logoutColor }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = logoutHoverBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <LogOut className="h-5 w-5" />Odhlásit se
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-[260px] shrink-0 flex-col"
        style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${borderColor}` }}
      >
        {logoPosition === "sidebar_top" && (
          <div className="flex h-16 items-center px-6" style={{ borderBottom: `1px solid ${borderColor}` }}>
            {renderLogo()}
          </div>
        )}
        <nav aria-label="Hlavní navigace" className="flex-1 overflow-y-auto py-2">
          {logoPosition === "above_nav" && (
            <div className="px-6 pb-4 pt-2">
              {renderLogo()}
            </div>
          )}
          {renderNav()}
        </nav>
        {logoPosition === "sidebar_center" && (
          <div className="flex items-center justify-center px-6 py-4" style={{ borderTop: `1px solid ${borderColor}` }}>
            {renderLogo()}
          </div>
        )}
        {bottomContent && <div className="px-3 pb-2">{bottomContent}</div>}
        <div style={{ borderTop: `1px solid ${borderColor}` }} className="pt-4 mt-4 px-3 pb-3">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer"
            style={{ color: logoutColor }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = logoutHoverBg; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <LogOut className="h-5 w-5" />Odhlásit se
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-14 md:pt-0" style={{ backgroundColor: contentBg }}>
        {children}
      </main>
    </div>
  );
}
