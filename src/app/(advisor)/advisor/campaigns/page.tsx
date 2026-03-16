"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Megaphone,
  DollarSign,
  Users,
  Target,
  TrendingDown,
  ArrowLeft,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { ModuleGate } from "@/components/ModuleGate";

interface Campaign {
  id: string;
  name: string;
  status: string;
  budget: number;
  spent: number;
  leads_count: number;
  conversions_count: number;
  cost_per_lead: number;
  cost_per_conversion: number;
  last_synced: string | null;
}

interface MetaAd {
  id: string;
  name: string;
  status: string;
  spent: number;
  leads_count: number;
  conversions_count: number;
}

interface MetaLead {
  title: string;
  contact_name: string;
  campaign_name: string;
  created_at: string;
  stage_name: string;
}

const PIE_COLORS = ["#3B82F6", "#22C55E", "#F97316", "#8B5CF6", "#EC4899", "#6B7280"];

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function CampaignsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [campaignAds, setCampaignAds] = useState<MetaAd[]>([]);
  const [metaLeads, setMetaLeads] = useState<MetaLead[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; leads: number; conversions: number }[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [campRes, dealsRes, stagesRes] = await Promise.all([
        supabase.from("meta_campaigns").select("*").order("created_at", { ascending: false }),
        supabase.from("deals").select("title, contact_name, source, meta_campaign_id, created_at, stage_id").eq("source", "meta").order("created_at", { ascending: false }).limit(20),
        supabase.from("pipeline_stages").select("id, name"),
      ]);

      setCampaigns(campRes.data || []);

      const stageMap: Record<string, string> = {};
      (stagesRes.data || []).forEach((s) => { stageMap[s.id] = s.name; });

      const camps = campRes.data || [];
      const campMap: Record<string, string> = {};
      camps.forEach((c) => { campMap[c.id] = c.name; });

      setMetaLeads(
        (dealsRes.data || []).map((d) => ({
          title: d.title,
          contact_name: d.contact_name || "—",
          campaign_name: d.meta_campaign_id ? campMap[d.meta_campaign_id] || "—" : "—",
          created_at: d.created_at,
          stage_name: stageMap[d.stage_id] || "—",
        }))
      );

      // Generate trend data (last 30 days)
      const deals = dealsRes.data || [];
      const days: { date: string; leads: number; conversions: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayLeads = deals.filter((dl) => dl.created_at?.startsWith(dateStr)).length;
        days.push({ date: d.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" }), leads: dayLeads, conversions: 0 });
      }
      setTrendData(days);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCampaignAds(campaignId: string) {
    setSelectedCampaign(campaignId);
    const { data } = await supabase.from("meta_ads").select("*").eq("campaign_id", campaignId);
    setCampaignAds(data || []);
  }

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div><Skeleton className="h-80 rounded-xl" /></div>;

  const totalSpent = campaigns.reduce((s, c) => s + (c.spent || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads_count || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions_count || 0), 0);
  const avgCPL = totalLeads > 0 ? totalSpent / totalLeads : 0;

  const pieData = campaigns.filter((c) => c.leads_count > 0).map((c) => ({ name: c.name, value: c.leads_count }));

  if (selectedCampaign) {
    const camp = campaigns.find((c) => c.id === selectedCampaign);
    return (
      <div className="p-8">
        <button onClick={() => setSelectedCampaign(null)} className="mb-4 flex items-center gap-1.5 text-sm text-[var(--card-text-muted)] hover:text-[var(--card-text)]">
          <ArrowLeft className="h-4 w-4" />Zpět na kampaně
        </button>
        <h1 className="mb-6 text-2xl font-bold text-[var(--card-text)]">{camp?.name || "Kampaň"}</h1>
        <div className="mb-6 grid grid-cols-4 gap-4">
          <KpiCard icon={DollarSign} label="Utraceno" value={formatCZK(camp?.spent || 0)} color="text-red-600" bg="bg-red-50" />
          <KpiCard icon={Users} label="Leadů" value={String(camp?.leads_count || 0)} color="text-blue-600" bg="bg-blue-50" />
          <KpiCard icon={Target} label="Konverzí" value={String(camp?.conversions_count || 0)} color="text-emerald-600" bg="bg-emerald-50" />
          <KpiCard icon={TrendingDown} label="Cena za lead" value={formatCZK(camp?.cost_per_lead || 0)} color="text-amber-600" bg="bg-amber-50" />
        </div>
        {campaignAds.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Megaphone className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
            <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádné reklamy</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-[var(--card-bg)] shadow-sm">
            <table className="w-full">
              <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-[var(--card-text)]"><th className="px-6 py-3">Reklama</th><th className="px-6 py-3">Stav</th><th className="px-6 py-3">Utraceno</th><th className="px-6 py-3">Leadů</th><th className="px-6 py-3">Konverzí</th></tr></thead>
              <tbody>
                {campaignAds.map((ad) => (
                  <tr key={ad.id} className="border-b last:border-0 hover:bg-[var(--table-hover)]">
                    <td className="px-6 py-3 text-sm font-medium text-[var(--card-text)]">{ad.name}</td>
                    <td className="px-6 py-3"><Badge variant={ad.status === "active" ? "default" : "secondary"} className="text-[10px]">{ad.status === "active" ? "Aktivní" : "Pozastaveno"}</Badge></td>
                    <td className="px-6 py-3 text-sm text-[var(--card-text)]">{formatCZK(ad.spent)}</td>
                    <td className="px-6 py-3 text-sm text-[var(--card-text)]">{ad.leads_count}</td>
                    <td className="px-6 py-3 text-sm text-[var(--card-text)]">{ad.conversions_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <ModuleGate moduleKey="meta_ads" moduleName="Kampaně" moduleDescription="Správa Meta Ads kampaní, sledování výkonu a generování leadů přímo z vašich reklam na Facebooku a Instagramu.">
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--card-text)]">Meta Ads kampaně</h1>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Celkem utraceno" value={formatCZK(totalSpent)} color="text-red-600" bg="bg-red-50" />
        <KpiCard icon={Users} label="Celkem leadů" value={String(totalLeads)} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard icon={Target} label="Celkem konverzí" value={String(totalConversions)} color="text-emerald-600" bg="bg-emerald-50" />
        <KpiCard icon={TrendingDown} label="Průměrná cena/lead" value={formatCZK(avgCPL)} color="text-amber-600" bg="bg-amber-50" />
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center py-16 max-w-md mx-auto text-center">
          <Megaphone className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text)]">Meta Ads na klíč</p>
          <p className="mt-2 text-sm text-[var(--card-text-muted)] leading-relaxed">
            Pro napojení Meta Ads kampaní kontaktujte náš tým. Nastavíme vám vše na klíč — kreativy, videa, cílení i optimalizaci.
          </p>
          <a
            href="/kontakt?predmet=meta-ads"
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-colors duration-150 cursor-pointer"
            style={{ backgroundColor: "var(--color-primary, #2563EB)" }}
          >
            Domluvit konzultaci
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </a>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="mb-6 grid grid-cols-2 gap-6">
            <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">Leady za posledních 30 dní</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="leads" name="Leady" stroke="#3B82F6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">Leady per kampaň</h2>
              {pieData.length === 0 ? (
                <div className="flex h-[250px] items-center justify-center"><p className="text-sm text-[var(--card-text-muted)]">Žádná data</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Campaigns table */}
          <div className="mb-6 rounded-xl border bg-[var(--card-bg)] shadow-sm">
            <table className="w-full">
              <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-[var(--card-text)]"><th className="px-6 py-3">Kampaň</th><th className="px-6 py-3">Stav</th><th className="px-6 py-3">Rozpočet</th><th className="px-6 py-3">Utraceno</th><th className="px-6 py-3">Leadů</th><th className="px-6 py-3">Konverzí</th><th className="px-6 py-3">CPL</th><th className="px-6 py-3">CPA</th></tr></thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} onClick={() => loadCampaignAds(c.id)} className="cursor-pointer border-b last:border-0 hover:bg-[var(--table-hover)]">
                    <td className="px-6 py-3 text-sm font-medium text-[var(--card-text)]">{c.name}</td>
                    <td className="px-6 py-3"><Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">{c.status === "active" ? "Aktivní" : "Pozastaveno"}</Badge></td>
                    <td className="px-6 py-3 text-sm text-[var(--card-text)]">{formatCZK(c.budget)}</td>
                    <td className="px-6 py-3 text-sm text-[var(--card-text)]">{formatCZK(c.spent)}</td>
                    <td className="px-6 py-3 text-sm text-[var(--card-text)]">{c.leads_count}</td>
                    <td className="px-6 py-3 text-sm text-[var(--card-text)]">{c.conversions_count}</td>
                    <td className="px-6 py-3 text-sm text-[var(--card-text)]">{formatCZK(c.cost_per_lead)}</td>
                    <td className="px-6 py-3 text-sm text-[var(--card-text)]">{formatCZK(c.cost_per_conversion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Recent Meta leads */}
      {metaLeads.length > 0 && (
        <div className="rounded-xl border bg-[var(--card-bg)] shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">Poslední leady z Meta Ads</h2>
          </div>
          <table className="w-full">
            <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-[var(--card-text)]"><th className="px-6 py-3">Kontakt</th><th className="px-6 py-3">Kampaň</th><th className="px-6 py-3">Datum</th><th className="px-6 py-3">Stav dealu</th></tr></thead>
            <tbody>
              {metaLeads.map((l, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-[var(--table-hover)]">
                  <td className="px-6 py-3 text-sm font-medium text-[var(--card-text)]">{l.contact_name}</td>
                  <td className="px-6 py-3 text-sm text-[var(--card-text)]">{l.campaign_name}</td>
                  <td className="px-6 py-3 text-sm text-[var(--card-text-muted)]">{new Date(l.created_at).toLocaleDateString("cs-CZ")}</td>
                  <td className="px-6 py-3 text-sm text-[var(--card-text)]">{l.stage_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </ModuleGate>
  );
}

function KpiCard({ icon: Icon, label, value, color, bg }: { icon: typeof DollarSign; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-[var(--card-text-muted)]">{label}</p>
          <p className="text-lg font-bold text-[var(--card-text)]">{value}</p>
        </div>
      </div>
    </div>
  );
}
