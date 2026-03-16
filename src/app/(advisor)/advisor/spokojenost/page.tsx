"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, TrendingUp, TrendingDown, Minus, Users } from "lucide-react";
import { ModuleGate } from "@/components/ModuleGate";

interface Survey {
  id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  trigger_type: string | null;
  created_at: string;
  clients?: { first_name: string; last_name: string } | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-[var(--card-text-dim)]"
          }`}
        />
      ))}
    </div>
  );
}

export default function SatisfactionPage() {
  const supabase = createClient();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTrigger, setFilterTrigger] = useState("all");

  useEffect(() => {
    async function load() {
      const { data: advisor } = await supabase
        .from("advisors")
        .select("id")
        .single();
      if (!advisor) return;

      const { data } = await supabase
        .from("satisfaction_surveys")
        .select("*, clients(first_name, last_name)")
        .eq("advisor_id", advisor.id)
        .order("created_at", { ascending: false });

      setSurveys(data || []);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered =
    filterTrigger === "all"
      ? surveys
      : surveys.filter((s) => s.trigger_type === filterTrigger);

  const avgRating =
    filtered.length > 0
      ? filtered.reduce((sum, s) => sum + s.rating, 0) / filtered.length
      : 0;

  // Trend: last 30d vs previous 30d
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const recent = surveys.filter(
    (s) => new Date(s.created_at) >= thirtyDaysAgo
  );
  const previous = surveys.filter(
    (s) =>
      new Date(s.created_at) >= sixtyDaysAgo &&
      new Date(s.created_at) < thirtyDaysAgo
  );

  const recentAvg =
    recent.length > 0
      ? recent.reduce((sum, s) => sum + s.rating, 0) / recent.length
      : 0;
  const previousAvg =
    previous.length > 0
      ? previous.reduce((sum, s) => sum + s.rating, 0) / previous.length
      : 0;

  const trendDiff = recentAvg - previousAvg;

  const triggerTypes = Array.from(
    new Set(surveys.map((s) => s.trigger_type).filter(Boolean))
  );

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ModuleGate moduleKey="satisfaction" moduleName="Spokojenost" moduleDescription="Měřte spokojenost klientů pomocí automatických dotazníků — zjistěte co zlepšit a kde jste výborní.">
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--card-text)]">
            Spokojenost klientů
          </h1>
          <p className="mt-0.5 text-sm text-[var(--card-text-muted)]">
            {surveys.length} hodnocení celkem
          </p>
        </div>
        <Select value={filterTrigger} onValueChange={setFilterTrigger}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filtr" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            {triggerTypes.map((t) => (
              <SelectItem key={t!} value={t!}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm">
          <p className="text-xs font-medium text-[var(--card-text-muted)]">
            Průměrné hodnocení
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl font-bold text-[var(--card-text)]">
              {avgRating.toFixed(1)}
            </span>
            <StarRating rating={Math.round(avgRating)} />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm">
          <p className="text-xs font-medium text-[var(--card-text-muted)]">Celkem odpovědí</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl font-bold text-[var(--card-text)]">
              {filtered.length}
            </span>
            <Users className="h-5 w-5 text-[var(--card-text-dim)]" />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm">
          <p className="text-xs font-medium text-[var(--card-text-muted)]">
            Trend (30 dní)
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-3xl font-bold text-[var(--card-text)]">
              {trendDiff > 0 ? "+" : ""}
              {trendDiff.toFixed(1)}
            </span>
            {trendDiff > 0 ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : trendDiff < 0 ? (
              <TrendingDown className="h-5 w-5 text-red-500" />
            ) : (
              <Minus className="h-5 w-5 text-[var(--card-text-dim)]" />
            )}
          </div>
        </div>
      </div>

      {/* Survey list */}
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-text)]">
        Poslední hodnocení
      </h2>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Star className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">
            Zatím žádná hodnocení
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StarRating rating={s.rating} />
                  <span className="text-sm font-medium text-[var(--card-text)]">
                    {s.clients
                      ? `${s.clients.first_name} ${s.clients.last_name}`
                      : "Klient"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {s.trigger_type && (
                    <Badge variant="outline" className="text-[10px]">
                      {s.trigger_type}
                    </Badge>
                  )}
                  <span className="text-xs text-[var(--card-text-muted)]">
                    {new Date(s.created_at).toLocaleDateString("cs-CZ")}
                  </span>
                </div>
              </div>
              {s.comment && (
                <p className="mt-2 text-sm text-[var(--card-text-muted)]">{s.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </ModuleGate>
  );
}
