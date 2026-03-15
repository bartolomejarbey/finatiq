"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Tag } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { DealCard } from "./deal-card";
import { NewDealSheet } from "./new-deal-sheet";
import { LostReasonDialog } from "./lost-reason-dialog";
import { ModuleGate } from "@/components/ModuleGate";

export interface Stage {
  id: string;
  name: string;
  position: number;
  color: string;
}

export interface Deal {
  id: string;
  title: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  value: number | null;
  source: string;
  stage_id: string;
  client_id: string | null;
  created_at: string;
  converted_at: string | null;
  lost_at: string | null;
}

export interface DealTag {
  id: string;
  name: string;
  color: string;
}

export function formatCZK(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCZK(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M Kč`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K Kč`;
  return `${value} Kč`;
}

export function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "právě teď";
  if (mins < 60) return `před ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `před ${hours} hod`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "včera";
  if (days < 30) return `před ${days}d`;
  return `před ${Math.floor(days / 30)} měs`;
}

export default function PipelinePage() {
  const router = useRouter();
  const supabase = createClient();

  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [allTags, setAllTags] = useState<DealTag[]>([]);
  const [dealTagMap, setDealTagMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lostDialog, setLostDialog] = useState<{
    open: boolean;
    dealId: string | null;
    stageId: string | null;
  }>({ open: false, dealId: null, stageId: null });

  const fetchData = useCallback(async () => {
    const [stagesRes, dealsRes, tagsRes, assignmentsRes] = await Promise.all([
      supabase.from("pipeline_stages").select("*").order("position"),
      supabase.from("deals").select("id, title, contact_name, contact_email, contact_phone, value, source, stage_id, client_id, created_at, converted_at, lost_at").order("created_at", { ascending: false }),
      supabase.from("deal_tags").select("*").order("name"),
      supabase.from("deal_tag_assignments").select("deal_id, tag_id"),
    ]);
    if (stagesRes.data) setStages(stagesRes.data);
    if (dealsRes.data) setDeals(dealsRes.data);
    if (tagsRes.data) setAllTags(tagsRes.data);
    if (assignmentsRes.data) {
      const map: Record<string, string[]> = {};
      assignmentsRes.data.forEach((a) => {
        if (!map[a.deal_id]) map[a.deal_id] = [];
        map[a.deal_id].push(a.tag_id);
      });
      setDealTagMap(map);
    }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredDeals = useMemo(() => {
    let result = deals;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        d.contact_name?.toLowerCase().includes(q) ||
        d.contact_email?.toLowerCase().includes(q)
      );
    }
    if (sourceFilter !== "all") {
      result = result.filter((d) => d.source === sourceFilter);
    }
    if (selectedTags.length > 0) {
      result = result.filter((d) => {
        const tags = dealTagMap[d.id] || [];
        return selectedTags.some((t) => tags.includes(t));
      });
    }
    return result;
  }, [deals, searchQuery, sourceFilter, selectedTags, dealTagMap]);

  const totalDeals = filteredDeals.length;
  const totalValue = filteredDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const wonDeals = filteredDeals.filter((d) => d.converted_at).length;
  const closedDeals = filteredDeals.filter((d) => d.converted_at || d.lost_at).length;
  const conversionRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0;

  function isWonStage(stage: Stage) {
    const n = stage.name.toLowerCase();
    return n.includes("výhra") || n.includes("vyhra");
  }

  function isLostStage(stage: Stage) {
    return stage.name.toLowerCase().includes("prohra");
  }

  async function handleDragEnd(result: DropResult) {
    const { draggableId, destination } = result;
    if (!destination) return;
    const newStageId = destination.droppableId;
    const deal = deals.find((d) => d.id === draggableId);
    if (!deal || deal.stage_id === newStageId) return;
    const targetStage = stages.find((s) => s.id === newStageId);
    if (!targetStage) return;

    setDeals((prev) => prev.map((d) => d.id === draggableId ? { ...d, stage_id: newStageId } : d));

    if (isWonStage(targetStage)) {
      await supabase.from("deals").update({ stage_id: newStageId, converted_at: new Date().toISOString() }).eq("id", draggableId);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      toast.success("Deal označen jako výhra!");
      triggerAutomation(draggableId, "deal_won", { newStageName: targetStage.name });
      if (deal.source === "meta") {
        fetch("/api/meta/conversion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dealId: draggableId, dealValue: deal.value, contactEmail: deal.contact_email, contactPhone: deal.contact_phone }),
        }).catch(() => {});
      }
      return;
    }
    if (isLostStage(targetStage)) {
      setLostDialog({ open: true, dealId: draggableId, stageId: newStageId });
      return;
    }
    await supabase.from("deals").update({ stage_id: newStageId }).eq("id", draggableId);
    toast.success(`Deal přesunut do "${targetStage.name}"`);
    triggerAutomation(draggableId, "stage_change", { newStageName: targetStage.name });
  }

  async function triggerAutomation(dealId: string, triggerType: string, triggerData: Record<string, string>) {
    try {
      await fetch("/api/automations/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, triggerType, triggerData }),
      });
    } catch {
      // Silently fail — automations are non-critical
    }
  }

  async function handleLostConfirm(reason: string) {
    if (!lostDialog.dealId || !lostDialog.stageId) return;
    await supabase.from("deals").update({ stage_id: lostDialog.stageId, lost_at: new Date().toISOString(), lost_reason: reason }).eq("id", lostDialog.dealId);
    triggerAutomation(lostDialog.dealId, "deal_lost", { reason });
    setLostDialog({ open: false, dealId: null, stageId: null });
    toast.info("Deal označen jako prohra.");
  }

  function handleLostCancel() {
    if (lostDialog.dealId) fetchData();
    setLostDialog({ open: false, dealId: null, stageId: null });
  }

  async function handleDeleteDeal(dealId: string) {
    setDeals((prev) => prev.filter((d) => d.id !== dealId));
    await supabase.from("deals").delete().eq("id", dealId);
    toast.success("Deal smazán.");
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  }

  if (loading) return <PipelineSkeleton />;

  return (
    <ModuleGate moduleKey="crm" moduleName="Obchodní příležitosti" moduleDescription="Kanban board pro správu obchodních případů — sledujte každý deal od prvního kontaktu po uzavření.">
    <div className="flex h-full flex-col bg-[#FAFBFC]">
      {/* Header — clean, no box */}
      <div className="px-6 md:px-8 pt-6 pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--card-text)]">Obchodní příležitosti</h1>
            <p className="mt-1 text-sm text-[var(--card-text-dim)]">
              {totalDeals} dealů • {formatCompactCZK(totalValue)} • {conversionRate}% konverze
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--card-text-dim)]" />
              <input
                placeholder="Hledat deal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-full border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-10 pr-4 text-sm text-[var(--input-text)] shadow-sm outline-none transition placeholder:text-[var(--input-placeholder)] focus:border-gray-300 focus:ring-2 focus:ring-gray-100"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36 rounded-full border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny zdroje</SelectItem>
                <SelectItem value="meta">Meta Ads</SelectItem>
                <SelectItem value="manual">Manuální</SelectItem>
                <SelectItem value="referral">Doporučení</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setSheetOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Nový deal
            </button>
          </div>
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-[var(--card-text-dim)]" />
            {allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                  selectedTags.includes(tag.id)
                    ? "border-transparent text-white shadow-sm"
                    : "border-[var(--card-border)] text-[var(--card-text-muted)] hover:border-gray-300"
                }`}
                style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : undefined}
              >
                {tag.name}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button onClick={() => setSelectedTags([])} className="text-xs text-[var(--card-text-dim)] hover:text-[var(--card-text-muted)]">Zrušit</button>
            )}
          </div>
        )}
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto px-4 md:px-6 pb-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3" style={{ minWidth: stages.length * 296 }}>
            {stages.map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.stage_id === stage.id);
              const stageTotal = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);
              return (
                <div key={stage.id} className="flex min-w-[280px] w-[280px] shrink-0 flex-col rounded-xl bg-[var(--card-bg)]/60 p-2 backdrop-blur-sm">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-2 px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[var(--card-text-muted)] uppercase tracking-wide">{stage.name}</span>
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--table-header)] px-1.5 text-xs text-[var(--card-text-muted)]">
                        {stageDeals.length}
                      </span>
                    </div>
                  </div>
                  {stageTotal > 0 && (
                    <p className="text-xs text-[var(--card-text-dim)] px-2 mb-2">{formatCZK(stageTotal)}</p>
                  )}

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-0 transition-colors duration-150 rounded-lg ${snapshot.isDraggingOver ? "bg-blue-50/40" : ""}`}
                        style={{ minHeight: 60 }}
                      >
                        {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-[var(--card-border)]">
                            <p className="text-xs text-[var(--card-text-dim)]">Přetáhněte sem</p>
                          </div>
                        )}
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                style={{ ...prov.draggableProps.style, transition: snap.isDragging ? undefined : "transform 150ms ease" }}
                              >
                                <DealCard
                                  deal={deal}
                                  tags={allTags.filter((t) => (dealTagMap[deal.id] || []).includes(t.id))}
                                  isDragging={snap.isDragging}
                                  stageColor={stage.color}
                                  onClick={() => router.push(`/advisor/crm/deals/${deal.id}`)}
                                  onDelete={() => handleDeleteDeal(deal.id)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <NewDealSheet open={sheetOpen} onOpenChange={setSheetOpen} stages={stages} onCreated={() => { fetchData(); toast.success("Deal vytvořen!"); }} />
      <LostReasonDialog open={lostDialog.open} onConfirm={handleLostConfirm} onCancel={handleLostCancel} />
    </div>
    </ModuleGate>
  );
}

function PipelineSkeleton() {
  return (
    <div className="flex h-full flex-col bg-[#FAFBFC]">
      <div className="px-8 pt-6 pb-4">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="flex flex-1 gap-3 px-6 pb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-[280px] shrink-0 space-y-2 rounded-xl bg-[var(--card-bg)]/60 p-2">
            <Skeleton className="h-5 w-28 mx-2 mt-1" />
            {[1, 2].map((j) => <Skeleton key={j} className="h-28 w-full rounded-xl" />)}
          </div>
        ))}
      </div>
    </div>
  );
}
