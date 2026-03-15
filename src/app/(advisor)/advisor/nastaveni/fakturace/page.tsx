"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoice_number: string;
  period: string;
  amount: number;
  total_with_vat: number;
  vat_applied: boolean;
  vat_amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
}

interface BillingInfo {
  billing_name: string;
  billing_ico: string;
  billing_dic: string;
  billing_address: string;
}

export default function AdvisorFakturacePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [billing, setBilling] = useState<BillingInfo>({
    billing_name: "",
    billing_ico: "",
    billing_dic: "",
    billing_address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: advisor } = await supabase
        .from("advisors")
        .select("id, billing_name, billing_ico, billing_dic, billing_address")
        .eq("user_id", user.id)
        .single();

      if (!advisor) return;
      setBilling({
        billing_name: advisor.billing_name || "",
        billing_ico: advisor.billing_ico || "",
        billing_dic: advisor.billing_dic || "",
        billing_address: advisor.billing_address || "",
      });

      const { data: inv } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, period, amount, total_with_vat, vat_applied, vat_amount, status, due_date, paid_at"
        )
        .eq("advisor_id", advisor.id)
        .order("created_at", { ascending: false });

      setInvoices(inv || []);
      setLoading(false);
    })();
  }, [supabase]);

  const saveBilling = async () => {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("advisors")
      .update(billing)
      .eq("user_id", user.id);
    if (error) toast.error("Chyba při ukládání");
    else toast.success("Fakturační údaje uloženy");
    setSaving(false);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      issued: "bg-blue-100 text-blue-700",
      paid: "bg-green-100 text-green-700",
      overdue: "bg-red-100 text-red-700",
      pending: "bg-amber-100 text-amber-700",
    };
    const labels: Record<string, string> = {
      issued: "Vystavena",
      paid: "Zaplacena",
      overdue: "Po splatnosti",
      pending: "Čeká na platbu",
    };
    return <Badge className={map[s] || "bg-gray-100"}>{labels[s] || s}</Badge>;
  };

  if (loading)
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-[var(--card-text)]">Fakturace</h1>

      {/* Billing info */}
      <div className="border border-[var(--card-border)] bg-[var(--card-bg)] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--card-text)]">Fakturační údaje</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Název firmy / Jméno</Label>
            <Input
              value={billing.billing_name}
              onChange={(e) =>
                setBilling({ ...billing, billing_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>IČO</Label>
            <Input
              value={billing.billing_ico}
              onChange={(e) =>
                setBilling({ ...billing, billing_ico: e.target.value })
              }
            />
          </div>
          <div>
            <Label>DIČ</Label>
            <Input
              value={billing.billing_dic}
              onChange={(e) =>
                setBilling({ ...billing, billing_dic: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Adresa</Label>
            <Input
              value={billing.billing_address}
              onChange={(e) =>
                setBilling({ ...billing, billing_address: e.target.value })
              }
            />
          </div>
        </div>
        <Button onClick={saveBilling} disabled={saving}>
          {saving ? "Ukládám..." : "Uložit"}
        </Button>
      </div>

      {/* Invoice list */}
      <div className="border border-[var(--card-border)] bg-[var(--card-bg)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--table-hover)] border-b border-[var(--card-border)]">
            <tr>
              <th className="text-left p-3 font-medium">Číslo</th>
              <th className="text-left p-3 font-medium">Období</th>
              <th className="text-left p-3 font-medium">Částka</th>
              <th className="text-left p-3 font-medium">Stav</th>
              <th className="text-left p-3 font-medium">Splatnost</th>
              <th className="text-left p-3 font-medium">PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-[var(--card-border)] hover:bg-[var(--table-hover)]">
                <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                <td className="p-3">{inv.period}</td>
                <td className="p-3">
                  {(inv.total_with_vat || inv.amount).toLocaleString("cs-CZ")} Kč
                </td>
                <td className="p-3">{statusBadge(inv.status)}</td>
                <td className="p-3">
                  {new Date(inv.due_date).toLocaleDateString("cs-CZ")}
                </td>
                <td className="p-3">
                  <a
                    href={`/api/advisor/invoice/${inv.id}/pdf`}
                    target="_blank"
                    rel="noopener"
                  >
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4 mr-1" /> PDF
                    </Button>
                  </a>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[var(--card-text-dim)]">
                  Zatím žádné faktury
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
