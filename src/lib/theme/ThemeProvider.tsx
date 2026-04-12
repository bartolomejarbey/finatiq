"use client";

import { useEffect, useState, useCallback, useRef, createContext, useContext } from "react";
import { createClient } from "@/lib/supabase/client";

/* ── Template definitions ── */

export interface TemplateConfig {
  id: string;
  sidebarBg: string;
  sidebarText: string;
  sidebarActiveText: string;
  mainBg: string;
  mainText: string;
  cardBg: string;
  cardText: string;
  cardTextMuted: string;
  cardTextDim: string;
  cardBorder: string;
  tableHeader: string;
  tableHover: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  skeletonBg: string;
}

export const TEMPLATES: Record<string, TemplateConfig> = {
  clean: {
    id: "clean",
    sidebarBg: "#FFFFFF",
    sidebarText: "#374151",
    sidebarActiveText: "#111827",
    mainBg: "#F8FAFC",
    mainText: "#0F172A",
    cardBg: "#FFFFFF",
    cardText: "#111827",
    cardTextMuted: "#6B7280",
    cardTextDim: "#9CA3AF",
    cardBorder: "#E2E8F0",
    tableHeader: "#F9FAFB",
    tableHover: "#F9FAFB",
    inputBg: "#FFFFFF",
    inputBorder: "#D1D5DB",
    inputText: "#111827",
    inputPlaceholder: "#9CA3AF",
    skeletonBg: "#E5E7EB",
  },
  luxe: {
    id: "luxe",
    sidebarBg: "#1C1917",
    sidebarText: "#A8A29E",
    sidebarActiveText: "#FAFAF9",
    mainBg: "#FFFBF5",
    mainText: "#1C1917",
    cardBg: "#FFFFFF",
    cardText: "#1C1917",
    cardTextMuted: "#78716C",
    cardTextDim: "#A8A29E",
    cardBorder: "#D6D3D1",
    tableHeader: "#FAF9F7",
    tableHover: "#FAF9F7",
    inputBg: "#FFFFFF",
    inputBorder: "#D6D3D1",
    inputText: "#1C1917",
    inputPlaceholder: "#A8A29E",
    skeletonBg: "#E7E5E4",
  },
  fintech: {
    id: "fintech",
    sidebarBg: "#020617",
    sidebarText: "#64748B",
    sidebarActiveText: "#F8FAFC",
    mainBg: "#0F172A",
    mainText: "#F8FAFC",
    cardBg: "#1E293B",
    cardText: "#F1F5F9",
    cardTextMuted: "#94A3B8",
    cardTextDim: "#64748B",
    cardBorder: "#334155",
    tableHeader: "#0F172A",
    tableHover: "#334155",
    inputBg: "#0F172A",
    inputBorder: "#334155",
    inputText: "#F1F5F9",
    inputPlaceholder: "#64748B",
    skeletonBg: "#334155",
  },
  corporate: {
    id: "corporate",
    sidebarBg: "#111827",
    sidebarText: "#9CA3AF",
    sidebarActiveText: "#F9FAFB",
    mainBg: "#F9FAFB",
    mainText: "#111827",
    cardBg: "#FFFFFF",
    cardText: "#111827",
    cardTextMuted: "#6B7280",
    cardTextDim: "#9CA3AF",
    cardBorder: "#E5E7EB",
    tableHeader: "#F3F4F6",
    tableHover: "#F3F4F6",
    inputBg: "#FFFFFF",
    inputBorder: "#D1D5DB",
    inputText: "#111827",
    inputPlaceholder: "#9CA3AF",
    skeletonBg: "#E5E7EB",
  },
};

const DEFAULT_TEMPLATE = TEMPLATES.clean;

/* ── Theme values ── */

export interface ThemeValues {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  font: string;
  fontSize: "small" | "medium" | "large";
  borderRadius: "sharp" | "medium" | "rounded";
  mode: "light" | "dark";
  logoUrl: string | null;
  logoIconUrl: string | null;
  companyName: string;
  appName: string;
  clientLayout: "classic" | "modern" | "minimal";
  advisorLayout: "classic" | "modern" | "minimal";
  customWelcomeText: string | null;
  loginSlug: string | null;
  customLoginTitle: string | null;
  customLoginSubtitle: string | null;
  logoSize: number;
  logoShape: "original" | "square" | "circle";
  logoPosition: "sidebar_top" | "sidebar_center" | "above_nav";
  template: TemplateConfig;
}

const defaultTheme: ThemeValues = {
  primary: "#2563EB",
  secondary: "#1E40AF",
  accent: "#10B981",
  background: "#F8FAFC",
  font: "Inter",
  fontSize: "medium",
  borderRadius: "medium",
  mode: "light",
  logoUrl: null,
  logoIconUrl: null,
  companyName: "Finatiq",
  appName: "Finatiq",
  clientLayout: "classic",
  advisorLayout: "classic",
  customWelcomeText: null,
  loginSlug: null,
  customLoginTitle: null,
  customLoginSubtitle: null,
  logoSize: 40,
  logoShape: "original",
  logoPosition: "sidebar_top",
  template: DEFAULT_TEMPLATE,
};

interface ThemeContextValue {
  theme: ThemeValues;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  isLoading: true,
  refreshTheme: async () => {},
});

export function useTheme() {
  return useContext(ThemeContext).theme;
}

export function useThemeLoading() {
  return useContext(ThemeContext).isLoading;
}

export function useRefreshTheme() {
  return useContext(ThemeContext).refreshTheme;
}

const BORDER_RADIUS_MAP = { sharp: "4px", medium: "8px", rounded: "16px" };
const FONT_SIZE_MAP = { small: "14px", medium: "16px", large: "18px" };

function applyThemeToDOM(t: ThemeValues) {
  const root = document.documentElement;
  const tpl = t.template;

  // Brand colors
  root.style.setProperty("--color-primary", t.primary);
  root.style.setProperty("--color-secondary", t.secondary);
  root.style.setProperty("--color-accent", t.accent);
  root.style.setProperty("--font-family", t.font + ", sans-serif");
  root.style.setProperty("--border-radius", BORDER_RADIUS_MAP[t.borderRadius]);
  root.style.setProperty("--font-size-base", FONT_SIZE_MAP[t.fontSize]);

  // Template: layout
  root.style.setProperty("--color-background", tpl.mainBg);
  root.style.setProperty("--main-text", tpl.mainText);
  root.style.setProperty("--sidebar-bg", tpl.sidebarBg);
  root.style.setProperty("--sidebar-text", tpl.sidebarText);

  // Template: cards
  root.style.setProperty("--card-bg", tpl.cardBg);
  root.style.setProperty("--card-text", tpl.cardText);
  root.style.setProperty("--card-text-muted", tpl.cardTextMuted);
  root.style.setProperty("--card-text-dim", tpl.cardTextDim);
  root.style.setProperty("--card-border", tpl.cardBorder);

  // Template: tables
  root.style.setProperty("--table-header", tpl.tableHeader);
  root.style.setProperty("--table-hover", tpl.tableHover);

  // Template: inputs
  root.style.setProperty("--input-bg", tpl.inputBg);
  root.style.setProperty("--input-border", tpl.inputBorder);
  root.style.setProperty("--input-text", tpl.inputText);
  root.style.setProperty("--input-placeholder", tpl.inputPlaceholder);

  // Template: skeleton
  root.style.setProperty("--skeleton-bg", tpl.skeletonBg);

  // Override shadcn vars so dialogs/popovers/dropdowns match the template
  root.style.setProperty("--popover", tpl.cardBg);
  root.style.setProperty("--popover-foreground", tpl.cardText);
  root.style.setProperty("--background", tpl.mainBg);
  root.style.setProperty("--foreground", tpl.mainText);
  root.style.setProperty("--border", tpl.cardBorder);
  root.style.setProperty("--input", tpl.inputBorder);
  root.style.setProperty("--ring", t.primary);
  root.style.setProperty("--muted", tpl.tableHover);
  root.style.setProperty("--muted-foreground", tpl.cardTextMuted);
  root.style.setProperty("--accent", tpl.tableHover);
  root.style.setProperty("--accent-foreground", tpl.cardText);
  root.style.setProperty("--card", tpl.cardBg);
  root.style.setProperty("--card-foreground", tpl.cardText);

  // Load Google Font
  const fontLink = document.getElementById("theme-font") as HTMLLinkElement | null;
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(t.font)}:wght@400;500;600;700&display=swap`;
  if (fontLink) {
    fontLink.href = fontUrl;
  } else {
    const link = document.createElement("link");
    link.id = "theme-font";
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);
  }

  root.classList.remove("dark");
}

const ADVISOR_BRAND_COLUMNS = "company_name, app_name, logo_url, logo_icon_url, brand_primary, brand_secondary, brand_accent_color, brand_background, brand_font, brand_font_size, brand_border_radius, brand_mode, client_layout, advisor_layout, custom_welcome_text, login_slug, custom_login_title, custom_login_subtitle, logo_size, logo_shape, logo_position, brand_template";

function advisorToTheme(advisor: Record<string, unknown>): ThemeValues {
  const templateId = (advisor.brand_template as string) || "clean";
  const template = TEMPLATES[templateId] || DEFAULT_TEMPLATE;

  return {
    primary: (advisor.brand_primary as string) || defaultTheme.primary,
    secondary: (advisor.brand_secondary as string) || defaultTheme.secondary,
    accent: (advisor.brand_accent_color as string) || defaultTheme.accent,
    background: template.mainBg,
    font: (advisor.brand_font as string) || defaultTheme.font,
    fontSize: (advisor.brand_font_size as ThemeValues["fontSize"]) || defaultTheme.fontSize,
    borderRadius: (advisor.brand_border_radius as ThemeValues["borderRadius"]) || defaultTheme.borderRadius,
    mode: "light",
    logoUrl: (advisor.logo_url as string) || null,
    logoIconUrl: (advisor.logo_icon_url as string) || null,
    companyName: (advisor.company_name as string) || "Finatiq",
    appName: (advisor.app_name as string) || (advisor.company_name as string) || "Finatiq",
    clientLayout: (advisor.client_layout as ThemeValues["clientLayout"]) || defaultTheme.clientLayout,
    advisorLayout: (advisor.advisor_layout as ThemeValues["advisorLayout"]) || defaultTheme.advisorLayout,
    customWelcomeText: (advisor.custom_welcome_text as string) || null,
    loginSlug: (advisor.login_slug as string) || null,
    customLoginTitle: (advisor.custom_login_title as string) || null,
    customLoginSubtitle: (advisor.custom_login_subtitle as string) || null,
    logoSize: (advisor.logo_size as number) || 40,
    logoShape: (advisor.logo_shape as ThemeValues["logoShape"]) || "original",
    logoPosition: (advisor.logo_position as ThemeValues["logoPosition"]) || "sidebar_top",
    template,
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeValues>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const advisorIdRef = useRef<string | null>(null);

  const loadTheme = useCallback(async () => {
    try {
      const supabase = createClient();

      let advisorId = advisorIdRef.current;

      if (!advisorId) {
        const userResult = await Promise.race([
          supabase.auth.getUser(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);
        if (!userResult || !("data" in userResult)) { setIsLoading(false); return; }
        const user = userResult.data.user;
        if (!user) { setIsLoading(false); return; }

        const { data: client } = await supabase
          .from("clients")
          .select("advisor_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (client) {
          advisorId = client.advisor_id;
        } else {
          const { data: advisor } = await supabase
            .from("advisors")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          if (advisor) advisorId = advisor.id;
        }

        if (!advisorId) { setIsLoading(false); return; }
        advisorIdRef.current = advisorId;
      }

      const { data: advisor } = await supabase
        .from("advisors")
        .select(ADVISOR_BRAND_COLUMNS)
        .eq("id", advisorId)
        .single();
      if (!advisor) { setIsLoading(false); return; }

      const t = advisorToTheme(advisor);
      setTheme(t);
      applyThemeToDOM(t);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    loadTheme();

    const safetyTimeout = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(safetyTimeout);
  }, [loadTheme]);

  const refreshTheme = useCallback(async () => {
    await loadTheme();
  }, [loadTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isLoading, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
