"use client";

import { useEffect, useState, useCallback, useRef, createContext, useContext } from "react";
import { createClient } from "@/lib/supabase/client";

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
  companyName: "FinAdvisor",
  appName: "FinAdvisor",
  clientLayout: "classic",
  advisorLayout: "classic",
  customWelcomeText: null,
  loginSlug: null,
  customLoginTitle: null,
  customLoginSubtitle: null,
  logoSize: 40,
  logoShape: "original",
  logoPosition: "sidebar_top",
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
  root.style.setProperty("--color-primary", t.primary);
  root.style.setProperty("--color-secondary", t.secondary);
  root.style.setProperty("--color-accent", t.accent);
  root.style.setProperty("--color-background", t.background);
  root.style.setProperty("--font-family", t.font + ", sans-serif");
  root.style.setProperty("--border-radius", BORDER_RADIUS_MAP[t.borderRadius]);
  root.style.setProperty("--font-size-base", FONT_SIZE_MAP[t.fontSize]);

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

  // TODO: Dark mode bude implementován později
  // Vždy light mode — odstraň dark class pokud existuje
  root.classList.remove("dark");
}

const ADVISOR_BRAND_COLUMNS = "company_name, app_name, logo_url, logo_icon_url, brand_primary, brand_secondary, brand_accent_color, brand_background, brand_font, brand_font_size, brand_border_radius, brand_mode, client_layout, advisor_layout, custom_welcome_text, login_slug, custom_login_title, custom_login_subtitle, logo_size, logo_shape, logo_position";

function advisorToTheme(advisor: Record<string, unknown>): ThemeValues {
  return {
    primary: (advisor.brand_primary as string) || defaultTheme.primary,
    secondary: (advisor.brand_secondary as string) || defaultTheme.secondary,
    accent: (advisor.brand_accent_color as string) || defaultTheme.accent,
    background: (advisor.brand_background as string) || defaultTheme.background,
    font: (advisor.brand_font as string) || defaultTheme.font,
    fontSize: (advisor.brand_font_size as ThemeValues["fontSize"]) || defaultTheme.fontSize,
    borderRadius: (advisor.brand_border_radius as ThemeValues["borderRadius"]) || defaultTheme.borderRadius,
    mode: "light",
    logoUrl: (advisor.logo_url as string) || null,
    logoIconUrl: (advisor.logo_icon_url as string) || null,
    companyName: (advisor.company_name as string) || "FinAdvisor",
    appName: (advisor.app_name as string) || (advisor.company_name as string) || "FinAdvisor",
    clientLayout: (advisor.client_layout as ThemeValues["clientLayout"]) || defaultTheme.clientLayout,
    advisorLayout: (advisor.advisor_layout as ThemeValues["advisorLayout"]) || defaultTheme.advisorLayout,
    customWelcomeText: (advisor.custom_welcome_text as string) || null,
    loginSlug: (advisor.login_slug as string) || null,
    customLoginTitle: (advisor.custom_login_title as string) || null,
    customLoginSubtitle: (advisor.custom_login_subtitle as string) || null,
    logoSize: (advisor.logo_size as number) || 40,
    logoShape: (advisor.logo_shape as ThemeValues["logoShape"]) || "original",
    logoPosition: (advisor.logo_position as ThemeValues["logoPosition"]) || "sidebar_top",
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeValues>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);
  const advisorIdRef = useRef<string | null>(null);

  const loadTheme = useCallback(async (showLoading = true) => {
    try {
      const supabase = createClient();

      // If we already know advisorId, skip the lookup
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
    await loadTheme(false);
  }, [loadTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isLoading, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
