"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Filter, Star, ChevronDown, ChevronUp } from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  is_featured: boolean;
  created_at: string;
}

interface ArticleRecommendation {
  article_id: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "Vše",
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
  obecne: "bg-[var(--table-header)] text-[var(--card-text)]",
};

export default function ClientArticlesPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [recommendedIds, setRecommendedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: client } = await supabase
        .from("clients")
        .select("id, advisor_id")
        .eq("user_id", user.id)
        .single();
      if (!client) {
        setLoading(false);
        return;
      }

      // Fetch published articles from this client's advisor
      const { data: arts } = await supabase
        .from("articles")
        .select("*")
        .eq("advisor_id", client.advisor_id)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      setArticles(arts || []);

      // Fetch article recommendations for this client
      const { data: recs } = await supabase
        .from("article_recommendations")
        .select("article_id")
        .eq("client_id", client.id);

      const recIds = new Set((recs || []).map((r: ArticleRecommendation) => r.article_id));
      setRecommendedIds(recIds);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredArticles =
    selectedCategory === "all"
      ? articles
      : articles.filter((a) => a.category === selectedCategory);

  // Sort: recommended first
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    const aRec = recommendedIds.has(a.id) ? 1 : 0;
    const bRec = recommendedIds.has(b.id) ? 1 : 0;
    return bRec - aRec;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full rounded-lg" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--card-text)]">
          <BookOpen className="h-6 w-6 text-blue-600" />
          Články od poradce
        </h1>
        <p className="mt-1 text-sm text-[var(--card-text-muted)]">
          Užitečné články a tipy od vašeho finančního poradce
        </p>
      </div>

      {/* Category filter tabs */}
      <Tabs
        value={selectedCategory}
        onValueChange={setSelectedCategory}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Vše
          </TabsTrigger>
          <TabsTrigger value="uvery">Úvěry</TabsTrigger>
          <TabsTrigger value="pojisteni">Pojištění</TabsTrigger>
          <TabsTrigger value="investice">Investice</TabsTrigger>
          <TabsTrigger value="dane">Daně</TabsTrigger>
          <TabsTrigger value="obecne">Obecné</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Articles */}
      {sortedArticles.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <BookOpen className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">
            Žádné články
          </p>
          <p className="mt-1 text-sm text-[var(--card-text-dim)]">
            {selectedCategory !== "all"
              ? "Žádné články v této kategorii"
              : "Váš poradce zatím nezveřejnil žádné články"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedArticles.map((article) => {
            const isExpanded = expandedId === article.id;
            const isRecommended = recommendedIds.has(article.id);
            const preview =
              article.content.length > 200
                ? article.content.substring(0, 200) + "..."
                : article.content;

            return (
              <div
                key={article.id}
                className={`rounded-xl border bg-[var(--card-bg)] shadow-sm transition-all ${
                  isRecommended ? "ring-2 ring-amber-200" : ""
                }`}
              >
                <div
                  className="cursor-pointer p-6"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : article.id)
                  }
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-[var(--card-text)]">
                          {article.title}
                        </h3>
                        <Badge
                          className={`text-[10px] ${
                            CATEGORY_COLORS[article.category] ||
                            "bg-[var(--table-header)] text-[var(--card-text)]"
                          }`}
                        >
                          {CATEGORY_LABELS[article.category] || article.category}
                        </Badge>
                        {isRecommended && (
                          <Badge className="text-[10px] bg-amber-100 text-amber-800 gap-1">
                            <Star className="h-3 w-3" />
                            Doporučeno poradcem
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--card-text-muted)]">
                        {new Date(article.created_at).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                    <div className="ml-2 shrink-0 text-[var(--card-text-dim)]">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </div>
                  </div>

                  {!isExpanded && (
                    <p className="text-sm text-[var(--card-text-muted)]">{preview}</p>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t px-6 py-4">
                    <div className="prose prose-sm max-w-none text-[var(--card-text)] whitespace-pre-wrap">
                      {article.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
