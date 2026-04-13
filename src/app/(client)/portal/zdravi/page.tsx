"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface BreakdownItem {
  score: number;
  max: number;
  label: string;
}

interface HealthData {
  score: number;
  breakdown: Record<string, BreakdownItem>;
  recommendations: string[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#166534";
  if (score >= 60) return "#16a34a";
  if (score >= 30) return "#f97316";
  return "#dc2626";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Vynikající";
  if (score >= 60) return "Dobré";
  if (score >= 30) return "Průměrné";
  return "Kritické";
}

function GaugeSVG({ score }: { score: number }) {
  const cx = 150;
  const cy = 140;
  const r = 110;
  const strokeWidth = 20;

  // Semi-circle from 180 to 0 degrees (left to right)
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalAngle = Math.PI;

  // Background arc path
  const bgX1 = cx + r * Math.cos(startAngle);
  const bgY1 = cy - r * Math.sin(startAngle);
  const bgX2 = cx + r * Math.cos(endAngle);
  const bgY2 = cy - r * Math.sin(endAngle);
  const bgPath = `M ${bgX1} ${bgY1} A ${r} ${r} 0 0 1 ${bgX2} ${bgY2}`;

  // Colored zone arcs
  const zones = [
    { from: 0, to: 30, color: "#dc2626" },
    { from: 30, to: 60, color: "#f97316" },
    { from: 60, to: 80, color: "#16a34a" },
    { from: 80, to: 100, color: "#166534" },
  ];

  function arcPath(fromPct: number, toPct: number): string {
    const a1 = startAngle - (fromPct / 100) * totalAngle;
    const a2 = startAngle - (toPct / 100) * totalAngle;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy - r * Math.sin(a2);
    const largeArc = (toPct - fromPct) / 100 * Math.PI > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // Fill arc based on score
  const fillAngle = startAngle - (score / 100) * totalAngle;
  const fillX = cx + r * Math.cos(fillAngle);
  const fillY = cy - r * Math.sin(fillAngle);
  const largeArcFlag = score > 50 ? 1 : 0;
  const fillPath = `M ${bgX1} ${bgY1} A ${r} ${r} 0 ${largeArcFlag} 1 ${fillX} ${fillY}`;

  const color = getScoreColor(score);

  return (
    <svg viewBox="0 0 300 170" className="w-full max-w-[360px] mx-auto">
      {/* Background arc */}
      <path
        d={bgPath}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Zone indicators (thin) */}
      {zones.map((zone) => (
        <path
          key={zone.from}
          d={arcPath(zone.from, zone.to)}
          fill="none"
          stroke={zone.color}
          strokeWidth={4}
          opacity={0.25}
        />
      ))}
      {/* Score fill arc */}
      {score > 0 && (
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
      {/* Score number */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-bold"
        style={{ fontSize: "48px", fill: color }}
      >
        {score}
      </text>
      {/* Label */}
      <text
        x={cx}
        y={cy + 25}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: "13px", fill: "#6b7280" }}
      >
        {getScoreLabel(score)}
      </text>
      {/* Min/max labels */}
      <text x={cx - r - 5} y={cy + 15} textAnchor="middle" style={{ fontSize: "11px", fill: "#9ca3af" }}>
        0
      </text>
      <text x={cx + r + 5} y={cy + 15} textAnchor="middle" style={{ fontSize: "11px", fill: "#9ca3af" }}>
        100
      </text>
    </svg>
  );
}

function BreakdownBar({ item }: { item: BreakdownItem }) {
  const pct = (item.score / item.max) * 100;
  const barColor =
    pct >= 80 ? "bg-green-600" : pct >= 50 ? "bg-orange-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{item.label}</span>
        <span className="font-medium">
          {item.score}/{item.max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function HealthScorePage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/health-score")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Nepodařilo se načíst data");
        }
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8 px-4">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card className="rounded-xl shadow-sm border-destructive">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const breakdownEntries = Object.entries(data.breakdown);

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8 px-4">
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold">Vaše finanční zdraví</h1>
        <p className="mt-1 text-sm text-[var(--card-text-muted)]">
          Skóre ukazuje, jak dobře jsou nastavené vaše finance — od rezervy přes splátky až po pojištění.
        </p>
      </div>

      {/* Gauge card */}
      <Card className="rounded-xl shadow-sm">
        <CardContent className="pt-6 pb-4">
          <GaugeSVG score={data.score} />
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Přehled kategorií</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {breakdownEntries.map(([key, item]) => (
            <BreakdownBar key={key} item={item} />
          ))}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Doporučení</h2>
          {data.recommendations.map((rec, i) => (
            <Card key={i} className="rounded-xl shadow-sm">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{rec}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
