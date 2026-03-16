"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Brain,
  Plus,
  RefreshCw,
  Loader2,
  Pencil,
  Settings2,
  Shield,
  TrendingUp,
  Heart,
  FileText,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface UpsellRule {
  id: string;
  advisor_id: string;
  category: string;
  rule_type: string;
  threshold_value: number;
  threshold_unit: string;
  message_template: string;
  priority: string;
  is_active: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  loans: "Úvěry/Hypotéky",
  insurance: "Pojištění",
  investments: "Investice",
  life_events: "Životní události",
  contracts: "Smlouvy",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  loans: <TrendingUp className="h-5 w-5" />,
  insurance: <Shield className="h-5 w-5" />,
  investments: <Brain className="h-5 w-5" />,
  life_events: <Heart className="h-5 w-5" />,
  contracts: <FileText className="h-5 w-5" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-500 border-red-500/30",
  high: "bg-orange-500/20 text-orange-500 border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-500 border-amber-500/30",
  low: "bg-blue-500/20 text-blue-500 border-blue-500/30",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritická",
  high: "Vysoká",
  medium: "Střední",
  low: "Nízká",
};

const EMPTY_RULE = {
  category: "",
  rule_type: "",
  threshold_value: 0,
  threshold_unit: "",
  message_template: "",
  priority: "medium",
};

export default function UpsellRulesPage() {
  const supabase = createClient();

  const [rules, setRules] = useState<UpsellRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<UpsellRule | null>(null);
  const [form, setForm] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("upsell_rules")
      .select("*")
      .order("category")
      .order("priority", { ascending: false });

    if (error) {
      toast.error("Nepodařilo se načíst pravidla");
    } else {
      setRules(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const toggleActive = async (rule: UpsellRule) => {
    setTogglingId(rule.id);
    const { error } = await supabase
      .from("upsell_rules")
      .update({ is_active: !rule.is_active })
      .eq("id", rule.id);

    if (error) {
      toast.error("Nepodařilo se změnit stav pravidla");
    } else {
      setRules((prev) =>
        prev.map((r) =>
          r.id === rule.id ? { ...r, is_active: !r.is_active } : r
        )
      );
    }
    setTogglingId(null);
  };

  const openEdit = (rule: UpsellRule) => {
    setEditingRule(rule);
    setForm({
      category: rule.category,
      rule_type: rule.rule_type,
      threshold_value: rule.threshold_value,
      threshold_unit: rule.threshold_unit,
      message_template: rule.message_template,
      priority: rule.priority,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingRule(null);
    setForm(EMPTY_RULE);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.category || !form.rule_type || !form.message_template) {
      toast.error("Vyplňte všechna povinná pole");
      return;
    }

    setSaving(true);

    if (editingRule) {
      const { error } = await supabase
        .from("upsell_rules")
        .update({
          category: form.category,
          rule_type: form.rule_type,
          threshold_value: form.threshold_value,
          threshold_unit: form.threshold_unit,
          message_template: form.message_template,
          priority: form.priority,
        })
        .eq("id", editingRule.id);

      if (error) {
        toast.error("Nepodařilo se uložit pravidlo");
      } else {
        toast.success("Pravidlo aktualizováno");
        setDialogOpen(false);
        fetchRules();
      }
    } else {
      const { error } = await supabase.from("upsell_rules").insert({
        category: form.category,
        rule_type: form.rule_type,
        threshold_value: form.threshold_value,
        threshold_unit: form.threshold_unit,
        message_template: form.message_template,
        priority: form.priority,
      });

      if (error) {
        toast.error("Nepodařilo se vytvořit pravidlo");
      } else {
        toast.success("Pravidlo vytvořeno");
        setDialogOpen(false);
        fetchRules();
      }
    }

    setSaving(false);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/upsell/analyze", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Analýza dokončena — ${json.generated} nových příležitostí`);
      } else {
        toast.error(json.error || "Chyba při analýze");
      }
    } catch {
      toast.error("Nepodařilo se spustit analýzu");
    }
    setAnalyzing(false);
  };

  const resetDefaults = async () => {
    if (!confirm("Opravdu chcete obnovit výchozí pravidla? Všechna stávající pravidla budou smazána.")) return;

    setResetting(true);
    const { error: delError } = await supabase
      .from("upsell_rules")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all

    if (delError) {
      toast.error("Nepodařilo se smazat pravidla");
      setResetting(false);
      return;
    }

    const defaults = [
      { category: "loans", rule_type: "interest_rate_high", threshold_value: 5, threshold_unit: "%", message_template: "Klient má úvěr s úrokovou sazbou přes {threshold}%. Zvažte refinancování.", priority: "high" },
      { category: "loans", rule_type: "fixation_ending", threshold_value: 6, threshold_unit: "měsíců", message_template: "Fixace úvěru končí do {threshold} měsíců. Čas na novou nabídku.", priority: "critical" },
      { category: "loans", rule_type: "payment_ratio_high", threshold_value: 40, threshold_unit: "%", message_template: "Poměr splátek k příjmu přesahuje {threshold}%. Zvažte konsolidaci.", priority: "high" },
      { category: "loans", rule_type: "loan_no_insurance", threshold_value: 0, threshold_unit: "", message_template: "Klient má úvěr bez pojištění schopnosti splácet.", priority: "medium" },
      { category: "insurance", rule_type: "policy_old", threshold_value: 5, threshold_unit: "let", message_template: "Pojistná smlouva je starší než {threshold} let. Zvažte revizi.", priority: "medium" },
      { category: "insurance", rule_type: "coverage_low", threshold_value: 3, threshold_unit: "× roční příjem", message_template: "Pojistné krytí je nižší než {threshold}× roční příjem.", priority: "high" },
      { category: "insurance", rule_type: "missing_accident", threshold_value: 0, threshold_unit: "", message_template: "Klient nemá úrazové pojištění.", priority: "low" },
      { category: "insurance", rule_type: "missing_property", threshold_value: 0, threshold_unit: "", message_template: "Klient nemá pojištění majetku.", priority: "low" },
      { category: "investments", rule_type: "savings_high", threshold_value: 500000, threshold_unit: "Kč", message_template: "Klient má úspory přes {threshold} Kč na spořicím účtu. Zvažte investici.", priority: "medium" },
      { category: "investments", rule_type: "no_regular_saving", threshold_value: 0, threshold_unit: "", message_template: "Klient nemá pravidelnou investici. Nabídněte pravidelné spoření.", priority: "low" },
      { category: "contracts", rule_type: "contract_expiring", threshold_value: 90, threshold_unit: "dní", message_template: "Smlouva vyprší do {threshold} dní. Kontaktujte klienta.", priority: "high" },
      { category: "life_events", rule_type: "near_retirement", threshold_value: 10, threshold_unit: "let", message_template: "Klient je méně než {threshold} let od důchodu. Zkontrolujte plán.", priority: "medium" },
    ];

    const { error: insError } = await supabase
      .from("upsell_rules")
      .insert(defaults);

    if (insError) {
      toast.error("Nepodařilo se vložit výchozí pravidla");
    } else {
      toast.success("Výchozí pravidla obnovena");
      fetchRules();
    }
    setResetting(false);
  };

  const grouped = Object.keys(CATEGORY_LABELS).reduce(
    (acc, cat) => {
      acc[cat] = rules.filter((r) => r.category === cat);
      return acc;
    },
    {} as Record<string, UpsellRule[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Upsell pravidla</h1>
          <p style={{ color: "var(--card-text-muted)" }}>
            Nastavte pravidla pro automatickou detekci příležitostí
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={resetDefaults}
            disabled={resetting}
            style={{
              borderColor: "var(--card-border)",
              color: "var(--card-text)",
            }}
          >
            {resetting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Obnovit výchozí
          </Button>
          <Button
            variant="outline"
            onClick={runAnalysis}
            disabled={analyzing}
            style={{
              borderColor: "var(--color-primary)",
              color: "var(--color-primary)",
            }}
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Spustit analýzu
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Přidat vlastní pravidlo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
            const catRules = grouped[cat] || [];
            if (catRules.length === 0) return null;

            return (
              <div key={cat} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--color-primary)" }}>
                    {CATEGORY_ICONS[cat]}
                  </span>
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--card-text)" }}
                  >
                    {label}
                  </h2>
                  <span
                    className="text-sm"
                    style={{ color: "var(--card-text-dim)" }}
                  >
                    ({catRules.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {catRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap"
                      style={{
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--card-border)",
                        opacity: rule.is_active ? 1 : 0.6,
                      }}
                    >
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-medium"
                            style={{ color: "var(--card-text)" }}
                          >
                            {rule.rule_type}
                          </span>
                          <Badge
                            variant="outline"
                            className={PRIORITY_COLORS[rule.priority] || ""}
                          >
                            {PRIORITY_LABELS[rule.priority] || rule.priority}
                          </Badge>
                          {rule.threshold_value > 0 && (
                            <span
                              className="text-sm"
                              style={{ color: "var(--card-text-dim)" }}
                            >
                              Práh: {rule.threshold_value} {rule.threshold_unit}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-sm truncate"
                          style={{ color: "var(--card-text-muted)" }}
                        >
                          {rule.message_template}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(rule)}
                          style={{ color: "var(--card-text-muted)" }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={rule.is_active}
                          disabled={togglingId === rule.id}
                          onCheckedChange={() => toggleActive(rule)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {rules.length === 0 && (
            <div
              className="rounded-2xl p-12 text-center"
              style={{
                backgroundColor: "var(--card-bg)",
                border: "1px solid var(--card-border)",
              }}
            >
              <Settings2
                className="h-12 w-12 mx-auto mb-4"
                style={{ color: "var(--card-text-dim)" }}
              />
              <p
                className="text-lg font-medium"
                style={{ color: "var(--card-text)" }}
              >
                Žádná pravidla
              </p>
              <p style={{ color: "var(--card-text-muted)" }}>
                Přidejte vlastní pravidlo nebo obnovte výchozí nastavení
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            color: "var(--card-text)",
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: "var(--card-text)" }}>
              {editingRule ? "Upravit pravidlo" : "Nové pravidlo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{ color: "var(--card-text)" }}>Kategorie</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                >
                  <SelectValue placeholder="Vyberte kategorii" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label style={{ color: "var(--card-text)" }}>Typ pravidla</Label>
              <Input
                value={form.rule_type}
                onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
                placeholder="např. interest_rate_high"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label style={{ color: "var(--card-text)" }}>Prahová hodnota</Label>
                <Input
                  type="number"
                  value={form.threshold_value}
                  onChange={(e) =>
                    setForm({ ...form, threshold_value: Number(e.target.value) })
                  }
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ color: "var(--card-text)" }}>Jednotka</Label>
                <Input
                  value={form.threshold_unit}
                  onChange={(e) =>
                    setForm({ ...form, threshold_unit: e.target.value })
                  }
                  placeholder="%, měsíců, Kč, let..."
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label style={{ color: "var(--card-text)" }}>Šablona zprávy</Label>
              <Textarea
                value={form.message_template}
                onChange={(e) =>
                  setForm({ ...form, message_template: e.target.value })
                }
                placeholder="Použijte {threshold} pro prahovou hodnotu"
                rows={3}
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label style={{ color: "var(--card-text)" }}>Priorita</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                    color: "var(--input-text)",
                  }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Nízká</SelectItem>
                  <SelectItem value="medium">Střední</SelectItem>
                  <SelectItem value="high">Vysoká</SelectItem>
                  <SelectItem value="critical">Kritická</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              style={{
                borderColor: "var(--card-border)",
                color: "var(--card-text)",
              }}
            >
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRule ? "Uložit" : "Vytvořit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
