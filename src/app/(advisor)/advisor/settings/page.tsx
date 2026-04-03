"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  Loader2,
  Tag,
  Palette,
  Megaphone,
  CheckCircle2,
  XCircle,
  Sliders,
  Boxes,
  Brain,
  Zap,
  FileText,
  Link2,
  Calendar,
  Copy,
  ArrowRight,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface DealTag {
  id: string;
  name: string;
  color: string;
}

const MODULE_LABELS: Record<string, { label: string; description: string }> = {
  crm: { label: "CRM Pipeline", description: "Kanban správa dealů" },
  portal: { label: "Klientský portál", description: "Přístup klientů k datům" },
  templates: { label: "Emailové šablony", description: "Předpřipravené emaily" },
  scoring: { label: "Klientský scoring", description: "Automatické hodnocení klientů" },
  automations: { label: "Automatizace", description: "Pravidla a workflow" },
  meta_ads: { label: "Meta Ads", description: "Propojení s Meta reklamami" },
  ocr: { label: "OCR rozpoznávání", description: "Automatické čtení dokumentů" },
  ai_assistant: { label: "AI asistent", description: "AI doporučení a analýzy" },
  osvc: { label: "OSVČ modul", description: "Evidence příjmů a výdajů" },
  calendar: { label: "Kalendář", description: "Synchronizace kalendáře" },
  campaigns: { label: "Kampaně", description: "Správa reklamních kampaní" },
};

const TABS = [
  { key: "obecne", label: "Obecné", icon: Sliders },
  { key: "branding", label: "Branding", icon: Palette, href: "/advisor/nastaveni/branding" },
  { key: "moduly", label: "Moduly", icon: Boxes },
  { key: "ai", label: "AI pravidla", icon: Brain, href: "/advisor/nastaveni/ai-pravidla" },
  { key: "upsell", label: "Upsell pravidla", icon: Zap, href: "/advisor/nastaveni/upsell-pravidla" },
  { key: "automatizace", label: "Automatizace", icon: Zap, href: "/advisor/automatizace" },
  { key: "sablony", label: "Šablony", icon: FileText, href: "/advisor/sablony" },
  { key: "bezpecnost", label: "Bezpečnost", icon: Lock },
  { key: "propojeni", label: "Propojení", icon: Link2 },
];

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [advisor, setAdvisor] = useState<any>(null);
  const [companyName, setCompanyName] = useState("");
  const [advisorEmail, setAdvisorEmail] = useState("");
  const [advisorPhone, setAdvisorPhone] = useState("");
  const [welcomeText, setWelcomeText] = useState("");
  const [interestThreshold, setInterestThreshold] = useState("5.0");
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [tags, setTags] = useState<DealTag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [metaAccountId, setMetaAccountId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [activeTab, setActiveTab] = useState("obecne");
  const [planFeatures, setPlanFeatures] = useState<Record<string, boolean> | null>(null);
  const [planName, setPlanName] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: adv, error: advError } = await supabase
        .from("advisors")
        .select("*")
        .single();
      if (advError) {
        console.error("Settings load error:", advError.message, advError.code);
      }
      if (adv) {
        setAdvisor(adv);
        setCompanyName(adv.company_name || "");
        setAdvisorEmail(adv.email || "");
        setAdvisorPhone(adv.phone || "");
        setWelcomeText(adv.welcome_text || "");
        setMetaAccountId(adv.meta_ad_account_id || "");
        setMetaAccessToken(adv.meta_access_token_encrypted || "");
        setInterestThreshold(String(adv.interest_rate_threshold || 5.0));
        setEnabledModules(adv.enabled_modules || {});
        setTwoFactorEnabled(!!adv.two_factor_enabled);

        // Load plan features for module restrictions
        if (adv.selected_plan_id) {
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("features, name")
            .eq("id", adv.selected_plan_id)
            .single();
          if (plan?.features && typeof plan.features === "object") {
            setPlanFeatures(plan.features as Record<string, boolean>);
            setPlanName(plan.name || "");
          }
        }
      }
      const { data: t } = await supabase.from("deal_tags").select("*").order("name");
      setTags(t || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getUpgradePlanName(moduleKey: string): string {
    // Determine which plan unlocks this module
    const PROFESIONAL_MODULES = ["meta_ads", "automations", "ocr", "scoring", "calendar", "referral", "life_events", "milestones", "news_feed", "activity_tracking", "wishlist", "articles", "seasonal_reminders", "satisfaction", "duplicate_detection", "qr_payments", "calculators"];
    if (PROFESIONAL_MODULES.includes(moduleKey)) return "Profesionál";
    return "Expert";
  }

  async function handleSaveProfile() {
    if (!advisor?.id) {
      toast.error("Poradce nebyl načten.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("advisors")
      .update({
        company_name: companyName,
        email: advisorEmail || null,
        phone: advisorPhone || null,
        welcome_text: welcomeText || null,
        interest_rate_threshold: parseFloat(interestThreshold) || 5.0,
      })
      .eq("id", advisor.id);
    setSaving(false);
    if (error) {
      console.error("Profile save error:", error.message);
      toast.error("Chyba při ukládání: " + error.message);
    } else {
      toast.success("Nastavení uloženo.");
    }
  }

  async function handleToggleModule(key: string, checked: boolean) {
    const updated = { ...enabledModules, [key]: checked };
    setEnabledModules(updated);
    await supabase.from("advisors").update({ enabled_modules: updated }).eq("id", advisor?.id);
    toast.success(`${MODULE_LABELS[key]?.label} ${checked ? "zapnut" : "vypnut"}.`);
  }

  async function handleAddTag() {
    if (!newTagName.trim() || !advisor) return;
    const { data, error } = await supabase
      .from("deal_tags")
      .insert({ advisor_id: advisor.id, name: newTagName, color: newTagColor })
      .select()
      .single();
    if (error) { toast.error("Chyba při přidávání tagu: " + error.message); return; }
    if (data) setTags((prev) => [...prev, data]);
    setNewTagName("");
    setNewTagColor("#3B82F6");
    toast.success("Tag přidán.");
  }

  async function handleDeleteTag(id: string) {
    const { error: assignError } = await supabase.from("deal_tag_assignments").delete().eq("tag_id", id);
    if (assignError) { toast.error("Chyba při odstraňování přiřazení tagu: " + assignError.message); return; }
    const { error: tagError } = await supabase.from("deal_tags").delete().eq("id", id);
    if (tagError) { toast.error("Chyba při mazání tagu: " + tagError.message); return; }
    setTags((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tag smazán.");
  }

  async function handleUpdateTag(id: string, name: string, color: string) {
    const { error } = await supabase.from("deal_tags").update({ name, color }).eq("id", id);
    if (error) { toast.error("Chyba při aktualizaci tagu: " + error.message); return; }
    setTags((prev) => prev.map((t) => (t.id === id ? { ...t, name, color } : t)));
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const webhookUrl = advisor
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/meta-leads`
    : "";

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold gradient-text">Nastavení</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              if (t.href) {
                router.push(t.href);
                return;
              }
              setActiveTab(t.key);
            }}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--card-text-dim)] hover:text-[var(--card-text-muted)]"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Obecné tab */}
      {activeTab === "obecne" && (
        <div className="space-y-6">
          {/* Branding link card */}
          <button
            onClick={() => router.push("/advisor/nastaveni/branding")}
            className="w-full rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm text-left hover:shadow-md transition-shadow flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <Palette className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--card-text)]">Branding a personalizace</h2>
                <p className="text-xs text-[var(--card-text-muted)]">Logo, barvy, fonty, rozložení</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[var(--card-text-dim)] group-hover:text-[var(--card-text-muted)] transition-colors" />
          </button>

          {/* Profil firmy */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
                Profil firmy
              </h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Název firmy</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kontaktní email</Label>
                  <Input
                    value={advisorEmail}
                    onChange={(e) => setAdvisorEmail(e.target.value)}
                    placeholder="info@firma.cz"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Telefon</Label>
                  <Input
                    value={advisorPhone}
                    onChange={(e) => setAdvisorPhone(e.target.value)}
                    placeholder="+420 ..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Práh úrokové sazby (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={interestThreshold}
                    onChange={(e) => setInterestThreshold(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Uvítací text pro klienty</Label>
                <textarea
                  value={welcomeText}
                  onChange={(e) => setWelcomeText(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Vítejte v klientském portálu..."
                />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} size="sm">
                {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Uložit profil
              </Button>
            </div>
          </div>

          {/* Správa tagů */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
                Správa tagů
              </h2>
            </div>
            <div className="mb-4 space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2 hover:shadow-sm transition-all"
                >
                  <input
                    type="color"
                    value={tag.color}
                    onChange={(e) => handleUpdateTag(tag.id, tag.name, e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded border-0"
                  />
                  <Input
                    value={tag.name}
                    onChange={(e) => handleUpdateTag(tag.id, e.target.value, tag.color)}
                    className="flex-1"
                  />
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-[var(--card-text-dim)] hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded border-0"
              />
              <Input
                placeholder="Název nového tagu"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddTag} size="sm" variant="outline" disabled={!newTagName.trim()}>
                <Plus className="mr-1 h-3 w-3" />
                Přidat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Moduly tab */}
      {activeTab === "moduly" && (
        <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Boxes className="h-4 w-4 text-[var(--card-text-dim)]" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">Moduly</h2>
          </div>
          <p className="mb-6 text-xs text-[var(--card-text-muted)]">
            Zapněte nebo vypněte moduly podle potřeby. Vypnuté moduly se skryjí z navigace.
          </p>
          <div className="space-y-4">
            {Object.entries(MODULE_LABELS).map(([key, { label, description }]) => {
              const isLockedByPlan = planFeatures !== null && !planFeatures[key];
              const upgradeTo = getUpgradePlanName(key);
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-all ${isLockedByPlan ? "opacity-60 bg-[var(--table-hover)]" : "hover:shadow-sm"}`}
                >
                  <div className="flex items-center gap-3">
                    {isLockedByPlan && <Lock className="h-4 w-4 text-[var(--card-text-dim)] shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-[var(--card-text)]">{label}</p>
                      <p className="text-xs text-[var(--card-text-muted)]">{description}</p>
                      {isLockedByPlan && (
                        <p className="text-xs text-amber-600 mt-0.5">Dostupné v plánu {upgradeTo}</p>
                      )}
                    </div>
                  </div>
                  {isLockedByPlan ? (
                    <span className="text-xs text-[var(--card-text-dim)] font-medium">Zamčeno</span>
                  ) : (
                    <Switch
                      checked={enabledModules[key] ?? true}
                      onCheckedChange={(checked) => handleToggleModule(key, checked)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Propojení tab */}
      {activeTab === "bezpecnost" && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
                Dvoufaktorové ověření (2FA)
              </h2>
            </div>
            <p className="mb-4 text-xs text-[var(--card-text-muted)]">
              Po zapnutí budete při přihlášení potřebovat ověřovací kód zaslaný na váš email.
            </p>
            <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-4">
              <div>
                <p className="text-sm font-medium text-[var(--card-text)]">
                  {twoFactorEnabled ? "2FA je zapnuté" : "2FA je vypnuté"}
                </p>
                <p className="text-xs text-[var(--card-text-muted)]">
                  {twoFactorEnabled
                    ? "Při přihlášení budete muset zadat kód z emailu"
                    : "Přihlášení pouze pomocí emailu a hesla"}
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={async (checked) => {
                  setTwoFactorEnabled(checked);
                  await supabase
                    .from("advisors")
                    .update({ two_factor_enabled: checked })
                    .eq("id", advisor?.id);
                  toast.success(checked ? "2FA zapnuto." : "2FA vypnuto.");
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "propojeni" && (
        <div className="space-y-6">
          {/* Meta Ads */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
                Meta Ads propojení
              </h2>
              {advisor?.meta_ad_account_id ? (
                <span className="ml-auto flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Propojeno
                </span>
              ) : (
                <span className="ml-auto flex items-center gap-1 text-xs font-medium text-[var(--card-text-dim)]">
                  <XCircle className="h-3 w-3" />
                  Nepropojeno
                </span>
              )}
            </div>
            <p className="mb-4 text-xs text-[var(--card-text-muted)]">
              Pro propojení potřebujete Meta Business účet a přístupový token z Meta Business Suite.
            </p>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Meta Ad Account ID</Label>
                <Input
                  value={metaAccountId}
                  onChange={(e) => setMetaAccountId(e.target.value)}
                  placeholder="act_123456789"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Access Token</Label>
                <Input
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  type="password"
                  placeholder="EAABs..."
                />
              </div>
              <Button
                onClick={async () => {
                  setSavingMeta(true);
                  await supabase
                    .from("advisors")
                    .update({
                      meta_ad_account_id: metaAccountId || null,
                      meta_access_token_encrypted: metaAccessToken || null,
                    })
                    .eq("id", advisor?.id);
                  setSavingMeta(false);
                  toast.success("Meta Ads nastavení uloženo.");
                }}
                disabled={savingMeta}
                size="sm"
              >
                {savingMeta && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Uložit Meta Ads
              </Button>
            </div>
          </div>

          {/* Google Calendar */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
                Google Calendar
              </h2>
              <span className="ml-auto flex items-center gap-1 text-xs font-medium text-[var(--card-text-dim)]">
                <XCircle className="h-3 w-3" />
                Nepropojeno
              </span>
            </div>
            {process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID ? (
              <>
                <p className="mb-1 text-sm text-[var(--card-text-muted)]">
                  Po připojení se vaše schůzky automaticky synchronizují s Google Calendar.
                </p>
                <p className="mb-4 text-xs text-[var(--card-text-muted)]">
                  Po kliknutí budete přesměrováni na Google pro udělení přístupu ke kalendáři.
                </p>
                <Button
                  size="sm"
                  className="mt-1"
                  onClick={() => {
                    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
                    const redirectUri = `${window.location.origin}/api/calendar/callback`;
                    const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email");
                    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
                  }}
                >
                  <Calendar className="mr-2 h-3 w-3" />
                  Připojit Google Calendar
                </Button>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-[var(--card-text-muted)]">
                  Pro aktivaci propojení s Google Calendar kontaktujte podporu.
                </p>
                <Button size="sm" className="mt-1" disabled>
                  <Calendar className="mr-2 h-3 w-3" />
                  Připojit Google účet
                </Button>
              </>
            )}
          </div>

          {/* Messaging webhook */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
                Messaging Webhook
              </h2>
            </div>
            <p className="mb-3 text-xs text-[var(--card-text-muted)]">
              Tuto URL nastavte jako webhook ve vašem messaging botu (Messenger, Instagram, WhatsApp).
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={
                  advisor
                    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/messaging/incoming?advisor_key=${advisor.webhook_key || "—"}`
                    : ""
                }
                readOnly
                className="flex-1 font-mono text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const key = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
                  await supabase
                    .from("advisors")
                    .update({ webhook_key: key })
                    .eq("id", advisor?.id);
                  setAdvisor((prev: Record<string, unknown> | null) =>
                    prev ? { ...prev, webhook_key: key } : prev
                  );
                  toast.success("Nový webhook klíč vygenerován.");
                }}
              >
                Generovat klíč
              </Button>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[var(--card-text-dim)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
                Webhook URL
              </h2>
            </div>
            <p className="mb-3 text-xs text-[var(--card-text-muted)]">
              Tuto URL nastavte v Meta Business Suite jako Webhook endpoint pro Lead Ads.
            </p>
            <div className="flex items-center gap-2">
              <Input value={webhookUrl} readOnly className="flex-1 font-mono text-xs" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success("URL zkopírována.");
                }}
              >
                <Copy className="mr-1 h-3 w-3" />
                Kopírovat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
