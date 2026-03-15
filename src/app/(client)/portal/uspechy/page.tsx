"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  CheckCircle2,
  Award,
  Trophy,
} from "lucide-react";
import MilestoneCelebration from "@/components/milestone-celebration";

interface Milestone {
  id: string;
  title: string;
  description: string;
  type: string;
  achieved_at: string;
  seen_by_client: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  first_contract: FileText,
  months_6: Calendar,
  year_1: Calendar,
  years_2: Calendar,
  years_5: Calendar,
  all_payments_on_time: CheckCircle2,
};

function getIcon(type: string) {
  return typeIcons[type] || Award;
}

export default function MilestonesPage() {
  const supabase = createClient();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebrateMilestone, setCelebrateMilestone] =
    useState<Milestone | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: client } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!client) return;

      const res = await fetch(
        `/api/client/milestones?client_id=${client.id}`
      );
      const json = await res.json();
      const items: Milestone[] = json.milestones || [];
      setMilestones(items);

      // Show celebration for first unseen milestone
      const unseen = items.find((m) => !m.seen_by_client);
      if (unseen) {
        setCelebrateMilestone(unseen);
      }

      // Mark all as seen
      const unseenIds = items
        .filter((m) => !m.seen_by_client)
        .map((m) => m.id);
      if (unseenIds.length > 0) {
        await supabase
          .from("milestones")
          .update({ seen_by_client: true })
          .in("id", unseenIds);
      }

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="h-6 w-6 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-[var(--card-text)]">Vaše úspěchy</h1>
          <p className="text-sm text-[var(--card-text-muted)]">
            {milestones.length} dosažených milníků
          </p>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Award className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">
            Zatím žádné úspěchy
          </p>
          <p className="text-sm text-[var(--card-text-dim)]">
            Vaše milníky se zde brzy objeví
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {milestones.map((m) => {
            const Icon = getIcon(m.type);
            const isUnseen = !m.seen_by_client;
            return (
              <div
                key={m.id}
                className={`rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm transition-all ${
                  isUnseen
                    ? "border-amber-400 ring-2 ring-amber-200"
                    : "border-[var(--card-border)]"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isUnseen ? "bg-amber-100" : "bg-[var(--table-header)]"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isUnseen ? "text-amber-500" : "text-[var(--card-text-muted)]"
                      }`}
                    />
                  </div>
                  {isUnseen && (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                      Nové
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-[var(--card-text)]">
                  {m.title}
                </h3>
                <p className="mt-1 text-xs text-[var(--card-text-muted)]">{m.description}</p>
                <p className="mt-3 text-[10px] text-[var(--card-text-dim)]">
                  {new Date(m.achieved_at).toLocaleDateString("cs-CZ")}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <MilestoneCelebration
        milestone={celebrateMilestone}
        onClose={() => setCelebrateMilestone(null)}
      />
    </div>
  );
}
