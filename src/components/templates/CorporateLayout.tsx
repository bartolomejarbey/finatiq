"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LayoutNavItem } from "@/components/layouts/ClassicLayout";

interface CorporateLayoutProps {
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

const CORP = {
  bg: "#0A0A0A",
  bg2: "#111111",
  surface: "#1E1E1E",
  text: "#E6E3DE",
  muted: "#7A756E",
  dim: "#3A3835",
  accent: "#C8F560",
  r: "10px",
};

export function CorporateLayout({
  children,
  navItems,
  logoUrl,
  appName,
  accentColor,
  onLogout,
  bottomContent,
  logoSize = 40,
  logoShape = "original",
}: CorporateLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const accent = accentColor || CORP.accent;

  const basePath = navItems[0]?.href || "/";
  function isActive(href: string) {
    return href === basePath ? pathname === basePath : pathname.startsWith(href);
  }

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
      <div className="flex items-center gap-2.5">
        <div
          style={{
            width: 28,
            height: 28,
            background: accent,
            borderRadius: "4px",
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            fontSize: "0.6rem",
            color: CORP.bg,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {appName.substring(0, 2).toUpperCase()}
        </div>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.02em", color: CORP.text }}>
          {appName}
        </span>
      </div>
    );
  }

  function renderNav(closeSidebar?: () => void) {
    return navItems.map((item) => {
      const active = isActive(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={closeSidebar}
          className="flex items-center gap-2.5 px-3 py-2.5 transition-all"
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: active ? accent : CORP.muted,
            backgroundColor: active ? `${accent}10` : "transparent",
            borderRadius: CORP.r,
          }}
        >
          <span style={{ color: active ? accent : CORP.muted }}>
            <item.icon className="h-4 w-4" />
          </span>
          {item.label}
          {item.badge !== undefined && item.badge > 0 && (
            <span
              className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
              style={{ backgroundColor: accent, color: CORP.bg }}
            >
              {item.badge}
            </span>
          )}
        </Link>
      );
    });
  }

  return (
    <div className="flex h-screen" data-theme="dark" style={{ fontFamily: "'Syne', sans-serif" }}>
      {/* Mobile top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 px-4 md:hidden"
        style={{ background: CORP.bg2, borderBottom: `1px solid ${CORP.dim}` }}
      >
        <button onClick={() => setSidebarOpen(true)} style={{ color: CORP.text }}>
          <Menu className="h-6 w-6" />
        </button>
        {renderLogo(32)}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside
            className="relative flex h-full w-[220px] flex-col"
            style={{ background: CORP.bg2, borderRight: `1px solid ${CORP.dim}` }}
          >
            <div className="flex h-16 items-center justify-between px-4" style={{ borderBottom: `1px solid ${CORP.dim}` }}>
              {renderLogo(32)}
              <button onClick={() => setSidebarOpen(false)} style={{ color: CORP.muted }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {renderNav(() => setSidebarOpen(false))}
            </nav>
            {bottomContent}
            <div style={{ borderTop: `1px solid ${CORP.dim}`, padding: "12px" }}>
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors"
                style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: CORP.muted, borderRadius: "100px" }}
              >
                <LogOut className="h-4 w-4" />
                Odhlásit
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-[220px] shrink-0 flex-col"
        style={{ background: CORP.bg2, borderRight: `1px solid ${CORP.dim}` }}
      >
        <div className="px-4 py-5">
          {renderLogo()}
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {renderNav()}
        </nav>
        {bottomContent}
        <div style={{ borderTop: `1px solid ${CORP.dim}`, padding: "12px" }}>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 transition-colors"
            style={{ fontFamily: "'Syne', sans-serif", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: CORP.muted, borderRadius: "100px" }}
          >
            <LogOut className="h-4 w-4" />
            Odhlásit
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-14 md:pt-0" style={{ backgroundColor: CORP.bg }}>
        {children}
      </main>
    </div>
  );
}
