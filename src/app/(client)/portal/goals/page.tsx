"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AddGoalModal } from "@/components/portal/AddGoalModal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, CheckCircle2, AlertTriangle, XCircle, Home, Palmtree, Car, Plus } from "lucide-react";

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  notes: string | null;
}

const GOAL_ICONS: Record<string, { icon: typeof Target; from: string; to: string }> = {
  default: { icon: Target, from: "from-violet-500", to: "to-purple-600" },
};

function getGoalIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("byt") || t.includes("dům") || t.includes("dom")) return { icon: Home, from: "from-blue-500", to: "to-blue-600" };
  if (t.includes("dovolená") || t.includes("cestov")) return { icon: Palmtree, from: "from-emerald-500", to: "to-teal-600" };
  if (t.includes("auto") || t.includes("vůz")) return { icon: Car, from: "from-orange-500", to: "to-amber-600" };
  return GOAL_ICONS.default;
}

export default function GoalsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [clientId, setClientId] = useState("");
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  async function fetchData() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const meRes = await fetch("/api/portal/me");
      if (!meRes.ok) { setError("Nepodařilo se načíst klientský profil."); setLoading(false); return; }
      const client = (await meRes.json()).client;
      if (!client) { setLoading(false); return; }
      setClientId(client.id);
      setAdvisorId(client.advisor_id);

      const { data, error: goalsError } = await supabase.from("financial_goals").select("*").eq("client_id", client.id).order("created_at");
      if (goalsError) {
        setError("Nepodařilo se načíst finanční cíle.");
        setLoading(false);
        return;
      }
      setGoals(data || []);
      setLoading(false);
    }
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="p-4 md:p-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
    </div>
  );
  if (error) return <div className="p-4 md:p-8"><ErrorState description={error} onRetry={fetchData} /></div>;

  const onTrack = goals.filter((g) => (g.current_amount / g.target_amount) >= 0.5).length;

  function getStatus(g: Goal): { label: string; color: string; bg: string; icon: typeof CheckCircle2 } {
    const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
    if (pct >= 75) return { label: "Na dobré cestě", color: "text-emerald-700", bg: "bg-emerald-50", icon: CheckCircle2 };
    if (pct >= 40) return { label: "Zaostává", color: "text-amber-700", bg: "bg-amber-50", icon: AlertTriangle };
    return { label: "Ohroženo", color: "text-red-700", bg: "bg-red-50", icon: XCircle };
  }

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      <h1 className="mb-2 text-2xl font-bold text-[var(--card-text)]">Finanční plán</h1>
      <p className="mb-6 text-sm text-[var(--card-text-muted)]">
        {goals.length > 0 ? `${onTrack} z ${goals.length} cílů na dobré cestě` : "Žádné cíle"}
      </p>

      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="h-12 w-12" />}
          title="Žádné finanční cíle"
          description="Přidejte první finanční cíl a sledujte průběžné plnění."
          action={
            <Button onClick={() => setAddOpen(true)} disabled={!clientId}>
              <Plus className="mr-2 h-4 w-4" />
              Přidat cíl
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;
            const status = getStatus(g);
            const StatusIcon = status.icon;
            const goalIcon = getGoalIcon(g.title);
            const GoalIcon = goalIcon.icon;
            const remaining = Math.max(0, g.target_amount - g.current_amount);
            return (
              <div key={g.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 hover:shadow-md transition-shadow">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${goalIcon.from} ${goalIcon.to} text-white shrink-0`}>
                      <GoalIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--card-text)]">{g.title}</h3>
                      <p className="text-xs text-[var(--card-text-muted)]">Cíl: {formatCZK(g.target_amount)}</p>
                      {g.deadline && <p className="text-xs text-[var(--card-text-dim)]">Termín: {new Date(g.deadline).toLocaleDateString("cs-CZ")}</p>}
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-[var(--table-header)]">
                  <div
                    className={`h-3 rounded-full transition-all ${pct >= 75 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : pct >= 40 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-red-400 to-red-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-[var(--card-text-muted)]">{pct}% splněno</span>
                  <span className="font-medium text-[var(--card-text)]">Zbývá {formatCZK(remaining)}</span>
                </div>
                {g.notes && (
                  <div className="mt-3 rounded-xl bg-[var(--table-hover)] p-3">
                    <p className="text-xs text-[var(--card-text-muted)]"><span className="font-medium">Doporučení poradce:</span> {g.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {clientId && (
        <AddGoalModal
          open={addOpen}
          onOpenChange={setAddOpen}
          clientId={clientId}
          advisorId={advisorId}
          onAdded={fetchData}
        />
      )}
    </div>
  );
}
