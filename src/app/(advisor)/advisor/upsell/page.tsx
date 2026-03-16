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

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-500 border-red-500/30",
  high: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  low: "bg-blue-500/20 text-blue-500 border-blue-500/30",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritická",
  high: "Vysoká",
  medium: "Střední",
  low: "Nízká",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nový",
  contacted: "Kontaktováno",
  resolved: "Vyřešeno",
  dismissed: "Odmítnuto",
};

const CATEGORY_LABELS: Record<string, string> = {
  loans: "Úvěry/Hypotéky",
  insurance: "Pojištění",
  investments: "Investice",
  life_events: "Životní události",
  contracts: "Smlouvy",
};

export default function UpsellPage() {
  const supabase = createClient();

  const [alerts, setAlerts] = useState<UpsellAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("upsell_alerts")
      .select("*, clients(first_name, last_name)")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Nepodařilo se načíst upsell příležitosti");
      setLoading(false);
      return;
    }

    // Sort by priority first, then created_at desc
    const sorted = (data || []).sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 99;
      const pb = PRIORITY_ORDER[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setAlerts(sorted);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const updateStatus = async (alertId: string, newStatus: string) => {
    setUpdatingId(alertId);
    const { error } = await supabase
      .from("upsell_alerts")
      .update({ status: newStatus })
      .eq("id", alertId);

    if (error) {
      toast.error("Nepodařilo se aktualizovat status");
    } else {
      toast.success(`Status změněn na "${STATUS_LABELS[newStatus]}"`);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
      );
    }
    setUpdatingId(null);
  };

  const filtered = alerts.filter((alert) => {
    if (filterCategory !== "all" && alert.category !== filterCategory) return false;
    if (filterPriority !== "all" && alert.priority !== filterPriority) return false;
    if (filterStatus !== "all" && alert.status !== filterStatus) return false;
    if (searchQuery) {
      const name = alert.clients
        ? `${alert.clients.first_name} ${alert.clients.last_name}`.toLowerCase()
        : "";
      const q = searchQuery.toLowerCase();
      if (!name.includes(q) && !alert.title.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text">Upsell příležitosti</h1>
        <p style={{ color: "var(--card-text-muted)" }}>
          Přehled detekovaných příležitostí pro vaše klienty
        </p>
      </div>

      {/* Filters */}
      <div
        className="rounded-2xl p-4 flex flex-wrap gap-3 items-center"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--card-border)",
        }}
      >
        <Filter className="h-4 w-4" style={{ color: "var(--card-text-muted)" }} />

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: "var(--card-text-dim)" }}
          />
          <Input
            placeholder="Hledat klienta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-56"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
              color: "var(--input-text)",
            }}
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger
            className="w-44"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
              color: "var(--input-text)",
            }}
          >
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny kategorie</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger
            className="w-36"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
              color: "var(--input-text)",
            }}
          >
            <SelectValue placeholder="Priorita" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny priority</SelectItem>
            <SelectItem value="critical">Kritická</SelectItem>
            <SelectItem value="high">Vysoká</SelectItem>
            <SelectItem value="medium">Střední</SelectItem>
            <SelectItem value="low">Nízká</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger
            className="w-40"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
              color: "var(--input-text)",
            }}
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny statusy</SelectItem>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Alerts list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--card-border)",
          }}
        >
          <Sparkles
            className="h-12 w-12 mx-auto mb-4"
            style={{ color: "var(--card-text-dim)" }}
          />
          <p className="text-lg font-medium" style={{ color: "var(--card-text)" }}>
            Žádné upsell příležitosti
          </p>
          <p style={{ color: "var(--card-text-muted)" }}>
            {alerts.length > 0
              ? "Zkuste změnit filtry"
              : "Spusťte analýzu v nastavení pravidel pro detekci příležitostí"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const clientName = alert.clients
              ? `${alert.clients.first_name} ${alert.clients.last_name}`
              : "Neznámý klient";
            const isUpdating = updatingId === alert.id;

            return (
              <div
                key={alert.id}
                className="rounded-2xl p-5 space-y-3"
                style={{
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-semibold text-lg"
                        style={{ color: "var(--card-text)" }}
                      >
                        {clientName}
                      </span>
                      <Badge
                        variant="outline"
                        className={PRIORITY_COLORS[alert.priority] || ""}
                      >
                        {PRIORITY_LABELS[alert.priority] || alert.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: "var(--card-border)",
                          color: "var(--card-text-muted)",
                        }}
                      >
                        {CATEGORY_LABELS[alert.category] || alert.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: "var(--color-primary)",
                          color: "var(--color-primary)",
                        }}
                      >
                        {STATUS_LABELS[alert.status] || alert.status}
                      </Badge>
                    </div>
                    <p style={{ color: "var(--card-text-muted)" }}>
                      {alert.description || alert.title}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: "var(--card-text-dim)" }}
                    >
                      {new Date(alert.created_at).toLocaleDateString("cs-CZ", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {alert.status !== "contacted" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => updateStatus(alert.id, "contacted")}
                      style={{
                        borderColor: "var(--card-border)",
                        color: "var(--card-text)",
                      }}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Phone className="h-4 w-4 mr-1" />
                      )}
                      Kontaktováno
                    </Button>
                  )}
                  {alert.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => updateStatus(alert.id, "resolved")}
                      style={{
                        borderColor: "var(--card-border)",
                        color: "var(--card-text)",
                      }}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Vyřešeno
                    </Button>
                  )}
                  {alert.status !== "dismissed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isUpdating}
                      onClick={() => updateStatus(alert.id, "dismissed")}
                      style={{
                        borderColor: "var(--card-border)",
                        color: "var(--card-text)",
                      }}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-1" />
                      )}
                      Odmítnuto
                    </Button>
                  )}
                  <Link href={`/advisor/clients/${alert.client_id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      style={{
                        borderColor: "var(--color-primary)",
                        color: "var(--color-primary)",
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
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
