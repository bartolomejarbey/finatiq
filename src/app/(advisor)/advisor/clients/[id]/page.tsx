"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Save, Loader2, FileText, CreditCard, TrendingUp, Target, Handshake, User, Brain, Sparkles, Calculator, MessageSquare, Send, UserPlus, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { SEGMENT_CONFIG } from "@/lib/scoring";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  is_osvc: boolean;
  user_id: string | null;
  notes: string | null;
  segment: string;
  score: number;
  created_at: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("overview");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [contracts, setContracts] = useState<{ id: string; title: string; status: string; valid_to: string | null }[]>([]);
  const [payments, setPayments] = useState<{ id: string; amount: number; status: string; due_date: string | null }[]>([]);
  const [investments, setInvestments] = useState<{ id: string; instrument_name: string; current_value: number; type: string }[]>([]);
  const [goals, setGoals] = useState<{ id: string; title: string; target_amount: number; current_amount: number }[]>([]);
  const [deals, setDeals] = useState<{ id: string; title: string; value: number | null; stage_name: string }[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [upsellAlerts, setUpsellAlerts] = useState<{ id: string; title: string; description: string | null }[]>([]);
  const [osvcRecords, setOsvcRecords] = useState<{ id: string; type: string; amount: number; date: string; description: string | null; vendor: string | null }[]>([]);
  const [chatMessages, setChatMessages] = useState<{ id: string; direction: string; message_text: string; platform: string; created_at: string }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<{ email: string; password: string } | null>(null);

  const fetchData = useCallback(async () => {
    const { data: c } = await supabase.from("clients").select("*").eq("id", clientId).single();
    if (c) {
      setClient(c);
      setFirstName(c.first_name);
      setLastName(c.last_name);
      setEmail(c.email || "");
      setPhone(c.phone || "");
    }

    const [contractsRes, paymentsRes, investmentsRes, goalsRes, dealsRes, stagesRes] = await Promise.all([
      supabase.from("contracts").select("id, title, status, valid_to").eq("client_id", clientId),
      supabase.from("payments").select("id, amount, status, due_date").eq("client_id", clientId),
      supabase.from("investments").select("id, instrument_name, current_value, type").eq("client_id", clientId),
      supabase.from("financial_goals").select("id, title, target_amount, current_amount").eq("client_id", clientId),
      supabase.from("deals").select("id, title, value, stage_id").eq("client_id", clientId),
      supabase.from("pipeline_stages").select("id, name"),
    ]);

    setContracts(contractsRes.data || []);
    setPayments(paymentsRes.data || []);
    setInvestments(investmentsRes.data || []);
    setGoals(goalsRes.data || []);

    const stageMap: Record<string, string> = {};
    (stagesRes.data || []).forEach((s) => { stageMap[s.id] = s.name; });
    setDeals((dealsRes.data || []).map((d) => ({ ...d, stage_name: stageMap[d.stage_id] || "—" })));

    // Fetch upsell alerts for this client
    const { data: alerts } = await supabase
      .from("upsell_alerts")
      .select("id, title, description")
      .eq("client_id", clientId)
      .in("status", ["new", "viewed"])
      .limit(5);
    setUpsellAlerts(alerts || []);

    // Fetch messages
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, direction, message_text, platform, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    setChatMessages(msgs || []);

    // Fetch OSVČ records if client is OSVČ
    if (c?.is_osvc) {
      const { data: osvc } = await supabase
        .from("osvc_records")
        .select("id, type, amount, date, description, vendor")
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(50);
      setOsvcRecords(osvc || []);
    }

    setLoading(false);
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave() {
    setSaving(true);
    await supabase.from("clients").update({ first_name: firstName, last_name: lastName, email: email || null, phone: phone || null }).eq("id", clientId);
    setSaving(false);
    toast.success("Klient uložen.");
  }

  async function handleInvite() {
    if (!invitePassword || invitePassword.length < 6) {
      toast.error("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    setInviting(true);
    try {
      const res = await fetch("/api/clients/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, password: invitePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setClient((prev) => prev ? { ...prev, user_id: "created" } : prev);
        setInviteSuccess({ email: data.email, password: invitePassword });
        setInvitePassword("");
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Nepodařilo se vytvořit přístup.");
    }
    setInviting(false);
  }

  function handleCopyCredentials() {
    if (!inviteSuccess) return;
    const loginUrl = `${window.location.origin}/portal/login`;
    const text = `Přihlášení do klientského portálu:\n\nAdresa: ${loginUrl}\nEmail: ${inviteSuccess.email}\nHeslo: ${inviteSuccess.password}`;
    navigator.clipboard.writeText(text);
    toast.success("Přihlašovací údaje zkopírovány do schránky.");
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    setSendingMessage(true);
    const platform = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].platform : "email";
    const res = await fetch("/api/messaging/outgoing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, message_text: newMessage, platform }),
    });
    if (res.ok) {
      const data = await res.json();
      setChatMessages((prev) => [...prev, { id: data.message_id, direction: "outgoing", message_text: newMessage, platform, created_at: new Date().toISOString() }]);
      setNewMessage("");
      toast.success("Zpráva odeslána.");
    } else {
      toast.error("Nepodařilo se odeslat zprávu.");
    }
    setSendingMessage(false);
  }

  async function generateAiSummary() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "client_summary",
          context: {
            name: `${client?.first_name} ${client?.last_name}`,
            segment: client?.segment,
            portfolioValue: investments.reduce((s, i) => s + i.current_value, 0),
            activeContracts: contracts.filter((c) => c.status === "active").length,
            pendingPayments: payments.filter((p) => p.status === "pending").length,
          },
        }),
      });
      const data = await res.json();
      setAiSummary(data.text || "");
    } catch {
      setAiSummary("Nepodařilo se vygenerovat shrnutí.");
    }
    setAiLoading(false);
  }

  if (loading) return <div className="p-8"><Skeleton className="mb-4 h-8 w-64" /><Skeleton className="h-64 rounded-xl" /></div>;
  if (!client) return <div className="p-8"><p className="text-[var(--card-text-muted)]">Klient nenalezen.</p></div>;

  const seg = SEGMENT_CONFIG[client.segment] || SEGMENT_CONFIG.new;
  const portfolioValue = investments.reduce((s, i) => s + i.current_value, 0);
  const activeContracts = contracts.filter((c) => c.status === "active").length;
  const pendingPayments = payments.filter((p) => p.status === "pending").length;

  const tabs = [
    { key: "overview", label: "Přehled", icon: User },
    { key: "contracts", label: "Smlouvy", icon: FileText, count: contracts.length },
    { key: "payments", label: "Platby", icon: CreditCard, count: payments.length },
    { key: "investments", label: "Investice", icon: TrendingUp, count: investments.length },
    { key: "goals", label: "Cíle", icon: Target, count: goals.length },
    { key: "deals", label: "Dealy", icon: Handshake, count: deals.length },
    ...(chatMessages.length > 0 ? [{ key: "messages", label: "Zprávy", icon: MessageSquare, count: chatMessages.length }] : []),
    ...(client.is_osvc ? [{ key: "osvc", label: "Evidence OSVČ", icon: Calculator, count: osvcRecords.length }] : []),
  ];

  return (
    <div className="">
      <button onClick={() => router.push("/advisor/clients")} className="mb-4 flex items-center gap-1.5 text-sm text-[var(--card-text-muted)] hover:text-[var(--card-text)]">
        <ArrowLeft className="h-4 w-4" />Zpět na klienty
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-600">
            {client.first_name[0]}{client.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold gradient-text">{client.first_name} {client.last_name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${seg.bg} ${seg.color}`}>{seg.label}</span>
              <span className="text-sm text-[var(--card-text-muted)]">Skóre: {client.score}/100</span>
            </div>
            <p className="mt-0.5 text-sm text-[var(--card-text-muted)]">{client.email} {client.phone && `· ${client.phone}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {client.user_id ? (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="mr-1 h-3 w-3" />Má portál</Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />Pozvat do portálu
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Uložit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--card-text-dim)] hover:text-[var(--card-text-muted)]"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-[var(--table-hover)] px-1.5 py-0.5 text-[10px]">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">Kontaktní údaje</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Jméno</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Příjmení</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Telefon</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            </div>
          </div>
          <div className="space-y-4">
            <SummaryCard label="Hodnota portfolia" value={formatCZK(portfolioValue)} />
            <SummaryCard label="Aktivní smlouvy" value={String(activeContracts)} />
            <SummaryCard label="Čekající platby" value={String(pendingPayments)} />
            <SummaryCard label="Aktivní dealy" value={String(deals.length)} />
          </div>
        </div>
      )}

      {tab === "overview" && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* AI Summary */}
          <div className="col-span-1 md:col-span-2 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">AI shrnutí</h2>
              </div>
              <button
                onClick={generateAiSummary}
                disabled={aiLoading}
                className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-100 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {aiSummary ? "Obnovit" : "Vygenerovat"}
              </button>
            </div>
            {aiSummary ? (
              <p className="text-sm leading-relaxed text-[var(--card-text)]">{aiSummary}</p>
            ) : (
              <p className="text-sm text-[var(--card-text-muted)]">Klikněte na &quot;Vygenerovat&quot; pro AI analýzu klienta.</p>
            )}
          </div>

          {/* Upsell recommendations */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">AI doporučení</h2>
            </div>
            {upsellAlerts.length === 0 ? (
              <p className="text-sm text-[var(--card-text-muted)]">Žádná doporučení</p>
            ) : (
              <div className="space-y-2">
                {upsellAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xs font-medium text-amber-800">{alert.title}</p>
                    {alert.description && <p className="mt-0.5 text-xs text-amber-600">{alert.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "contracts" && <SimpleTable headers={["Název", "Stav", "Platnost do"]} rows={contracts.map((c) => [c.title, c.status, c.valid_to ? new Date(c.valid_to).toLocaleDateString("cs-CZ") : "—"])} empty="Žádné smlouvy" />}
      {tab === "payments" && <SimpleTable headers={["Částka", "Stav", "Splatnost"]} rows={payments.map((p) => [formatCZK(p.amount), p.status, p.due_date ? new Date(p.due_date).toLocaleDateString("cs-CZ") : "—"])} empty="Žádné platby" />}
      {tab === "investments" && <SimpleTable headers={["Instrument", "Typ", "Hodnota"]} rows={investments.map((i) => [i.instrument_name, i.type, formatCZK(i.current_value)])} empty="Žádné investice" />}
      {tab === "goals" && <SimpleTable headers={["Cíl", "Cílová částka", "Aktuální"]} rows={goals.map((g) => [g.title, formatCZK(g.target_amount), formatCZK(g.current_amount)])} empty="Žádné cíle" />}
      {tab === "deals" && <SimpleTable headers={["Deal", "Hodnota", "Fáze"]} rows={deals.map((d) => [d.title, formatCZK(d.value), d.stage_name])} empty="Žádné dealy" />}

      {tab === "messages" && (
        <div className="rounded-xl border bg-[var(--card-bg)] shadow-sm">
          <div className="flex h-[400px] flex-col">
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${msg.direction === "outgoing" ? "bg-blue-600 text-white" : "bg-[var(--table-hover)] text-[var(--card-text)]"}`}>
                    <p className="text-sm">{msg.message_text}</p>
                    <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${msg.direction === "outgoing" ? "text-blue-200" : "text-[var(--card-text-dim)]"}`}>
                      <Badge variant="secondary" className="h-4 px-1 text-[9px]">{msg.platform}</Badge>
                      {new Date(msg.created_at).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-3 flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Napište odpověď..."
                onKeyDown={(e) => { if (e.key === "Enter" && newMessage.trim()) handleSendMessage(); }}
              />
              <Button size="sm" onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === "osvc" && (
        <div>
          {/* OSVČ summary */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard label="Příjmy celkem" value={formatCZK(osvcRecords.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0))} />
            <SummaryCard label="Výdaje celkem" value={formatCZK(osvcRecords.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0))} />
            <SummaryCard label="Bilance" value={formatCZK(osvcRecords.reduce((s, r) => s + (r.type === "income" ? r.amount : -r.amount), 0))} />
          </div>
          <SimpleTable
            headers={["Datum", "Typ", "Popis", "Dodavatel", "Částka"]}
            rows={osvcRecords.map((r) => [
              new Date(r.date).toLocaleDateString("cs-CZ"),
              r.type === "income" ? "Příjem" : "Výdaj",
              r.description || "—",
              r.vendor || "—",
              (r.type === "expense" ? "- " : "+ ") + formatCZK(r.amount),
            ])}
            empty="Žádné záznamy OSVČ"
          />
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) setInviteSuccess(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{inviteSuccess ? "Přístup vytvořen" : "Pozvat klienta do portálu"}</DialogTitle>
          </DialogHeader>

          {inviteSuccess ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-800 mb-3">Klient se může přihlásit:</p>
                <div className="space-y-2 text-sm text-emerald-700">
                  <div><span className="text-emerald-600">Adresa:</span> <code className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs">{typeof window !== "undefined" ? window.location.origin : ""}/portal/login</code></div>
                  <div><span className="text-emerald-600">Email:</span> <strong>{inviteSuccess.email}</strong></div>
                  <div><span className="text-emerald-600">Heslo:</span> <strong>{inviteSuccess.password}</strong></div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setInviteOpen(false); setInviteSuccess(null); }}>Zavřít</Button>
                <Button onClick={handleCopyCredentials}>Kopírovat přihlašovací údaje</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <p className="text-sm text-[var(--card-text-muted)]">
                  Vytvořte přihlašovací údaje pro klienta <strong>{client.first_name} {client.last_name}</strong>.
                </p>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={client.email || ""} disabled className="bg-[var(--table-hover)]" />
                </div>
                {!client.email && (
                  <p className="text-sm text-red-500">Klient nemá nastavený email. Nejprve vyplňte email v kontaktních údajích.</p>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Heslo pro klienta</Label>
                  <Input
                    type="password"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Min. 6 znaků"
                    disabled={!client.email}
                  />
                </div>
                <p className="text-xs text-[var(--card-text-muted)]">
                  Klient se bude přihlašovat na: <code className="rounded bg-[var(--table-hover)] px-1 py-0.5">/portal/login</code>
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleInvite} disabled={inviting || !client.email || invitePassword.length < 6}>
                  {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Vytvořit přístup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatCZK(v: number | null) {
  if (v == null) return "—";
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-l-4 border-l-blue-500 bg-[var(--card-bg)] p-4 shadow-sm hover:shadow-md transition-all">
      <p className="text-xs text-[var(--card-text-muted)]">{label}</p>
      <p className="text-lg font-bold text-[var(--card-text)]">{value}</p>
    </div>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <div className="flex flex-col items-center py-16"><p className="text-lg font-medium text-[var(--card-text-dim)]">{empty}</p></div>;
  return (
    <div className="rounded-xl border bg-[var(--card-bg)] shadow-sm">
      <table className="w-full">
        <thead><tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-[var(--card-text)]">{headers.map((h) => <th key={h} className="px-6 py-3">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-b last:border-0 hover:bg-[var(--table-hover)] even:bg-[var(--table-header)]">{row.map((cell, j) => <td key={j} className="px-6 py-3 text-sm text-[var(--card-text)]">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
