"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  Receipt,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  MessageSquare,
  AlertTriangle,
  Server,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SuperadminChatWidget } from "@/components/SuperadminChatWidget";

/* ───── Typy ───── */

type SuperadminRole = "owner" | "support" | "sales" | "tech";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: SuperadminRole[];
  badgeCount?: number;
}

/* ───── Navigace ───── */

function buildNavItems(openTicketCount: number): NavItem[] {
  return [
    {
      href: "/superadmin",
      label: "Přehled",
      icon: LayoutDashboard,
      roles: ["owner", "support", "sales", "tech"],
    },
    {
      href: "/superadmin/tikety",
      label: "Tikety",
      icon: MessageSquare,
      roles: ["owner", "support"],
      badgeCount: openTicketCount,
    },
    {
      href: "/superadmin/poradci",
      label: "Poradci",
      icon: Users,
      roles: ["owner", "support", "sales"],
    },
    {
      href: "/superadmin/fakturace",
      label: "Fakturace",
      icon: Receipt,
      roles: ["owner", "sales"],
    },
    {
      href: "/superadmin/plany",
      label: "Cenové plány",
      icon: CreditCard,
      roles: ["owner", "sales"],
    },
    {
      href: "/superadmin/chyby",
      label: "Chyby",
      icon: AlertTriangle,
      roles: ["owner", "tech"],
    },
    {
      href: "/superadmin/system",
      label: "Systém",
      icon: Server,
      roles: ["owner", "support", "tech"],
    },
    {
      href: "/superadmin/audit-log",
      label: "Audit log",
      icon: ScrollText,
      roles: ["owner", "tech"],
    },
    {
      href: "/superadmin/tym",
      label: "Tým",
      icon: Users,
      roles: ["owner"],
    },
    {
      href: "/superadmin/nastaveni",
      label: "Nastavení",
      icon: Settings,
      roles: ["owner"],
    },
  ];
}

/* ───── Layout ───── */

export default function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [superadminRole, setSuperadminRole] = useState<SuperadminRole>("owner");
  const [openTicketCount, setOpenTicketCount] = useState(0);

  useEffect(() => {
    async function fetchRoleAndTickets() {
      const supabase = createClient();

      // Načíst roli superadmina
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("superadmin_profiles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (profile?.role) {
          setSuperadminRole(profile.role as SuperadminRole);
        }
      }

      // Počet otevřených tiketů
      const { count } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "open");

      setOpenTicketCount(count || 0);
    }
    fetchRoleAndTickets();
  }, []);

  const navItems = buildNavItems(openTicketCount).filter((item) =>
    item.roles.includes(superadminRole)
  );

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function renderNavItems(closeSidebar?: () => void) {
    return navItems.map((item) => {
      const isActive =
        item.href === "/superadmin"
          ? pathname === "/superadmin"
          : pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={closeSidebar}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-white/10 text-white border-l-2 border-blue-400"
              : "text-slate-400 hover:bg-white/5 hover:text-white"
          )}
        >
          <item.icon className="h-5 w-5" />
          <span className="flex-1">{item.label}</span>
          {item.badgeCount !== undefined && item.badgeCount > 0 && (
            <Badge className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 min-w-[20px] text-center">
              {item.badgeCount}
            </Badge>
          )}
        </Link>
      );
    });
  }

  function renderLogoutButton() {
    return (
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Odhlásit se
        </button>
      </div>
    );
  }

  function renderHeader() {
    return (
      <>
        <span className="text-xl font-bold tracking-tight">FinAdvisor</span>
        <span className="ml-2 rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
          Admin
        </span>
      </>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b bg-[#0F172A] px-4 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="text-white">
          <Menu className="h-6 w-6" />
        </button>
        <span className="text-lg font-bold text-white">FinAdvisor</span>
        <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
          Admin
        </span>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex h-full w-64 flex-col bg-[#0F172A] text-white">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center">{renderHeader()}</div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              {renderNavItems(() => setSidebarOpen(false))}
            </nav>
            {renderLogoutButton()}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#0F172A] text-white">
        <div className="flex h-16 items-center px-6">{renderHeader()}</div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {renderNavItems()}
        </nav>
        {renderLogoutButton()}
      </aside>

      <main className="flex-1 overflow-auto bg-slate-50 pt-14 md:pt-0 p-4 md:p-8">
        {children}
        <SuperadminChatWidget />
      </main>
    </div>
  );
}
