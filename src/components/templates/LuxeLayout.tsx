"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LayoutNavItem } from "@/components/layouts/ClassicLayout";

interface LuxeLayoutProps {
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

const LUXE = {
  bg: "#f5f2ea",
  warm: "#e8e3d7",
  stone: "#cdc6b6",
  ink: "#141311",
  mid: "#7a756a",
  brass: "#9e7c4e",
};

export function LuxeLayout({
  children,
  navItems,
  logoUrl,
  appName,
  onLogout,
  bottomContent,
  logoSize = 40,
  logoShape = "original",
}: LuxeLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", letterSpacing: "3px", textTransform: "uppercase", color: LUXE.ink }}
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
          className={cn("flex items-center gap-3 px-3 py-3 text-sm transition-all")}
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "0.85rem",
            color: active ? LUXE.brass : LUXE.mid,
            borderLeft: active ? `2px solid ${LUXE.brass}` : "2px solid transparent",
            backgroundColor: active ? "rgba(158,124,78,0.06)" : "transparent",
          }}
        >
          <span style={{ color: active ? LUXE.brass : LUXE.mid }}>
            <item.icon className="h-4 w-4" />
          </span>
          {item.label}
          {item.badge !== undefined && item.badge > 0 && (
            <span
              className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: LUXE.brass }}
            >
              {item.badge}
            </span>
          )}
        </Link>
      );
    });
  }

  return (
    <div className="flex h-screen" data-theme="light" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Mobile top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 px-4 md:hidden"
        style={{ background: `rgba(245,242,234,0.9)`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${LUXE.stone}` }}
      >
        <button onClick={() => setSidebarOpen(true)} style={{ color: LUXE.ink }}>
          <Menu className="h-6 w-6" />
        </button>
        {renderLogo(32)}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
          <aside
            className="relative flex h-full w-[260px] flex-col"
            style={{ background: LUXE.bg, borderRight: `1px solid ${LUXE.stone}` }}
          >
            <div className="flex h-16 items-center justify-between px-6" style={{ borderBottom: `1px solid ${LUXE.stone}` }}>
              {renderLogo(40)}
              <button onClick={() => setSidebarOpen(false)} style={{ color: LUXE.mid }}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              {renderNav(() => setSidebarOpen(false))}
            </nav>
            {bottomContent}
            <div style={{ borderTop: `1px solid ${LUXE.stone}`, padding: "12px" }}>
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", letterSpacing: "2px", textTransform: "uppercase", color: LUXE.mid }}
              >
                <LogOut className="h-4 w-4" />
                Odhlásit se
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-[260px] shrink-0 flex-col"
        style={{ background: LUXE.bg, borderRight: `1px solid ${LUXE.stone}` }}
      >
        <div className="flex h-16 items-center px-6" style={{ borderBottom: `1px solid ${LUXE.stone}` }}>
          {renderLogo()}
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {renderNav()}
        </nav>
        {bottomContent}
        <div style={{ borderTop: `1px solid ${LUXE.stone}`, padding: "12px" }}>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 transition-colors"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.58rem", letterSpacing: "3px", textTransform: "uppercase", color: LUXE.mid }}
          >
            <LogOut className="h-4 w-4" />
            Odhlásit se
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-14 md:pt-0" style={{ backgroundColor: LUXE.bg }}>
        {children}
      </main>
    </div>
  );
}
