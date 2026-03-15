"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Building2,
  Palette,
  Layout,
  Boxes,
  Brain,
  UserPlus,
  PartyPopper,
  Lock,
  Upload,
  Check,
  X,
  Crop,
  Link2,
  LayoutDashboard,
  Users as UsersIcon,
  Settings as SettingsIcon,
  Kanban,
  Bell as BellIcon,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

// ---------------------------------------------------------------------------
// Module definitions – ALL keys required
// ---------------------------------------------------------------------------
const MODULE_LABELS: Record<string, { label: string; description: string; recommended?: boolean }> = {
  crm: { label: "CRM Pipeline", description: "Kanban správa dealů", recommended: true },
  portal: { label: "Klientský portál", description: "Přístup klientů k datům", recommended: true },
  templates: { label: "Emailové šablony", description: "Předpřipravené emaily" },
  scoring: { label: "Klientský scoring", description: "Automatické hodnocení klientů", recommended: true },
  automations: { label: "Automatizace", description: "Pravidla a workflow" },
  meta_ads: { label: "Meta Ads", description: "Propojení s Meta reklamami" },
  ocr: { label: "OCR rozpoznávání", description: "Automatické čtení dokumentů" },
  ai_assistant: { label: "AI asistent", description: "AI doporučení a analýzy", recommended: true },
  osvc: { label: "OSVČ modul", description: "Evidence příjmů a výdajů" },
  calendar: { label: "Kalendář", description: "Synchronizace kalendáře" },
  campaigns: { label: "Kampaně", description: "Hromadné oslovení klientů" },
  email_templates: { label: "Email šablony (pokročilé)", description: "Vizuální editor emailů" },
  vault: { label: "Trezor dokumentů", description: "Bezpečné úložiště souborů" },
  chatbot: { label: "Chatbot", description: "Automatický chat na webu" },
  referral: { label: "Referral program", description: "Doporučení od klientů" },
  life_events: { label: "Životní události", description: "Sledování milníků klientů" },
  milestones: { label: "Milníky", description: "Sledování pokroku klienta" },
  news_feed: { label: "Novinky", description: "Aktuality a články" },
  health_score: { label: "Health Score", description: "Finanční zdraví klienta" },
  scenarios: { label: "Scénáře", description: "Modelování finančních situací" },
  coverage_check: { label: "Kontrola krytí", description: "Analýza pojistného krytí" },
  family: { label: "Rodinní příslušníci", description: "Evidence rodinných vazeb" },
  activity_tracking: { label: "Sledování aktivit", description: "Log komunikace s klientem" },
  wishlist: { label: "Wishlist", description: "Přání a cíle klienta" },
  articles: { label: "Články", description: "Publikace pro klienty" },
  seasonal_reminders: { label: "Sezónní připomínky", description: "Automatické připomínky dle období" },
  satisfaction: { label: "Spokojenost", description: "Dotazníky spokojenosti" },
  comparison: { label: "Srovnání produktů", description: "Porovnání nabídek" },
  duplicate_detection: { label: "Detekce duplicit", description: "Odhalení duplicitních záznamů" },
  qr_payments: { label: "QR platby", description: "Generování QR platebních kódů" },
};

// ---------------------------------------------------------------------------
// Color palettes (matching branding page)
// ---------------------------------------------------------------------------
const COLOR_PALETTES = [
  { name: "Modrá profesionální", primary: "#2563EB", secondary: "#1E40AF", accent: "#60A5FA" },
  { name: "Zelená finance", primary: "#059669", secondary: "#047857", accent: "#34D399" },
  { name: "Zlatá luxusní", primary: "#9E7C4E", secondary: "#B8860B", accent: "#D4A843" },
  { name: "Červená energická", primary: "#DC2626", secondary: "#B91C1C", accent: "#F87171" },
  { name: "Fialová moderní", primary: "#7C3AED", secondary: "#6D28D9", accent: "#A78BFA" },
  { name: "Tyrkysová cool", primary: "#0891B2", secondary: "#0E7490", accent: "#22D3EE" },
  { name: "Šedá minimalist", primary: "#374151", secondary: "#4B5563", accent: "#9CA3AF" },
  { name: "Oranžová teplá", primary: "#EA580C", secondary: "#C2410C", accent: "#FB923C" },
];

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
const ONBOARDING_TEMPLATES = [
  { id: "clean", name: "Clean", desc: "Světlá a čistá", bg: "#F8FAFC", sidebar: "#FFFFFF", text: "#0F172A", border: "#E2E8F0" },
  { id: "luxe", name: "Luxe", desc: "Elegantní a luxusní", bg: "#FFFBF5", sidebar: "#1C1917", text: "#1C1917", border: "#D6D3D1" },
  { id: "fintech", name: "Fintech", desc: "Tmavá a technická", bg: "#0F172A", sidebar: "#020617", text: "#F8FAFC", border: "#1E293B" },
  { id: "corporate", name: "Corporate", desc: "Profesionální a ostré", bg: "#F9FAFB", sidebar: "#111827", text: "#111827", border: "#E5E7EB" },
];

// ---------------------------------------------------------------------------
// Font options
// ---------------------------------------------------------------------------
const FONT_OPTIONS = [
  { value: "DM Sans", label: "DM Sans" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Inter", label: "Inter" },
  { value: "Outfit", label: "Outfit" },
  { value: "Syne", label: "Syne" },
];

// ---------------------------------------------------------------------------
// Crop utilities
// ---------------------------------------------------------------------------
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = crop.width;
  canvas.height = crop.height;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/png",
      1,
    );
  });
}

// ---------------------------------------------------------------------------
// Crop Modal
// ---------------------------------------------------------------------------
function OnboardingCropModal({
  imageSrc,
  onConfirm,
  onCancel,
}: {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      onConfirm(blob);
    } catch {
      toast.error("Nepodařilo se oříznout obrázek.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Oříznutí loga</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors duration-150">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative h-[320px] bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-12">Poměr:</span>
            <div className="flex gap-1.5">
              {([{ value: 1, label: "1:1" }, { value: 16 / 9, label: "16:9" }] as const).map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setAspect(opt.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 ${
                    aspect === opt.value ? "bg-gray-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-12">Zoom:</span>
            <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-gray-900 cursor-pointer" />
            <span className="text-xs text-slate-400 font-mono w-10 text-right">{zoom.toFixed(1)}x</span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-8 cursor-pointer">Zrušit</Button>
            <Button size="sm" onClick={handleConfirm} disabled={processing} className="h-8 cursor-pointer">
              {processing ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Ořezávám</> : "Potvrdit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout options
// ---------------------------------------------------------------------------
const LAYOUT_OPTIONS = [
  {
    value: "classic",
    label: "Klasický",
    description: "Tradiční rozložení s postranním panelem",
  },
  {
    value: "modern",
    label: "Moderní",
    description: "Vzdušný design s kartami",
  },
  {
    value: "minimal",
    label: "Minimalistický",
    description: "Čistý a jednoduchý vzhled",
  },
];

// ---------------------------------------------------------------------------
// Default AI rules
// ---------------------------------------------------------------------------
const DEFAULT_AI_RULES = [
  {
    id: "refinancing",
    label: "Upozornit na refinancování",
    description: "Automaticky detekuje klienty s vysokou úrokovou sazbou",
    enabled: true,
  },
  {
    id: "cross_sell",
    label: "Cross-sell příležitosti",
    description: "Navrhuje produkty na základě profilu klienta",
    enabled: true,
  },
  {
    id: "expiration_reminder",
    label: "Připomínka expirace",
    description: "Upozorní na blížící se konec smlouvy",
    enabled: true,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdvisorOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Whether ai_assistant is available in the advisor's plan
  const [hasAi, setHasAi] = useState(false);
  // Plan features from subscription_plans
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [planName, setPlanName] = useState("");

  // Track what was done for summary
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [clientAdded, setClientAdded] = useState(false);

  // Step 2 – Company
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ico, setIco] = useState("");
  const [dic, setDic] = useState("");

  // Step 3 – Branding
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [secondaryColor, setSecondaryColor] = useState("#1E40AF");
  const [accentColor, setAccentColor] = useState("#60A5FA");
  const [brandTemplate, setBrandTemplate] = useState("clean");
  const [brandFont, setBrandFont] = useState("Inter");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState("Inter");
  const [appName, setAppName] = useState("");
  const [loginSlug, setLoginSlug] = useState("");
  const [logoSize, setLogoSize] = useState(40);
  const [logoShape, setLogoShape] = useState<"original" | "rounded" | "circle">("original");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 4 – Layout
  const [clientLayout, setClientLayout] = useState("classic");
  const [advisorLayout, setAdvisorLayout] = useState("classic");

  // Step 5 – Modules
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    Object.keys(MODULE_LABELS).forEach((k) => {
      defaults[k] = MODULE_LABELS[k].recommended || false;
    });
    return defaults;
  });

  // Step 6 – AI Rules
  const [aiRules, setAiRules] = useState(DEFAULT_AI_RULES);
  const [interestRateThreshold, setInterestRateThreshold] = useState("5");

  // Step 7 – First client
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isOsvc, setIsOsvc] = useState(false);

  // Computed total steps: 7 if AI not in plan, 8 if it is
  const TOTAL_STEPS = hasAi ? 8 : 7;

  // Map visual step to logical step (skipping AI step 6 when not in plan)
  const mapStep = useCallback(
    (visualStep: number): number => {
      if (hasAi) return visualStep;
      // When no AI: steps 1-5 map 1:1, visual 6 -> logical 7, visual 7 -> logical 8
      if (visualStep <= 5) return visualStep;
      return visualStep + 1;
    },
    [hasAi]
  );

  // Reverse map for display
  const displayStep = useCallback(
    (logicalStep: number): number => {
      if (hasAi) return logicalStep;
      if (logicalStep <= 5) return logicalStep;
      return logicalStep - 1;
    },
    [hasAi]
  );

  const currentDisplay = displayStep(step);

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: adv, error: advError } = await supabase
          .from("advisors")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (advError) {
          console.error("Onboarding init – advisor query error:", advError.message);
          if (advError.code === "PGRST116") {
            setInitError("Pro váš účet nebyl nalezen záznam poradce. Kontaktujte podporu.");
          } else {
            setInitError(`Chyba načítání dat: ${advError.message || "Neznámá chyba"}`);
          }
          return;
        }
        if (!adv) {
          setInitError("Pro váš účet nebyl nalezen záznam poradce. Kontaktujte podporu.");
          return;
        }

        if (adv.onboarding_completed) {
          router.push("/advisor");
          return;
        }

        setAdvisorId(adv.id);
        if (adv.company_name) setCompanyName(adv.company_name);
        if (adv.phone) setPhone(adv.phone);
        if (adv.email) setEmail(adv.email);
        if (adv.ico) setIco(adv.ico);
        if (adv.dic) setDic(adv.dic);
        if (adv.logo_url) {
          setLogoUrl(adv.logo_url);
          setLogoPreview(adv.logo_url);
          setLogoUploaded(true);
        }
        if (adv.app_name) setAppName(adv.app_name);
        if (adv.font_family) setFontFamily(adv.font_family);
        if (adv.client_layout) setClientLayout(adv.client_layout);
        if (adv.advisor_layout) setAdvisorLayout(adv.advisor_layout);

        const brandPrimary = adv.brand_primary || adv.brand_color_primary;
        if (brandPrimary) setPrimaryColor(brandPrimary);

        if (adv.enabled_modules && typeof adv.enabled_modules === "object" && Object.keys(adv.enabled_modules).length > 0) {
          setEnabledModules(adv.enabled_modules);
        }

        if (adv.ai_rules && typeof adv.ai_rules === "object") {
          // Merge saved rules with defaults
          const saved = adv.ai_rules as { rules?: typeof DEFAULT_AI_RULES; threshold?: string };
          if (saved.rules) setAiRules(saved.rules);
          if (saved.threshold) setInterestRateThreshold(saved.threshold);
        }
        if (adv.interest_rate_threshold) {
          setInterestRateThreshold(String(adv.interest_rate_threshold));
        }

        // Load plan features
        if (adv.selected_plan_id) {
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("name, features")
            .eq("id", adv.selected_plan_id)
            .single();
          if (plan) {
            const features: string[] = Array.isArray(plan.features) ? plan.features : [];
            setPlanFeatures(features);
            setPlanName(plan.name || "");
            setHasAi(features.includes("ai_assistant"));
          }
        }

        // Save onboarding progress (non-critical)
        supabase
          .from("onboarding_progress")
          .upsert({ user_id: user.id, role: "advisor", steps: {} }, { onConflict: "user_id,role" })
          .then(({ error }) => {
            if (error) console.warn("Onboarding progress upsert failed (non-critical):", error.message);
          });
      } catch (err) {
        console.error("Onboarding init – unexpected error:", err);
        setInitError("Neočekávaná chyba při načítání. Zkuste obnovit stránku.");
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Save progress helper
  // -------------------------------------------------------------------------
  async function saveProgress(stepKey: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: progress } = await supabase
        .from("onboarding_progress")
        .select("steps")
        .eq("user_id", user.id)
        .eq("role", "advisor")
        .single();
      const steps = { ...(progress?.steps || {}), [stepKey]: true };
      await supabase.from("onboarding_progress").update({ steps }).eq("user_id", user.id).eq("role", "advisor");
    } catch (e) {
      console.warn("saveProgress failed (non-critical):", e);
    }
  }

  // -------------------------------------------------------------------------
  // Step 2 – Save company
  // -------------------------------------------------------------------------
  async function handleSaveCompany() {
    setCompanyError(null);
    if (!advisorId) {
      const msg = "Chyba: poradce nebyl načten. Zkuste obnovit stránku.";
      setCompanyError(msg);
      toast.error(msg);
      return;
    }
    if (!companyName.trim()) {
      setCompanyError("Vyplňte název firmy.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from("advisors")
        .update({
          company_name: companyName.trim(),
          phone: phone || null,
          email: email || null,
          ico: ico || null,
          dic: dic || null,
        })
        .eq("id", advisorId);
      if (error) {
        setCompanyError(`Chyba ukládání: ${error.message}`);
        toast.error("Nepodařilo se uložit údaje.");
        setLoading(false);
        return;
      }
      await saveProgress("company");
      setLoading(false);
      setStep(3);
    } catch {
      setCompanyError("Neočekávaná chyba při ukládání.");
      toast.error("Neočekávaná chyba při ukládání.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 3 – Logo upload + branding (with crop)
  // -------------------------------------------------------------------------
  function handleFileSelectForCrop(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Nahrávejte pouze obrázky."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Maximální velikost je 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadCroppedBlob(blob: Blob) {
    if (!advisorId) { toast.error("Poradce nebyl načten."); return; }
    setUploadingLogo(true);
    setCropSrc(null);
    try {
      const path = `${advisorId}/logo.png`;
      const file = new File([blob], "logo.png", { type: "image/png" });
      const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (uploadError) { toast.error("Chyba: " + uploadError.message); setUploadingLogo(false); return; }
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const url = urlData.publicUrl + "?t=" + Date.now();
      setLogoUrl(url);
      setLogoPreview(url);
      setLogoUploaded(true);
      await supabase.from("advisors").update({ logo_url: url }).eq("id", advisorId);
      toast.success("Logo nahráno!");
    } catch {
      toast.error("Chyba při nahrávání loga.");
    }
    setUploadingLogo(false);
  }

  function handleLogoDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelectForCrop(file);
    }
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelectForCrop(file);
    }
    e.target.value = "";
  }

  function applyPalette(palette: typeof COLOR_PALETTES[0]) {
    setPrimaryColor(palette.primary);
    setSecondaryColor(palette.secondary);
    setAccentColor(palette.accent);
  }

  async function handleSaveBranding() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase
        .from("advisors")
        .update({
          brand_primary: primaryColor,
          brand_secondary: secondaryColor,
          brand_accent_color: accentColor,
          brand_font: brandFont,
          brand_template: brandTemplate,
          app_name: appName || null,
          login_slug: loginSlug || null,
          logo_size: logoSize,
          logo_shape: logoShape,
        })
        .eq("id", advisorId);
      await saveProgress("branding");
      setLoading(false);
      setStep(4);
    } catch {
      toast.error("Chyba při ukládání brandingu.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 4 – Save layout
  // -------------------------------------------------------------------------
  async function handleSaveLayout() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase
        .from("advisors")
        .update({ client_layout: clientLayout, advisor_layout: advisorLayout })
        .eq("id", advisorId);
      await saveProgress("layout");
      setLoading(false);
      setStep(5);
    } catch {
      toast.error("Chyba při ukládání rozložení.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 5 – Save modules
  // -------------------------------------------------------------------------
  async function handleSaveModules() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase.from("advisors").update({ enabled_modules: enabledModules }).eq("id", advisorId);
      await saveProgress("modules");
      setLoading(false);
      // If AI is in plan, go to step 6 (AI Rules), otherwise skip to step 7 (First client)
      setStep(hasAi ? 6 : 7);
    } catch {
      toast.error("Chyba při ukládání modulů.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 6 – Save AI rules
  // -------------------------------------------------------------------------
  async function handleSaveAiRules() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase
        .from("advisors")
        .update({
          ai_rules: { rules: aiRules, threshold: interestRateThreshold },
          interest_rate_threshold: parseFloat(interestRateThreshold) || 5,
        })
        .eq("id", advisorId);
      await saveProgress("ai_rules");
      setLoading(false);
      setStep(7);
    } catch {
      toast.error("Chyba při ukládání AI pravidel.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 7 – Create first client
  // -------------------------------------------------------------------------
  async function handleCreateClient() {
    if (!advisorId || !firstName.trim() || !lastName.trim()) {
      toast.error("Vyplňte jméno a příjmení.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("clients").insert({
        advisor_id: advisorId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: clientEmail.trim() || null,
        phone: clientPhone.trim() || null,
        is_osvc: isOsvc,
      });
      if (error) {
        toast.error("Nepodařilo se vytvořit klienta.");
        setLoading(false);
        return;
      }
      toast.success("Klient vytvořen!");
      setClientAdded(true);
      await saveProgress("first_client");
      setLoading(false);
      setStep(8);
    } catch {
      toast.error("Chyba při vytváření klienta.");
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Step 8 – Finish
  // -------------------------------------------------------------------------
  async function handleFinish() {
    if (!advisorId) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    try {
      setLoading(true);
      await supabase.from("advisors").update({ onboarding_completed: true }).eq("id", advisorId);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("onboarding_progress")
          .update({ completed_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("role", "advisor");
      }
      setLoading(false);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => router.push("/advisor"), 1500);
    } catch {
      toast.error("Chyba při dokončování.");
      setLoading(false);
    }
  }

  // Fire confetti when reaching the final step
  useEffect(() => {
    if (step === 8) {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }, [step]);

  // -------------------------------------------------------------------------
  // Count enabled modules for summary
  // -------------------------------------------------------------------------
  const enabledModulesCount = useMemo(
    () => Object.values(enabledModules).filter(Boolean).length,
    [enabledModules]
  );

  // -------------------------------------------------------------------------
  // Progress bar with circles
  // -------------------------------------------------------------------------
  function ProgressBar() {
    const steps = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1);
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, i) => {
            const isCompleted = currentDisplay > s;
            const isCurrent = currentDisplay === s;
            return (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-blue-500 text-white"
                      : isCurrent
                      ? "bg-blue-500 text-white ring-4 ring-blue-100"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : s}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 transition-all ${
                      currentDisplay > s ? "bg-blue-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-center text-xs text-slate-500">
          Krok {currentDisplay} z {TOTAL_STEPS}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Layout card mini mockup
  // -------------------------------------------------------------------------
  function LayoutMockup({ type }: { type: string }) {
    if (type === "classic") {
      return (
        <div className="flex h-20 w-full gap-0.5 rounded border border-slate-200 overflow-hidden">
          <div className="w-1/4 bg-slate-700" />
          <div className="flex-1 bg-slate-100 p-1">
            <div className="h-2 w-3/4 rounded bg-slate-300 mb-1" />
            <div className="h-2 w-1/2 rounded bg-slate-200" />
          </div>
        </div>
      );
    }
    if (type === "modern") {
      return (
        <div className="h-20 w-full rounded border border-slate-200 overflow-hidden bg-slate-50 p-1.5">
          <div className="h-3 w-full rounded bg-slate-700 mb-1" />
          <div className="flex gap-1">
            <div className="h-6 flex-1 rounded bg-slate-200" />
            <div className="h-6 flex-1 rounded bg-slate-200" />
            <div className="h-6 flex-1 rounded bg-slate-200" />
          </div>
        </div>
      );
    }
    // minimal
    return (
      <div className="h-20 w-full rounded border border-slate-200 overflow-hidden bg-white p-2">
        <div className="h-2 w-1/3 rounded bg-slate-300 mb-2" />
        <div className="h-2 w-2/3 rounded bg-slate-200 mb-1" />
        <div className="h-2 w-1/2 rounded bg-slate-200" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-2xl">
        <ProgressBar />

        <div className="rounded-2xl border bg-white p-8 shadow-lg">
          {/* Init error banner */}
          {initError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {initError}
              <button onClick={() => window.location.reload()} className="ml-2 underline">
                Obnovit stránku
              </button>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 1 – Welcome */}
          {/* ============================================================= */}
          {step === 1 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                <Sparkles className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-slate-900">
                Vítejte ve FinAdvisor{companyName ? `, ${companyName}` : ""}!
              </h1>
              <p className="mb-6 text-slate-500">Pojďme nastavit váš účet. Zabere to pár minut.</p>
              <Button onClick={() => setStep(2)} className="w-full" size="lg">
                Pojďme na to <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 2 – Company info */}
          {/* ============================================================= */}
          {step === 2 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Vaše firma</h2>
                  <p className="text-xs text-slate-500">Základní údaje o vaší firmě</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Název firmy *</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setCompanyError(null);
                    }}
                    placeholder="Vaše firma s.r.o."
                    className={!companyName.trim() && companyError ? "border-red-400" : ""}
                  />
                  {companyError && <p className="text-xs text-red-500">{companyError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Telefon</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+420 ..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@firma.cz" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">IČO</Label>
                    <Input value={ico} onChange={(e) => setIco(e.target.value)} placeholder="12345678" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">DIČ</Label>
                    <Input value={dic} onChange={(e) => setDic(e.target.value)} placeholder="CZ12345678" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveCompany} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 3 – Branding (unified with branding page) */}
          {/* ============================================================= */}
          {step === 3 && (() => {
            const tpl = ONBOARDING_TEMPLATES.find((t) => t.id === brandTemplate) || ONBOARDING_TEMPLATES[0];
            const isDarkTpl = tpl.id === "fintech" || tpl.id === "luxe";
            const sidebarBgColor = tpl.sidebar;
            const sidebarTextColor = isDarkTpl || tpl.id === "corporate" ? "#E2E8F0" : "#374151";
            const mainBgColor = tpl.bg;
            const mainTextColor = tpl.text;
            const cardBgColor = isDarkTpl ? "#1E293B" : "#FFFFFF";
            const cardBorderColor = tpl.border;
            const logoShapeRadius = logoShape === "circle" ? "50%" : logoShape === "rounded" ? "4px" : "0";

            return (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                  <Palette className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Branding</h2>
                  <p className="text-xs text-slate-500">Přizpůsobte si vzhled aplikace</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left – controls (3/5) */}
                <div className="lg:col-span-3 space-y-5">

                  {/* A) Logo */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Logo</h3>
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleLogoDrop}
                      onClick={() => logoInputRef.current?.click()}
                      className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 p-5 cursor-pointer transition-colors duration-150 hover:border-slate-400"
                    >
                      {uploadingLogo ? (
                        <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-slate-400 mb-1" />
                          <p className="text-xs text-slate-500">Přetáhněte nebo klikněte</p>
                          <p className="text-[10px] text-slate-400">PNG, JPG, SVG — max 5 MB</p>
                        </>
                      )}
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                    </div>

                    {(logoUrl || logoPreview) && (
                      <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200 mt-2">
                        <img src={logoUrl || logoPreview || ""} alt="" className="h-8 max-w-[100px] object-contain" />
                        <button
                          type="button"
                          onClick={() => { if (logoUrl) setCropSrc(logoUrl); else if (logoPreview) setCropSrc(logoPreview); }}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer transition-colors duration-150"
                        >
                          <Crop className="h-3 w-3" />Upravit
                        </button>
                        <button
                          type="button"
                          onClick={() => { setLogoUrl(null); setLogoPreview(null); setLogoFile(null); setLogoUploaded(false); }}
                          className="ml-auto text-slate-400 hover:text-red-500 cursor-pointer transition-colors duration-150"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <Label className="text-xs font-medium mb-1.5 block">Velikost</Label>
                        <div className="flex items-center gap-3">
                          <input type="range" min={20} max={80} value={logoSize} onChange={(e) => setLogoSize(parseInt(e.target.value))} className="flex-1 accent-gray-900 cursor-pointer" />
                          <span className="text-xs text-slate-400 font-mono w-8 text-right">{logoSize}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1.5 block">Tvar</Label>
                        <div className="flex gap-1.5">
                          {(["original", "rounded", "circle"] as const).map((shape) => (
                            <button
                              key={shape}
                              type="button"
                              onClick={() => setLogoShape(shape)}
                              className={`flex-1 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 ${
                                logoShape === shape ? "bg-gray-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {shape === "original" ? "Original" : shape === "rounded" ? "Rounded" : "Kruh"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* B) Barvy */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Barvy</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {COLOR_PALETTES.map((palette) => {
                        const isActive = primaryColor === palette.primary && secondaryColor === palette.secondary;
                        return (
                          <button
                            key={palette.name}
                            type="button"
                            onClick={() => applyPalette(palette)}
                            className={`relative flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all duration-150 ${
                              isActive ? "border-gray-900 bg-slate-50" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex -space-x-1">
                              <div className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.primary }} />
                              <div className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.secondary }} />
                              <div className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.accent }} />
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium truncate">{palette.name}</span>
                            {isActive && <Check className="h-3 w-3 text-gray-900 absolute top-1 right-1" />}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomColors(!customColors)}
                      className="mt-3 text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition-colors duration-150"
                    >
                      {customColors ? "Skrýt vlastní barvy" : "Vlastní barvy →"}
                    </button>
                    {customColors && (
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {([
                          { label: "Primární", value: primaryColor, onChange: setPrimaryColor },
                          { label: "Sekundární", value: secondaryColor, onChange: setSecondaryColor },
                          { label: "Akcentní", value: accentColor, onChange: setAccentColor },
                        ] as const).map((c) => (
                          <div key={c.label}>
                            <Label className="text-xs text-slate-500 mb-1 block">{c.label}</Label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={c.value} onChange={(e) => c.onChange(e.target.value)} className="h-7 w-7 rounded cursor-pointer border-0 p-0" />
                              <span className="text-xs text-slate-500 font-mono">{c.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* C) Šablona */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Šablona</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {ONBOARDING_TEMPLATES.map((t) => {
                        const isActive = brandTemplate === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setBrandTemplate(t.id)}
                            className={`relative rounded-lg border-2 p-3 text-left cursor-pointer transition-all duration-150 ${
                              isActive ? "border-gray-900" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex h-16 rounded overflow-hidden mb-2" style={{ border: `1px solid ${t.border}` }}>
                              <div className="w-4 shrink-0" style={{ backgroundColor: t.sidebar }} />
                              <div className="flex-1 p-1.5" style={{ backgroundColor: t.bg }}>
                                <div className="h-1.5 w-8 rounded-sm mb-1" style={{ backgroundColor: t.text, opacity: 0.2 }} />
                                <div className="h-1 w-6 rounded-sm mb-1" style={{ backgroundColor: t.text, opacity: 0.1 }} />
                                <div className="flex gap-1 mt-1.5">
                                  <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: t.text, opacity: 0.06 }} />
                                  <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: t.text, opacity: 0.06 }} />
                                </div>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-slate-900">{t.name}</p>
                            <p className="text-xs text-slate-400">{t.desc}</p>
                            {isActive && (
                              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-gray-900 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* D) Font */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Font</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {FONT_OPTIONS.map((font) => (
                        <button
                          key={font.value}
                          type="button"
                          onClick={() => setBrandFont(font.value)}
                          className={`px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors duration-150 ${
                            brandFont === font.value ? "bg-gray-900 text-white font-medium" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                          style={{ fontFamily: font.value + ", sans-serif" }}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200 mt-3">
                      <p style={{ fontFamily: brandFont + ", sans-serif" }} className="text-lg font-semibold text-slate-900">Aa Bb Cc 123</p>
                      <p style={{ fontFamily: brandFont + ", sans-serif" }} className="text-sm text-slate-500 mt-0.5">Přehled vašeho podnikání — {brandFont}</p>
                    </div>
                  </div>

                  {/* E) Název firmy */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Název firmy</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium mb-1.5 block">Název aplikace</Label>
                        <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="FinAdvisor" className="h-9" />
                        <p className="text-xs text-slate-400 mt-1">Tento název uvidí vaši klienti</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium mb-1.5 block">Login slug</Label>
                        <Input value={loginSlug} onChange={(e) => setLoginSlug(e.target.value)} placeholder="moje-firma" className="h-9" />
                        {loginSlug && <p className="text-xs text-slate-400 mt-1">URL: finatiq.cz/p/{loginSlug}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right – live preview (2/5) */}
                <div className="lg:col-span-2">
                  <div className="sticky top-6">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 block">Náhled</span>
                    <div
                      className="w-full h-[420px] rounded-lg border border-gray-200 overflow-hidden flex"
                      style={{ fontFamily: brandFont + ", sans-serif", fontSize: "10px" }}
                    >
                      {/* Mini sidebar */}
                      <div className="w-[72px] shrink-0 flex flex-col py-2.5 px-1.5" style={{ backgroundColor: sidebarBgColor }}>
                        <div className="flex items-center justify-center mb-3 px-1">
                          {(logoUrl || logoPreview) ? (
                            <img
                              src={logoUrl || logoPreview || ""}
                              alt=""
                              style={{
                                height: `${Math.min(logoSize * 0.45, 24)}px`,
                                objectFit: logoShape !== "original" ? "cover" : "contain",
                                borderRadius: logoShapeRadius,
                                aspectRatio: logoShape !== "original" ? "1/1" : "auto",
                              }}
                            />
                          ) : (
                            <span style={{ color: sidebarTextColor, fontSize: "9px", fontWeight: 700 }}>
                              {(appName || "FinAdvisor").slice(0, 6)}
                            </span>
                          )}
                        </div>
                        {[LayoutDashboard, Kanban, UsersIcon, BellIcon, SettingsIcon].map((Icon, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-1.5 py-1 rounded mx-0.5 mb-0.5 transition-colors duration-150"
                            style={{
                              backgroundColor: i === 0 ? primaryColor + "20" : "transparent",
                              borderLeft: i === 0 ? `2px solid ${primaryColor}` : "2px solid transparent",
                            }}
                          >
                            <Icon style={{ width: 10, height: 10, color: i === 0 ? primaryColor : sidebarTextColor, opacity: i === 0 ? 1 : 0.5 }} />
                            <span style={{ color: i === 0 ? primaryColor : sidebarTextColor, opacity: i === 0 ? 1 : 0.5, fontSize: "7px", fontWeight: i === 0 ? 600 : 400 }}>
                              {["Přehled", "Pipeline", "Klienti", "Oznámení", "Nastavení"][i]}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Main area */}
                      <div className="flex-1 p-3 overflow-hidden" style={{ backgroundColor: mainBgColor }}>
                        <div className="mb-2.5">
                          <div style={{ color: mainTextColor, fontSize: "11px", fontWeight: 700 }}>Přehled</div>
                          <div style={{ color: mainTextColor, fontSize: "7px", opacity: 0.4 }}>Tady je přehled vašeho podnikání</div>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                          {[{ label: "Pipeline", value: "1.2M Kč" }, { label: "Leady", value: "24" }, { label: "Konverze", value: "68%" }].map((kpi) => (
                            <div key={kpi.label} className="p-1.5 rounded" style={{ backgroundColor: cardBgColor, border: `1px solid ${cardBorderColor}` }}>
                              <div style={{ fontSize: "6px", color: mainTextColor, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{kpi.label}</div>
                              <div style={{ fontSize: "10px", color: mainTextColor, fontWeight: 700, marginTop: 2 }}>{kpi.value}</div>
                            </div>
                          ))}
                        </div>
                        <div className="p-2 rounded mb-2" style={{ backgroundColor: cardBgColor, border: `1px solid ${cardBorderColor}` }}>
                          <div style={{ fontSize: "6px", color: mainTextColor, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, marginBottom: 6 }}>Pipeline</div>
                          <div className="flex items-end gap-1 h-[50px]">
                            {[40, 65, 45, 80, 60, 90, 70].map((h, i) => (
                              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: i === 5 ? primaryColor : primaryColor + "30" }} />
                            ))}
                          </div>
                        </div>
                        <div className="rounded overflow-hidden" style={{ border: `1px solid ${cardBorderColor}` }}>
                          <div className="flex gap-2 px-2 py-1" style={{ borderBottom: `1px solid ${cardBorderColor}`, backgroundColor: cardBgColor }}>
                            <span style={{ fontSize: "6px", color: mainTextColor, opacity: 0.4, textTransform: "uppercase", fontWeight: 600, flex: 1 }}>Klient</span>
                            <span style={{ fontSize: "6px", color: mainTextColor, opacity: 0.4, textTransform: "uppercase", fontWeight: 600, width: 40, textAlign: "right" }}>Hodnota</span>
                          </div>
                          {["Novák", "Dvořáková", "Procházka"].map((name) => (
                            <div key={name} className="flex gap-2 px-2 py-1" style={{ backgroundColor: cardBgColor, borderBottom: `1px solid ${cardBorderColor}` }}>
                              <span style={{ fontSize: "7px", color: mainTextColor, flex: 1 }}>{name}</span>
                              <span style={{ fontSize: "7px", color: mainTextColor, fontWeight: 600, width: 40, textAlign: "right" }}>250k</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Crop modal */}
              {cropSrc && (
                <OnboardingCropModal
                  imageSrc={cropSrc}
                  onConfirm={uploadCroppedBlob}
                  onCancel={() => setCropSrc(null)}
                />
              )}

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveBranding} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            );
          })()}

          {/* ============================================================= */}
          {/* STEP 4 – Layout */}
          {/* ============================================================= */}
          {step === 4 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                  <Layout className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Rozložení</h2>
                  <p className="text-xs text-slate-500">Vyberte rozložení klientského portálu</p>
                </div>
              </div>

              {/* Client layout */}
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-700 mb-3">Klientský portál</p>
                <div className="grid grid-cols-3 gap-3">
                  {LAYOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        clientLayout === opt.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setClientLayout(opt.value)}
                    >
                      <LayoutMockup type={opt.value} />
                      <p className="mt-2 text-xs font-medium text-slate-900">{opt.label}</p>
                      <p className="text-[10px] text-slate-500">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advisor layout */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">Rozložení admin panelu</p>
                <div className="grid grid-cols-3 gap-3">
                  {LAYOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${
                        advisorLayout === opt.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setAdvisorLayout(opt.value)}
                    >
                      <LayoutMockup type={opt.value} />
                      <p className="mt-2 text-xs font-medium text-slate-900">{opt.label}</p>
                      <p className="text-[10px] text-slate-500">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveLayout} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 5 – Modules */}
          {/* ============================================================= */}
          {step === 5 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <Boxes className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Moduly</h2>
                  <p className="text-xs text-slate-500">Vyberte moduly, které chcete používat</p>
                </div>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {Object.entries(MODULE_LABELS).map(([key, { label, description, recommended }]) => {
                  const inPlan = planFeatures.length === 0 || planFeatures.includes(key);
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        !inPlan ? "opacity-50 bg-slate-50" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{label}</p>
                          {recommended && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                              Doporučeno
                            </span>
                          )}
                          {!inPlan && (
                            <span className="flex items-center gap-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600" title={`Dostupné v plánu ${planName}`}>
                              <Lock className="h-3 w-3" />
                              {planName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{description}</p>
                      </div>
                      {inPlan ? (
                        <Switch
                          checked={enabledModules[key] ?? false}
                          onCheckedChange={(checked) =>
                            setEnabledModules((prev) => ({ ...prev, [key]: checked }))
                          }
                        />
                      ) : (
                        <Lock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(4)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveModules} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 6 – AI Rules (only when hasAi) */}
          {/* ============================================================= */}
          {step === 6 && hasAi && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">AI pravidla</h2>
                  <p className="text-xs text-slate-500">Nastavte automatická pravidla AI asistenta</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                {aiRules.map((rule, idx) => (
                  <div key={rule.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm font-medium text-slate-900">{rule.label}</p>
                      <p className="text-xs text-slate-500">{rule.description}</p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => {
                        setAiRules((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, enabled: checked } : r))
                        );
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border p-4">
                <Label className="text-xs">Práh úrokové sazby pro refinancování (%)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={interestRateThreshold}
                    onChange={(e) => setInterestRateThreshold(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Klienti se sazbou nad tuto hodnotu budou označeni k refinancování
                </p>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(5)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <Button onClick={handleSaveAiRules} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Další <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 7 – First client */}
          {/* ============================================================= */}
          {step === 7 && (
            <div>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">První klient</h2>
                  <p className="text-xs text-slate-500">Přidejte svého prvního klienta</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Jméno *</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jan" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Příjmení *</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Novák" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="jan@novak.cz"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefon</Label>
                    <Input
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+420 ..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isOsvc"
                    checked={isOsvc}
                    onChange={(e) => setIsOsvc(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="isOsvc" className="text-sm text-slate-700 cursor-pointer">
                    Je OSVČ
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(hasAi ? 6 : 5)}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Zpět
                </Button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      saveProgress("first_client_skipped");
                      setStep(8);
                    }}
                    className="text-sm text-slate-500 hover:text-slate-700 underline transition-colors"
                  >
                    Přidám později
                  </button>
                  <Button
                    onClick={handleCreateClient}
                    disabled={loading || !firstName.trim() || !lastName.trim()}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Přidat <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 8 – Done! */}
          {/* ============================================================= */}
          {step === 8 && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                <PartyPopper className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="mb-4 text-2xl font-bold text-slate-900">Vše je připraveno!</h1>

              {/* Summary */}
              <div className="mx-auto mb-6 max-w-sm space-y-2 text-left">
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-slate-700">
                    Firma: <span className="font-medium">{companyName || "—"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  {logoUploaded ? (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-sm text-slate-700">
                    Logo: <span className="font-medium">{logoUploaded ? "Nahráno" : "Nenastaveno"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-slate-700">
                    Barva:{" "}
                    <span
                      className="inline-block h-3 w-3 rounded-full align-middle mr-1"
                      style={{ backgroundColor: primaryColor }}
                    />
                    <span className="font-medium font-mono text-xs">{primaryColor}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-sm text-slate-700">
                    Moduly: <span className="font-medium">{enabledModulesCount} aktivních</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  {clientAdded ? (
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-sm text-slate-700">
                    Klient: <span className="font-medium">{clientAdded ? "Přidán" : "Přidáte později"}</span>
                  </span>
                </div>
              </div>

              <p className="mb-6 text-xs text-slate-500">Všechna nastavení můžete kdykoliv změnit v sekci Nastavení.</p>

              <Button onClick={handleFinish} disabled={loading} className="w-full" size="lg">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Přejít do přehledu <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
