"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LayoutNavItem } from "./ClassicLayout";

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface ModernLayoutProps {
  children: React.ReactNode;
  navItems: LayoutNavItem[];
  logoUrl?: string | null;
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

export function ModernLayout({
  children,
  navItems,
  logoUrl,
  appName,
  primaryColor,
  sidebarBg,
  accentColor,
  onLogout,
  bottomContent,
  logoSize = 40,
  logoShape = "original",
}: ModernLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const basePath = navItems[0]?.href || "/";
  function isActive(href: string) {
    return href === basePath ? pathname === basePath : pathname.startsWith(href);
  }

  // Breadcrumb
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumb = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--color-background, #F8FAFC)" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-sm shadow-sm" style={{ backgroundColor: "color-mix(in srgb, var(--card-bg, #fff) 95%, transparent)", borderBottom: `2px solid ${primaryColor}` }}>
        <div className="flex h-14 items-center gap-4 px-4 md:px-6">
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Otevřít navigaci"
            className="md:hidden cursor-pointer"
            style={{ color: "var(--card-text-muted, #475569)" }}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} style={{ height: `${Math.min(logoSize, 32)}px`, objectFit: logoShape !== "original" ? "cover" : "contain", borderRadius: logoShape === "circle" ? "50%" : logoShape === "square" ? "4px" : "0", aspectRatio: logoShape !== "original" ? "1/1" : "auto" }} />
            ) : (
              <span className="text-lg font-bold" style={{ color: primaryColor }}>{appName}</span>
            )}
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto ml-6">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                    active
                      ? "font-medium"
                      : "hover:bg-[var(--table-hover)]"
                  )}
                  style={active ? { backgroundColor: hexToRgba(primaryColor, 0.12), color: primaryColor } : { color: "var(--card-text-muted, #475569)" }}
                >
                  <span style={active ? { color: primaryColor } : { color: "var(--card-text-dim, #9ca3af)" }}><item.icon className="h-4 w-4" /></span>
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <button onClick={onLogout} className="hidden md:flex items-center gap-1.5 text-sm ml-auto" style={{ color: "var(--card-text-muted, #64748b)" }}>
            <LogOut className="h-4 w-4" />Odhlásit
          </button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col shadow-xl" style={{ backgroundColor: "var(--card-bg, #fff)" }}>
            <div className="flex h-14 items-center justify-between px-4 border-b">
              {logoUrl ? (
                <img src={logoUrl} alt={appName} style={{ height: `${Math.min(logoSize, 32)}px`, objectFit: logoShape !== "original" ? "cover" : "contain", borderRadius: logoShape === "circle" ? "50%" : logoShape === "square" ? "4px" : "0", aspectRatio: logoShape !== "original" ? "1/1" : "auto" }} />
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
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
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
                      active
                        ? "font-medium"
                        : "hover:bg-[var(--table-hover)]"
                    )}
                    style={active ? { backgroundColor: hexToRgba(primaryColor, 0.12), color: primaryColor } : { color: "var(--card-text-muted, #475569)" }}
                  >
                    <span style={active ? { color: primaryColor } : { color: "var(--card-text-dim, #9ca3af)" }}><item.icon className="h-5 w-5" /></span>
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

      {/* Breadcrumb */}
      <div className="px-4 md:px-8 py-2 flex items-center gap-1 text-xs" style={{ color: "var(--card-text-muted, #64748b)" }}>
        {breadcrumb.map((b, i) => (
          <span key={b.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <Link href={b.href} aria-current={i === breadcrumb.length - 1 ? "page" : undefined} className="hover:opacity-80">{b.label}</Link>
          </span>
        ))}
      </div>

      <main className="flex-1 px-4 md:px-8 pb-8">
        {children}
      </main>
    </div>
  );
}
