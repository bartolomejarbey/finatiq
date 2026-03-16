"use client";

import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  title: string;
  type: string;
  read: boolean;
  created_at: string;
}

export default function NotificationBell({
  table = "client_notifications",
  idColumn = "client_id",
  entityId,
}: {
  table?: string;
  idColumn?: string;
  entityId: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();
    async function fetch() {
      const { data } = await supabase
        .from(table)
        .select("id, title, type, read, created_at")
        .eq(idColumn, entityId)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications(data || []);
    }
    fetch();

    const channel = supabase
      .channel(`${table}_${entityId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `${idColumn}=eq.${entityId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, idColumn, entityId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from(table).update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllRead() {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from(table).update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  const typeColors: Record<string, string> = {
    payment: "bg-amber-400",
    contract: "bg-blue-400",
    reminder: "bg-violet-400",
    system: "bg-gray-400",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 transition-colors hover:bg-[var(--table-hover,#f1f5f9)]"
        aria-label="Notifikace"
      >
        <Bell className="h-5 w-5" style={{ color: "var(--card-text-dim, #6b7280)" }} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-xl z-50 overflow-hidden"
          style={{
            backgroundColor: "var(--card-bg, #ffffff)",
            borderColor: "var(--card-border, #e2e8f0)",
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "var(--card-border, #e2e8f0)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--card-text, #0f172a)" }}>
              Oznámení
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs transition-colors"
                style={{ color: "var(--color-primary, #2563eb)" }}
              >
                Označit vše jako přečtené
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm" style={{ color: "var(--card-text-dim, #9ca3af)" }}>
                Žádná oznámení
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    backgroundColor: !n.read ? "var(--table-hover, #f8fafc)" : "transparent",
                  }}
                >
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${typeColors[n.type] || "bg-gray-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm truncate ${!n.read ? "font-medium" : ""}`}
                      style={{ color: !n.read ? "var(--card-text, #0f172a)" : "var(--card-text-muted, #6b7280)" }}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--card-text-dim, #9ca3af)" }}>
                      {new Date(n.created_at).toLocaleDateString("cs-CZ", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {!n.read && <div className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: "var(--color-primary, #2563eb)" }} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
