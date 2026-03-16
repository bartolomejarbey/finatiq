"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeProvider, useTheme, useThemeLoading } from "@/lib/theme/ThemeProvider";
import { ClassicLayout } from "@/components/layouts/ClassicLayout";
import { ModernLayout } from "@/components/layouts/ModernLayout";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import type { LayoutNavItem } from "@/components/layouts/ClassicLayout";
import {
  LayoutDashboard, FileText, CreditCard, TrendingUp, Target,
  FolderOpen, CalendarDays, Calculator, Bell, Gauge, Heart,
  CalculatorIcon, GitBranch, Shield, Share2, Star, BookOpen,
  Newspaper, Award, Lock, HeartHandshake, Users, Settings,
} from "lucide-react";

interface NavDef {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "notifications";
  osvcOnly?: boolean;
  moduleKey?: string;
}

const NAV_DEFS: NavDef[] = [
  { href: "/portal", label: "Přehled", icon: LayoutDashboard },
  { href: "/portal/cockpit", label: "Finanční přehled", icon: Gauge },
  { href: "/portal/contracts", label: "Smlouvy", icon: FileText },
  { href: "/portal/payments", label: "Platby", icon: CreditCard },
  { href: "/portal/investments", label: "Investice", icon: TrendingUp },
  { href: "/portal/goals", label: "Finanční plán", icon: Target },
  { href: "/portal/zdravi", label: "Finanční zdraví", icon: Heart },
  { href: "/portal/kalkulacky", label: "Kalkulačky", icon: CalculatorIcon },
  { href: "/portal/scenare", label: "Scénáře", icon: GitBranch },
  { href: "/portal/ochrana", label: "Pojistné krytí", icon: Shield },
  { href: "/portal/documents", label: "Dokumenty", icon: FolderOpen },
  { href: "/portal/trezor", label: "Trezor", icon: Lock },
  { href: "/portal/doporuceni", label: "Doporučení", icon: Share2 },
  { href: "/portal/prani", label: "Přání", icon: Star },
  { href: "/portal/clanky", label: "Články", icon: BookOpen },
  { href: "/portal/novinky", label: "Novinky", icon: Newspaper },
  { href: "/portal/uspechy", label: "Úspěchy", icon: Award },
  { href: "/portal/zivotni-udalosti", label: "Životní události", icon: HeartHandshake },
  { href: "/portal/rodina", label: "Rodina", icon: Users },
  { href: "/portal/kalendar", label: "Kalendář", icon: CalendarDays, moduleKey: "calendar" },
  { href: "/portal/evidence", label: "Evidence", icon: Calculator, osvcOnly: true, moduleKey: "osvc" },
  { href: "/portal/notifications", label: "Oznámení", icon: Bell, badge: "notifications" },
  { href: "/portal/nastaveni", label: "Nastavení", icon: Settings },
];

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: "var(--color-background, #F8FAFC)" }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4"
          style={{ borderColor: "var(--card-border, #e2e8f0)" }}
          style={{ borderTopColor: "var(--color-primary, #2563EB)" }}
        />
        <p className="text-sm font-medium text-gray-500">Načítání...</p>
      </div>
    </div>
  );
}

function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const theme = useTheme();
  const themeLoading = useThemeLoading();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOsvc, setIsOsvc] = useState(false);
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const supabase = createClient();
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: client } = await supabase.from("clients").select("id, is_osvc, advisor_id").eq("user_id", user.id).single();
      if (!client) return;
      setIsOsvc(client.is_osvc || false);
      const { data: adv } = await supabase.from("advisors").select("enabled_modules").eq("id", client.advisor_id).single();
      if (adv?.enabled_modules) setEnabledModules(adv.enabled_modules);
      const { count } = await supabase
        .from("client_notifications")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItems: LayoutNavItem[] = NAV_DEFS
    .filter((item) => {
      if (item.osvcOnly && (!isOsvc || enabledModules.osvc === false)) return false;
      if (item.moduleKey && !item.osvcOnly && enabledModules[item.moduleKey] === false) return false;
      return true;
    })
    .map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      badge: item.badge === "notifications" ? unreadCount : undefined,
    }));

  const layoutProps = {
    navItems,
    logoUrl: theme.logoUrl,
    logoIconUrl: theme.logoIconUrl,
    appName: theme.appName,
    primaryColor: theme.primary,
    sidebarBg: theme.secondary || theme.primary,
    accentColor: theme.accent,
    onLogout: handleLogout,
    logoSize: theme.logoSize,
    logoShape: theme.logoShape,
    logoPosition: theme.logoPosition,
  };

  if (themeLoading) return <LoadingScreen />;

  if (theme.clientLayout === "modern") {
    return <ModernLayout {...layoutProps}>{children}</ModernLayout>;
  }
  if (theme.clientLayout === "minimal") {
    return <MinimalLayout {...layoutProps}>{children}</MinimalLayout>;
  }
  return <ClassicLayout {...layoutProps}>{children}</ClassicLayout>;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ClientLayoutInner>{children}</ClientLayoutInner>
    </ThemeProvider>
  );
}
