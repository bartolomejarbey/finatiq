"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterButton, FilterGroup } from "@/components/ui/filter-group";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, CheckCircle2, Clock, AlertTriangle, Wallet } from "lucide-react";

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  contract_id: string | null;
  contract_title: string;
}

export default function PaymentsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: client } = await supabase.from("clients").select("id").eq("user_id", user.id).single();
      if (!client) { setLoading(false); return; }

      const [paymentsRes, contractsRes] = await Promise.all([
        supabase.from("payments").select("*").eq("client_id", client.id).order("due_date", { ascending: false }),
        supabase.from("contracts").select("id, title").eq("client_id", client.id),
      ]);

      const contractMap: Record<string, string> = {};
      (contractsRes.data || []).forEach((c) => { contractMap[c.id] = c.title; });

      setPayments(
        (paymentsRes.data || []).map((p) => ({
          ...p,
          contract_title: p.contract_id ? contractMap[p.contract_id] || "—" : "—",
        }))
      );
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const filtered = payments.filter((p) => {
    if (filter === "all") return true;
    if (filter === "pending") return p.status === "pending";
    if (filter === "paid") return p.status === "paid";
    if (filter === "overdue") return p.status === "pending" && p.due_date && new Date(p.due_date) < now;
    return true;
  });

  function getStatusInfo(p: Payment) {
    if (p.status === "paid") return { icon: CheckCircle2, label: "Uhrazeno", bg: "bg-emerald-100", text: "text-emerald-600" };
    if (p.due_date && new Date(p.due_date) < now) return { icon: AlertTriangle, label: "Po splatnosti", bg: "bg-red-100", text: "text-red-600" };
    return { icon: Clock, label: "Čeká", bg: "bg-amber-100", text: "text-amber-600" };
  }

  if (loading) return (
    <div className="p-4 md:p-8 space-y-4">
      <Skeleton className="h-8 w-48" />
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-6 text-2xl font-bold text-[var(--card-text)]">Platby</h1>

      <FilterGroup value={filter} onChange={setFilter} className="mb-4">
        {[
          { key: "all", label: "Vše" },
          { key: "pending", label: "Čekající" },
          { key: "paid", label: "Uhrazené" },
          { key: "overdue", label: "Po splatnosti" },
        ].map((f) => (
          <FilterButton
            key={f.key}
            value={f.key}
          >
            {f.label}
          </FilterButton>
        ))}
      </FilterGroup>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-12 w-12" />}
          title="Žádné platby"
          description="Platby se zobrazí automaticky po přidání smlouvy."
          action={
            <Button asChild>
              <Link href="/portal/contracts">Přidat smlouvu</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const status = getStatusInfo(p);
            const StatusIcon = status.icon;
            return (
              <div key={p.id} className="flex items-center gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 hover:shadow-sm transition-shadow">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${status.bg}`}>
                  <StatusIcon className={`h-5 w-5 ${status.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--card-text)]">{p.contract_title}</p>
                  <p className="text-xs text-[var(--card-text-muted)]">
                    {p.due_date ? `Splatnost: ${new Date(p.due_date).toLocaleDateString("cs-CZ")}` : "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--card-text)]">{formatCZK(p.amount)}</p>
                  <span className={`text-[10px] font-medium ${status.text}`}>{status.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
