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
import { Brain, Plus, Pencil, Trash2, Loader2, Play, Pause, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface UpsellRule {
  id: string;
  name: string;
  description: string | null;
  condition_type: string;
  condition_config: Record<string, string>;
  recommendation: string;
  priority: number;
  is_active: boolean;
  created_at: string;
}

const CONDITION_LABELS: Record<string, string> = {
  portfolio_value: "Hodnota portfolia",
  no_product: "Chybí produkt",
  contract_expiring: "Expirace smlouvy",
  segment: "Segment klienta",
};

export default function AiRulesPage() {
  const supabase = createClient();
  const [rules, setRules] = useState<UpsellRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<UpsellRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditionType, setConditionType] = useState("portfolio_value");
  const [conditionValue, setConditionValue] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [priority, setPriority] = useState("0");

  async function fetchRules() {
    const { data } = await supabase.from("upsell_rules").select("*").order("priority", { ascending: false });
    setRules(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchRules(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(rule?: UpsellRule) {
    if (rule) {
      setEditRule(rule);
      setName(rule.name);
      setDescription(rule.description || "");
      setConditionType(rule.condition_type);
      setConditionValue(
        rule.condition_config?.min_value ||
        rule.condition_config?.product_type ||
        rule.condition_config?.days_ahead ||
        rule.condition_config?.segment || ""
      );
      setRecommendation(rule.recommendation);
      setPriority(String(rule.priority));
    } else {
      setEditRule(null);
      setName("");
      setDescription("");
      setConditionType("portfolio_value");
      setConditionValue("");
      setRecommendation("");
      setPriority("0");
    }
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: advisor } = await supabase.from("advisors").select("id").single();
    if (!advisor) { setSaving(false); return; }

    const conditionConfig: Record<string, string> = {};
    if (conditionType === "portfolio_value") conditionConfig.min_value = conditionValue;
    else if (conditionType === "no_product") conditionConfig.product_type = conditionValue;
    else if (conditionType === "contract_expiring") conditionConfig.days_ahead = conditionValue;
    else if (conditionType === "segment") conditionConfig.segment = conditionValue;

    const payload = {
      name,
      description: description || null,
      condition_type: conditionType,
      condition_config: conditionConfig,
      recommendation,
      priority: parseInt(priority) || 0,
    };

    if (editRule) {
      await supabase.from("upsell_rules").update(payload).eq("id", editRule.id);
    } else {
      await supabase.from("upsell_rules").insert({ ...payload, advisor_id: advisor.id });
    }

    setSaving(false);
    setDialogOpen(false);
    toast.success(editRule ? "Pravidlo uloženo." : "Pravidlo vytvořeno.");
    fetchRules();
  }

  async function handleDelete(id: string) {
    await supabase.from("upsell_alerts").delete().eq("rule_id", id);
    await supabase.from("upsell_rules").delete().eq("id", id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Pravidlo smazáno.");
  }

  async function handleToggle(id: string, current: boolean) {
    await supabase.from("upsell_rules").update({ is_active: !current }).eq("id", id);
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, is_active: !current } : r));
  }

  async function runCheck() {
    setChecking(true);
    try {
      const res = await fetch("/api/ai/check-upsells", { method: "POST" });
      const data = await res.json();
      toast.success(`Kontrola dokončena. Vygenerováno ${data.generated || 0} nových doporučení.`);
    } catch {
      toast.error("Chyba při kontrole.");
    }
    setChecking(false);
  }

  const conditionValueLabel = (): string => {
    switch (conditionType) {
      case "portfolio_value": return "Minimální hodnota (Kč)";
      case "no_product": return "Typ produktu";
      case "contract_expiring": return "Dní do expirace";
      case "segment": return "Segment (vip, active, standard, sleeping, new)";
      default: return "Hodnota";
    }
  };

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">AI pravidla</h1>
          <p className="mt-0.5 text-sm text-[var(--card-text-muted)]">Nastavte pravidla pro automatická doporučení</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={runCheck} disabled={checking}>
            {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Spustit kontrolu
          </Button>
          <Button onClick={() => openEdit()}>
            <Plus className="mr-2 h-4 w-4" />Nové pravidlo
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Brain className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">Žádná pravidla</p>
          <p className="mt-1 text-sm text-[var(--card-text-dim)]">Vytvořte pravidlo pro identifikaci upsell příležitostí</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--card-text)]">{rule.name}</h3>
                    <Badge variant={rule.is_active ? "default" : "secondary"} className="text-[10px]">
                      {rule.is_active ? "Aktivní" : "Neaktivní"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      Priorita: {rule.priority}
                    </Badge>
                  </div>
                  {rule.description && <p className="mt-0.5 text-xs text-[var(--card-text-muted)]">{rule.description}</p>}
                  <div className="mt-2 flex items-center gap-3 text-xs text-[var(--card-text-muted)]">
                    <span>Podmínka: {CONDITION_LABELS[rule.condition_type] || rule.condition_type}</span>
                  </div>
                  <p className="mt-1 text-xs text-emerald-600">Doporučení: {rule.recommendation}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleToggle(rule.id, rule.is_active)} className="rounded-md p-1.5 hover:bg-[var(--table-header)]">
                    {rule.is_active ? <Pause className="h-4 w-4 text-[var(--card-text-dim)]" /> : <Play className="h-4 w-4 text-[var(--card-text-dim)]" />}
                  </button>
                  <button onClick={() => openEdit(rule)} className="rounded-md p-1.5 hover:bg-[var(--table-header)]">
                    <Pencil className="h-4 w-4 text-[var(--card-text-dim)]" />
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="rounded-md p-1.5 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4 text-[var(--card-text-dim)]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editRule ? "Upravit pravidlo" : "Nové pravidlo"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1"><Label className="text-xs">Název *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
            <div className="space-y-1"><Label className="text-xs">Popis</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Typ podmínky</Label>
                <Select value={conditionType} onValueChange={setConditionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{conditionValueLabel()}</Label>
                <Input value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Doporučení *</Label><Textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={2} required /></div>
            <div className="space-y-1"><Label className="text-xs">Priorita</Label><Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} /></div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editRule ? "Uložit" : "Vytvořit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
