"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CoverageCheck {
  id: string;
  title: string;
  description: string;
  status: "ok" | "warning" | "danger";
}

interface CoverageData {
  checks: CoverageCheck[];
  coverageScore: string;
  okCount: number;
  total: number;
}

const statusConfig = {
  ok: {
    border: "border-l-green-500",
    bg: "bg-green-50",
    ring: "text-green-600",
    icon: ShieldCheck,
  },
  warning: {
    border: "border-l-orange-500",
    bg: "bg-orange-50",
    ring: "text-orange-600",
    icon: ShieldAlert,
  },
  danger: {
    border: "border-l-red-500",
    bg: "bg-red-50",
    ring: "text-red-600",
    icon: ShieldX,
  },
};

export default function OchranaPage() {
  const [data, setData] = useState<CoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/coverage-check")
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const handleNotifyAdvisor = async (checkId: string, title: string) => {
    setNotifying(checkId);
    try {
      await fetch("/api/client/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "coverage_gap",
          message: `Klient se chce poradit ohledně: ${title}`,
        }),
      });
    } catch {
      // silently fail
    } finally {
      setNotifying(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.checks) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Ochrana</h1>
        <p className="text-muted-foreground">
          Nepodařilo se načíst data o pojistném krytí.
        </p>
      </div>
    );
  }

  const scorePercent =
    data.total > 0 ? Math.round((data.okCount / data.total) * 100) : 0;
  const scoreColor =
    scorePercent >= 75
      ? "text-green-600"
      : scorePercent >= 50
        ? "text-orange-600"
        : "text-red-600";
  const ringColor =
    scorePercent >= 75
      ? "stroke-green-500"
      : scorePercent >= 50
        ? "stroke-orange-500"
        : "stroke-red-500";

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">Ochrana</h1>

      {/* Coverage Score */}
      <div className="flex items-center gap-6">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
            <path
              className="stroke-gray-200"
              d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831"
              fill="none"
              strokeWidth="3"
            />
            <path
              className={ringColor}
              d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831"
              fill="none"
              strokeWidth="3"
              strokeDasharray={`${scorePercent}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div
            className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${scoreColor}`}
          >
            {data.coverageScore}
          </div>
        </div>
        <div>
          <p className="text-lg font-semibold">
            Vaše ochrana: {data.coverageScore}
          </p>
          <p className="text-sm text-muted-foreground">
            {data.okCount} z {data.total} kontrol v pořádku
          </p>
        </div>
      </div>

      {/* Check Cards */}
      <div className="space-y-4">
        {data.checks.map((check) => {
          const config = statusConfig[check.status];
          const Icon = config.icon;

          return (
            <div
              key={check.id}
              className={`rounded-xl border-l-4 ${config.border} ${config.bg} p-5 shadow-sm`}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 ${config.ring}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[var(--card-text)]">
                    {check.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--card-text-muted)]">
                    {check.description}
                  </p>
                  {(check.status === "danger" || check.status === "warning") && (
                    <button
                      onClick={() =>
                        handleNotifyAdvisor(check.id, check.title)
                      }
                      disabled={notifying === check.id}
                      className="mt-3 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {notifying === check.id
                        ? "Odesílání..."
                        : "Poradit se s poradcem"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
