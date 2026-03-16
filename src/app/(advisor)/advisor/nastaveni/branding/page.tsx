"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRefreshTheme } from "@/lib/theme/ThemeProvider";
import { toast } from "sonner";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Upload, Link2, X, Loader2, Check, Crop,
  LayoutDashboard, Users, Settings, Kanban, Bell,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ── Constants ── */

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

const TEMPLATES = [
  { id: "clean", name: "Clean", desc: "Světlá a čistá", bg: "#F8FAFC", sidebar: "#FFFFFF", text: "#0F172A", border: "#E2E8F0" },
  { id: "luxe", name: "Luxe", desc: "Elegantní a luxusní", bg: "#FFFBF5", sidebar: "#1C1917", text: "#1C1917", border: "#D6D3D1" },
  { id: "fintech", name: "Fintech", desc: "Tmavá a technická", bg: "#0F172A", sidebar: "#020617", text: "#F8FAFC", border: "#1E293B" },
  { id: "corporate", name: "Corporate", desc: "Profesionální a ostré", bg: "#F9FAFB", sidebar: "#111827", text: "#111827", border: "#E5E7EB" },
];

const FONTS = [
  { value: "DM Sans", label: "DM Sans" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Inter", label: "Inter" },
  { value: "Outfit", label: "Outfit" },
  { value: "Syne", label: "Syne" },
];

interface BrandingState {
  app_name: string;
  logo_url: string;
  logo_icon_url: string;
  logo_size: number;
  logo_shape: string;
  logo_position: string;
  login_slug: string;
  brand_primary: string;
  brand_secondary: string;
  brand_accent_color: string;
  brand_background: string;
  brand_font: string;
  brand_template: string;
  custom_login_title: string;
  custom_login_subtitle: string;
}

const DEFAULTS: BrandingState = {
  app_name: "FinAdvisor",
  logo_url: "",
  logo_icon_url: "",
  logo_size: 40,
  logo_shape: "original",
  logo_position: "sidebar_top",
  login_slug: "",
  brand_primary: "#2563EB",
  brand_secondary: "#1E40AF",
  brand_accent_color: "#60A5FA",
  brand_background: "#F8FAFC",
  brand_font: "Inter",
  brand_template: "clean",
  custom_login_title: "",
  custom_login_subtitle: "",
};

/* ── Crop Utilities ── */

function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = Math.round(crop.width * scaleX);
  canvas.height = Math.round(crop.height * scaleY);

  ctx.drawImage(
    image,
    Math.round(crop.x * scaleX),
    Math.round(crop.y * scaleY),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      "image/png",
      1,
    );
  });
}

/* ── Crop Modal ── */

type AspectMode = "free" | "1:1" | "16:9";
const ASPECT_OPTIONS: { mode: AspectMode; label: string; value: number | undefined }[] = [
  { mode: "free", label: "Volný", value: undefined },
  { mode: "1:1", label: "1:1", value: 1 },
  { mode: "16:9", label: "16:9", value: 16 / 9 },
];

function CropModal({
  imageSrc,
  onConfirm,
  onCancel,
}: {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspectMode, setAspectMode] = useState<AspectMode>("free");
  const [processing, setProcessing] = useState(false);
  const [scale, setScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const aspect = ASPECT_OPTIONS.find((o) => o.mode === aspectMode)?.value;

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    // Default: select 90% of the image, centered
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, width / height, width, height),
      width,
      height,
    );
    setCrop(initialCrop);
  }

  function handleAspectChange(mode: AspectMode) {
    setAspectMode(mode);
    const img = imgRef.current;
    if (!img) return;
    const { width, height } = img;
    const newAspect = ASPECT_OPTIONS.find((o) => o.mode === mode)?.value;
    if (newAspect) {
      const newCrop = centerCrop(
        makeAspectCrop({ unit: "%", width: 70 }, newAspect, width, height),
        width,
        height,
      );
      setCrop(newCrop);
    }
  }

  async function handleConfirm() {
    if (!completedCrop || !imgRef.current) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      onConfirm(blob);
    } catch {
      toast.error("Nepodařilo se oříznout obrázek.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl bg-[var(--card-bg)] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--card-border)]">
          <h3 className="text-sm font-semibold text-[var(--card-text)]">Oříznutí loga</h3>
          <button
            onClick={onCancel}
            className="text-[var(--card-text-dim)] hover:text-[var(--card-text-muted)] cursor-pointer transition-colors duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cropper area */}
        <div className="flex items-center justify-center bg-gray-900 p-4 min-h-[320px] max-h-[400px] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop"
              onLoad={onImageLoad}
              style={{ transform: `scale(${scale})`, transformOrigin: "center", maxHeight: "380px" }}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-3">
          {/* Aspect ratio toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--card-text-muted)] w-12">Poměr:</span>
            <div className="flex gap-1.5">
              {ASPECT_OPTIONS.map((opt) => (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => handleAspectChange(opt.mode)}
                  className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 ${
                    aspectMode === opt.mode
                      ? "bg-gray-900 text-white"
                      : "bg-[var(--table-header)] text-[var(--card-text-muted)] hover:bg-[var(--card-border)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--card-text-muted)] w-12">Zoom:</span>
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="flex-1 accent-gray-900 cursor-pointer"
            />
            <span className="text-xs text-[var(--card-text-dim)] font-mono w-10 text-right">
              {scale.toFixed(1)}x
            </span>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8 cursor-pointer"
            >
              Zrušit
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={processing || !completedCrop}
              className="h-8 cursor-pointer"
            >
              {processing ? (
                <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Ořezávám</>
              ) : (
                "Potvrdit"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Logo Upload ── */

function LogoUpload({
  label,
  hint,
  currentUrl,
  onUrlChange,
  advisorId,
  fileKey,
}: {
  label: string;
  hint: string;
  currentUrl: string;
  onUrlChange: (url: string) => void;
  advisorId: string | null;
  fileKey: string;
}) {
  const [mode, setMode] = useState<"upload" | "url">(
    currentUrl && !currentUrl.includes("/storage/") ? "url" : "upload"
  );
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Read file as data URL and open crop modal */
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Nahrávejte pouze obrázky."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Maximální velikost je 5 MB."); return; }

    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  /* Upload the cropped blob to Supabase */
  const uploadBlob = useCallback(
    async (blob: Blob) => {
      if (!advisorId) { toast.error("Poradce nebyl načten."); return; }

      setUploading(true);
      setCropSrc(null);
      try {
        const supabase = createClient();
        const path = `${advisorId}/${fileKey}.png`;
        const file = new File([blob], `${fileKey}.png`, { type: "image/png" });
        const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
        if (uploadError) { toast.error("Chyba: " + uploadError.message); setUploading(false); return; }
        const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
        onUrlChange(urlData.publicUrl + "?t=" + Date.now());
        toast.success("Logo nahráno.");
      } catch { toast.error("Nepodařilo se nahrát soubor."); }
      finally { setUploading(false); }
    },
    [advisorId, fileKey, onUrlChange]
  );

  /* Re-edit existing logo */
  function handleEditLogo() {
    if (currentUrl) setCropSrc(currentUrl);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <button
          type="button"
          onClick={() => setMode(mode === "upload" ? "url" : "upload")}
          className="flex items-center gap-1 text-xs text-[var(--brand-primary,#2563EB)] hover:opacity-70 cursor-pointer transition-opacity duration-150"
        >
          {mode === "upload" ? <><Link2 className="h-3 w-3" />Zadat URL</> : <><Upload className="h-3 w-3" />Nahrát</>}
        </button>
      </div>
      <p className="text-xs text-[var(--card-text-dim)]">{hint}</p>

      {mode === "upload" ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-md border border-dashed p-5 cursor-pointer transition-colors duration-150 ${
            dragOver ? "border-blue-500 bg-blue-500/5" : "border-[var(--card-border)] hover:border-[var(--card-border)]"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-[var(--card-text-dim)] animate-spin" />
          ) : (
            <>
              <Upload className="h-4 w-4 text-[var(--card-text-dim)] mb-1" />
              <p className="text-xs text-[var(--card-text-dim)]">Přetáhněte nebo klikněte</p>
              <p className="text-[10px] text-[var(--card-text-dim)]">PNG, JPG, SVG — max 5 MB</p>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />
        </div>
      ) : (
        <Input value={currentUrl} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://..." className="h-9 text-sm" />
      )}

      {currentUrl && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--table-hover)] border border-[var(--card-border)]">
          <img src={currentUrl} alt="" className="h-8 max-w-[100px] object-contain" />
          <button
            type="button"
            onClick={handleEditLogo}
            className="flex items-center gap-1 text-xs text-[var(--card-text-muted)] hover:text-[var(--card-text)] cursor-pointer transition-colors duration-150"
          >
            <Crop className="h-3 w-3" />
            Upravit
          </button>
          <button type="button" onClick={() => onUrlChange("")} className="ml-auto text-[var(--card-text-dim)] hover:text-red-500 cursor-pointer transition-colors duration-150">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Crop modal */}
      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          onConfirm={uploadBlob}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}

/* ── Live Preview ── */

function LivePreview({ state }: { state: BrandingState }) {
  const tpl = TEMPLATES.find((t) => t.id === state.brand_template) || TEMPLATES[0];
  const isDark = tpl.id === "fintech" || tpl.id === "luxe";
  const sidebarBg = tpl.sidebar;
  const sidebarText = isDark || tpl.id === "corporate" ? "#E2E8F0" : "#374151";
  const mainBg = tpl.bg;
  const mainText = tpl.text;
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const cardBorder = tpl.border;

  const logoShape = state.logo_shape === "circle" ? "50%" : state.logo_shape === "square" ? "4px" : "0";

  return (
    <div
      className="w-full h-[420px] rounded-lg border border-[var(--card-border)] overflow-hidden flex"
      style={{ fontFamily: state.brand_font + ", sans-serif", fontSize: "10px" }}
    >
      {/* Mini sidebar */}
      <div className="w-[72px] shrink-0 flex flex-col py-2.5 px-1.5" style={{ backgroundColor: sidebarBg }}>
        {/* Logo */}
        <div className="flex items-center justify-center mb-3 px-1">
          {state.logo_url ? (
            <img
              src={state.logo_url}
              alt=""
              style={{
                height: `${Math.min(state.logo_size * 0.45, 24)}px`,
                objectFit: state.logo_shape !== "original" ? "cover" : "contain",
                borderRadius: logoShape,
                aspectRatio: state.logo_shape !== "original" ? "1/1" : "auto",
              }}
            />
          ) : (
            <span style={{ color: sidebarText, fontSize: "9px", fontWeight: 700 }}>
              {state.app_name.slice(0, 6)}
            </span>
          )}
        </div>

        {/* Menu items */}
        {[LayoutDashboard, Kanban, Users, Bell, Settings].map((Icon, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded mx-0.5 mb-0.5 transition-colors duration-150"
            style={{
              backgroundColor: i === 0 ? state.brand_primary + "20" : "transparent",
              borderLeft: i === 0 ? `2px solid ${state.brand_primary}` : "2px solid transparent",
            }}
          >
            <Icon style={{ width: 10, height: 10, color: i === 0 ? state.brand_primary : sidebarText, opacity: i === 0 ? 1 : 0.5 }} />
            <span style={{ color: i === 0 ? state.brand_primary : sidebarText, opacity: i === 0 ? 1 : 0.5, fontSize: "7px", fontWeight: i === 0 ? 600 : 400 }}>
              {["Přehled", "Pipeline", "Klienti", "Oznámení", "Nastavení"][i]}
            </span>
          </div>
        ))}
      </div>

      {/* Main area */}
      <div className="flex-1 p-3 overflow-hidden" style={{ backgroundColor: mainBg }}>
        {/* Header */}
        <div className="mb-2.5">
          <div style={{ color: mainText, fontSize: "11px", fontWeight: 700 }}>Přehled</div>
          <div style={{ color: mainText, fontSize: "7px", opacity: 0.4 }}>Tady je přehled vašeho podnikání</div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-3 gap-1.5 mb-2.5">
          {[
            { label: "Pipeline", value: "1.2M Kč" },
            { label: "Leady", value: "24" },
            { label: "Konverze", value: "68%" },
          ].map((kpi) => (
            <div key={kpi.label} className="p-1.5 rounded" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
              <div style={{ fontSize: "6px", color: mainText, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>{kpi.label}</div>
              <div style={{ fontSize: "10px", color: mainText, fontWeight: 700, marginTop: 2 }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Mini chart placeholder */}
        <div className="p-2 rounded mb-2" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
          <div style={{ fontSize: "6px", color: mainText, opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500, marginBottom: 6 }}>Pipeline</div>
          <div className="flex items-end gap-1 h-[50px]">
            {[40, 65, 45, 80, 60, 90, 70].map((h, i) => (
              <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: i === 5 ? state.brand_primary : state.brand_primary + "30" }} />
            ))}
          </div>
        </div>

        {/* Mini table */}
        <div className="rounded overflow-hidden" style={{ border: `1px solid ${cardBorder}` }}>
          <div className="flex gap-2 px-2 py-1" style={{ borderBottom: `1px solid ${cardBorder}`, backgroundColor: cardBg }}>
            <span style={{ fontSize: "6px", color: mainText, opacity: 0.4, textTransform: "uppercase", fontWeight: 600, flex: 1 }}>Klient</span>
            <span style={{ fontSize: "6px", color: mainText, opacity: 0.4, textTransform: "uppercase", fontWeight: 600, width: 40, textAlign: "right" }}>Hodnota</span>
          </div>
          {["Novák", "Dvořáková", "Procházka"].map((name) => (
            <div key={name} className="flex gap-2 px-2 py-1" style={{ backgroundColor: cardBg, borderBottom: `1px solid ${cardBorder}` }}>
              <span style={{ fontSize: "7px", color: mainText, flex: 1 }}>{name}</span>
              <span style={{ fontSize: "7px", color: mainText, fontWeight: 600, width: 40, textAlign: "right" }}>250k</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function BrandingPage() {
  const refreshTheme = useRefreshTheme();
  const [state, setState] = useState<BrandingState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState(false);

  useEffect(() => { loadBranding(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadBranding() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("advisors").select("*").eq("user_id", user.id).single();
      if (data) {
        setAdvisorId(data.id);
        setState((prev) => ({
          ...prev,
          app_name: data.app_name || prev.app_name,
          logo_url: data.logo_url || "",
          logo_icon_url: data.logo_icon_url || "",
          logo_size: data.logo_size || 40,
          logo_shape: data.logo_shape || "original",
          logo_position: data.logo_position || "sidebar_top",
          login_slug: data.login_slug || "",
          brand_primary: data.brand_primary || data.brand_color_primary || prev.brand_primary,
          brand_secondary: data.brand_secondary || data.brand_color_secondary || prev.brand_secondary,
          brand_accent_color: data.brand_accent_color || prev.brand_accent_color,
          brand_background: data.brand_background || prev.brand_background,
          brand_font: data.brand_font || prev.brand_font,
          brand_template: data.brand_template || prev.brand_template,
          custom_login_title: data.custom_login_title || "",
          custom_login_subtitle: data.custom_login_subtitle || "",
        }));
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!advisorId) { toast.error("Poradce nebyl načten."); return; }
    setSaving(true);

    const payload = {
      app_name: state.app_name,
      logo_url: state.logo_url || null,
      logo_icon_url: state.logo_icon_url || null,
      logo_size: state.logo_size,
      logo_shape: state.logo_shape,
      logo_position: state.logo_position,
      login_slug: state.login_slug || null,
      brand_primary: state.brand_primary,
      brand_secondary: state.brand_secondary,
      brand_accent_color: state.brand_accent_color,
      brand_background: state.brand_background,
      brand_font: state.brand_font,
      brand_template: state.brand_template,
      custom_login_title: state.custom_login_title || null,
      custom_login_subtitle: state.custom_login_subtitle || null,
    };

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("advisors")
        .update(payload)
        .eq("id", advisorId);

      if (error) {
        toast.error("Chyba: " + error.message);
        return;
      }

      await refreshTheme();
      toast.success("Branding uložen.");
    } catch {
      toast.error("Nepodařilo se uložit.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof BrandingState>(key: K, value: BrandingState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function applyPalette(palette: typeof COLOR_PALETTES[0]) {
    setState((prev) => ({
      ...prev,
      brand_primary: palette.primary,
      brand_secondary: palette.secondary,
      brand_accent_color: palette.accent,
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--card-text-dim)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--card-text)]">Branding</h1>
        <p className="text-sm text-[var(--card-text-dim)] mt-0.5">Nastavte jak bude vypadat váš portál pro klienty</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: Settings (60%) ── */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* A) Logo */}
          <Section title="Logo">
            <LogoUpload
              label="Hlavní logo"
              hint="Zobrazuje se v sidebaru a na login stránce"
              currentUrl={state.logo_url}
              onUrlChange={(url) => update("logo_url", url)}
              advisorId={advisorId}
              fileKey="logo"
            />

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Velikost</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={20} max={80} value={state.logo_size}
                    onChange={(e) => update("logo_size", parseInt(e.target.value))}
                    className="flex-1 accent-gray-900 cursor-pointer"
                  />
                  <span className="text-xs text-[var(--card-text-dim)] font-mono w-8 text-right">{state.logo_size}</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Tvar</Label>
                <div className="flex gap-1.5">
                  {(["original", "rounded", "circle"] as const).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => update("logo_shape", shape)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 ${
                        state.logo_shape === shape
                          ? "bg-gray-900 text-white"
                          : "bg-[var(--table-hover)] text-[var(--card-text-muted)] hover:bg-[var(--table-header)]"
                      }`}
                    >
                      {shape === "original" ? "Original" : shape === "rounded" ? "Rounded" : "Kruh"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Label className="text-sm font-medium mb-1.5 block">Pozice</Label>
              <div className="flex gap-1.5">
                {([
                  { value: "sidebar_top", label: "Nahoře" },
                  { value: "sidebar_center", label: "Uprostřed" },
                  { value: "above_nav", label: "Nad nav" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("logo_position", opt.value)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors duration-150 ${
                      state.logo_position === opt.value
                        ? "bg-gray-900 text-white"
                        : "bg-[var(--table-hover)] text-[var(--card-text-muted)] hover:bg-[var(--table-header)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* B) Barvy */}
          <Section title="Barvy">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLOR_PALETTES.map((palette) => {
                const isActive =
                  state.brand_primary === palette.primary &&
                  state.brand_secondary === palette.secondary;
                return (
                  <button
                    key={palette.name}
                    type="button"
                    onClick={() => applyPalette(palette)}
                    className={`relative flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all duration-150 ${
                      isActive ? "border-gray-900 bg-[var(--table-hover)]" : "border-[var(--card-border)] hover:border-[var(--card-border)]"
                    }`}
                  >
                    <div className="flex -space-x-1">
                      <div className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.primary }} />
                      <div className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.secondary }} />
                      <div className="h-5 w-5 rounded-full border-2 border-white" style={{ backgroundColor: palette.accent }} />
                    </div>
                    <span className="text-[11px] text-[var(--card-text-muted)] font-medium truncate">{palette.name}</span>
                    {isActive && <Check className="h-3 w-3 text-gray-900 absolute top-1 right-1" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCustomColors(!customColors)}
              className="mt-3 text-xs text-[var(--card-text-dim)] hover:text-[var(--card-text-muted)] cursor-pointer transition-colors duration-150"
            >
              {customColors ? "Skrýt vlastní barvy" : "Vlastní barvy →"}
            </button>

            {customColors && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <ColorPicker label="Primární" value={state.brand_primary} onChange={(v) => update("brand_primary", v)} />
                <ColorPicker label="Sekundární" value={state.brand_secondary} onChange={(v) => update("brand_secondary", v)} />
                <ColorPicker label="Akcentní" value={state.brand_accent_color} onChange={(v) => update("brand_accent_color", v)} />
              </div>
            )}
          </Section>

          {/* C) Šablona */}
          <Section title="Šablona">
            <div className="grid grid-cols-2 gap-3">
              {TEMPLATES.map((tpl) => {
                const isActive = state.brand_template === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => update("brand_template", tpl.id)}
                    className={`relative rounded-lg border-2 p-3 text-left cursor-pointer transition-all duration-150 ${
                      isActive ? "border-gray-900" : "border-[var(--card-border)] hover:border-[var(--card-border)]"
                    }`}
                  >
                    {/* Mini preview */}
                    <div className="flex h-16 rounded overflow-hidden mb-2" style={{ border: `1px solid ${tpl.border}` }}>
                      <div className="w-4 shrink-0" style={{ backgroundColor: tpl.sidebar }} />
                      <div className="flex-1 p-1.5" style={{ backgroundColor: tpl.bg }}>
                        <div className="h-1.5 w-8 rounded-sm mb-1" style={{ backgroundColor: tpl.text, opacity: 0.2 }} />
                        <div className="h-1 w-6 rounded-sm mb-1" style={{ backgroundColor: tpl.text, opacity: 0.1 }} />
                        <div className="flex gap-1 mt-1.5">
                          <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: tpl.text, opacity: 0.06 }} />
                          <div className="h-3 flex-1 rounded-sm" style={{ backgroundColor: tpl.text, opacity: 0.06 }} />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-[var(--card-text)]">{tpl.name}</p>
                    <p className="text-xs text-[var(--card-text-dim)]">{tpl.desc}</p>
                    {isActive && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-gray-900 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* D) Font */}
          <Section title="Font">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {FONTS.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => update("brand_font", font.value)}
                    className={`px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors duration-150 ${
                      state.brand_font === font.value
                        ? "bg-gray-900 text-white font-medium"
                        : "bg-[var(--table-hover)] text-[var(--card-text-muted)] hover:bg-[var(--table-header)]"
                    }`}
                    style={{ fontFamily: font.value + ", sans-serif" }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-md bg-[var(--table-hover)] border border-[var(--card-border)]">
                <p style={{ fontFamily: state.brand_font + ", sans-serif" }} className="text-lg font-semibold text-[var(--card-text)]">
                  Aa Bb Cc 123
                </p>
                <p style={{ fontFamily: state.brand_font + ", sans-serif" }} className="text-sm text-[var(--card-text-muted)] mt-0.5">
                  Přehled vašeho podnikání — {state.brand_font}
                </p>
              </div>
            </div>
          </Section>

          {/* E) Název firmy */}
          <Section title="Název firmy">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Název aplikace</Label>
                <Input
                  value={state.app_name}
                  onChange={(e) => update("app_name", e.target.value)}
                  placeholder="FinAdvisor"
                  className="h-9"
                />
                <p className="text-xs text-[var(--card-text-dim)] mt-1">Tento název uvidí vaši klienti</p>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Login slug</Label>
                <Input
                  value={state.login_slug}
                  onChange={(e) => update("login_slug", e.target.value)}
                  placeholder="moje-firma"
                  className="h-9"
                />
                {state.login_slug && (
                  <p className="text-xs text-[var(--card-text-dim)] mt-1">
                    URL: finatiq.cz/p/{state.login_slug}
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* Save — mobile */}
          <div className="lg:hidden pb-4">
            <Button onClick={handleSave} disabled={saving} className="w-full h-10 cursor-pointer">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ukládám...</> : "Uložit změny"}
            </Button>
          </div>
        </div>

        {/* ── Right: Live Preview (40%) ── */}
        <div className="hidden lg:block w-[380px] shrink-0">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[var(--card-text-dim)] uppercase tracking-wider">Náhled</span>
              <Button onClick={handleSave} disabled={saving} size="sm" className="h-8 cursor-pointer">
                {saving ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Ukládám</> : "Uložit změny"}
              </Button>
            </div>
            <LivePreview state={state} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <h2 className="text-sm font-semibold text-[var(--card-text)] mb-4">{title}</h2>
      {children}
    </section>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-[var(--card-text-muted)] mb-1 block">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-7 rounded cursor-pointer border-0 p-0" />
        <span className="text-xs text-[var(--card-text-muted)] font-mono">{value}</span>
      </div>
    </div>
  );
}
