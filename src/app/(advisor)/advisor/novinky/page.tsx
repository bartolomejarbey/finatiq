"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { ModuleGate } from "@/components/ModuleGate";

interface NewsItem {
  id: string;
  advisor_id: string | null;
  title: string;
  content: string;
  source_url: string | null;
  category: string | null;
  advisor_comment: string | null;
  is_global: boolean;
  created_at: string;
}

const defaultCategories = [
  "legislativa",
  "trh",
  "produkty",
  "tipy",
  "ostatní",
];

export default function AdvisorNewsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [category, setCategory] = useState("ostatní");
  const [advisorComment, setAdvisorComment] = useState("");

  useEffect(() => {
    async function load() {
      const { data: advisor } = await supabase
        .from("advisors")
        .select("id")
        .single();
      if (!advisor) return;
      setAdvisorId(advisor.id);

      const { data } = await supabase
        .from("news_items")
        .select("*")
        .or(`advisor_id.eq.${advisor.id},is_global.eq.true`)
        .order("created_at", { ascending: false });

      setItems(data || []);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setTitle("");
    setContent("");
    setSourceUrl("");
    setCategory("ostatní");
    setAdvisorComment("");
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(item: NewsItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setSourceUrl(item.source_url || "");
    setCategory(item.category || "ostatní");
    setAdvisorComment(item.advisor_comment || "");
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      advisor_id: advisorId,
      title,
      content,
      source_url: sourceUrl || null,
      category: category || null,
      advisor_comment: advisorComment || null,
    };

    if (editingId) {
      await supabase
        .from("news_items")
        .update(payload)
        .eq("id", editingId);
      toast.success("Novinka upravena.");
    } else {
      await supabase.from("news_items").insert(payload);
      toast.success("Novinka přidána.");
    }

    resetForm();
    setSaving(false);
    setDialogOpen(false);

    // Refetch
    const { data } = await supabase
      .from("news_items")
      .select("*")
      .or(`advisor_id.eq.${advisorId},is_global.eq.true`)
      .order("created_at", { ascending: false });
    setItems(data || []);
  }

  async function handleDelete(id: string) {
    await supabase.from("news_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Novinka smazána.");
  }

  async function handleAddComment(item: NewsItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setSourceUrl(item.source_url || "");
    setCategory(item.category || "ostatní");
    setAdvisorComment(item.advisor_comment || "");
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <ModuleGate moduleKey="news_feed" moduleName="Novinky" moduleDescription="Informujte klienty o důležitých novinkách, změnách v legislativě nebo nových produktech.">
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--card-text)]">
              Správa novinek
            </h1>
            <p className="mt-0.5 text-sm text-[var(--card-text-muted)]">
              {items.length} novinek
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Přidat novinku
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Newspaper className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">
            Žádné novinky
          </p>
          <p className="text-sm text-[var(--card-text-dim)]">
            Přidejte první novinku pro klienty
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    {item.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.category}
                      </Badge>
                    )}
                    {item.is_global && (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                        Globální
                      </Badge>
                    )}
                    <span className="text-[10px] text-[var(--card-text-dim)]">
                      {new Date(item.created_at).toLocaleDateString("cs-CZ")}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--card-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--card-text-muted)] line-clamp-2">
                    {item.content}
                  </p>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Zdroj
                    </a>
                  )}
                  {item.advisor_comment && (
                    <p className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">
                      Komentář: {item.advisor_comment}
                    </p>
                  )}
                </div>
                <div className="ml-3 flex items-center gap-1">
                  {item.is_global && !item.advisor_comment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddComment(item)}
                      title="Přidat komentář"
                    >
                      <Pencil className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                  )}
                  {!item.is_global && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Upravit novinku" : "Nová novinka"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Nadpis *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Nadpis novinky"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Obsah *</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={4}
                placeholder="Text novinky..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">URL zdroje</Label>
                <Input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {defaultCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Komentář poradce</Label>
              <Textarea
                value={advisorComment}
                onChange={(e) => setAdvisorComment(e.target.value)}
                rows={2}
                placeholder="Váš komentář ke zprávě..."
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId ? "Uložit" : "Přidat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </ModuleGate>
  );
}
