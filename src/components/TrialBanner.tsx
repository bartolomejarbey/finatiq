"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, AlertTriangle, XCircle } from "lucide-react";

interface SubStatus {
  status: string;
  trial_ends_at: string | null;
  days_remaining: number | null;
}

export default function TrialBanner() {
  const [data, setData] = useState<SubStatus | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/advisor/subscription-status");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Silently fail
      }
    }
    load();
  }, []);

  if (!data) return null;
  if (data.status === "active") return null;

  const days = data.days_remaining ?? 0;

  if (data.status === "trial" && days > 3) {
    return (
      <div className="w-full bg-[#22d3ee]/10 border-b border-[#22d3ee]/20 px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <Clock className="h-4 w-4 text-[#22d3ee] shrink-0" />
        <span className="text-[#22d3ee]">
          Zkušební období: zbývá <strong>{days} dní</strong>
        </span>
      </div>
    );
  }

  if (data.status === "trial" && days <= 3) {
    return (
      <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-amber-400">
          Zkušební období končí za <strong>{days} {days === 1 ? "den" : days <= 4 ? "dny" : "dní"}</strong>! Aktivujte předplatné.
        </span>
        <Link
          href="/advisor/predplatne"
          className="ml-2 bg-amber-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-amber-600 transition-colors"
        >
          Aktivovat
        </Link>
      </div>
    );
  }

  if (data.status === "expired") {
    return (
      <div className="w-full bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
        <span className="text-red-400">
          Zkušební období skončilo. Pro pokračování aktivujte předplatné.
        </span>
        <Link
          href="/advisor/predplatne"
          className="ml-2 bg-red-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-red-600 transition-colors"
        >
          Aktivovat nyní
        </Link>
      </div>
    );
  }

  if (data.status === "cancelled") {
    return (
      <div className="w-full bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
        <span className="text-red-400">Váš účet je deaktivován.</span>
      </div>
    );
  }

  return null;
}
