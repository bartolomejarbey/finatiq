"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Eye } from "lucide-react";

interface ClientContract {
  id: string;
  title: string;
  type: string;
  status: string;
  processing_status: string;
  client_uploaded: boolean;
  created_at: string;
  client_name: string;
  client_id: string;
}

function formatCZK(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function ClientContractsQueue() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [filter, setFilter] = useState("new");
  const [docs, setDocs] = useState<Record<string, { id: string; name: string; file_path: string }[]>>({});

  useEffect(() => {
    async function fetchData() {
      const [contractsRes, clientsRes, docsRes] = await Promise.all([
        supabase.from("contracts").select("id, title, type, status, processing_status, client_uploaded, created_at, client_id").eq("client_uploaded", true).order("created_at", { ascending: false }),
        supabase.from("clients").select("id, first_name, last_name"),
        supabase.from("client_documents").select("id, name, file_path, client_id").eq("category", "contract"),
      ]);

      const clientMap: Record<string, string> = {};
      (clientsRes.data || []).forEach((c) => { clientMap[c.id] = `${c.first_name} ${c.last_name}`; });

      const docMap: Record<string, { id: string; name: string; file_path: string }[]> = {};
      (docsRes.data || []).forEach((d) => {
        if (!docMap[d.client_id]) docMap[d.client_id] = [];
        docMap[d.client_id].push(d);
      });
      setDocs(docMap);

      setContracts(
        (contractsRes.data || []).map((c) => ({
          ...c,
          client_name: clientMap[c.client_id] || "—",
          processing_status: c.processing_status || "new",
        }))
      );
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from("contracts").update({ processing_status: newStatus }).eq("id", id);
    setContracts((prev) => prev.map((c) => c.id === id ? { ...c, processing_status: newStatus } : c));
  }

  const filtered = filter === "all" ? contracts : contracts.filter((c) => c.processing_status === filter);

  const statusBadge = (s: string) => {
    switch (s) {
      case "new": return <Badge className="bg-blue-100 text-blue-700 text-[10px]">Nové</Badge>;
      case "in_progress": return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Rozpracované</Badge>;
      case "resolved": return <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Vyřešené</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{s}</Badge>;
    }
  };

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Smlouvy od klientů</h1>
          <p className="mt-0.5 text-sm text-slate-500">{contracts.filter((c) => c.processing_status === "new").length} nových</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {[
          { key: "all", label: "Vše" },
          { key: "new", label: "Nové" },
          { key: "in_progress", label: "Rozpracované" },
          { key: "resolved", label: "Vyřešené" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${filter === f.key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <FileText className="mb-4 h-12 w-12 text-slate-200" />
          <p className="text-lg font-medium text-slate-400">Žádné smlouvy</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-[var(--card-bg)] shadow-sm">
          <table className="w-full">
            <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-slate-700"><th className="px-6 py-3">Klient</th><th className="px-6 py-3">Smlouva</th><th className="px-6 py-3">Typ</th><th className="px-6 py-3">Datum</th><th className="px-6 py-3">Dokument</th><th className="px-6 py-3">Stav</th></tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{c.client_name}</td>
                  <td className="px-6 py-3 text-sm text-slate-700">{c.title}</td>
                  <td className="px-6 py-3"><Badge variant="secondary" className="text-[10px]">{c.type === "uver" ? "Úvěr" : c.type === "pojisteni" ? "Pojištění" : c.type}</Badge></td>
                  <td className="px-6 py-3 text-sm text-slate-500">{new Date(c.created_at).toLocaleDateString("cs-CZ")}</td>
                  <td className="px-6 py-3">
                    {(docs[c.client_id] || []).length > 0 ? (
                      <Button size="sm" variant="outline" className="text-xs" onClick={async () => {
                        const d = docs[c.client_id][0];
                        const { data } = await supabase.storage.from("deal-documents").createSignedUrl(d.file_path, 3600);
                        if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                      }}>
                        <Download className="mr-1 h-3 w-3" />Stáhnout
                      </Button>
                    ) : <span className="text-xs text-slate-500">—</span>}
                  </td>
                  <td className="px-6 py-3">
                    <Select value={c.processing_status} onValueChange={(v) => updateStatus(c.id, v)}>
                      <SelectTrigger className="h-7 w-32 text-xs">{statusBadge(c.processing_status)}</SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Nové</SelectItem>
                        <SelectItem value="in_progress">Rozpracované</SelectItem>
                        <SelectItem value="resolved">Vyřešené</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
