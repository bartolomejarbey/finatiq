"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, Users, Power, LogIn, CheckCircle2, Circle, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const FEATURE_NAMES: Record<string, string> = {
  crm: "CRM & Pipeline", portal: "Klientský portál", templates: "Šablony smluv",
  scoring: "Lead scoring", automations: "Automatizace", meta_ads: "Meta Ads",
  ocr: "OCR dokumentů", ai_assistant: "AI asistent", osvc: "OSVČ modul", calendar: "Kalendář",
};

interface Advisor {
  id: string;
  user_id: string;
  company_name: string;
  subscription_tier: string;
  is_active: boolean;
  max_clients: number;
  meta_ad_account_id: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  brand_accent_color: string | null;
  created_at: string;
  feature_trials?: Record<string, string>;
  enabled_modules?: Record<string, boolean>;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  segment: string;
  user_id: string | null;
}

interface Invoice {
  id: string;
  period: string;
  amount: number;
  status: string;
}

export default function AdvisorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const advisorId = params.id as string;

  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [tier, setTier] = useState("starter");
  const [dealsCount, setDealsCount] = useState(0);
  const [hasRecentAudit, setHasRecentAudit] = useState(false);
  const [featureTrials, setFeatureTrials] = useState<Record<string, string>>({});
  const [dmDialogOpen, setDmDialogOpen] = useState(false);
  const [dmMessage, setDmMessage] = useState("");

  const fetchData = useCallback(async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [advRes, clientsRes, invoicesRes, dealsRes, auditRes] = await Promise.all([
      supabase.from("advisors").select("*, feature_trials, enabled_modules").eq("id", advisorId).single(),
      supabase.from("clients").select("id, first_name, last_name, email, segment, user_id").eq("advisor_id", advisorId),
      supabase.from("invoices").select("*").eq("advisor_id", advisorId).order("period", { ascending: false }),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("advisor_id", advisorId),
      supabase.from("audit_logs").select("id", { count: "exact", head: true }).eq("user_id", advisorId).gte("created_at", sevenDaysAgo.toISOString()),
    ]);

    if (advRes.data) {
      setAdvisor(advRes.data);
      setCompanyName(advRes.data.company_name);
      setTier(advRes.data.subscription_tier);
      if (advRes.data.feature_trials) setFeatureTrials(advRes.data.feature_trials);
    }
    setClients(clientsRes.data || []);
    setInvoices(invoicesRes.data || []);
    setDealsCount(dealsRes.count ?? 0);
    setHasRecentAudit((auditRes.count ?? 0) > 0);
    setLoading(false);
  }, [advisorId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave() {
    setSaving(true);
    await supabase.from("advisors").update({ company_name: companyName, subscription_tier: tier }).eq("id", advisorId);
    setSaving(false);
    toast.success("Poradce aktualizován.");
  }

  async function toggleActive() {
    if (!advisor) return;
    await supabase.from("advisors").update({ is_active: !advisor.is_active }).eq("id", advisorId);
    setAdvisor((prev) => prev ? { ...prev, is_active: !prev.is_active } : prev);
    toast.success(advisor.is_active ? "Poradce deaktivován." : "Poradce aktivován.");
  }

  const giveFeatureTrial = async (feature: string) => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 14);
    const updated = { ...featureTrials, [feature]: expiry.toISOString() };
    await supabase.from("advisors").update({ feature_trials: updated }).eq("id", advisor!.id);
    setFeatureTrials(updated);
    toast.success(`Trial ${FEATURE_NAMES[feature]} aktivován na 14 dní`);
  };

  const activateFeature = async (feature: string) => {
    const modules = { ...(advisor!.enabled_modules || {}), [feature]: true };
    const trials = { ...featureTrials };
    delete trials[feature];
    await supabase.from("advisors").update({ enabled_modules: modules, feature_trials: trials }).eq("id", advisor!.id);
    setFeatureTrials(trials);
    toast.success(`${FEATURE_NAMES[feature]} aktivován natrvalo`);
    fetchData();
  };

  const deactivateFeature = async (feature: string) => {
    const modules = { ...(advisor!.enabled_modules || {}), [feature]: false };
    const trials = { ...featureTrials };
    delete trials[feature];
    await supabase.from("advisors").update({ enabled_modules: modules, feature_trials: trials }).eq("id", advisor!.id);
    setFeatureTrials(trials);
    toast.success(`${FEATURE_NAMES[feature]} deaktivován`);
    fetchData();
  };

  const sendDM = async () => {
    if (!dmMessage.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: ticket } = await supabase.from("tickets").insert({
      advisor_id: advisor!.id,
      subject: "Zpráva od Finatiq",
      category: "dm",
      priority: "low",
      status: "open",
    }).select("id").single();

    if (ticket) {
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_type: "superadmin",
        sender_id: user?.id,
        message: dmMessage.trim(),
      });
      fetch("/api/tickets/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "dm", advisorName: advisor!.company_name, advisorEmail: advisor!.email, message: dmMessage.trim() }),
      }).catch(() => {});
      toast.success("Zpráva odeslána");
      setDmDialogOpen(false);
      setDmMessage("");
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 rounded-xl" /></div>;
  if (!advisor) return <div><p className="text-slate-500">Poradce nenalezen.</p></div>;

  return (
    <div>
      <button onClick={() => router.push("/superadmin/poradci")} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />Zpět na poradce
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{advisor.company_name}</h1>
          <p className="text-sm text-slate-500">ID: {advisor.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setDmDialogOpen(true)} variant="outline" size="sm">
            <MessageCircle className="w-4 h-4 mr-2" /> Poslat zprávu
          </Button>
          <Button variant="outline" size="sm" onClick={toggleActive}>
            <Power className="mr-2 h-4 w-4" />{advisor.is_active ? "Deaktivovat" : "Aktivovat"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Uložit
          </Button>
        </div>
      </div>

      {/* Settings */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Nastavení</h2>
          <div className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Název firmy</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4 text-sm text-slate-500">
              <span>Stav: <Badge className={`ml-1 text-[10px] ${advisor.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{advisor.is_active ? "Aktivní" : "Neaktivní"}</Badge></span>
              <span>Klientů: {clients.length}/{advisor.max_clients}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Info</h2>
          <div className="space-y-2 text-sm text-slate-600">
            <p>Email: {advisor.email || "—"}</p>
            <p>Telefon: {advisor.phone || "—"}</p>
            <p>Meta Ads: {advisor.meta_ad_account_id || "Nepropojeno"}</p>
            <p>Registrace: {new Date(advisor.created_at).toLocaleDateString("cs-CZ")}</p>
          </div>
        </div>
      </div>

      {/* Onboarding checklist */}
      {(() => {
        const checklistItems = [
          { label: "Registrace dokončena", done: !!advisor },
          { label: "Faktura zaplacena", done: invoices.some((inv) => inv.status === "paid") },
          { label: "Logo nahráno", done: !!advisor.logo_url },
          { label: "Barvy nastaveny", done: !!advisor.brand_accent_color },
          { label: "První klient přidán", done: clients.length > 0 },
          { label: "První deal vytvořen", done: dealsCount > 0 },
          { label: "Klient se přihlásil", done: clients.some((c) => c.user_id != null) },
          { label: "Aktivní užívání", done: hasRecentAudit },
        ];
        const completed = checklistItems.filter((i) => i.done).length;
        const percent = Math.round((completed / checklistItems.length) * 100);

        return (
          <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm hover:shadow-md transition-all">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">
              Onboarding checklist
            </h2>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{completed}/8 dokončeno</span>
              <span className="text-slate-400">{percent}%</span>
            </div>
            <div className="mb-4 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300 shrink-0" />
                  )}
                  <span className={`text-sm ${item.done ? "text-slate-700" : "text-slate-400"}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Feature trialy */}
      {advisor && (
        <div className="mb-6 border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Feature trialy</h3>
          <div className="space-y-3">
            {Object.entries(FEATURE_NAMES).map(([key, label]) => {
              const inPlan = advisor?.enabled_modules?.[key] === true;
              const trialDate = featureTrials[key];
              const trialActive = trialDate && new Date(trialDate) > new Date();
              const trialExpired = trialDate && new Date(trialDate) <= new Date();

              return (
                <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{label}</span>
                    {inPlan && <Badge className="bg-green-100 text-green-700">V plánu</Badge>}
                    {trialActive && <Badge className="bg-amber-100 text-amber-700">Trial do {new Date(trialDate).toLocaleDateString("cs-CZ")}</Badge>}
                    {trialExpired && <Badge className="bg-red-100 text-red-700">Trial expiroval</Badge>}
                    {!inPlan && !trialActive && !trialExpired && <Badge className="bg-gray-100 text-gray-500">Neaktivní</Badge>}
                  </div>
                  <div className="flex gap-2">
                    {!inPlan && !trialActive && (
                      <Button size="sm" variant="outline" onClick={() => giveFeatureTrial(key)}>Trial 14d</Button>
                    )}
                    {!inPlan && (
                      <Button size="sm" variant="outline" onClick={() => activateFeature(key)}>Aktivovat</Button>
                    )}
                    {(inPlan || trialActive) && (
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deactivateFeature(key)}>Deaktivovat</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Clients */}
      <div className="mb-6 rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Klienti ({clients.length})</h2>
        </div>
        {clients.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">Žádní klienti</p>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700"><th className="px-6 py-3">Jméno</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Segment</th></tr></thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b last:border-0 even:bg-slate-50/50 hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{c.first_name} {c.last_name}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{c.email || "—"}</td>
                  <td className="px-6 py-3"><Badge variant="secondary" className="text-[10px]">{c.segment || "new"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4"><h2 className="text-sm font-semibold text-slate-700">Fakturace</h2></div>
          <table className="w-full">
            <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700"><th className="px-6 py-3">Období</th><th className="px-6 py-3">Částka</th><th className="px-6 py-3">Stav</th></tr></thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 even:bg-slate-50/50 hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm text-slate-700">{inv.period}</td>
                  <td className="px-6 py-3 text-sm font-bold text-slate-900">{formatCZK(inv.amount)}</td>
                  <td className="px-6 py-3"><Badge className={`text-[10px] ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{inv.status === "paid" ? "Zaplaceno" : inv.status === "overdue" ? "Po splatnosti" : "Čeká"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dmDialogOpen} onOpenChange={setDmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Poslat zprávu — {advisor?.company_name}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={dmMessage}
            onChange={(e) => setDmMessage(e.target.value)}
            placeholder="Napište zprávu poradci..."
            rows={4}
          />
          <Button onClick={sendDM} disabled={!dmMessage.trim()}>Odeslat</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}
