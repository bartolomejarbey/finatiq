"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LayoutNavItem } from "./ClassicLayout";

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface MinimalLayoutProps {
  children: React.ReactNode;
  navItems: LayoutNavItem[];
  logoUrl?: string | null;
  logoIconUrl?: string | null;
  appName: string;
  primaryColor: string;
  sidebarBg?: string;
  accentColor: string;
  onLogout: () => void;
  bottomContent?: React.ReactNode;
  logoSize?: number;
  logoShape?: "original" | "square" | "circle";
  logoPosition?: "sidebar_top" | "sidebar_center" | "above_nav";
}

export function MinimalLayout({
  children,
  navItems,
  logoUrl,
  logoIconUrl,
  appName,
  primaryColor,
  sidebarBg,
  accentColor,
  onLogout,
  bottomContent,
  logoSize = 40,
  logoShape = "original",
}: MinimalLayoutProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const basePath = navItems[0]?.href || "/";
  function isActive(href: string) {
    return href === basePath ? pathname === basePath : pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen">
      {/* Mobile top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b px-4 md:hidden" style={{ backgroundColor: "var(--card-bg, #fff)" }}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Otevřít navigaci"
          className="cursor-pointer"
          style={{ color: "var(--card-text-muted, #475569)" }}
        >
          <Menu className="h-6 w-6" />
        </button>
        {logoUrl ? (
          <img src={logoUrl} alt={appName} style={{ height: `${Math.min(logoSize, 32)}px`, objectFit: logoShape !== "original" ? "cover" : "contain", borderRadius: logoShape === "circle" ? "50%" : logoShape === "square" ? "4px" : "0", aspectRatio: logoShape !== "original" ? "1/1" : "auto" }} />
        ) : (
          <span className="text-lg font-bold" style={{ color: primaryColor }}>{appName}</span>
        )}
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col shadow-xl" style={{ backgroundColor: "var(--card-bg, #fff)" }}>
            <div className="flex h-14 items-center justify-between px-4 border-b">
              {logoUrl ? (
                <img src={logoUrl} alt={appName} style={{ height: `${Math.min(logoSize, 32)}px`, objectFit: logoShape !== "original" ? "cover" : "contain", borderRadius: logoShape === "circle" ? "50%" : logoShape === "square" ? "4px" : "0", aspectRatio: logoShape !== "original" ? "1/1" : "auto", background: "transparent" }} />
              ) : (
                <span className="text-lg font-bold" style={{ color: primaryColor }}>{appName}</span>
              )}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Zavřít navigaci"
                className="cursor-pointer"
                style={{ color: "var(--card-text-dim, #94a3b8)" }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Hlavní navigace" className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "font-medium" : "hover:bg-[var(--table-hover)]"
                    )}
                    style={active ? { backgroundColor: hexToRgba(primaryColor, 0.12), color: primaryColor } : { color: "var(--card-text-muted, #475569)" }}
                  >
                    <span style={active ? { color: primaryColor } : { color: "var(--card-text-dim, #9ca3af)" }}><item.icon className="h-5 w-5" /></span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {bottomContent}
            <div className="border-t p-3">
              <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--table-hover)]" style={{ color: "var(--card-text-muted, #64748b)" }}>
                <LogOut className="h-5 w-5" />Odhlásit se
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop minimal sidebar */}
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col backdrop-blur-sm border-r transition-all duration-200 shadow-sm",
          expanded ? "w-60" : "w-[72px]"
        )}
        style={{ backgroundColor: "color-mix(in srgb, var(--card-bg, #fff) 95%, transparent)" }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="flex h-16 items-center justify-center px-3">
          {expanded ? (
            logoUrl ? (
              <img src={logoUrl} alt={appName} style={{ height: `${Math.min(logoSize, 32)}px`, objectFit: logoShape !== "original" ? "cover" : "contain", borderRadius: logoShape === "circle" ? "50%" : logoShape === "square" ? "4px" : "0", aspectRatio: logoShape !== "original" ? "1/1" : "auto", background: "transparent" }} />
            ) : (
              <span className="text-lg font-bold truncate" style={{ color: primaryColor }}>{appName}</span>
            )
          ) : (
            logoIconUrl ? (
              <img src={logoIconUrl} alt={appName} style={{ height: `${Math.min(logoSize, 32)}px`, width: `${Math.min(logoSize, 32)}px`, objectFit: "contain", borderRadius: logoShape === "circle" ? "50%" : logoShape === "square" ? "4px" : "0", background: "transparent" }} />
            ) : (
              <span className="text-xl font-bold" style={{ color: primaryColor }}>
                {appName.charAt(0)}
              </span>
            )
          )}
        </div>

        <nav aria-label="Hlavní navigace" className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!expanded ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-lg transition-colors relative",
                  expanded ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5",
                  active ? "font-medium" : "hover:bg-[var(--table-hover)]"
                )}
                style={active ? { backgroundColor: hexToRgba(primaryColor, 0.12), color: primaryColor } : { color: "var(--card-text-muted, #475569)" }}
              >
                <span style={active ? { color: primaryColor } : { color: "var(--card-text-dim, #9ca3af)" }}><item.icon className="h-5 w-5 shrink-0" /></span>
                {expanded && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
                      expanded ? "ml-auto" : "absolute -top-1 -right-1"
                    )}
                    style={{ backgroundColor: accentColor }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {expanded && bottomContent}

        <div className={cn("border-t p-2", expanded ? "px-3" : "")}>
          <button
            onClick={onLogout}
            title={!expanded ? "Odhlásit se" : undefined}
            className={cn(
              "flex w-full items-center rounded-lg text-sm font-medium transition-colors hover:bg-[var(--table-hover)]",
              expanded ? "gap-3 px-3 py-2.5" : "justify-center px-2 py-2.5"
            )}
            style={{ color: "var(--card-text-dim, #94a3b8)" }}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {expanded && "Odhlásit se"}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-14 md:pt-0 p-4 md:p-8" style={{ backgroundColor: "var(--color-background, #F8FAFC)" }}>
        {children}
      </main>
    </div>
  );
}
