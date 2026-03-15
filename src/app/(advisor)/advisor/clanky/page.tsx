"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FileText, Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  uvery: "Úvěry",
  pojisteni: "Pojištění",
  investice: "Investice",
  dane: "Daně",
  obecne: "Obecné",
};

const CATEGORY_COLORS: Record<string, string> = {
  uvery: "bg-blue-100 text-blue-800",
  pojisteni: "bg-purple-100 text-purple-800",
  investice: "bg-green-100 text-green-800",
  dane: "bg-orange-100 text-orange-800",
  obecne: "bg-slate-100 text-slate-800",
};

export default function AdvisorArticlesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("obecne");
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: advisor } = await supabase
      .from("advisors")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!advisor) {
      setLoading(false);
      return;
    }

    setAdvisorId(advisor.id);

    const { data } = await supabase
      .from("articles")
      .select("*")
      .eq("advisor_id", advisor.id)
      .order("created_at", { ascending: false });

    setArticles(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditingArticle(null);
    setTitle("");
    setContent("");
    setCategory("obecne");
    setIsPublished(false);
    setIsFeatured(false);
    setDialogOpen(true);
  }

  function openEdit(article: Article) {
    setEditingArticle(article);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setIsPublished(article.is_published);
    setIsFeatured(article.is_featured);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!advisorId || !title.trim()) {
      toast.error("Vyplňte název článku");
      return;
    }

    const payload = {
      advisor_id: advisorId,
      title: title.trim(),
      content: content.trim(),
      category,
      is_published: isPublished,
      is_featured: isFeatured,
    };

    if (editingArticle) {
      const { error } = await supabase
        .from("articles")
        .update(payload)
        .eq("id", editingArticle.id);
      if (error) {
        toast.error("Chyba při ukládání");
        return;
      }
      toast.success("Článek upraven");
    } else {
      const { error } = await supabase.from("articles").insert(payload);
      if (error) {
        toast.error("Chyba při ukládání");
        return;
      }
      toast.success("Článek vytvořen");
    }

    setDialogOpen(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Opravdu chcete smazat tento článek?")) return;

    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) {
      toast.error("Chyba při mazání");
      return;
    }

    toast.success("Článek smazán");
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  async function togglePublish(article: Article) {
    const { error } = await supabase
      .from("articles")
      .update({ is_published: !article.is_published })
      .eq("id", article.id);
    if (error) {
      toast.error("Chyba při změně stavu");
      return;
    }
    toast.success(
      article.is_published ? "Článek skryt" : "Článek publikován"
    );
    fetchData();
  }

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--card-text)]">
            <FileText className="h-6 w-6 text-blue-600" />
            Články
          </h1>
          <p className="mt-1 text-sm text-[var(--card-text-muted)]">
            Spravujte články pro své klienty
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Nový článek
        </Button>
      </div>

      {/* Article list */}
      {articles.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <FileText className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">
            Zatím žádné články
          </p>
          <p className="mt-1 text-sm text-[var(--card-text-dim)]">
            Vytvořte první článek pro své klienty
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
          <div className="divide-y">
            {articles.map((article) => (
              <div
                key={article.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-[var(--table-hover)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-[var(--card-text)] truncate">
                      {article.title}
                    </h3>
                    <Badge
                      className={`text-[10px] shrink-0 ${
                        CATEGORY_COLORS[article.category] ||
                        "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {CATEGORY_LABELS[article.category] || article.category}
                    </Badge>
                    <Badge
                      className={`text-[10px] shrink-0 ${
                        article.is_published
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {article.is_published ? "Publikováno" : "Koncept"}
                    </Badge>
                    {article.is_featured && (
                      <Badge className="text-[10px] shrink-0 bg-amber-100 text-amber-800">
                        Doporučený
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--card-text-muted)]">
                    {new Date(article.created_at).toLocaleDateString("cs-CZ")}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublish(article)}
                    className="h-8 w-8 p-0"
                    title={
                      article.is_published ? "Skrýt článek" : "Publikovat článek"
                    }
                  >
                    {article.is_published ? (
                      <EyeOff className="h-4 w-4 text-[var(--card-text-dim)]" />
                    ) : (
                      <Eye className="h-4 w-4 text-[var(--card-text-dim)]" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(article)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4 text-[var(--card-text-dim)]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(article.id)}
                    className="h-8 w-8 p-0 text-[var(--card-text-dim)] hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? "Upravit článek" : "Nový článek"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="article-title">Název *</Label>
              <Input
                id="article-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Název článku"
              />
            </div>
            <div>
              <Label htmlFor="article-content">Obsah</Label>
              <Textarea
                id="article-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Text článku..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uvery">Úvěry</SelectItem>
                  <SelectItem value="pojisteni">Pojištění</SelectItem>
                  <SelectItem value="investice">Investice</SelectItem>
                  <SelectItem value="dane">Daně</SelectItem>
                  <SelectItem value="obecne">Obecné</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                  id="is-published"
                />
                <Label htmlFor="is-published">Publikováno</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                  id="is-featured"
                />
                <Label htmlFor="is-featured">Doporučený</Label>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editingArticle ? "Uložit změny" : "Vytvořit článek"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
