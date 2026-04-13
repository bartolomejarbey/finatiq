"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Newspaper, ExternalLink, MessageCircle } from "lucide-react";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  source_url: string | null;
  category: string | null;
  advisor_comment: string | null;
  is_global: boolean;
  created_at: string;
}

export default function ClientNewsPage() {
  const supabase = createClient();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: client } = await supabase
        .from("clients")
        .select("id, advisor_id")
        .eq("user_id", user.id)
        .single();
      if (!client) return;

      const { data } = await supabase
        .from("news_items")
        .select("*")
        .or(`advisor_id.eq.${client.advisor_id},is_global.eq.true`)
        .order("created_at", { ascending: false });

      setNews(data || []);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = Array.from(
    new Set(news.map((n) => n.category).filter(Boolean))
  );

  const filtered =
    categoryFilter === "all"
      ? news
      : news.filter((n) => n.category === categoryFilter);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-blue-500" />
          <div>
            <h1 className="text-2xl font-bold text-[var(--card-text)]">Novinky</h1>
            <p className="text-sm text-[var(--card-text-muted)]">
              {filtered.length} článků — aktuality a doporučení od vašeho poradce
            </p>
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Kategorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c!} value={c!}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <Newspaper className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
          <p className="text-lg font-medium text-[var(--card-text-dim)]">
            Žádné novinky
          </p>
          <p className="mt-2 max-w-md text-center text-sm text-[var(--card-text-muted)]">
            Váš poradce sem bude přidávat důležité informace, tipy a novinky z finančního světa relevantní pro vaši situaci.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {item.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {item.category}
                      </Badge>
                    )}
                    <span className="text-xs text-[var(--card-text-muted)]">
                      {new Date(item.created_at).toLocaleDateString("cs-CZ")}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--card-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--card-text-muted)] whitespace-pre-wrap">
                    {item.content}
                  </p>
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Zdroj
                    </a>
                  )}
                </div>
              </div>
              {item.advisor_comment && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3">
                  <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <p className="text-sm text-blue-800">
                    {item.advisor_comment}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
