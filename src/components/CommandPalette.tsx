"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  Users,
  Briefcase,
  ArrowRight,
  Loader2,
  Command,
} from "lucide-react";

interface SearchResult {
  label: string;
  href: string;
  type: string;
  subtitle?: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  page: FileText,
  client: Users,
  deal: Briefcase,
};

const TYPE_LABELS: Record<string, string> = {
  page: "Stránka",
  client: "Klient",
  deal: "Deal",
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search with debounce
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    setSelectedIndex(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 200);
  }

  function handleSelect(result: SearchResult) {
    setOpen(false);
    router.push(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg mx-4 overflow-hidden rounded-xl border shadow-2xl"
        style={{
          backgroundColor: "var(--card-bg, #ffffff)",
          borderColor: "var(--border-color, #e2e8f0)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div
          className="flex items-center gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--border-color, #e2e8f0)" }}
        >
          <Search className="h-5 w-5 shrink-0" style={{ color: "var(--text-secondary, #94a3b8)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hledat stránky, klienty, dealy..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
            style={{ color: "var(--text-primary, #0f172a)" }}
          />
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-secondary, #94a3b8)" }} />
          )}
          <kbd
            className="hidden sm:inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono"
            style={{
              borderColor: "var(--border-color, #e2e8f0)",
              color: "var(--text-secondary, #94a3b8)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto py-2">
            {results.map((result, i) => {
              const Icon = TYPE_ICONS[result.type] || FileText;
              return (
                <button
                  key={`${result.href}-${i}`}
                  onClick={() => handleSelect(result)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{
                    backgroundColor: i === selectedIndex ? "var(--table-hover, #f8fafc)" : "transparent",
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--color-primary, #06b6d4)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary, #0f172a)" }}>
                      {result.label}
                    </p>
                    {result.subtitle && (
                      <p className="truncate text-xs" style={{ color: "var(--text-secondary, #94a3b8)" }}>
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: "var(--table-hover, #f1f5f9)",
                      color: "var(--text-secondary, #64748b)",
                    }}
                  >
                    {TYPE_LABELS[result.type] || result.type}
                  </span>
                  {i === selectedIndex && (
                    <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "var(--text-secondary, #94a3b8)" }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary, #94a3b8)" }}>
              Žádné výsledky pro &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {/* Hint */}
        {query.length < 2 && (
          <div className="py-8 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary, #94a3b8)" }}>
              Zadejte alespoň 2 znaky pro vyhledávání
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Trigger button for navbar */
export function CommandPaletteTrigger() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", metaKey: true })
        );
      }}
      className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:shadow-sm"
      style={{
        borderColor: "var(--border-color, #e2e8f0)",
        color: "var(--text-secondary, #64748b)",
        backgroundColor: "var(--table-hover, #f8fafc)",
      }}
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Hledat...</span>
      <kbd
        className="hidden sm:inline-flex items-center rounded border px-1 py-0.5 text-[10px] font-mono"
        style={{
          borderColor: "var(--border-color, #d1d5db)",
          color: "var(--text-secondary, #94a3b8)",
        }}
      >
        <Command className="mr-0.5 h-2.5 w-2.5" />K
      </kbd>
    </button>
  );
}
