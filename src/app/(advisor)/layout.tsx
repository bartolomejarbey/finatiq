"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeProvider, useTheme, useThemeLoading } from "@/lib/theme/ThemeProvider";
import { ClassicLayout } from "@/components/layouts/ClassicLayout";
import { ModernLayout } from "@/components/layouts/ModernLayout";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import type { LayoutNavItem } from "@/components/layouts/ClassicLayout";
import { TicketModal } from "@/components/ticket-modal";
import {
  LayoutDashboard, Kanban, Users, ClipboardList, Bell, Zap,
  FileText, Megaphone, CalendarDays, Settings, BookOpen,
  Newspaper, CalendarClock, Upload, Star, HelpCircle,
} from "lucide-react";

interface NavDef {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: "reminder" | "contracts";
  moduleKey?: string;
}

const NAV_DEFS: NavDef[] = [
  { href: "/advisor", label: "Přehled", icon: LayoutDashboard },
  { href: "/advisor/crm/pipeline", label: "Obchodní příležitosti", icon: Kanban, moduleKey: "crm" },
  { href: "/advisor/clients", label: "Klienti", icon: Users },
  { href: "/advisor/smlouvy-klientu", label: "Nové smlouvy", icon: ClipboardList, badge: "contracts" },
  { href: "/advisor/pripominky", label: "Připomínky", icon: Bell, badge: "reminder" },
  { href: "/advisor/automatizace", label: "Automatizace", icon: Zap, moduleKey: "automations" },
  { href: "/advisor/sablony", label: "Šablony", icon: FileText, moduleKey: "templates" },
  { href: "/advisor/campaigns", label: "Kampaně", icon: Megaphone, moduleKey: "meta_ads" },
  { href: "/advisor/clanky", label: "Články", icon: BookOpen },
  { href: "/advisor/novinky", label: "Novinky", icon: Newspaper },
  { href: "/advisor/sezonni", label: "Sezónní připomínky", icon: CalendarClock },
  { href: "/advisor/spokojenost", label: "Spokojenost", icon: Star },
  { href: "/advisor/import", label: "Import klientů", icon: Upload },
  { href: "/advisor/kalendar", label: "Kalendář", icon: CalendarDays, moduleKey: "calendar" },
  { href: "/advisor/settings", label: "Nastavení", icon: Settings },
];

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="text-sm font-medium text-slate-500">Načítání...</p>
      </div>
    </div>
  );
}

function AdvisorLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const theme = useTheme();
  const themeLoading = useThemeLoading();
  const [reminderCount, setReminderCount] = useState(0);
  const [newContractsCount, setNewContractsCount] = useState(0);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [featureTrials, setFeatureTrials] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    async function fetchCounts() {
      const [reminders, contracts] = await Promise.all([
        supabase
          .from("reminders")
          .select("*", { count: "exact", head: true })
          .eq("is_completed", false)
          .lte("due_date", new Date().toISOString()),
        supabase
          .from("contracts")
          .select("*", { count: "exact", head: true })
          .eq("client_uploaded", true)
          .eq("processing_status", "new"),
      ]);
      setReminderCount(reminders.count || 0);
      setNewContractsCount(contracts.count || 0);

      const { data: adv } = await supabase.from("advisors").select("enabled_modules, feature_trials").single();
      if (adv?.enabled_modules) setEnabledModules(adv.enabled_modules);
      if (adv?.feature_trials) setFeatureTrials(adv.feature_trials);
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
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
      if (!item.moduleKey) return true;
      if (enabledModules[item.moduleKey] === true) return true;
      const trialExpiry = featureTrials[item.moduleKey];
      if (trialExpiry && new Date(trialExpiry) > new Date()) return true;
      return false;
    })
    .map((item) => ({
      href: item.href,
      label: item.label,
      icon: item.icon,
      badge: item.badge === "reminder" ? reminderCount : item.badge === "contracts" ? newContractsCount : undefined,
    }));

  const bottomContent = (
    <div className="px-3 pb-2">
      <button
        onClick={() => setTicketOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
      >
        <HelpCircle className="h-5 w-5" />
        Potřebuji pomoc
      </button>
    </div>
  );

  const tpl = theme.template;

  const layoutProps = {
    navItems,
    logoUrl: theme.logoUrl,
    logoIconUrl: theme.logoIconUrl,
    appName: theme.appName,
    primaryColor: theme.primary,
    sidebarBg: tpl.sidebarBg,
    sidebarText: tpl.sidebarText,
    sidebarActiveText: tpl.sidebarActiveText,
    accentColor: theme.accent,
    mainBg: tpl.mainBg,
    mainText: tpl.mainText,
    onLogout: handleLogout,
    bottomContent,
    logoSize: theme.logoSize,
    logoShape: theme.logoShape,
    logoPosition: theme.logoPosition,
  };

  if (themeLoading) return <LoadingScreen />;

  const layout = theme.advisorLayout;
  let content: React.ReactNode;
  if (layout === "modern") {
    content = <ModernLayout {...layoutProps}>{children}</ModernLayout>;
  } else if (layout === "minimal") {
    content = <MinimalLayout {...layoutProps}>{children}</MinimalLayout>;
  } else {
    content = <ClassicLayout {...layoutProps}>{children}</ClassicLayout>;
  }

  return (
    <>
      {content}
      <TicketModal open={ticketOpen} onOpenChange={setTicketOpen} />
    </>
  );
}

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AdvisorLayoutInner>{children}</AdvisorLayoutInner>
    </ThemeProvider>
  );
}
