"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, Search, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SEGMENT_CONFIG } from "@/lib/scoring";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  segment: string;
  score: number;
  user_id: string | null;
  created_at: string;
}

const SEGMENT_PILLS: Record<string, { bg: string; text: string }> = {
  vip: { bg: "bg-amber-50", text: "text-amber-600" },
  active: { bg: "bg-green-50", text: "text-green-600" },
  standard: { bg: "bg-blue-50", text: "text-blue-600" },
  sleeping: { bg: "bg-gray-50", text: "text-gray-500" },
  new: { bg: "bg-violet-50", text: "text-violet-600" },
};

const FILTER_SEGMENTS = [
  { key: "all", label: "Všichni" },
  { key: "vip", label: "VIP" },
  { key: "active", label: "Aktivní" },
  { key: "standard", label: "Standardní" },
  { key: "sleeping", label: "Spící" },
  { key: "new", label: "Nový" },
];

export default function ClientsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function fetchClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email, phone, segment, score, user_id, created_at")
      .order("last_name");
    setClients(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchClients(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = clients.filter((c) => {
    const matchesSearch = !search || `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesSegment = segmentFilter === "all" || c.segment === segmentFilter;
    return matchesSearch && matchesSegment;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: advisor } = await supabase.from("advisors").select("id").single();
    if (!advisor) { setSaving(false); return; }

    await supabase.from("clients").insert({
      advisor_id: advisor.id,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
    });

    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setSaving(false);
    setDialogOpen(false);
    toast.success("Klient vytvořen.");
    fetchClients();
  }

  if (loading) {
    return (
      <div className="bg-[var(--color-background)] min-h-full p-6 md:p-8">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-24" />
        <Skeleton className="mt-6 h-10 w-full rounded-full" />
        <Skeleton className="mt-4 h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-background)] min-h-full p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--card-text)]">Klienti</h1>
          <p className="mt-0.5 text-sm text-[var(--card-text-dim)]">
            {filtered.length} {filtered.length === 1 ? "klient" : "klientů"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--card-text-dim)]" />
            <input
              placeholder="Hledat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-full border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-10 pr-4 text-sm text-[var(--input-text)] shadow-sm outline-none transition placeholder:text-[var(--input-placeholder)] focus:border-[var(--card-border)] focus:ring-2 focus:ring-[var(--card-border)]"
            />
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nový klient
          </button>
        </div>
      </div>

      {/* Segment filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {FILTER_SEGMENTS.map((seg) => (
          <button
            key={seg.key}
            onClick={() => setSegmentFilter(seg.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              segmentFilter === seg.key
                ? "bg-black text-white shadow-sm"
                : "bg-[var(--card-bg)] text-[var(--card-text-muted)] border border-[var(--card-border)] hover:border-[var(--card-border)]"
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20">
          <Users className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádní klienti</p>
          <p className="text-sm text-[var(--card-text-dim)] mt-1">Vytvořte prvního klienta</p>
        </div>
      ) : (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--table-hover)]/50 border-b border-[var(--card-border)]">
                <th className="px-6 py-3 text-left text-xs text-[var(--card-text-dim)] uppercase tracking-wide font-medium">Jméno</th>
                <th className="px-6 py-3 text-left text-xs text-[var(--card-text-dim)] uppercase tracking-wide font-medium">Email</th>
                <th className="px-6 py-3 text-left text-xs text-[var(--card-text-dim)] uppercase tracking-wide font-medium hidden md:table-cell">Telefon</th>
                <th className="px-6 py-3 text-left text-xs text-[var(--card-text-dim)] uppercase tracking-wide font-medium">Segment</th>
                <th className="px-6 py-3 text-left text-xs text-[var(--card-text-dim)] uppercase tracking-wide font-medium hidden lg:table-cell">Portál</th>
                <th className="px-6 py-3 text-left text-xs text-[var(--card-text-dim)] uppercase tracking-wide font-medium hidden lg:table-cell">Skóre</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const seg = SEGMENT_CONFIG[c.segment] || SEGMENT_CONFIG.new;
                const pill = SEGMENT_PILLS[c.segment] || SEGMENT_PILLS.new;
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/advisor/clients/${c.id}`)}
                    className="cursor-pointer border-b border-[var(--table-hover)] last:border-0 transition-colors hover:bg-[var(--table-hover)]/50"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-medium">
                          {c.first_name[0]}{c.last_name[0]}
                        </div>
                        <span className="text-sm font-medium text-[var(--card-text)]">{c.first_name} {c.last_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-[var(--card-text-muted)]">{c.email || "—"}</span>
                    </td>
                    <td className="px-6 py-3.5 hidden md:table-cell">
                      <span className="text-sm text-[var(--card-text-muted)]">{c.phone || "—"}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pill.bg} ${pill.text}`}>
                        {seg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 hidden lg:table-cell">
                      {c.user_id ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-xs text-green-600">Aktivní</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-[var(--card-text-dim)]" />
                          <span className="text-xs text-[var(--card-text-dim)]">Neaktivní</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-10 rounded-full bg-[var(--table-header)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all"
                            style={{ width: `${c.score}%` }}
                          />
                        </div>
                        <span className="text-xs text-[var(--card-text-dim)] tabular-nums">{c.score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New client dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nový klient</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Jméno *</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
              <div className="space-y-1"><Label className="text-xs">Příjmení *</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Telefon</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="rounded-full bg-[var(--color-primary)] text-white hover:opacity-90">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Vytvořit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
