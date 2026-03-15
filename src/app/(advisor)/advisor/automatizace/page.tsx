"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Plus, Play, Pause, Trash2, Loader2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, string>;
  action_type: string;
  action_config: Record<string, string>;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
}

interface AutomationLog {
  id: string;
  automation_id: string;
  status: string;
  details: Record<string, unknown> | null;
  executed_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  stage_change: "Změna fáze",
  deal_created: "Nový deal",
  deal_won: "Deal vyhrán",
  deal_lost: "Deal prohrán",
};

const ACTION_LABELS: Record<string, string> = {
  create_activity: "Vytvořit aktivitu",
  send_email: "Odeslat email",
  create_reminder: "Vytvořit připomínku",
  notify: "Notifikace",
};

export default function AutomationsPage() {
  const supabase = createClient();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("stage_change");
  const [triggerStageName, setTriggerStageName] = useState("");
  const [actionType, setActionType] = useState("create_activity");
  const [actionNote, setActionNote] = useState("");

  async function fetchData() {
    const [autoRes, logsRes] = await Promise.all([
      supabase.from("automations").select("*").order("created_at"),
      supabase.from("automation_logs").select("*").order("executed_at", { ascending: false }).limit(20),
    ]);
    setAutomations(autoRes.data || []);
    setLogs(logsRes.data || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(id: string, currentState: boolean) {
    await supabase.from("automations").update({ is_active: !currentState }).eq("id", id);
    setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !currentState } : a));
    toast.success(!currentState ? "Automatizace aktivována." : "Automatizace deaktivována.");
  }

  async function handleDelete(id: string) {
    await supabase.from("automation_logs").delete().eq("automation_id", id);
    await supabase.from("automations").delete().eq("id", id);
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    toast.success("Automatizace smazána.");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: advisor } = await supabase.from("advisors").select("id").single();
    if (!advisor) { setSaving(false); return; }

    const triggerConfig: Record<string, string> = {};
    if (triggerType === "stage_change" && triggerStageName) {
      triggerConfig.stage_name = triggerStageName;
    }

    const actionConfig: Record<string, string> = {};
    if (actionType === "create_activity") {
      actionConfig.activity_type = "meeting";
      actionConfig.note = actionNote || `Automaticky: ${name}`;
    } else if (actionType === "create_reminder") {
      actionConfig.title = actionNote || name;
      actionConfig.days_offset = "1";
    } else if (actionType === "notify") {
      actionConfig.message = actionNote || name;
    }

    await supabase.from("automations").insert({
      advisor_id: advisor.id,
      name,
      description,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
      is_system: false,
    });

    setSaving(false);
    setDialogOpen(false);
    setName("");
    setDescription("");
    setTriggerStageName("");
    setActionNote("");
    toast.success("Automatizace vytvořena.");
    fetchData();
  }

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--card-text)]">Automatizace</h1>
          <p className="mt-0.5 text-sm text-[var(--card-text-muted)]">{automations.length} pravidel</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Nová automatizace
        </Button>
      </div>

      {automations.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Zap className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádné automatizace</p>
          <p className="mt-1 text-sm text-[var(--card-text-dim)]">Vytvořte první automatizaci pro zefektivnění práce</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => (
            <div key={auto.id} className="flex items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${auto.is_active ? "bg-emerald-50" : "bg-[var(--table-header)]"}`}>
                  <Zap className={`h-5 w-5 ${auto.is_active ? "text-emerald-600" : "text-[var(--card-text-dim)]"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--card-text)]">{auto.name}</h3>
                    {auto.is_system && <Badge variant="secondary" className="text-[10px]">Systém</Badge>}
                    <Badge variant={auto.is_active ? "default" : "secondary"} className="text-[10px]">
                      {auto.is_active ? "Aktivní" : "Neaktivní"}
                    </Badge>
                  </div>
                  {auto.description && <p className="mt-0.5 text-xs text-[var(--card-text-muted)]">{auto.description}</p>}
                  <div className="mt-1 flex items-center gap-3 text-xs text-[var(--card-text-muted)]">
                    <span>Spouštěč: {TRIGGER_LABELS[auto.trigger_type] || auto.trigger_type}</span>
                    <span>Akce: {ACTION_LABELS[auto.action_type] || auto.action_type}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(auto.id, auto.is_active)}
                >
                  {auto.is_active ? <Pause className="mr-1 h-3 w-3" /> : <Play className="mr-1 h-3 w-3" />}
                  {auto.is_active ? "Zastavit" : "Spustit"}
                </Button>
                {!auto.is_system && (
                  <button onClick={() => handleDelete(auto.id)} className="rounded-md p-1.5 text-[var(--card-text-dim)] hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">Poslední spuštění</h2>
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-left text-xs font-medium uppercase tracking-wider text-[var(--card-text)]">
                  <th className="px-6 py-3">Čas</th>
                  <th className="px-6 py-3">Automatizace</th>
                  <th className="px-6 py-3">Stav</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const auto = automations.find((a) => a.id === log.automation_id);
                  return (
                    <tr key={log.id} className="border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--table-hover)]">
                      <td className="px-6 py-3 text-sm text-[var(--card-text-muted)]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {new Date(log.executed_at).toLocaleString("cs-CZ")}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-[var(--card-text)]">{auto?.name || "—"}</td>
                      <td className="px-6 py-3">
                        {log.status === "success" ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="h-3 w-3" />Úspěch</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-500"><XCircle className="h-3 w-3" />Chyba</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nová automatizace</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Název *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Popis</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Spouštěč</Label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Akce</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {triggerType === "stage_change" && (
              <div className="space-y-1">
                <Label className="text-xs">Název fáze (obsahuje)</Label>
                <Input value={triggerStageName} onChange={(e) => setTriggerStageName(e.target.value)} placeholder="např. Schůzka" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Poznámka akce</Label>
              <Input value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="Popis aktivity / připomínky" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Vytvořit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
