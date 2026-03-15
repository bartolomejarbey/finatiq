"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, FileText, Eye, Pencil, Trash2, Loader2, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  is_default: boolean;
  created_at: string;
}

const AVAILABLE_VARS = [
  { key: "jmeno_klienta", label: "Jméno klienta" },
  { key: "prijmeni_klienta", label: "Příjmení klienta" },
  { key: "nazev_dealu", label: "Název dealu" },
  { key: "hodnota_dealu", label: "Hodnota dealu" },
  { key: "jmeno_poradce", label: "Jméno poradce" },
  { key: "firma_poradce", label: "Firma poradce" },
  { key: "telefon_poradce", label: "Telefon poradce" },
];

export default function TemplatesPage() {
  const supabase = createClient();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  async function fetchTemplates() {
    const { data } = await supabase.from("email_templates").select("*").order("is_default", { ascending: false }).order("name");
    setTemplates(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTemplates().then(() => {
      // Auto-seed if no templates exist
      supabase.from("email_templates").select("id", { count: "exact", head: true }).then(({ count }) => {
        if (count === 0) handleSeedDefaults(true);
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSeedDefaults(silent = false) {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed-templates", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        if (!silent) toast.success(`Výchozí šablony obnoveny (${data.count}).`);
        fetchTemplates();
      } else {
        if (!silent) toast.error("Nepodařilo se obnovit šablony.");
      }
    } catch {
      if (!silent) toast.error("Chyba při obnovení šablon.");
    }
    setSeeding(false);
  }

  function openEdit(tmpl?: Template) {
    if (tmpl) {
      setEditTemplate(tmpl);
      setName(tmpl.name);
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    } else {
      setEditTemplate(null);
      setName("");
      setSubject("");
      setBody("");
    }
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: advisor } = await supabase.from("advisors").select("id").single();
    if (!advisor) { setSaving(false); return; }

    if (editTemplate) {
      await supabase.from("email_templates").update({ name, subject, body }).eq("id", editTemplate.id);
    } else {
      await supabase.from("email_templates").insert({
        advisor_id: advisor.id,
        name,
        subject,
        body,
        variables: AVAILABLE_VARS.map((v) => v.key),
        is_default: false,
      });
    }
    setSaving(false);
    setDialogOpen(false);
    toast.success(editTemplate ? "Šablona uložena." : "Šablona vytvořena.");
    fetchTemplates();
  }

  async function handleDelete(id: string) {
    await supabase.from("email_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Šablona smazána.");
  }

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-8 w-48" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Emailové šablony</h1>
          <p className="mt-0.5 text-sm text-[var(--card-text-muted)]">{templates.length} šablon</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSeedDefaults()} disabled={seeding}>
            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
            Obnovit výchozí
          </Button>
          <Button onClick={() => openEdit()}><Plus className="mr-2 h-4 w-4" />Nová šablona</Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <FileText className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádné šablony</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--card-text)]">{tmpl.name}</h3>
                  {tmpl.is_default && <Badge variant="secondary" className="text-[10px]">Výchozí</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPreviewTemplate(tmpl)} className="rounded-md p-1.5 hover:bg-[var(--table-header)]"><Eye className="h-4 w-4 text-[var(--card-text-dim)]" /></button>
                  <button onClick={() => openEdit(tmpl)} className="rounded-md p-1.5 hover:bg-[var(--table-header)]"><Pencil className="h-4 w-4 text-[var(--card-text-dim)]" /></button>
                  {!tmpl.is_default && <button onClick={() => handleDelete(tmpl.id)} className="rounded-md p-1.5 hover:bg-red-50"><Trash2 className="h-4 w-4 text-[var(--card-text-dim)] hover:text-red-500" /></button>}
                </div>
              </div>
              <p className="text-xs font-medium text-[var(--card-text-muted)]">Předmět: {tmpl.subject}</p>
              <p className="mt-1 line-clamp-2 text-xs text-[var(--card-text-muted)]">{tmpl.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editTemplate ? "Upravit šablonu" : "Nová šablona"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Název *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="space-y-1"><Label className="text-xs">Předmět *</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} required /></div>
            <div className="space-y-1">
              <Label className="text-xs">Tělo emailu *</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} required />
              <div className="flex flex-wrap gap-1 mt-1">
                {AVAILABLE_VARS.map((v) => (
                  <button key={v.key} type="button" onClick={() => setBody((prev) => prev + `{${v.key}}`)}
                    className="rounded bg-[var(--table-header)] px-2 py-0.5 text-[10px] text-[var(--card-text-muted)] hover:bg-blue-100 hover:text-blue-600">
                    {`{${v.key}}`}
                  </button>
                ))}
              </div>
            </div>
            <DialogFooter><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editTemplate ? "Uložit" : "Vytvořit"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview sheet */}
      <Sheet open={!!previewTemplate} onOpenChange={(o) => !o && setPreviewTemplate(null)}>
        <SheetContent className="w-[500px] sm:w-[600px]">
          <SheetHeader><SheetTitle>Náhled: {previewTemplate?.name}</SheetTitle></SheetHeader>
          {previewTemplate && (
            <div className="mt-6">
              <div className="mb-4 rounded-lg bg-[var(--table-hover)] p-4">
                <p className="text-xs text-[var(--card-text-muted)]">Předmět:</p>
                <p className="text-sm font-medium text-[var(--card-text)]">{previewTemplate.subject}</p>
              </div>
              <div className="whitespace-pre-wrap rounded-lg border p-4 text-sm text-[var(--card-text)]">{previewTemplate.body}</div>
              <Button variant="outline" className="mt-4" onClick={() => { navigator.clipboard.writeText(previewTemplate.body); toast.success("Zkopírováno do schránky."); }}>
                <Copy className="mr-2 h-4 w-4" />Kopírovat text
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
