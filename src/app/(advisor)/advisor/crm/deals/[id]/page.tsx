"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Phone, Mail, Calendar, FileText, CheckSquare, MessageSquare,
  Loader2, Save, Copy, Check, User, Tag, Bell, Upload, Download, Trash2, Send,
} from "lucide-react";
import { toast } from "sonner";

interface Deal {
  id: string; title: string; contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; value: number | null; source: string; stage_id: string;
  client_id: string | null; lost_reason: string | null; converted_at: string | null;
  lost_at: string | null; created_at: string;
}
interface Stage { id: string; name: string; position: number; color: string; }
interface Activity { id: string; type: string; title: string; description: string | null; scheduled_at: string | null; completed_at: string | null; created_at: string; }
interface Client { id: string; first_name: string; last_name: string; }
interface DealTag { id: string; name: string; color: string; }
interface DocFile { id: string; original_filename: string; storage_path: string; file_type: string | null; created_at: string; }
interface EmailTemplate { id: string; name: string; subject: string; body: string; }

const ACTIVITY_CONFIG: Record<string, { label: string; icon: typeof Phone; color: string; bg: string }> = {
  call: { label: "Hovor", icon: Phone, color: "text-emerald-600", bg: "bg-emerald-50" },
  email: { label: "Email", icon: Mail, color: "text-blue-600", bg: "bg-blue-50" },
  meeting: { label: "Schůzka", icon: Calendar, color: "text-violet-600", bg: "bg-violet-50" },
  note: { label: "Poznámka", icon: FileText, color: "text-slate-600", bg: "bg-slate-100" },
  task: { label: "Úkol", icon: CheckSquare, color: "text-amber-600", bg: "bg-amber-50" },
};

function formatCZK(v: number | null) { if (v == null) return "—"; return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v); }
function formatDate(d: string) { return new Date(d).toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" }); }

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [allTags, setAllTags] = useState<DealTag[]>([]);
  const [dealTagIds, setDealTagIds] = useState<string[]>([]);
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Editable
  const [title, setTitle] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState("");
  const [clientId, setClientId] = useState("");

  // Activity form
  const [actType, setActType] = useState("note");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [actDate, setActDate] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);

  // Reminder dialog
  const [reminderOpen, setReminderOpen] = useState(false);
  const [remTitle, setRemTitle] = useState("");
  const [remDate, setRemDate] = useState("");
  const [remSaving, setRemSaving] = useState(false);

  // Email dialog
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [emailPreview, setEmailPreview] = useState("");

  // Upload
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    const [dealRes, stagesRes, activitiesRes, clientsRes, tagsRes, assignRes, docsRes, tmplRes] = await Promise.all([
      supabase.from("deals").select("*").eq("id", dealId).single(),
      supabase.from("pipeline_stages").select("*").order("position"),
      supabase.from("deal_activities").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
      supabase.from("clients").select("id, first_name, last_name").order("last_name"),
      supabase.from("deal_tags").select("*").order("name"),
      supabase.from("deal_tag_assignments").select("tag_id").eq("deal_id", dealId),
      supabase.from("documents").select("id, original_filename, storage_path, file_type, created_at").eq("contract_id", dealId).order("created_at", { ascending: false }),
      supabase.from("email_templates").select("id, name, subject, body").order("name"),
    ]);
    if (dealRes.data) {
      const d = dealRes.data;
      setDeal(d); setTitle(d.title); setContactName(d.contact_name || ""); setContactEmail(d.contact_email || "");
      setContactPhone(d.contact_phone || ""); setValue(d.value?.toString() || ""); setStageId(d.stage_id); setClientId(d.client_id || "");
    }
    if (stagesRes.data) setStages(stagesRes.data);
    if (activitiesRes.data) setActivities(activitiesRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (tagsRes.data) setAllTags(tagsRes.data);
    if (assignRes.data) setDealTagIds(assignRes.data.map((a) => a.tag_id));
    if (docsRes.data) setDocuments(docsRes.data);
    if (tmplRes.data) setTemplates(tmplRes.data);
    setLoading(false);
  }, [dealId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave() {
    setSaving(true);
    await supabase.from("deals").update({ title, contact_name: contactName || null, contact_email: contactEmail || null, contact_phone: contactPhone || null, value: value ? parseFloat(value) : 0, stage_id: stageId, client_id: clientId || null }).eq("id", dealId);
    setSaving(false);
    toast.success("Deal uložen.");
  }

  async function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!deal) return;
    setAddingActivity(true);
    const { data: advisor } = await supabase.from("advisors").select("id").single();
    if (!advisor) { setAddingActivity(false); return; }
    await supabase.from("deal_activities").insert({ deal_id: dealId, advisor_id: advisor.id, type: actType, title: actTitle, description: actDesc || null, scheduled_at: actDate ? new Date(actDate).toISOString() : null });
    setActTitle(""); setActDesc(""); setActDate("");
    setAddingActivity(false);
    toast.success("Aktivita přidána.");
    fetchData();
  }

  async function toggleTag(tagId: string) {
    if (dealTagIds.includes(tagId)) {
      await supabase.from("deal_tag_assignments").delete().eq("deal_id", dealId).eq("tag_id", tagId);
      setDealTagIds((prev) => prev.filter((t) => t !== tagId));
    } else {
      await supabase.from("deal_tag_assignments").insert({ deal_id: dealId, tag_id: tagId });
      setDealTagIds((prev) => [...prev, tagId]);
    }
    toast.success("Tagy aktualizovány.");
  }

  async function handleAddReminder(e: React.FormEvent) {
    e.preventDefault();
    setRemSaving(true);
    const { data: advisor } = await supabase.from("advisors").select("id").single();
    if (!advisor) { setRemSaving(false); return; }
    await supabase.from("reminders").insert({ advisor_id: advisor.id, deal_id: dealId, type: "follow_up", title: remTitle, due_date: new Date(remDate).toISOString() });
    setRemTitle(""); setRemDate(""); setRemSaving(false); setReminderOpen(false);
    toast.success("Připomínka vytvořena.");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { data: advisor } = await supabase.from("advisors").select("id").single();
    if (!advisor) { setUploading(false); return; }

    const path = `${advisor.id}/${dealId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("deal-documents").upload(path, file);
    if (uploadError) { toast.error("Nahrání selhalo."); setUploading(false); return; }

    // We don't have a proper client_id for deal docs, but we store in documents table using contract_id field as deal reference
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("documents").insert({
      advisor_id: advisor.id,
      client_id: clients[0]?.id || advisor.id, // fallback
      contract_id: dealId, // using as deal reference
      category: "other",
      original_filename: file.name,
      storage_path: path,
      file_type: file.type,
      uploaded_by: user?.id,
    });
    setUploading(false);
    toast.success("Dokument nahrán.");
    fetchData();
    e.target.value = "";
  }

  async function handleDeleteDoc(doc: DocFile) {
    await supabase.storage.from("deal-documents").remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast.success("Dokument smazán.");
  }

  async function handleDownloadDoc(doc: DocFile) {
    const { data } = await supabase.storage.from("deal-documents").download(doc.storage_path);
    if (!data) { toast.error("Stažení selhalo."); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = doc.original_filename;
    a.click(); URL.revokeObjectURL(url);
  }

  function prepareEmail(tmpl: EmailTemplate) {
    setSelectedTemplate(tmpl);
    let preview = tmpl.body;
    const vars: Record<string, string> = {
      jmeno_klienta: contactName || "—", prijmeni_klienta: "", nazev_dealu: title,
      hodnota_dealu: formatCZK(parseFloat(value) || null), jmeno_poradce: "", firma_poradce: "", telefon_poradce: "",
    };
    Object.entries(vars).forEach(([k, v]) => { preview = preview.replace(new RegExp(`\\{${k}\\}`, "g"), v); });
    setEmailPreview(preview);
    setEmailOpen(true);
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  if (loading) return <DetailSkeleton />;
  if (!deal) return <div className="flex h-full items-center justify-center"><p className="text-slate-500">Deal nenalezen.</p></div>;

  const currentStage = stages.find((s) => s.id === stageId);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="border-b bg-[var(--card-bg)] px-8 py-5">
        <button onClick={() => router.push("/advisor/crm/pipeline")} className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Zpět na pipeline</button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold gradient-text">{deal.title}</h1>
              {deal.converted_at && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Konvertováno</Badge>}
              {deal.lost_at && <Badge variant="destructive">Prohra</Badge>}
            </div>
            <div className="mt-1 flex items-center gap-4">
              <span className="text-2xl font-bold text-blue-600">{formatCZK(deal.value)}</span>
              {currentStage && <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentStage.color }} /><span className="text-sm font-medium text-slate-600">{currentStage.name}</span></div>}
            </div>
            {/* Tags */}
            <div className="mt-2 flex flex-wrap gap-1">
              {allTags.map((tag) => (
                <button key={tag.id} onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all ${
                    dealTagIds.includes(tag.id) ? "border-transparent text-white" : "border-slate-200 text-slate-400 hover:border-slate-300"
                  }`}
                  style={dealTagIds.includes(tag.id) ? { backgroundColor: tag.color } : undefined}
                >{tag.name}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)}><Bell className="mr-2 h-4 w-4" />Připomínka</Button>
            {templates.length > 0 && (
              <Select onValueChange={(id) => { const t = templates.find((t) => t.id === id); if (t) prepareEmail(t); }}>
                <SelectTrigger className="w-36"><Send className="mr-2 h-4 w-4" /><SelectValue placeholder="Email" /></SelectTrigger>
                <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Uložit
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 p-8">
        {/* Left (2/3) */}
        <div className="col-span-2 space-y-6">
          {/* Details */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Detaily dealu</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Název"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
              <Field label="Hodnota (Kč)"><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
              <Field label="Kontakt"><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
              <Field label="Telefon"><Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></Field>
              <Field label="Fáze">
                <Select value={stageId} onValueChange={setStageId}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{stages.map((s) => <SelectItem key={s.id} value={s.id}><div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />{s.name}</div></SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Klient">
                <Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Bez klienta" /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            {deal.lost_reason && <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3"><p className="text-xs font-semibold text-red-800">Důvod ztráty</p><p className="mt-0.5 text-sm text-red-600">{deal.lost_reason}</p></div>}
          </div>

          {/* Documents */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Dokumenty</h2>
            <label className={`mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-6 text-sm text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-500 ${uploading ? "pointer-events-none opacity-50" : ""}`}>
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              {uploading ? "Nahrávání..." : "Klikněte nebo přetáhněte soubor (PDF, JPG, PNG)"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
            </label>
            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate text-sm text-slate-700">{doc.original_filename}</span>
                      <span className="text-xs text-slate-500">{formatDate(doc.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDownloadDoc(doc)} className="rounded p-1.5 hover:bg-slate-100"><Download className="h-4 w-4 text-slate-400" /></button>
                      <button onClick={() => handleDeleteDoc(doc)} className="rounded p-1.5 hover:bg-red-50"><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activities */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-700">Aktivity</h2>
            <form onSubmit={handleAddActivity} className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Typ">
                  <Select value={actType} onValueChange={setActType}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(ACTIVITY_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}><div className="flex items-center gap-2"><c.icon className={`h-3.5 w-3.5 ${c.color}`} />{c.label}</div></SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Datum"><Input type="datetime-local" value={actDate} onChange={(e) => setActDate(e.target.value)} /></Field>
                <div className="col-span-2 space-y-1"><Label className="text-xs text-slate-500">Nadpis *</Label><Input value={actTitle} onChange={(e) => setActTitle(e.target.value)} required placeholder="Např. Hovor s klientem" /></div>
                <div className="col-span-2 space-y-1"><Label className="text-xs text-slate-500">Popis</Label><Textarea value={actDesc} onChange={(e) => setActDesc(e.target.value)} rows={2} /></div>
              </div>
              <Button type="submit" size="sm" className="mt-3" disabled={addingActivity}>{addingActivity && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}Přidat aktivitu</Button>
            </form>
            <Separator className="mb-5" />
            {activities.length === 0 ? (
              <div className="flex flex-col items-center py-8"><MessageSquare className="mb-3 h-10 w-10 text-slate-200" /><p className="text-sm text-slate-500">Zatím žádné aktivity</p></div>
            ) : (
              <div className="relative space-y-0">
                <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-200" />
                {activities.map((act) => {
                  const cfg = ACTIVITY_CONFIG[act.type] || ACTIVITY_CONFIG.note;
                  const Icon = cfg.icon;
                  return (
                    <div key={act.id} className="relative flex gap-4 pb-5">
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}><Icon className={`h-4 w-4 ${cfg.color}`} /></div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-2"><span className="text-sm font-semibold text-slate-900">{act.title}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span></div>
                        {act.description && <p className="mt-1 text-sm text-slate-500">{act.description}</p>}
                        <p className="mt-1 text-xs text-slate-500">{formatDate(act.created_at)}{act.scheduled_at && ` · Naplánováno: ${formatDate(act.scheduled_at)}`}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right (1/3) */}
        <div className="space-y-4">
          {/* Contact */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700">Kontakt</h3>
            {deal.contact_name ? (
              <div className="mb-3 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">{deal.contact_name[0].toUpperCase()}</div><p className="font-semibold text-slate-900">{deal.contact_name}</p></div>
            ) : <p className="mb-3 text-sm text-slate-500">Žádný kontakt</p>}
            {deal.contact_email && <CopyRow icon={Mail} text={deal.contact_email} field="email" copied={copiedField} onCopy={copyToClipboard} />}
            {deal.contact_phone && <CopyRow icon={Phone} text={deal.contact_phone} field="phone" copied={copiedField} onCopy={copyToClipboard} />}
          </div>

          {/* Stage progress */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700">Průběh</h3>
            <div className="space-y-1">
              {stages.map((s) => {
                const isActive = s.id === stageId;
                const currentPos = stages.find((st) => st.id === stageId)?.position ?? 0;
                const isPast = s.position < currentPos;
                return (
                  <button key={s.id} onClick={() => setStageId(s.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${isActive ? "bg-blue-50 font-semibold text-blue-700" : isPast ? "text-slate-400" : "text-slate-500 hover:bg-slate-50"}`}>
                    <div className={`h-2 w-2 rounded-full ${isActive ? "ring-2 ring-blue-200" : isPast ? "opacity-50" : ""}`} style={{ backgroundColor: s.color }} />{s.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700">Klient</h3>
            {clientId && clients.find((c) => c.id === clientId) ? (
              <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100"><User className="h-4 w-4 text-slate-500" /></div><p className="text-sm font-medium text-slate-900">{clients.find((c) => c.id === clientId)!.first_name} {clients.find((c) => c.id === clientId)!.last_name}</p></div>
            ) : <div className="text-center"><User className="mx-auto mb-2 h-8 w-8 text-slate-200" /><p className="text-xs text-slate-500">Žádný klient</p></div>}
          </div>

          {/* Info */}
          <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-700">Informace</h3>
            <dl className="space-y-2.5 text-sm">
              <InfoRow label="Vytvořeno" value={formatDate(deal.created_at)} />
              <InfoRow label="Zdroj" value={deal.source === "meta" ? "Meta Ads" : deal.source === "referral" ? "Doporučení" : "Manuální"} />
              <InfoRow label="Aktivity" value={String(activities.length)} />
              <InfoRow label="Dokumenty" value={String(documents.length)} />
            </dl>
          </div>
        </div>
      </div>

      {/* Reminder dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent><DialogHeader><DialogTitle>Nová připomínka</DialogTitle></DialogHeader>
          <form onSubmit={handleAddReminder} className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Nadpis *</Label><Input value={remTitle} onChange={(e) => setRemTitle(e.target.value)} required /></div>
            <div className="space-y-1"><Label className="text-xs">Termín *</Label><Input type="datetime-local" value={remDate} onChange={(e) => setRemDate(e.target.value)} required /></div>
            <DialogFooter><Button type="submit" disabled={remSaving}>{remSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Vytvořit</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Email preview dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Náhled emailu: {selectedTemplate?.name}</DialogTitle></DialogHeader>
          {selectedTemplate && (
            <div>
              <div className="mb-3 rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Předmět:</p><p className="text-sm font-medium">{selectedTemplate.subject.replace(/\{nazev_dealu\}/g, title)}</p></div>
              <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border p-4 text-sm text-slate-700">{emailPreview}</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Zavřít</Button>
            <Button onClick={() => { navigator.clipboard.writeText(emailPreview); toast.success("Zkopírováno do schránky."); }}><Copy className="mr-2 h-4 w-4" />Kopírovat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-slate-500">{label}</Label>{children}</div>;
}

function CopyRow({ icon: Icon, text, field, copied, onCopy }: { icon: typeof Mail; text: string; field: string; copied: string | null; onCopy: (t: string, f: string) => void }) {
  return (
    <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-slate-600 min-w-0"><Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{text}</span></div>
      <button onClick={() => onCopy(text, field)} className="shrink-0 text-slate-400 hover:text-slate-600">{copied === field ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}</button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-slate-500">{label}</dt><dd className="font-medium text-slate-700">{value}</dd></div>;
}

function DetailSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="border-b bg-[var(--card-bg)] px-8 py-5"><Skeleton className="mb-3 h-4 w-32" /><Skeleton className="h-8 w-64" /><Skeleton className="mt-2 h-6 w-40" /></div>
      <div className="grid grid-cols-3 gap-6 p-8">
        <div className="col-span-2 space-y-6"><Skeleton className="h-72 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>
        <div className="space-y-4"><Skeleton className="h-36 rounded-xl" /><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-28 rounded-xl" /></div>
      </div>
    </div>
  );
}
