"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LayoutNavItem } from "@/components/layouts/ClassicLayout";

interface FintechLayoutProps {
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

const FT = {
  bg: "#060d1a",
  bg2: "#0b1629",
  bg3: "#0f2035",
  text: "#f0f4f8",
  muted: "rgba(240,244,248,0.5)",
  dim: "rgba(240,244,248,0.08)",
  cyan: "#22d3ee",
};

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const GRID_BG = "linear-gradient(rgba(240,244,248,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(240,244,248,0.02) 1px, transparent 1px)";

export function FintechLayout({
  children,
  navItems,
  logoUrl,
  appName,
  accentColor,
  onLogout,
  bottomContent,
  logoSize = 40,
  logoShape = "original",
}: FintechLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const accent = accentColor || FT.cyan;

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
      <span
        style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "4px", textTransform: "uppercase", color: FT.text }}
      >
        {appName}
      </span>
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
          className="relative flex items-center gap-2.5 px-3 py-2.5 text-sm transition-all"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.84rem",
            color: active ? accent : FT.muted,
            backgroundColor: active ? `${accent}15` : "transparent",
            clipPath: "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {active && (
            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "2px", background: accent }} />
          )}
          <span style={{ color: active ? accent : FT.muted }}>
            <item.icon className="h-4 w-4" />
          </span>
          {item.label}
          {item.badge !== undefined && item.badge > 0 && (
            <span
              className="ml-auto flex h-5 min-w-[20px] items-center justify-center px-1.5 text-[10px] font-bold"
              style={{ backgroundColor: accent, color: FT.bg, clipPath: "polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)" }}
            >
              {item.badge}
            </span>
          )}
        </Link>
      );
    });
  }

  return (
    <div className="flex h-screen" data-theme="dark" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Noise overlay */}
      <div
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, opacity: 0.02, backgroundImage: NOISE_SVG, backgroundSize: "128px" }}
      />

      {/* Mobile top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 px-4 md:hidden"
        style={{ background: FT.bg2, borderBottom: `1px solid ${FT.dim}` }}
      >
        <button onClick={() => setSidebarOpen(true)} style={{ color: FT.text }}>
          <Menu className="h-6 w-6" />
        </button>
        {renderLogo(32)}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside
            className="relative flex h-full w-[240px] flex-col"
            style={{ background: FT.bg2, borderRight: `1px solid ${FT.dim}` }}
          >
            <div className="flex h-16 items-center justify-between px-4" style={{ borderBottom: `1px solid ${FT.dim}` }}>
              {renderLogo(32)}
              <button onClick={() => setSidebarOpen(false)} style={{ color: FT.muted }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {renderNav(() => setSidebarOpen(false))}
            </nav>
            {bottomContent}
            <div style={{ borderTop: `1px solid ${FT.dim}`, padding: "12px" }}>
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors"
                style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.75rem", letterSpacing: "2px", textTransform: "uppercase", color: FT.muted }}
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
        className="hidden md:flex w-[240px] shrink-0 flex-col relative"
        style={{ background: FT.bg2, borderRight: `1px solid ${FT.dim}` }}
      >
        <div
          style={{ position: "absolute", inset: 0, pointerEvents: "none", background: GRID_BG, backgroundSize: "48px 48px" }}
        />
        <div className="flex h-16 items-center px-4 relative z-10" style={{ borderBottom: `1px solid ${FT.dim}` }}>
          {renderLogo()}
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 relative z-10">
          {renderNav()}
        </nav>
        {bottomContent && <div className="relative z-10">{bottomContent}</div>}
        <div className="relative z-10" style={{ borderTop: `1px solid ${FT.dim}`, padding: "12px" }}>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 transition-colors"
            style={{ fontFamily: "'Oswald', sans-serif", fontSize: "0.75rem", letterSpacing: "2px", textTransform: "uppercase", color: FT.muted }}
          >
            <LogOut className="h-4 w-4" />
            Odhlásit
          </button>
        </div>
      </aside>

      <main
        className="flex-1 overflow-auto pt-14 md:pt-0 relative"
        style={{ backgroundColor: FT.bg }}
      >
        <div
          style={{ position: "absolute", inset: 0, pointerEvents: "none", background: GRID_BG, backgroundSize: "48px 48px" }}
        />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
