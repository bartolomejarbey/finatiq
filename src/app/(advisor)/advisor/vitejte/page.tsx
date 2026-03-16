"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Rocket,
  User,
  BookOpen,
  Globe,
  Palette,
  UserPlus,
  Boxes,
  PartyPopper,
  Upload,
  Check,
  X,
  Crop,
  Lock,
  ClipboardList,
  BarChart3,
  Bell,
  Zap,
  FileText,
  Megaphone,
  Newspaper,
  CalendarClock,
  Star,
  CalendarDays,
  LayoutDashboard,
  Users as UsersIcon,
  Settings as SettingsIcon,
  Kanban,
  Bell as BellIcon,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop as CropType, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 8;

const STEP_ICONS = [Rocket, User, BookOpen, Globe, Palette, UserPlus, Boxes, PartyPopper];
const STEP_LABELS = [
  "Vítejte",
  "Váš profil",
  "Co je CRM?",
  "Klientský portál",
  "Branding",
  "První klient",
  "Nástroje",
  "Hotovo!",
];

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

const ONBOARDING_TEMPLATES = [
  { id: "clean", name: "Clean", desc: "Světlá a čistá", bg: "#F8FAFC", sidebar: "#FFFFFF", text: "#0F172A", border: "#E2E8F0" },
  { id: "luxe", name: "Luxe", desc: "Elegantní a luxusní", bg: "#FFFBF5", sidebar: "#1C1917", text: "#1C1917", border: "#D6D3D1" },
  { id: "fintech", name: "Fintech", desc: "Tmavá a technická", bg: "#0F172A", sidebar: "#020617", text: "#F8FAFC", border: "#1E293B" },
  { id: "corporate", name: "Corporate", desc: "Profesionální a ostré", bg: "#F9FAFB", sidebar: "#111827", text: "#111827", border: "#E5E7EB" },
];

const FONT_OPTIONS = [
  { value: "DM Sans", label: "DM Sans" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Inter", label: "Inter" },
  { value: "Outfit", label: "Outfit" },
  { value: "Syne", label: "Syne" },
];

const MODULE_DEFS: { key: string; label: string; description: string; icon: React.ComponentType<{ className?: string }>; defaultOn?: boolean }[] = [
  { key: "crm", label: "Obchodní příležitosti", description: "Sledujte obchodní případy od prvního kontaktu po uzavření.", icon: Kanban, defaultOn: true },
  { key: "portal", label: "Klientský portál", description: "Klienti vidí své smlouvy, platby a dokumenty.", icon: Globe, defaultOn: true },
  { key: "scoring", label: "Klientský scoring", description: "Automatické hodnocení a prioritizace klientů.", icon: BarChart3, defaultOn: true },
  { key: "automations", label: "Automatizace", description: "Nastavte akce které se spustí automaticky (např. email po podpisu smlouvy).", icon: Zap },
  { key: "templates", label: "Šablony", description: "Předpřipravené emailové šablony pro komunikaci s klienty.", icon: FileText },
  { key: "meta_ads", label: "Kampaně", description: "Správa Meta Ads kampaní a sledování leadů.", icon: Megaphone },
  { key: "articles", label: "Články", description: "Publikujte články pro vaše klienty.", icon: BookOpen },
  { key: "news_feed", label: "Novinky", description: "Informujte klienty o novinkách.", icon: Newspaper },
  { key: "seasonal_reminders", label: "Sezónní připomínky", description: "Automatické připomínky na důležitá data (daně, pojistky).", icon: CalendarClock },
  { key: "satisfaction", label: "Spokojenost", description: "Měřte spokojenost klientů dotazníky.", icon: Star },
  { key: "calendar", label: "Kalendář", description: "Plánujte schůzky a synchronizujte s Google Calendar.", icon: CalendarDays },
];

// ---------------------------------------------------------------------------
// Crop utilities
// ---------------------------------------------------------------------------
function getCroppedBlobFromImg(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = Math.round(crop.width * scaleX);
  canvas.height = Math.round(crop.height * scaleY);
  ctx.drawImage(image, Math.round(crop.x * scaleX), Math.round(crop.y * scaleY), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))), "image/png", 1);
  });
}

type CropAspectMode = "free" | "1:1" | "16:9";
const CROP_ASPECT_OPTIONS: { mode: CropAspectMode; label: string; value: number | undefined }[] = [
  { mode: "free", label: "Volný", value: undefined },
  { mode: "1:1", label: "1:1", value: 1 },
  { mode: "16:9", label: "16:9", value: 16 / 9 },
];

function OnboardingCropModal({ imageSrc, onConfirm, onCancel }: { imageSrc: string; onConfirm: (blob: Blob) => void; onCancel: () => void }) {
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspectMode, setAspectMode] = useState<CropAspectMode>("free");
  const [processing, setProcessing] = useState(false);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const aspect = CROP_ASPECT_OPTIONS.find((o) => o.mode === aspectMode)?.value;

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerCrop(makeAspectCrop({ unit: "%", width: 90 }, width / height, width, height), width, height));
  }

  function handleAspectChange(mode: CropAspectMode) {
    setAspectMode(mode);
    const img = imgRef.current;
    if (!img) return;
    const newAspect = CROP_ASPECT_OPTIONS.find((o) => o.mode === mode)?.value;
    if (newAspect) setCrop(centerCrop(makeAspectCrop({ unit: "%", width: 70 }, newAspect, img.width, img.height), img.width, img.height));
  }

  async function handleConfirm() {
    if (!completedCrop || !imgRef.current) return;
    setProcessing(true);
    try { onConfirm(await getCroppedBlobFromImg(imgRef.current, completedCrop)); }
    catch { toast.error("Nepodařilo se oříznout obrázek."); }
    finally { setProcessing(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-[var(--card-bg,#fff)] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--card-border,#e2e8f0)]">
          <h3 className="text-sm font-semibold text-[var(--card-text,#111827)]">Oříznutí loga</h3>
          <button onClick={onCancel} className="text-[var(--card-text-dim,#9ca3af)] hover:text-[var(--card-text-muted,#6b7280)] cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center justify-center bg-gray-900 p-4 min-h-[320px] max-h-[400px] overflow-auto">
          <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)} aspect={aspect}>
            <img ref={imgRef} src={imageSrc} alt="Crop" onLoad={onImageLoad} style={{ transform: `scale(${scale})`, transformOrigin: "center", maxHeight: "380px" }} crossOrigin="anonymous" />
          </ReactCrop>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--card-text-muted,#6b7280)] w-12">Poměr:</span>
            <div className="flex gap-1.5">
              {CROP_ASPECT_OPTIONS.map((opt) => (
                <button key={opt.mode} type="button" onClick={() => handleAspectChange(opt.mode)}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 ${aspectMode === opt.mode ? "bg-gray-900 text-white" : "bg-[var(--table-header,#f9fafb)] text-[var(--card-text-muted,#6b7280)]"}`}
                >{opt.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--card-text-muted,#6b7280)] w-12">Zoom:</span>
            <input type="range" min={0.3} max={3} step={0.05} value={scale} onChange={(e) => setScale(Number(e.target.value))} className="flex-1 accent-gray-900 cursor-pointer" />
            <span className="text-xs text-[var(--card-text-dim,#9ca3af)] font-mono w-10 text-right">{scale.toFixed(1)}x</span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onCancel} className="h-8 cursor-pointer">Zrušit</Button>
            <Button size="sm" onClick={handleConfirm} disabled={processing || !completedCrop} className="h-8 cursor-pointer">
              {processing ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Ořezávám</> : "Potvrdit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Bar
// ---------------------------------------------------------------------------
function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--card-text-muted,#6b7280)]">Krok {current} z {total}</span>
        <span className="text-xs text-[var(--card-text-dim,#9ca3af)]">{STEP_LABELS[current - 1]}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i < current ? "var(--color-primary, #2563EB)" : "var(--card-border, #e2e8f0)" }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Card wrapper
// ---------------------------------------------------------------------------
function StepCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-2xl mx-auto animate-in fade-in duration-300 ${className}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function AdvisorOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  // Track for summary
  const [logoUploaded, setLogoUploaded] = useState(false);
  const [clientAdded, setClientAdded] = useState(false);

  // Step 2 – Profile
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ico, setIco] = useState("");

  // Step 5 – Branding
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [secondaryColor, setSecondaryColor] = useState("#1E40AF");
  const [accentColor, setAccentColor] = useState("#60A5FA");
  const [brandTemplate, setBrandTemplate] = useState("clean");
  const [brandFont, setBrandFont] = useState("Inter");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [appName, setAppName] = useState("");
  const [loginSlug, setLoginSlug] = useState("");
  const [logoSize, setLogoSize] = useState(40);
  const [logoShape, setLogoShape] = useState<"original" | "rounded" | "circle">("original");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 6 – First client
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Step 7 – Modules
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    MODULE_DEFS.forEach((m) => { defaults[m.key] = m.defaultOn || false; });
    return defaults;
  });
  const [planFeatures, setPlanFeatures] = useState<Record<string, boolean> | null>(null);
  const [planName, setPlanName] = useState("");

  // -------------------------------------------------------------------------
  // Init
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data: adv, error: advError } = await supabase
          .from("advisors")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (advError || !adv) {
          setInitError("Pro váš účet nebyl nalezen záznam poradce. Kontaktujte podporu.");
          return;
        }

        if (adv.onboarding_completed) { router.push("/advisor"); return; }

        setAdvisorId(adv.id);
        if (adv.company_name) setCompanyName(adv.company_name);
        if (adv.phone) setPhone(adv.phone);
        if (adv.email) setEmail(adv.email);
        if (adv.ico) setIco(adv.ico);
        if (adv.logo_url) { setLogoUrl(adv.logo_url); setLogoPreview(adv.logo_url); setLogoUploaded(true); }
        if (adv.app_name) setAppName(adv.app_name);
        if (adv.brand_primary) setPrimaryColor(adv.brand_primary);
        if (adv.brand_secondary) setSecondaryColor(adv.brand_secondary);
        if (adv.brand_accent_color) setAccentColor(adv.brand_accent_color);
        if (adv.brand_font) setBrandFont(adv.brand_font);
        if (adv.brand_template) setBrandTemplate(adv.brand_template);
        if (adv.login_slug) setLoginSlug(adv.login_slug);
        if (adv.logo_size) setLogoSize(adv.logo_size);
        if (adv.logo_shape) setLogoShape(adv.logo_shape);
        if (adv.enabled_modules && typeof adv.enabled_modules === "object" && Object.keys(adv.enabled_modules).length > 0) {
          setEnabledModules(adv.enabled_modules);
        }

        if (adv.selected_plan_id) {
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("name, features")
            .eq("id", adv.selected_plan_id)
            .single();
          if (plan) {
            const features = (plan.features as Record<string, boolean>) || {};
            setPlanFeatures(features);
            setPlanName(plan.name || "");
          }
        }

        supabase
          .from("onboarding_progress")
          .upsert({ user_id: user.id, role: "advisor", steps: {} }, { onConflict: "user_id,role" })
          .then(({ error }) => { if (error) console.warn("Onboarding progress upsert:", error.message); });
      } catch (err) {
        console.error("Onboarding init error:", err);
        setInitError("Neočekávaná chyba při načítání. Zkuste obnovit stránku.");
      } finally {
        setInitLoading(false);
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Save progress helper
  // -------------------------------------------------------------------------
  async function saveProgress(stepKey: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: progress } = await supabase.from("onboarding_progress").select("steps").eq("user_id", user.id).eq("role", "advisor").single();
      const steps = { ...(progress?.steps || {}), [stepKey]: true };
      await supabase.from("onboarding_progress").update({ steps }).eq("user_id", user.id).eq("role", "advisor");
    } catch (e) { console.warn("saveProgress:", e); }
  }

  // -------------------------------------------------------------------------
  // Step 2 – Save profile
  // -------------------------------------------------------------------------
  async function handleSaveProfile() {
    if (!advisorId) return;
    if (!companyName.trim()) { toast.error("Vyplňte název firmy."); return; }
    setLoading(true);
    try {
      await supabase.from("advisors").update({ company_name: companyName, phone, email, ico }).eq("id", advisorId);
      await saveProgress("profile");
      setStep(3);
    } catch { toast.error("Chyba při ukládání."); }
    finally { setLoading(false); }
  }

  // -------------------------------------------------------------------------
  // Step 5 – Branding helpers
  // -------------------------------------------------------------------------
  function handleFileSelectForCrop(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Nahrávejte pouze obrázky."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Maximální velikost je 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadCroppedBlob(blob: Blob) {
    if (!advisorId) return;
    setUploadingLogo(true);
    setCropSrc(null);
    try {
      const path = `${advisorId}/logo.png`;
      const file = new File([blob], "logo.png", { type: "image/png" });
      const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (uploadError) { toast.error("Chyba: " + uploadError.message); return; }
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const url = urlData.publicUrl + "?t=" + Date.now();
      setLogoUrl(url);
      setLogoPreview(url);
      setLogoUploaded(true);
      await supabase.from("advisors").update({ logo_url: url }).eq("id", advisorId);
      toast.success("Logo nahráno!");
    } catch { toast.error("Chyba při nahrávání."); }
    finally { setUploadingLogo(false); }
  }

  function applyPalette(p: typeof COLOR_PALETTES[0]) {
    setPrimaryColor(p.primary);
    setSecondaryColor(p.secondary);
    setAccentColor(p.accent);
  }

  async function handleSaveBranding() {
    if (!advisorId) return;
    setLoading(true);
    try {
      await supabase.from("advisors").update({
        brand_primary: primaryColor, brand_secondary: secondaryColor, brand_accent_color: accentColor,
        brand_font: brandFont, brand_template: brandTemplate, app_name: appName || null,
        login_slug: loginSlug || null, logo_size: logoSize, logo_shape: logoShape,
      }).eq("id", advisorId);
      await saveProgress("branding");
      setStep(6);
    } catch { toast.error("Chyba při ukládání."); }
    finally { setLoading(false); }
  }

  // -------------------------------------------------------------------------
  // Step 6 – First client
  // -------------------------------------------------------------------------
  async function handleCreateClient() {
    if (!advisorId) return;
    if (!firstName.trim() || !lastName.trim()) { toast.error("Vyplňte jméno a příjmení klienta."); return; }
    setLoading(true);
    try {
      await supabase.from("clients").insert({
        advisor_id: advisorId, first_name: firstName, last_name: lastName,
        email: clientEmail || null, phone: clientPhone || null,
      });
      setClientAdded(true);
      toast.success(`Klient ${firstName} ${lastName} byl přidán.`);
      await saveProgress("first_client");
      setStep(7);
    } catch { toast.error("Chyba při přidávání klienta."); }
    finally { setLoading(false); }
  }

  // -------------------------------------------------------------------------
  // Step 7 – Save modules
  // -------------------------------------------------------------------------
  async function handleSaveModules() {
    if (!advisorId) return;
    setLoading(true);
    try {
      await supabase.from("advisors").update({ enabled_modules: enabledModules }).eq("id", advisorId);
      await saveProgress("modules");
      setStep(8);
    } catch { toast.error("Chyba při ukládání."); }
    finally { setLoading(false); }
  }

  // -------------------------------------------------------------------------
  // Step 8 – Finish
  // -------------------------------------------------------------------------
  async function handleFinish() {
    if (!advisorId) return;
    setLoading(true);
    try {
      await supabase.from("advisors").update({ onboarding_completed: true }).eq("id", advisorId);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("onboarding_progress").update({ completed_at: new Date().toISOString() }).eq("user_id", user.id).eq("role", "advisor");
      }
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => router.push("/advisor"), 1500);
    } catch { toast.error("Chyba."); setLoading(false); }
  }

  // -------------------------------------------------------------------------
  // Loading / Error
  // -------------------------------------------------------------------------
  if (initLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: "var(--color-background, #f8fafc)" }}>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--card-text-dim,#9ca3af)]" />
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6" style={{ backgroundColor: "var(--color-background, #f8fafc)" }}>
        <div className="max-w-sm text-center">
          <p className="text-sm text-red-600 mb-4">{initError}</p>
          <Button onClick={() => window.location.reload()} className="cursor-pointer">Obnovit stránku</Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Branding preview helpers
  // -------------------------------------------------------------------------
  const tpl = ONBOARDING_TEMPLATES.find((t) => t.id === brandTemplate) || ONBOARDING_TEMPLATES[0];
  const isDarkTpl = tpl.id === "fintech" || tpl.id === "luxe";
  const sidebarBgColor = tpl.sidebar;
  const sidebarTextColor = isDarkTpl || tpl.id === "corporate" ? "#E2E8F0" : "#374151";
  const mainBgColor = tpl.bg;
  const mainTextColor = tpl.text;
  const cardBgColor = isDarkTpl ? "#1E293B" : "#FFFFFF";
  const cardBorderColor = tpl.border;
  const logoShapeRadius = logoShape === "circle" ? "50%" : logoShape === "rounded" ? "4px" : "0";

  const enabledCount = Object.values(enabledModules).filter(Boolean).length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--color-background, #f8fafc)" }}>
      <div className="flex-1 px-4 py-8 md:py-12">
        <ProgressBar current={step} total={TOTAL_STEPS} />

        {/* ============================================================= */}
        {/* STEP 1 – Vítejte */}
        {/* ============================================================= */}
        {step === 1 && (
          <StepCard>
            <div className="text-center py-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--color-primary, #2563EB)" + "15" }}>
                <Rocket className="h-10 w-10" style={{ color: "var(--color-primary, #2563EB)" }} />
              </div>
              <h1 className="text-2xl font-bold text-[var(--card-text,#111827)] mb-3">
                Vítejte v {appName || "Finatiq"}!
              </h1>
              <p className="text-[var(--card-text-muted,#6b7280)] max-w-md mx-auto mb-2">
                Pomůžeme vám nastavit váš portál pro správu klientů krok za krokem.
              </p>
              <p className="text-sm text-[var(--card-text-dim,#9ca3af)] mb-10">
                Nastavení zabere asi 5 minut.
              </p>
              <Button onClick={() => setStep(2)} className="h-11 px-8 cursor-pointer text-base">
                Začít nastavení <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </StepCard>
        )}

        {/* ============================================================= */}
        {/* STEP 2 – Váš profil */}
        {/* ============================================================= */}
        {step === 2 && (
          <StepCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--color-primary, #2563EB)" + "15" }}>
                <User className="h-6 w-6" style={{ color: "var(--color-primary, #2563EB)" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--card-text,#111827)]">Váš profil</h2>
                <p className="text-sm text-[var(--card-text-muted,#6b7280)]">Nejdřív si nastavíme základní údaje o vás.</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Název firmy / vaše jméno jako OSVČ *</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Finanční poradenství Novák" className="h-10" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Telefon</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+420 ..." className="h-10" />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vas@email.cz" className="h-10" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">IČO (volitelné)</Label>
                <Input value={ico} onChange={(e) => setIco(e.target.value)} placeholder="12345678" className="h-10" />
              </div>
              <p className="text-xs text-[var(--card-text-dim,#9ca3af)]">
                Tyto údaje se zobrazí vašim klientům v portálu a na fakturách.
              </p>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="cursor-pointer">
                <ChevronLeft className="mr-2 h-4 w-4" />Zpět
              </Button>
              <Button onClick={handleSaveProfile} disabled={loading} className="cursor-pointer">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Další <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {/* ============================================================= */}
        {/* STEP 3 – Co je CRM? */}
        {/* ============================================================= */}
        {step === 3 && (
          <StepCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--color-primary, #2563EB)" + "15" }}>
                <BookOpen className="h-6 w-6" style={{ color: "var(--color-primary, #2563EB)" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--card-text,#111827)]">Co je CRM?</h2>
                <p className="text-sm text-[var(--card-text-muted,#6b7280)]">Rychlý úvod do systému</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-6 space-y-5">
              <p className="text-[var(--card-text,#111827)] leading-relaxed">
                <strong>CRM</strong> znamená <em>Customer Relationship Management</em> — správa vztahů s klienty.
                Místo excelu a papírků budete mít vše na jednom místě:
              </p>

              <div className="space-y-3">
                {[
                  { icon: ClipboardList, title: "Přehled všech klientů a jejich smluv", desc: "Vidíte kontakty, smlouvy, platby i historii komunikace." },
                  { icon: Kanban, title: "Pipeline — vidíte kde je každý obchodní případ", desc: "Přetahujte karty mezi sloupci: Nový lead, Schůzka, Nabídka, Podpis." },
                  { icon: Bell, title: "Připomínky — nikdy nezapomenete na follow-up", desc: "Systém vám připomene důležité termíny a následné kroky." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 p-4 rounded-lg" style={{ backgroundColor: "var(--table-header, #f9fafb)" }}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--color-primary, #2563EB)" + "15" }}>
                      <item.icon className="h-5 w-5" style={{ color: "var(--color-primary, #2563EB)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--card-text,#111827)]">{item.title}</p>
                      <p className="text-xs text-[var(--card-text-muted,#6b7280)] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="cursor-pointer">
                <ChevronLeft className="mr-2 h-4 w-4" />Zpět
              </Button>
              <Button onClick={() => setStep(4)} className="cursor-pointer">
                Rozumím, pokračovat <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {/* ============================================================= */}
        {/* STEP 4 – Co je klientský portál? */}
        {/* ============================================================= */}
        {step === 4 && (
          <StepCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--color-primary, #2563EB)" + "15" }}>
                <Globe className="h-6 w-6" style={{ color: "var(--color-primary, #2563EB)" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--card-text,#111827)]">Co je klientský portál?</h2>
                <p className="text-sm text-[var(--card-text-muted,#6b7280)]">Místo pro vaše klienty</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-6 space-y-5">
              <p className="text-[var(--card-text,#111827)] leading-relaxed">
                Klientský portál je místo, kde vaši klienti vidí své smlouvy, platby a dokumenty.
                Vy jim vytvoříte přístup a oni se přihlásí na vašem odkazu.
              </p>

              <div className="space-y-3">
                {[
                  { icon: ClipboardList, title: "Klient vidí své smlouvy a stav plateb", desc: "Transparentní přehled o všech produktech a jejich stavu." },
                  { icon: Upload, title: "Může nahrávat dokumenty", desc: "Například daňové přiznání, výpisy z účtu nebo kopie dokladů." },
                  { icon: Bell, title: "Dostává notifikace o důležitých změnách", desc: "Email notifikace při nové smlouvě, blížící se platbě nebo zprávě od vás." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 p-4 rounded-lg" style={{ backgroundColor: "var(--table-header, #f9fafb)" }}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--color-primary, #2563EB)" + "15" }}>
                      <item.icon className="h-5 w-5" style={{ color: "var(--color-primary, #2563EB)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--card-text,#111827)]">{item.title}</p>
                      <p className="text-xs text-[var(--card-text-muted,#6b7280)] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="cursor-pointer">
                <ChevronLeft className="mr-2 h-4 w-4" />Zpět
              </Button>
              <Button onClick={() => setStep(5)} className="cursor-pointer">
                Skvělé, pokračovat <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {/* ============================================================= */}
        {/* STEP 5 – Branding */}
        {/* ============================================================= */}
        {step === 5 && (
          <StepCard className="!max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--color-primary, #2563EB)" + "15" }}>
                <Palette className="h-6 w-6" style={{ color: "var(--color-primary, #2563EB)" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--card-text,#111827)]">Branding</h2>
                <p className="text-sm text-[var(--card-text-muted,#6b7280)]">Teď si upravíme jak bude váš portál vypadat pro klienty.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left – controls (3/5) */}
              <div className="lg:col-span-3 space-y-5">
                {/* Logo */}
                <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--card-text,#111827)] mb-3">Logo</h3>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelectForCrop(f); }}
                    onClick={() => logoInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--card-border,#e2e8f0)] p-5 cursor-pointer transition-colors duration-150 hover:border-[var(--card-text-dim,#9ca3af)]"
                  >
                    {uploadingLogo ? <Loader2 className="h-5 w-5 text-[var(--card-text-dim,#9ca3af)] animate-spin" /> : (
                      <><Upload className="h-4 w-4 text-[var(--card-text-dim,#9ca3af)] mb-1" /><p className="text-xs text-[var(--card-text-dim,#9ca3af)]">Přetáhněte nebo klikněte</p></>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelectForCrop(f); e.target.value = ""; }} />
                  </div>
                  {(logoUrl || logoPreview) && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--table-hover,#f9fafb)] border border-[var(--card-border,#e2e8f0)] mt-2">
                      <img src={logoUrl || logoPreview || ""} alt="" className="h-8 max-w-[100px] object-contain" />
                      <button type="button" onClick={() => { if (logoUrl) setCropSrc(logoUrl); else if (logoPreview) setCropSrc(logoPreview); }} className="flex items-center gap-1 text-xs text-[var(--card-text-muted,#6b7280)] hover:text-[var(--card-text,#111827)] cursor-pointer"><Crop className="h-3 w-3" />Upravit</button>
                      <button type="button" onClick={() => { setLogoUrl(null); setLogoPreview(null); setLogoUploaded(false); }} className="ml-auto text-[var(--card-text-dim,#9ca3af)] hover:text-red-500 cursor-pointer"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <Label className="text-xs font-medium mb-1.5 block">Velikost</Label>
                      <div className="flex items-center gap-3">
                        <input type="range" min={20} max={80} value={logoSize} onChange={(e) => setLogoSize(parseInt(e.target.value))} className="flex-1 accent-gray-900 cursor-pointer" />
                        <span className="text-xs text-[var(--card-text-dim,#9ca3af)] font-mono w-8 text-right">{logoSize}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1.5 block">Tvar</Label>
                      <div className="flex gap-1.5">
                        {(["original", "rounded", "circle"] as const).map((shape) => (
                          <button key={shape} type="button" onClick={() => setLogoShape(shape)}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 ${logoShape === shape ? "bg-gray-900 text-white" : "bg-[var(--table-hover,#f9fafb)] text-[var(--card-text-muted,#6b7280)]"}`}
                          >{shape === "original" ? "Original" : shape === "rounded" ? "Rounded" : "Kruh"}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barvy */}
                <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--card-text,#111827)] mb-3">Barvy</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COLOR_PALETTES.map((palette) => {
                      const isActive = primaryColor === palette.primary && secondaryColor === palette.secondary;
                      return (
                        <button key={palette.name} type="button" onClick={() => applyPalette(palette)}
                          className={`relative flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all duration-150 ${isActive ? "border-gray-900 bg-[var(--table-hover,#f9fafb)]" : "border-[var(--card-border,#e2e8f0)]"}`}>
                          <div className="flex -space-x-1">
                            <div className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.primary }} />
                            <div className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.secondary }} />
                            <div className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.accent }} />
                          </div>
                          <span className="text-[11px] text-[var(--card-text-muted,#6b7280)] font-medium truncate">{palette.name}</span>
                          {isActive && <Check className="h-3 w-3 text-[var(--card-text)] absolute top-1 right-1" />}
                        </button>
                      );
                    })}
                  </div>
                  <button type="button" onClick={() => setCustomColors(!customColors)} className="mt-3 text-xs text-[var(--card-text-dim,#9ca3af)] hover:text-[var(--card-text-muted,#6b7280)] cursor-pointer">
                    {customColors ? "Skrýt vlastní barvy" : "Vlastní barvy"}
                  </button>
                  {customColors && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      {[{ label: "Primární", value: primaryColor, fn: setPrimaryColor }, { label: "Sekundární", value: secondaryColor, fn: setSecondaryColor }, { label: "Akcentní", value: accentColor, fn: setAccentColor }].map((c) => (
                        <div key={c.label}>
                          <Label className="text-xs text-[var(--card-text-muted,#6b7280)] mb-1 block">{c.label}</Label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={c.value} onChange={(e) => c.fn(e.target.value)} className="h-7 w-7 rounded cursor-pointer border-0 p-0" />
                            <span className="text-xs text-[var(--card-text-muted,#6b7280)] font-mono">{c.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Šablona */}
                <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--card-text,#111827)] mb-3">Šablona</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {ONBOARDING_TEMPLATES.map((t) => {
                      const isActive = brandTemplate === t.id;
                      return (
                        <button key={t.id} type="button" onClick={() => setBrandTemplate(t.id)}
                          className={`relative rounded-lg border-2 p-3 text-left cursor-pointer transition-all duration-150 ${isActive ? "border-gray-900" : "border-[var(--card-border,#e2e8f0)]"}`}>
                          <div className="flex h-16 rounded overflow-hidden mb-2" style={{ border: `1px solid ${t.border}` }}>
                            <div className="w-4 shrink-0" style={{ backgroundColor: t.sidebar }} />
                            <div className="flex-1 p-1.5" style={{ backgroundColor: t.bg }}>
                              <div className="h-1.5 w-8 rounded-sm mb-1" style={{ backgroundColor: t.text, opacity: 0.2 }} />
                              <div className="h-1 w-6 rounded-sm" style={{ backgroundColor: t.text, opacity: 0.1 }} />
                            </div>
                          </div>
                          <p className="text-sm font-medium text-[var(--card-text,#111827)]">{t.name}</p>
                          <p className="text-xs text-[var(--card-text-dim,#9ca3af)]">{t.desc}</p>
                          {isActive && <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-gray-900 flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font */}
                <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--card-text,#111827)] mb-3">Font</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {FONT_OPTIONS.map((font) => (
                      <button key={font.value} type="button" onClick={() => setBrandFont(font.value)}
                        className={`px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors duration-150 ${brandFont === font.value ? "bg-gray-900 text-white font-medium" : "bg-[var(--table-hover,#f9fafb)] text-[var(--card-text-muted,#6b7280)]"}`}
                        style={{ fontFamily: font.value + ", sans-serif" }}>{font.label}</button>
                    ))}
                  </div>
                  <div className="p-3 rounded-md bg-[var(--table-hover,#f9fafb)] border border-[var(--card-border,#e2e8f0)] mt-3">
                    <p style={{ fontFamily: brandFont + ", sans-serif" }} className="text-lg font-semibold text-[var(--card-text,#111827)]">Aa Bb Cc 123</p>
                    <p style={{ fontFamily: brandFont + ", sans-serif" }} className="text-sm text-[var(--card-text-muted,#6b7280)] mt-0.5">Přehled vašeho podnikání — {brandFont}</p>
                  </div>
                </div>

                {/* Název */}
                <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--card-text,#111827)] mb-3">Název firmy</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs font-medium mb-1.5 block">Název aplikace</Label>
                      <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="FinAdvisor" className="h-9" />
                      <p className="text-xs text-[var(--card-text-dim,#9ca3af)] mt-1">Tento název uvidí vaši klienti</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1.5 block">Login slug</Label>
                      <Input value={loginSlug} onChange={(e) => setLoginSlug(e.target.value)} placeholder="moje-firma" className="h-9" />
                      {loginSlug && <p className="text-xs text-[var(--card-text-dim,#9ca3af)] mt-1">URL: finatiq.cz/p/{loginSlug}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right – live preview (2/5) */}
              <div className="lg:col-span-2">
                <div className="sticky top-6">
                  <span className="text-xs font-medium text-[var(--card-text-dim,#9ca3af)] uppercase tracking-wider mb-3 block">Náhled</span>
                  <div className="w-full h-[420px] rounded-lg border border-[var(--card-border,#e2e8f0)] overflow-hidden flex" style={{ fontFamily: brandFont + ", sans-serif", fontSize: "10px" }}>
                    <div className="w-[72px] shrink-0 flex flex-col py-2.5 px-1.5" style={{ backgroundColor: sidebarBgColor }}>
                      <div className="flex items-center justify-center mb-3 px-1">
                        {(logoUrl || logoPreview) ? (
                          <img src={logoUrl || logoPreview || ""} alt="" style={{ height: `${Math.min(logoSize * 0.45, 24)}px`, objectFit: logoShape !== "original" ? "cover" : "contain", borderRadius: logoShapeRadius, aspectRatio: logoShape !== "original" ? "1/1" : "auto" }} />
                        ) : (
                          <span style={{ color: sidebarTextColor, fontSize: "9px", fontWeight: 700 }}>{(appName || "Finatiq").slice(0, 6)}</span>
                        )}
                      </div>
                      {[LayoutDashboard, Kanban, UsersIcon, BellIcon, SettingsIcon].map((Icon, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-1.5 py-1 rounded mx-0.5 mb-0.5"
                          style={{ backgroundColor: i === 0 ? primaryColor + "20" : "transparent", borderLeft: i === 0 ? `2px solid ${primaryColor}` : "2px solid transparent" }}>
                          <Icon style={{ width: 10, height: 10, color: i === 0 ? primaryColor : sidebarTextColor, opacity: i === 0 ? 1 : 0.5 }} />
                          <span style={{ color: i === 0 ? primaryColor : sidebarTextColor, opacity: i === 0 ? 1 : 0.5, fontSize: "7px", fontWeight: i === 0 ? 600 : 400 }}>
                            {["Přehled", "Pipeline", "Klienti", "Oznámení", "Nastavení"][i]}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 p-3 overflow-hidden" style={{ backgroundColor: mainBgColor }}>
                      <div className="mb-2.5">
                        <div style={{ color: mainTextColor, fontSize: "11px", fontWeight: 700 }}>Přehled</div>
                        <div style={{ color: mainTextColor, fontSize: "7px", opacity: 0.4 }}>Tady je přehled vašeho podnikání</div>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                        {[{ label: "Pipeline", value: "1.2M Kč" }, { label: "Leady", value: "24" }, { label: "Konverze", value: "68%" }].map((kpi) => (
                          <div key={kpi.label} className="p-1.5 rounded" style={{ backgroundColor: cardBgColor, border: `1px solid ${cardBorderColor}` }}>
                            <div style={{ fontSize: "6px", color: mainTextColor, opacity: 0.5, textTransform: "uppercase", fontWeight: 500 }}>{kpi.label}</div>
                            <div style={{ fontSize: "10px", color: mainTextColor, fontWeight: 700, marginTop: 2 }}>{kpi.value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 rounded mb-2" style={{ backgroundColor: cardBgColor, border: `1px solid ${cardBorderColor}` }}>
                        <div style={{ fontSize: "6px", color: mainTextColor, opacity: 0.5, textTransform: "uppercase", fontWeight: 500, marginBottom: 6 }}>Pipeline</div>
                        <div className="flex items-end gap-1 h-[50px]">
                          {[40, 65, 45, 80, 60, 90, 70].map((h, i) => (
                            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: i === 5 ? primaryColor : primaryColor + "30" }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {cropSrc && <OnboardingCropModal imageSrc={cropSrc} onConfirm={uploadCroppedBlob} onCancel={() => setCropSrc(null)} />}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)} className="cursor-pointer">
                <ChevronLeft className="mr-2 h-4 w-4" />Zpět
              </Button>
              <Button onClick={handleSaveBranding} disabled={loading} className="cursor-pointer">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Uložit a pokračovat <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {/* ============================================================= */}
        {/* STEP 6 – Přidejte prvního klienta */}
        {/* ============================================================= */}
        {step === 6 && (
          <StepCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--color-primary, #2563EB)" + "15" }}>
                <UserPlus className="h-6 w-6" style={{ color: "var(--color-primary, #2563EB)" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--card-text,#111827)]">Přidejte prvního klienta</h2>
                <p className="text-sm text-[var(--card-text-muted,#6b7280)]">Pojďme přidat vašeho prvního klienta.</p>
              </div>
            </div>

            {clientAdded ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Check className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-emerald-800">
                  Výborně! Klient {firstName} {lastName} byl přidán.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Jméno *</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jan" className="h-10" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Příjmení *</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Novák" className="h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Email</Label>
                    <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="jan@email.cz" className="h-10" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">Telefon</Label>
                    <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+420 ..." className="h-10" />
                  </div>
                </div>
                <p className="text-xs text-[var(--card-text-dim,#9ca3af)]">
                  Klienta můžete přidat i později. Tento krok můžete přeskočit.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(5)} className="cursor-pointer">
                <ChevronLeft className="mr-2 h-4 w-4" />Zpět
              </Button>
              <div className="flex gap-2">
                {!clientAdded && (
                  <Button variant="outline" onClick={async () => { await saveProgress("first_client_skipped"); setStep(7); }} className="cursor-pointer">
                    Přeskočit
                  </Button>
                )}
                <Button onClick={clientAdded ? () => setStep(7) : handleCreateClient} disabled={loading} className="cursor-pointer">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {clientAdded ? "Pokračovat" : "Přidat klienta"} <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </StepCard>
        )}

        {/* ============================================================= */}
        {/* STEP 7 – Které nástroje chcete používat? */}
        {/* ============================================================= */}
        {step === 7 && (
          <StepCard>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--color-primary, #2563EB)" + "15" }}>
                <Boxes className="h-6 w-6" style={{ color: "var(--color-primary, #2563EB)" }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--card-text,#111827)]">Které nástroje chcete používat?</h2>
                <p className="text-sm text-[var(--card-text-muted,#6b7280)]">Vyberte si funkce. Můžete to kdykoliv změnit v nastavení.</p>
              </div>
            </div>

            <div className="space-y-2">
              {MODULE_DEFS.map((mod) => {
                const inPlan = !planFeatures || planFeatures[mod.key] === true;
                const isEnabled = enabledModules[mod.key] || false;

                return (
                  <div
                    key={mod.key}
                    className="flex items-center gap-4 rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--table-header, #f9fafb)" }}>
                      <mod.icon className="h-5 w-5 text-[var(--card-text-muted,#6b7280)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--card-text,#111827)]">{mod.label}</p>
                        {!inPlan && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--card-text-dim,#9ca3af)] bg-[var(--table-header,#f9fafb)] px-2 py-0.5 rounded-full">
                            <Lock className="h-2.5 w-2.5" />
                            {planName || "Vyšší plán"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--card-text-muted,#6b7280)] mt-0.5">{mod.description}</p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(val) => setEnabledModules((prev) => ({ ...prev, [mod.key]: val }))}
                      disabled={!inPlan}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(6)} className="cursor-pointer">
                <ChevronLeft className="mr-2 h-4 w-4" />Zpět
              </Button>
              <Button onClick={handleSaveModules} disabled={loading} className="cursor-pointer">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Další <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {/* ============================================================= */}
        {/* STEP 8 – Hotovo! */}
        {/* ============================================================= */}
        {step === 8 && (
          <StepCard>
            <div className="text-center py-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50">
                <PartyPopper className="h-10 w-10 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--card-text,#111827)] mb-2">
                Váš portál je připravený!
              </h1>
              <p className="text-[var(--card-text-muted,#6b7280)] mb-8">
                Tady je shrnutí co jste nastavili:
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-5 space-y-3 mb-8">
              {[
                { label: "Firma", value: companyName, done: !!companyName },
                { label: "Logo", value: logoUploaded ? "Nahráno" : "Nepřidáno", done: logoUploaded },
                { label: "Barva", value: primaryColor, done: true, swatch: primaryColor },
                { label: "Šablona", value: ONBOARDING_TEMPLATES.find((t) => t.id === brandTemplate)?.name || brandTemplate, done: true },
                { label: "Font", value: brandFont, done: true },
                { label: "Moduly", value: `${enabledCount} aktivních`, done: enabledCount > 0 },
                { label: "Klient", value: clientAdded ? `${firstName} ${lastName}` : "Přeskočeno", done: clientAdded },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--table-header, #f9fafb)" }}>
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${item.done ? "bg-emerald-100" : "bg-[var(--card-border,#e2e8f0)]"}`}>
                    {item.done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-[var(--card-text-dim,#9ca3af)]" />}
                  </div>
                  <span className="text-sm text-[var(--card-text-muted,#6b7280)] w-20">{item.label}</span>
                  <span className="text-sm font-medium text-[var(--card-text,#111827)] flex items-center gap-2">
                    {item.swatch && <span className="inline-block h-4 w-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: item.swatch }} />}
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick-start tips */}
            <div className="rounded-xl border border-[var(--card-border,#e2e8f0)] bg-[var(--card-bg,#fff)] p-5 mb-8">
              <h3 className="text-sm font-semibold text-[var(--card-text,#111827)] mb-3">Další kroky</h3>
              <div className="space-y-2">
                {[
                  { icon: UsersIcon, text: "Přidejte další klienty v sekci Klienti" },
                  { icon: Kanban, text: "Vytvořte první obchodní příležitost v Pipeline" },
                  { icon: Globe, text: loginSlug ? `Sdílejte odkaz na portál: finatiq.cz/p/${loginSlug}` : "Nastavte login slug v brandingu pro sdílení portálu" },
                ].map((tip) => (
                  <div key={tip.text} className="flex items-center gap-3 text-sm text-[var(--card-text-muted,#6b7280)]">
                    <tip.icon className="h-4 w-4 shrink-0" style={{ color: "var(--color-primary, #2563EB)" }} />
                    {tip.text}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-[var(--card-text-dim,#9ca3af)] text-center mb-6">
              Všechna nastavení můžete kdykoliv změnit v sekci Nastavení.
            </p>

            <div className="flex justify-center">
              <Button onClick={handleFinish} disabled={loading} className="h-11 px-8 cursor-pointer text-base">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Přejít na dashboard <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </StepCard>
        )}
      </div>
    </div>
  );
}
