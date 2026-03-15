"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { SEGMENT_CONFIG } from "@/lib/scoring";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme/ThemeProvider";
import {
  ArrowUpRight,
  X,
  CheckCircle2,
  Circle,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function formatCZK(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M Kč`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} tis. Kč`;
  return `${value} Kč`;
}

const SEGMENT_COLORS: Record<string, string> = {
  vip: "#F59E0B",
  active: "#22C55E",
  standard: "#3B82F6",
  sleeping: "#94A3B8",
  new: "#8B5CF6",
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Dobré ráno";
  if (h >= 12 && h < 18) return "Dobré odpoledne";
  return "Dobrý večer";
}

function formatCzechDate(): string {
  return new Date().toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  href?: string;
}

/* ── Tiny sparkline bars ── */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[3px] h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-[5px] rounded-sm transition-all duration-300"
          style={{
            height: `${(v / max) * 100}%`,
            minHeight: 3,
            backgroundColor: color,
            opacity: 0.5 + (i / data.length) * 0.5,
          }}
        />
      ))}
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({
  title,
  value,
  subtitle,
  accent,
  sparkData,
  wide,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  accent: string;
  sparkData?: number[];
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-[var(--card-bg)] p-5 transition-colors duration-150 hover:border-[var(--card-border)] ${wide ? "col-span-2" : ""}`}
      style={{ borderColor: "var(--card-border, #e5e7eb)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--card-text-dim)] mb-3">
        {title}
      </p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-[var(--card-text)]">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--card-text-dim)]">{subtitle}</p>
          )}
        </div>
        {sparkData && sparkData.length > 0 && (
          <Sparkline data={sparkData} color={accent} />
        )}
      </div>
    </div>
  );
}

/* ── Section card wrapper ── */
function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-[var(--card-bg)] p-5 transition-colors duration-150 hover:border-[var(--card-border)] ${className}`}
      style={{ borderColor: "var(--card-border, #e5e7eb)" }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-[var(--card-text-dim)] mb-4">
      {children}
    </h2>
  );
}

export default function AdvisorDashboard() {
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [showChecklist, setShowChecklist] = useState(false);
  const [kpi, setKpi] = useState({
    totalLeads: 0,
    newDeals: 0,
    conversionRate: 0,
    pipelineValue: 0,
    avgDaysInPipeline: 0,
  });
  const [funnelData, setFunnelData] = useState<
    { name: string; count: number; color: string }[]
  >([]);
  const [sourceData, setSourceData] = useState<
    { name: string; value: number }[]
  >([]);
  const [topDeals, setTopDeals] = useState<
    { title: string; value: number; contact: string; stage: string }[]
  >([]);
  const [segmentData, setSegmentData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [upsellAlerts, setUpsellAlerts] = useState<
    {
      id: string;
      title: string;
      description: string | null;
      status: string;
      client_id: string;
    }[]
  >([]);
  const [monthlyLeads, setMonthlyLeads] = useState<number[]>([]);

  const accent = theme.accent || "#10B981";
  const primary = theme.primary || "#2563EB";

  useEffect(() => {
    async function fetchDashboard() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: adv } = await supabase
          .from("advisors")
          .select("onboarding_completed, company_name")
          .eq("user_id", user.id)
          .single();
        if (adv && !adv.onboarding_completed) {
          router.push("/advisor/vitejte");
          return;
        }
        if (adv?.company_name) setUserName(adv.company_name);
        else setUserName(user.email?.split("@")[0] || "");

        const { data: progress } = await supabase
          .from("onboarding_progress")
          .select("steps, completed_at")
          .eq("user_id", user.id)
          .eq("role", "advisor")
          .single();
        if (progress && progress.completed_at) {
          const steps = (progress.steps || {}) as Record<string, boolean>;
          const items: ChecklistItem[] = [
            {
              key: "company",
              label: "Nastavit firmu",
              done: !!steps.company,
              href: "/advisor/settings",
            },
            {
              key: "appearance",
              label: "Vzhled portálu",
              done: !!steps.appearance,
              href: "/advisor/nastaveni/branding",
            },
            {
              key: "modules",
              label: "Vybrat moduly",
              done: !!steps.modules,
              href: "/advisor/settings",
            },
            {
              key: "first_client",
              label: "Přidat klienta",
              done: !!(steps.first_client || steps.first_client_skipped),
              href: "/advisor/clients",
            },
            {
              key: "connections",
              label: "Propojit služby",
              done: !!steps.connections,
              href: "/advisor/settings",
            },
          ];
          const allDone = items.every((i) => i.done);
          if (!allDone) {
            setChecklist(items);
            setShowChecklist(true);
          }
        }
      }

      const now = new Date();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      const [dealsRes, stagesRes, allDealsRes, clientsRes, alertsRes] =
        await Promise.all([
          supabase.from("deals").select("*"),
          supabase.from("pipeline_stages").select("*").order("position"),
          supabase
            .from("deals")
            .select(
              "id, title, value, contact_name, stage_id, source, created_at, converted_at, lost_at"
            ),
          supabase.from("clients").select("id, segment"),
          supabase
            .from("upsell_alerts")
            .select("id, title, description, status, client_id")
            .in("status", ["new", "viewed"])
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      const deals = allDealsRes.data || [];
      const stages = stagesRes.data || [];
      const clients = clientsRes.data || [];

      const thisMonthDeals = deals.filter(
        (d) => d.created_at >= startOfMonth
      );
      const wonDeals = deals.filter((d) => d.converted_at);
      const closedDeals = deals.filter((d) => d.converted_at || d.lost_at);
      const rate =
        closedDeals.length > 0
          ? Math.round((wonDeals.length / closedDeals.length) * 100)
          : 0;
      const totalValue = deals
        .filter((d) => !d.lost_at)
        .reduce((s, d) => s + (d.value || 0), 0);

      const pipelineDays = wonDeals
        .map((d) => {
          const created = new Date(d.created_at).getTime();
          const converted = new Date(d.converted_at).getTime();
          return Math.round(
            (converted - created) / (1000 * 60 * 60 * 24)
          );
        })
        .filter((d) => d >= 0);
      const avgDays =
        pipelineDays.length > 0
          ? Math.round(
              pipelineDays.reduce((a, b) => a + b, 0) / pipelineDays.length
            )
          : 0;

      setKpi({
        totalLeads: deals.length,
        newDeals: thisMonthDeals.length,
        conversionRate: rate,
        pipelineValue: totalValue,
        avgDaysInPipeline: avgDays,
      });

      setFunnelData(
        stages.map((s) => ({
          name: s.name,
          count: deals.filter((d) => d.stage_id === s.id).length,
          color: s.color,
        }))
      );

      const monthlyLeadCounts: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(
          now.getFullYear(),
          now.getMonth() - i + 1,
          1
        );
        const monthLeads = deals.filter(
          (deal) =>
            deal.created_at >= d.toISOString() &&
            deal.created_at < end.toISOString()
        ).length;
        monthlyLeadCounts.push(monthLeads);
      }
      setMonthlyLeads(monthlyLeadCounts.slice(-5));

      const sources: Record<string, number> = {};
      deals.forEach((d) => {
        const src =
          d.source === "meta"
            ? "Meta Ads"
            : d.source === "referral"
              ? "Doporučení"
              : "Manuální";
        sources[src] = (sources[src] || 0) + 1;
      });
      setSourceData(
        Object.entries(sources).map(([name, value]) => ({ name, value }))
      );

      const sorted = [...deals]
        .filter((d) => !d.lost_at)
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 5);
      setTopDeals(
        sorted.map((d) => ({
          title: d.title,
          value: d.value || 0,
          contact: d.contact_name || "—",
          stage:
            stages.find((s) => s.id === d.stage_id)?.name || "—",
        }))
      );

      const segments: Record<string, number> = {};
      clients.forEach((c) => {
        const seg = c.segment || "new";
        segments[seg] = (segments[seg] || 0) + 1;
      });
      setSegmentData(
        Object.entries(segments).map(([key, value]) => ({
          name: SEGMENT_CONFIG[key]?.label || key,
          value,
          color: SEGMENT_COLORS[key] || "#94A3B8",
        }))
      );

      setUpsellAlerts(alertsRes.data || []);
      setLoading(false);
    }
    fetchDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton
              key={i}
              className={`h-28 rounded-xl ${i === 0 ? "col-span-2" : ""}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Skeleton className="h-72 rounded-xl col-span-3" />
          <Skeleton className="h-72 rounded-xl col-span-2" />
        </div>
      </div>
    );
  }

  const totalSourceCount = sourceData.reduce((s, d) => s + d.value, 0);

  /* Source pie colors — derived from theme */
  const sourceColors = [primary, "#6B7280", accent, "#F97316"];

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--card-text)]">
            {getGreeting()}, {userName || "poradce"}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--card-text-dim)]">
            Tady je přehled vašeho podnikání
          </p>
        </div>
        <p className="hidden md:block text-xs text-[var(--card-text-dim)] mt-1">
          {formatCzechDate()}
        </p>
      </div>

      {/* ── KPI Row ── */}
      <div className="mb-5 grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          title="Hodnota pipeline"
          value={formatCZK(kpi.pipelineValue)}
          accent={primary}
          sparkData={monthlyLeads}
          wide
        />
        <KpiCard
          title="Nové leady"
          value={kpi.newDeals}
          subtitle="tento měsíc"
          accent={accent}
        />
        <KpiCard
          title="Konverze"
          value={`${kpi.conversionRate}%`}
          accent={primary}
        />
        <KpiCard
          title="Ø dny v pipeline"
          value={`${kpi.avgDaysInPipeline}`}
          subtitle="dní"
          accent={primary}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="mb-5 grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Pipeline bar chart */}
        <Section className="md:col-span-3">
          <SectionTitle>Přehled pipeline</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={funnelData}
              layout="vertical"
              margin={{ left: 10, right: 10, top: 0, bottom: 0 }}
            >
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
              <YAxis
                dataKey="name"
                type="category"
                width={110}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#6B7280" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" name="Dealů" radius={[0, 4, 4, 0]} barSize={20}>
                {funnelData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        {/* Source donut */}
        <Section className="md:col-span-2">
          <SectionTitle>Zdroje leadů</SectionTitle>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {sourceData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={sourceColors[i % sourceColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-xl font-semibold text-[var(--card-text)]">
                  {totalSourceCount}
                </p>
                <p className="text-[10px] text-[var(--card-text-dim)]">celkem</p>
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {sourceData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      sourceColors[i % sourceColors.length],
                  }}
                />
                <span className="text-[11px] text-[var(--card-text-muted)]">
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* ── Bottom Row — Top deals, Segments, Upsell ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top deals — table style */}
        <Section>
          <SectionTitle>Top příležitosti</SectionTitle>
          {topDeals.length === 0 ? (
            <p className="text-sm text-[var(--card-text-dim)] py-4 text-center">
              Žádné dealy
            </p>
          ) : (
            <div className="space-y-0">
              {topDeals.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 border-b border-[var(--card-border)] last:border-0 cursor-pointer transition-colors duration-150 hover:bg-[var(--table-hover)] -mx-2 px-2 rounded"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--card-text)]">
                      {d.title}
                    </p>
                    <p className="text-[11px] text-[var(--card-text-dim)]">
                      {d.contact} · {d.stage}
                    </p>
                  </div>
                  <span className="shrink-0 ml-3 text-sm font-semibold text-[var(--card-text)]">
                    {formatCZK(d.value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Client segments */}
        <Section>
          <SectionTitle>Segmentace klientů</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={segmentData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {segmentData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {segmentData.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[11px] text-[var(--card-text-muted)]">
                  {s.name} ({s.value})
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Upsell alerts */}
        <Section>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
            <SectionTitle>Příležitosti</SectionTitle>
          </div>
          {upsellAlerts.length === 0 ? (
            <p className="text-sm text-[var(--card-text-dim)] py-4 text-center">
              Žádné nové příležitosti
            </p>
          ) : (
            <div className="space-y-2">
              {upsellAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-lg border border-[var(--card-border)] p-3 transition-colors duration-150 hover:border-[var(--card-border)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--card-text)]">
                        {alert.title}
                      </p>
                      {alert.description && (
                        <p className="mt-0.5 text-[11px] text-[var(--card-text-dim)] line-clamp-1">
                          {alert.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-2 flex items-center gap-1 shrink-0">
                      <button
                        onClick={async () => {
                          const supabase = createClient();
                          await supabase
                            .from("upsell_alerts")
                            .update({ status: "viewed" })
                            .eq("id", alert.id);
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150 cursor-pointer hover:bg-[var(--table-header)]"
                        style={{ color: primary }}
                      >
                        Zobrazit
                      </button>
                      <button
                        onClick={async () => {
                          const supabase = createClient();
                          await supabase
                            .from("upsell_alerts")
                            .update({ status: "dismissed" })
                            .eq("id", alert.id);
                          setUpsellAlerts((prev) =>
                            prev.filter((a) => a.id !== alert.id)
                          );
                        }}
                        className="rounded-md p-1 cursor-pointer transition-colors duration-150 hover:bg-red-50"
                        title="Zamítnout"
                      >
                        <X className="h-3.5 w-3.5 text-[var(--card-text-dim)]" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ── Onboarding checklist ── */}
      {showChecklist && (
        <Section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Dokončete nastavení</SectionTitle>
            <span className="text-[11px] text-[var(--card-text-dim)]">
              {checklist.filter((i) => i.done).length}/{checklist.length}
            </span>
          </div>
          <div className="mb-3 h-1.5 rounded-full bg-[var(--table-header)]">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(checklist.filter((i) => i.done).length / checklist.length) * 100}%`,
                backgroundColor: primary,
              }}
            />
          </div>
          <div className="space-y-1">
            {checklist.map((item) => (
              <button
                key={item.key}
                onClick={() =>
                  item.href && !item.done && router.push(item.href)
                }
                className={`flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 ${
                  !item.done && item.href
                    ? "hover:bg-[var(--table-hover)] cursor-pointer"
                    : ""
                }`}
              >
                {item.done ? (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0"
                    style={{ color: accent }}
                  />
                ) : (
                  <Circle className="h-4 w-4 text-[var(--card-text-dim)] shrink-0" />
                )}
                <span
                  className={`text-sm ${item.done ? "text-[var(--card-text-dim)] line-through" : "text-[var(--card-text-muted)]"}`}
                >
                  {item.label}
                </span>
                {!item.done && item.href && (
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-[var(--card-text-dim)]" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowChecklist(false)}
            className="mt-3 text-xs text-[var(--card-text-dim)] cursor-pointer transition-colors duration-150 hover:text-[var(--card-text-muted)]"
          >
            Skrýt
          </button>
        </Section>
      )}
    </div>
  );
}
