"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { LogOut, Menu, X, ChevronDown } from "lucide-react";

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
  "Import klientů": "NÁSTROJE",
  "Spokojenost": "NÁSTROJE",
  "Sezónní připomínky": "NÁSTROJE",
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
  "Doporučení": "OSOBNÍ",
  "Přání": "OSOBNÍ",
  "Úspěchy": "OSOBNÍ",
  "Životní události": "OSOBNÍ",
  "Rodina": "OSOBNÍ",
  "Evidence": "DOKUMENTY",
  "Oznámení": "OZNÁMENÍ",
  "Články": "OBSAH",
  "Novinky": "OBSAH",
  "Kalendář": "NÁSTROJE",
};

/* Sections collapsed by default */
const DEFAULT_COLLAPSED = new Set(["OSOBNÍ", "OBSAH", "NÁSTROJE"]);

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

/* Scroll fade hook — returns whether nav can scroll further */
function useScrollFade(ref: React.RefObject<HTMLElement | null>) {
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function check() {
      if (!el) return;
      setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    }
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [ref]);

  return canScrollDown;
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
  const navRef = useRef<HTMLElement>(null);
  const canScrollDown = useScrollFade(navRef);

  // Collapsible sections — expand section that contains active page
  const basePath = navItems[0]?.href || "/";
  const sections = groupNavItems(navItems);

  function findActiveSection() {
    for (const section of sections) {
      for (const item of section.items) {
        if (isActive(item.href, basePath)) return section.label;
      }
    }
    return null;
  }

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    const initial = new Set(DEFAULT_COLLAPSED);
    // Auto-expand section with active page
    const activeSection = null; // will be set after first render
    if (activeSection) initial.delete(activeSection);
    return initial;
  });

  // On mount: expand section with active page
  useEffect(() => {
    const active = findActiveSection();
    if (active && collapsedSections.has(active)) {
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        next.delete(active);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleSection(label: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  const dark = isDark(sidebarBg);
  const textColor = sidebarText || (dark ? "#9CA3AF" : "#374151");
  const activeTextColor = sidebarActiveText || (dark ? "#F9FAFB" : "#111827");
  const borderColor = dark ? "rgba(255,255,255,0.08)" : "var(--card-border, #E2E8F0)";
  const hoverBg = dark ? "rgba(255,255,255,0.06)" : "var(--table-hover, #F9FAFB)";
  const sectionLabelColor = dark ? "rgba(255,255,255,0.35)" : "var(--card-text-dim, #9CA3AF)";
  const logoutColor = dark ? "rgba(255,255,255,0.4)" : "var(--card-text-muted, #6B7280)";
  const contentBg = mainBg || "var(--color-background, #f8fafc)";
  const activeBg = hexToRgba(primaryColor, dark ? 0.2 : 0.1);
  const activeBorderColor = dark ? activeTextColor : primaryColor;
  const focusRingColor = dark ? "rgba(255,255,255,0.4)" : primaryColor;

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
      <span className="text-lg font-semibold tracking-tight" style={{ color: primaryColor }}>{appName}</span>
    );
  }

  function isActive(href: string, base: string) {
    return href === base ? pathname === base : pathname.startsWith(href);
  }

  // CSS custom properties for dynamic hover/focus (avoids JS hover handlers)
  const sidebarCssVars = {
    "--sb-hover": hoverBg,
    "--sb-active-bg": activeBg,
    "--sb-active-border": activeBorderColor,
    "--sb-focus-ring": focusRingColor,
    "--sb-text": textColor,
    "--sb-active-text": dark ? activeTextColor : primaryColor,
  } as React.CSSProperties;

  function renderNav(closeSidebar?: () => void) {
    return sections.map((section) => {
      const isCollapsed = collapsedSections.has(section.label);
      const hasActiveItem = section.items.some((item) => isActive(item.href, basePath));
      const isCollapsible = DEFAULT_COLLAPSED.has(section.label) || section.items.length > 3;

      return (
        <div key={section.label}>
          {isCollapsible ? (
            <button
              type="button"
              onClick={() => toggleSection(section.label)}
              className="flex w-full items-center justify-between px-6 mt-4 mb-1 cursor-pointer group"
              aria-expanded={!isCollapsed}
            >
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: sectionLabelColor }}
              >
                {section.label}
                {hasActiveItem && isCollapsed && (
                  <span
                    className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </span>
              <ChevronDown
                className="h-3 w-3 transition-transform duration-200"
                style={{
                  color: sectionLabelColor,
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                }}
                aria-hidden="true"
              />
            </button>
          ) : (
            <p
              className="px-6 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: sectionLabelColor }}
            >
              {section.label}
            </p>
          )}
          {!isCollapsed && (
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, basePath);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeSidebar}
                    aria-current={active ? "page" : undefined}
                    className="sidebar-nav-link flex items-center gap-3 mx-2 px-3 py-2 rounded-md text-sm transition-colors duration-150 outline-none"
                    style={{
                      backgroundColor: active ? activeBg : undefined,
                      color: active ? (dark ? activeTextColor : primaryColor) : textColor,
                      fontWeight: active ? 500 : undefined,
                      borderLeft: active ? `3px solid ${activeBorderColor}` : "3px solid transparent",
                    }}
                  >
                    <span
                      style={{ color: active ? (dark ? activeTextColor : primaryColor) : textColor }}
                      aria-hidden="true"
                    >
                      <item.icon className="h-4.5 w-4.5" />
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
          )}
        </div>
      );
    });
  }

  return (
    <>
      {/* Scoped CSS for hover/focus (avoids JS handlers, uses CSS custom properties) */}
      <style>{`
        .sidebar-nav-link:hover:not([aria-current="page"]) {
          background-color: var(--sb-hover) !important;
        }
        .sidebar-nav-link:focus-visible {
          box-shadow: 0 0 0 2px var(--sb-focus-ring);
        }
      `}</style>

      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:outline-none"
        style={{ backgroundColor: primaryColor }}
      >
        Přeskočit na obsah
      </a>

      <div className="flex h-screen" style={sidebarCssVars}>
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
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
          {renderLogo(32)}
        </header>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden" style={{ overscrollBehavior: "contain" }}>
            <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <aside
              className="relative flex h-full w-[260px] flex-col"
              style={{ backgroundColor: sidebarBg, overscrollBehavior: "contain" }}
            >
              <div
                className="flex h-14 items-center justify-between px-6 shrink-0"
                style={{ borderBottom: `1px solid ${borderColor}` }}
              >
                {renderLogo(36)}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Zavřít navigaci"
                  className="cursor-pointer transition-opacity duration-150 hover:opacity-70"
                  style={{ color: textColor }}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <nav aria-label="Hlavní navigace" className="flex-1 overflow-y-auto py-2" style={{ overscrollBehavior: "contain" }}>
                {renderNav(() => setSidebarOpen(false))}
              </nav>
              {bottomContent && <div className="px-3 pb-2 shrink-0">{bottomContent}</div>}
              <div style={{ borderTop: `1px solid ${borderColor}` }} className="shrink-0 px-3 py-3">
                <button
                  onClick={onLogout}
                  className="sidebar-nav-link flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer outline-none"
                  style={{ color: dark ? "rgba(255,255,255,0.4)" : "var(--card-text-muted, #6B7280)" }}
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />Odhlásit se
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
            <div className="flex h-14 items-center px-6 shrink-0" style={{ borderBottom: `1px solid ${borderColor}` }}>
              {renderLogo()}
            </div>
          )}

          {/* Nav with scroll fade */}
          <div className="relative flex-1 min-h-0">
            <nav
              ref={navRef}
              aria-label="Hlavní navigace"
              className="h-full overflow-y-auto py-2"
              style={{ overscrollBehavior: "contain" }}
            >
              {logoPosition === "above_nav" && (
                <div className="px-6 pb-4 pt-2">
                  {renderLogo()}
                </div>
              )}
              {renderNav()}
            </nav>

            {/* Scroll fade indicator */}
            {canScrollDown && (
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-8"
                style={{
                  background: `linear-gradient(to bottom, transparent, ${sidebarBg})`,
                }}
                aria-hidden="true"
              />
            )}
          </div>

          {logoPosition === "sidebar_center" && (
            <div className="flex items-center justify-center px-6 py-4 shrink-0" style={{ borderTop: `1px solid ${borderColor}` }}>
              {renderLogo()}
            </div>
          )}
          {bottomContent && <div className="px-3 pb-2 shrink-0">{bottomContent}</div>}

          {/* Sticky logout footer */}
          <div style={{ borderTop: `1px solid ${borderColor}` }} className="shrink-0 px-3 py-3">
            <button
              onClick={onLogout}
              className="sidebar-nav-link flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer outline-none"
              style={{ color: dark ? "rgba(255,255,255,0.4)" : "var(--card-text-muted, #6B7280)" }}
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />Odhlásit se
            </button>
          </div>
        </aside>

        <main id="main-content" className="flex-1 overflow-auto pt-14 md:pt-0" style={{ backgroundColor: contentBg }}>
          {children}
        </main>
      </div>
    </>
  );
}
