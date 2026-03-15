"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, X, Send, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  advisor_id: string;
  advisors?: { company_name: string; email: string } | null;
}

interface Message {
  id: string;
  ticket_id: string;
  message: string;
  sender_type: string;
  created_at: string;
}

export function SuperadminChatWidget() {
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("id, subject, status, advisor_id, advisors(company_name, email)")
      .in("status", ["open", "in_progress", "waiting"])
      .order("created_at", { ascending: false })
      .limit(20);
    setTickets((data as Ticket[]) || []);
    setUnreadTotal((data || []).length);
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel("chat-widget-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (selectedTicket && msg.ticket_id === selectedTicket.id) {
            setMessages((prev) => [...prev, msg]);
          }
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (!selectedTicket) return;
    (async () => {
      const { data } = await supabase
        .from("ticket_messages")
        .select("id, ticket_id, message, sender_type, created_at")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    })();
  }, [selectedTicket, supabase]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedTicket || sending) return;
    setSending(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_type: "superadmin",
      sender_id: user?.id,
      message: newMsg.trim(),
    });

    fetch("/api/tickets/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "reply",
        advisorName: selectedTicket.advisors?.company_name,
        advisorEmail: selectedTicket.advisors?.email,
        message: newMsg.trim(),
      }),
    }).catch(() => {});

    setNewMsg("");
    setSending(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
        {!open && unreadTotal > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-white rounded-xl shadow-2xl border flex flex-col overflow-hidden">
          {selectedTicket ? (
            <>
              <div className="p-3 border-b flex items-center gap-2 bg-slate-50">
                <button onClick={() => setSelectedTicket(null)}>
                  <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedTicket.subject}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedTicket.advisors?.company_name}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.sender_type === "superadmin"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                        m.sender_type === "superadmin"
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {m.message}
                      <p
                        className={`text-[10px] mt-1 ${
                          m.sender_type === "superadmin"
                            ? "text-blue-200"
                            : "text-slate-400"
                        }`}
                      >
                        {new Date(m.created_at).toLocaleTimeString("cs-CZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEnd} />
              </div>

              <div className="p-3 border-t flex gap-2">
                <Input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder="Napište zprávu..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button size="sm" onClick={sendMessage} disabled={sending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 border-b bg-slate-50">
                <h3 className="font-semibold text-sm">Otevřené tikety</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {tickets.length === 0 && (
                  <p className="p-6 text-center text-sm text-slate-400">
                    Žádné otevřené tikety
                  </p>
                )}
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="w-full text-left p-3 border-b hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {t.subject}
                      </p>
                      <Badge
                        className={
                          t.status === "open"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t.advisors?.company_name}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
