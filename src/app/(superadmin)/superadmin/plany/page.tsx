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
import { Plus, Pencil, Trash2, Loader2, CreditCard, X } from "lucide-react";
import { toast } from "sonner";
import { PlanCard } from "@/components/PlanCard";

interface Plan {
  id: string;
  name: string;
  tier: string;
  max_clients: number;
  price_monthly: number;
  features: Record<string, boolean>;
  is_active: boolean;
  description?: string | null;
  perks?: string[] | null;
  sort_order?: number;
  badge?: string | null;
  trial_days?: number;
}

const FEATURE_LABELS: Record<string, string> = {
  crm: "CRM Pipeline",
  portal: "Klientský portál",
  templates: "Emailové šablony",
  scoring: "Klientský scoring",
  automations: "Automatizace",
  meta_ads: "Meta Ads integrace",
  ocr: "OCR rozpoznávání",
  ai_assistant: "AI asistent",
  osvc: "OSVČ modul",
  calendar: "Kalendář",
};

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(v);
}

export default function PlansPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [tier, setTier] = useState("");
  const [maxClients, setMaxClients] = useState("50");
  const [price, setPrice] = useState("0");
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [formDescription, setFormDescription] = useState("");
  const [formPerks, setFormPerks] = useState<string[]>([]);
  const [formPerkInput, setFormPerkInput] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formTrialDays, setFormTrialDays] = useState(14);
  const [formSortOrder, setFormSortOrder] = useState(0);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from("subscription_plans").select("id,name,tier,max_clients,price_monthly,features,is_active,description,perks,sort_order,badge,trial_days").order("price_monthly");
      setPlans(data || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit(plan?: Plan) {
    if (plan) {
      setEditPlan(plan);
      setName(plan.name);
      setTier(plan.tier);
      setMaxClients(String(plan.max_clients));
      setPrice(String(plan.price_monthly));
      setFeatures(plan.features || {});
      setFormDescription(plan.description || "");
      setFormPerks(plan.perks || []);
      setFormPerkInput("");
      setFormBadge(plan.badge || "");
      setFormTrialDays(plan.trial_days ?? 14);
      setFormSortOrder(plan.sort_order ?? 0);
    } else {
      setEditPlan(null);
      setName(""); setTier(""); setMaxClients("50"); setPrice("0");
      setFeatures({});
      setFormDescription("");
      setFormPerks([]);
      setFormPerkInput("");
      setFormBadge("");
      setFormTrialDays(14);
      setFormSortOrder(0);
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      name,
      tier,
      max_clients: parseInt(maxClients) || 50,
      price_monthly: parseFloat(price) || 0,
      features,
      description: formDescription || null,
      perks: formPerks.length > 0 ? formPerks : null,
      badge: formBadge || null,
      trial_days: formTrialDays,
      sort_order: formSortOrder,
    };

    if (editPlan) {
      await supabase.from("subscription_plans").update(payload).eq("id", editPlan.id);
    } else {
      await supabase.from("subscription_plans").insert(payload);
    }

    setSaving(false);
    setDialogOpen(false);
    toast.success(editPlan ? "Plán aktualizován." : "Plán vytvořen.");
    const { data } = await supabase.from("subscription_plans").select("id,name,tier,max_clients,price_monthly,features,is_active,description,perks,sort_order,badge,trial_days").order("price_monthly");
    setPlans(data || []);
  }

  async function handleDelete(id: string) {
    await supabase.from("subscription_plans").delete().eq("id", id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast.success("Plán smazán.");
  }

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 rounded-xl" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Cenové plány</h1>
        <Button onClick={() => openEdit()}><Plus className="mr-2 h-4 w-4" />Nový plán</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl border bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <Badge variant="secondary" className="text-[10px]">{plan.tier}</Badge>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(plan)} className="rounded-md p-1.5 hover:bg-slate-100"><Pencil className="h-4 w-4 text-slate-400" /></button>
                <button onClick={() => handleDelete(plan.id)} className="rounded-md p-1.5 hover:bg-red-50"><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
              </div>
            </div>
            <p className="mb-1 text-2xl font-bold text-slate-900">{formatCZK(plan.price_monthly)}<span className="text-sm font-normal text-slate-400">/měs</span></p>
            <p className="mb-2 text-xs text-slate-500">Max {plan.max_clients} klientů</p>
            <div className="mb-4 flex items-center gap-2">
              {plan.badge && <Badge variant="outline" className="text-[10px] border-cyan-300 text-cyan-600">{plan.badge}</Badge>}
              <span className="text-[10px] text-slate-400">Řazení: {plan.sort_order ?? 0}</span>
            </div>
            <div className="space-y-1">
              {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${plan.features?.[key] ? "bg-emerald-500" : "bg-slate-200"}`} />
                  <span className={plan.features?.[key] ? "text-slate-700" : "text-slate-300"}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPlan ? "Upravit plán" : "Nový plán"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Název</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Tier (ID)</Label><Input value={tier} onChange={(e) => setTier(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Max klientů</Label><Input type="number" value={maxClients} onChange={(e) => setMaxClients(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Cena/měsíc (Kč)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Funkce</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={features[key] || false} onChange={(e) => setFeatures((prev) => ({ ...prev, [key]: e.target.checked }))} className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Popis</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Krátký popis plánu..." rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Výhody (perks)</Label>
              <div className="flex gap-2">
                <Input value={formPerkInput} onChange={(e) => setFormPerkInput(e.target.value)} placeholder="Nová výhoda..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (formPerkInput.trim()) { setFormPerks((prev) => [...prev, formPerkInput.trim()]); setFormPerkInput(""); } } }} />
                <Button type="button" variant="outline" size="sm" onClick={() => { if (formPerkInput.trim()) { setFormPerks((prev) => [...prev, formPerkInput.trim()]); setFormPerkInput(""); } }}>Přidat</Button>
              </div>
              {formPerks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formPerks.map((perk, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs text-cyan-700">
                      {perk}
                      <button type="button" onClick={() => setFormPerks((prev) => prev.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1"><Label className="text-xs">Badge</Label><Input value={formBadge} onChange={(e) => setFormBadge(e.target.value)} placeholder="např. Nejoblíbenější" /></div>
              <div className="space-y-1"><Label className="text-xs">Zkušební dny</Label><Input type="number" value={formTrialDays} onChange={(e) => setFormTrialDays(parseInt(e.target.value) || 0)} /></div>
              <div className="space-y-1"><Label className="text-xs">Řazení</Label><Input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)} /></div>
            </div>
            <div className="mt-6 p-4 bg-[#060d1a] rounded-xl">
              <p className="text-xs text-white/40 mb-3 font-mono uppercase tracking-wider">Náhled na webu</p>
              <PlanCard
                plan={{
                  name: name || "Název plánu",
                  price_monthly: parseFloat(price) || 0,
                  max_clients: parseInt(maxClients) || 50,
                  features,
                  description: formDescription || null,
                  perks: formPerks.length > 0 ? formPerks : null,
                  badge: formBadge || null,
                  trial_days: formTrialDays,
                }}
                featured={false}
                showCta={false}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editPlan ? "Uložit" : "Vytvořit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
