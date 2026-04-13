"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Phone,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Shield,
  CreditCard,
  Bell,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface UpsellAlert {
  id: string;
  advisor_id: string;
  client_id: string;
  rule_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof AlertTriangle }> = {
  critical: { label: "Kritická", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle },
  high: { label: "Vysoká", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: TrendingUp },
  medium: { label: "Střední", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: Bell },
  low: { label: "Nízká", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: Info },
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nový",
  contacted: "Kontaktováno",
  resolved: "Vyřešeno",
  dismissed: "Odmítnuto",
};

const STATUS_CONFIG: Record<string, { bg: string; color: string }> = {
  new: { bg: "bg-blue-50 border-blue-200", color: "text-blue-700" },
  contacted: { bg: "bg-amber-50 border-amber-200", color: "text-amber-700" },
  resolved: { bg: "bg-emerald-50 border-emerald-200", color: "text-emerald-700" },
  dismissed: { bg: "bg-gray-50 border-gray-200", color: "text-gray-500" },
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof CreditCard }> = {
  loans: { label: "Úvěry/Hypotéky", icon: CreditCard },
  insurance: { label: "Pojištění", icon: Shield },
  investments: { label: "Investice", icon: TrendingUp },
  life_events: { label: "Životní události", icon: Sparkles },
  contracts: { label: "Smlouvy", icon: CreditCard },
};

export default function UpsellPage() {
  const supabase = createClient();
  const [alerts, setAlerts] = useState<UpsellAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(5.0);

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);

    // Fetch threshold
    const { data: adv } = await supabase.from("advisors").select("interest_rate_threshold").single();
    if (adv?.interest_rate_threshold) setThreshold(adv.interest_rate_threshold);

    const { data, error } = await supabase
      .from("upsell_alerts")
      .select("*, clients(first_name, last_name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Nepodařilo se načíst upsell příležitosti");
      setLoading(false);
      return;
    }

    const sorted = (data || []).sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setAlerts(sorted);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const updateStatus = async (alertId: string, newStatus: string) => {
    setUpdatingId(alertId);
    const { error } = await supabase.from("upsell_alerts").update({ status: newStatus }).eq("id", alertId);
    if (error) {
      toast.error("Nepodařilo se aktualizovat status");
    } else {
      toast.success(`Status změněn na "${STATUS_LABELS[newStatus]}"`);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a)));
    }
    setUpdatingId(null);
  };

  const filtered = alerts.filter((alert) => {
    if (filterCategory !== "all" && alert.category !== filterCategory) return false;
    if (filterPriority !== "all" && alert.priority !== filterPriority) return false;
    if (filterStatus !== "all" && alert.status !== filterStatus) return false;
    if (searchQuery) {
      const name = alert.clients ? `${alert.clients.first_name} ${alert.clients.last_name}`.toLowerCase() : "";
      const q = searchQuery.toLowerCase();
      if (!name.includes(q) && !alert.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const criticalCount = alerts.filter((a) => a.priority === "critical" && a.status === "new").length;
  const highCount = alerts.filter((a) => a.priority === "high" && a.status === "new").length;
  const newCount = alerts.filter((a) => a.status === "new").length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Upsell příležitosti</h1>
          <p className="mt-1 text-sm text-[var(--card-text-muted)]">
            Přehled detekovaných příležitostí pro vaše klienty
          </p>
        </div>
        <Link href="/advisor/nastaveni/upsell-pravidla">
          <Button variant="outline" className="rounded-xl text-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Nastavit pravidla
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className={`rounded-2xl border p-5 shadow-sm ${criticalCount > 0 ? "border-red-200 bg-red-50/50" : "border-[var(--card-border)] bg-[var(--card-bg)]"}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${criticalCount > 0 ? "bg-red-100" : "bg-red-50"}`}>
              <AlertTriangle className={`h-5 w-5 ${criticalCount > 0 ? "text-red-600" : "text-red-400"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{criticalCount}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Kritické</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{highCount}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Vysoká priorita</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{newCount}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Nové celkem</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">
                {alerts.filter((a) => a.status === "resolved").length}
              </p>
              <p className="text-xs text-[var(--card-text-muted)]">Vyřešené</p>
            </div>
          </div>
        </div>
      </div>

      {/* Threshold info */}
      <div className="flex items-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-3 shadow-sm">
        <Info className="h-4 w-4 text-[var(--card-text-dim)]" />
        <span className="text-xs text-[var(--card-text-muted)]">
          Práh úrokové sazby: <span className="font-semibold text-[var(--card-text)]">{threshold}%</span> — smlouvy s vyšším úrokem se zobrazí jako příležitost k refinancování
        </span>
        <Link href="/advisor/settings" className="ml-auto text-xs text-[var(--color-primary)] hover:underline">
          Změnit
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-[var(--card-text-dim)]" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--card-text-dim)]" />
          <Input
            placeholder="Hledat klienta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-56 rounded-xl"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Kategorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny kategorie</SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([val, cfg]) => (
              <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Priorita" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny priority</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
              <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny statusy</SelectItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alerts */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] py-20 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--table-hover)]">
            <Sparkles className="h-8 w-8 text-[var(--card-text-dim)]" />
          </div>
          <p className="mt-4 text-lg font-medium text-[var(--card-text-dim)]">Žádné příležitosti</p>
          <p className="mt-1 max-w-sm text-center text-sm text-[var(--card-text-dim)]">
            {alerts.length > 0
              ? "Zkuste změnit filtry pro zobrazení dalších příležitostí"
              : "Příležitosti se vytváří automaticky, když klient nahraje smlouvu s vysokým úrokem nebo chybějícími údaji"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const clientName = alert.clients ? `${alert.clients.first_name} ${alert.clients.last_name}` : "Neznámý klient";
            const isUpdating = updatingId === alert.id;
            const pc = PRIORITY_CONFIG[alert.priority] || PRIORITY_CONFIG.low;
            const sc = STATUS_CONFIG[alert.status] || STATUS_CONFIG.new;
            const cc = CATEGORY_CONFIG[alert.category];
            const PriorityIcon = pc.icon;
            const CategoryIcon = cc?.icon || CreditCard;

            return (
              <div
                key={alert.id}
                className={`group rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
                  alert.priority === "critical" ? "border-red-200 bg-red-50/20" :
                  alert.priority === "high" ? "border-orange-200 bg-orange-50/10" :
                  "border-[var(--card-border)] bg-[var(--card-bg)]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Priority icon */}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${pc.bg}`}>
                    <PriorityIcon className={`h-5 w-5 ${pc.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--card-text)]">{clientName}</span>
                      <Badge variant="outline" className={`text-[10px] ${pc.bg} ${pc.color} ${pc.border} border`}>
                        {pc.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-[var(--card-border)] text-[var(--card-text-muted)]">
                        <CategoryIcon className="mr-1 h-3 w-3" />
                        {cc?.label || alert.category}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${sc.bg} ${sc.color} border`}>
                        {STATUS_LABELS[alert.status] || alert.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--card-text-muted)]">
                      {alert.description || alert.title}
                    </p>
                    <p className="text-xs text-[var(--card-text-dim)]">
                      {new Date(alert.created_at).toLocaleDateString("cs-CZ", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 flex-wrap border-t border-[var(--card-border)] pt-4">
                  {alert.status !== "contacted" && (
                    <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => updateStatus(alert.id, "contacted")} className="rounded-xl text-xs">
                      {isUpdating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Phone className="h-3.5 w-3.5 mr-1.5" />}
                      Kontaktováno
                    </Button>
                  )}
                  {alert.status !== "resolved" && (
                    <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => updateStatus(alert.id, "resolved")} className="rounded-xl text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                      {isUpdating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                      Vyřešeno
                    </Button>
                  )}
                  {alert.status !== "dismissed" && (
                    <Button size="sm" variant="outline" disabled={isUpdating} onClick={() => updateStatus(alert.id, "dismissed")} className="rounded-xl text-xs text-[var(--card-text-dim)]">
                      {isUpdating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 mr-1.5" />}
                      Odmítnout
                    </Button>
                  )}
                  <Link href={`/advisor/clients/${alert.client_id}`} className="ml-auto">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-blue-50">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Otevřít klienta
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
