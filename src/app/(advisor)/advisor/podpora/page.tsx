"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Send,
  Loader2,
  Ticket,
  Clock,
  ChevronDown,
  ChevronUp,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";

interface TicketRow {
  id: string;
  advisor_id: string;
  subject: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  created_at: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Novy",
  in_progress: "Resi se",
  waiting: "Ceka",
  resolved: "Vyreseno",
  closed: "Uzavreno",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  waiting: "bg-purple-100 text-purple-700 border-purple-200",
  resolved: "bg-green-100 text-green-700 border-green-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: "Technicky problem",
  billing: "Fakturace",
  feature_request: "Funkce",
  question: "Obecny dotaz",
};

function relativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "prave ted";
  if (diffMin < 60) return `pred ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `pred ${diffH} hod`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `pred ${diffD} dny`;
  return date.toLocaleDateString("cs-CZ");
}

export default function PodporaPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [advisorId, setAdvisorId] = useState("");

  // New ticket form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("question");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Expanded ticket + messages
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: adv } = await supabase
        .from("advisors")
        .select("id")
        .single();
      if (!adv) {
        setLoading(false);
        return;
      }
      setAdvisorId(adv.id);

      const { data } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      setTickets(data || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMessages = useCallback(
    async (ticketId: string) => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      setLoadingMessages(false);
    },
    [supabase]
  );

  function handleToggleExpand(ticketId: string) {
    if (expandedId === ticketId) {
      setExpandedId(null);
      setMessages([]);
      setReplyText("");
    } else {
      setExpandedId(ticketId);
      loadMessages(ticketId);
      setReplyText("");
    }
  }

  async function handleSubmitTicket() {
    if (!subject.trim()) {
      toast.error("Vyplnte predmet tiketu.");
      return;
    }
    setSubmitting(true);

    let attachmentUrl: string | null = null;
    if (attachment) {
      const fileName = `${advisorId}/${Date.now()}_${attachment.name}`;
      const { error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(fileName, attachment);
      if (uploadError) {
        console.error("Upload error:", uploadError.message);
      } else {
        const { data: urlData } = supabase.storage
          .from("ticket-attachments")
          .getPublicUrl(fileName);
        attachmentUrl = urlData.publicUrl;
      }
    }

    const { data: newTicket, error } = await supabase
      .from("tickets")
      .insert({
        advisor_id: advisorId,
        subject: subject.trim(),
        description: description.trim() || null,
        category,
        priority: "medium",
        attachment_url: attachmentUrl,
      })
      .select()
      .single();

    if (error) {
      toast.error("Chyba pri vytvareni tiketu: " + error.message);
      setSubmitting(false);
      return;
    }

    // Notify via API
    try {
      await fetch("/api/tickets/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: newTicket.id }),
      });
    } catch {
      // notification failure is non-critical
    }

    setTickets((prev) => [newTicket, ...prev]);
    setSubject("");
    setCategory("question");
    setDescription("");
    setAttachment(null);
    setSubmitting(false);
    toast.success("Tiket vytvoren, budeme se vam venovat.");
  }

  async function handleSendReply() {
    if (!replyText.trim() || !expandedId) return;
    setSendingReply(true);

    const { data: msg, error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: expandedId,
        sender_role: "advisor",
        message: replyText.trim(),
      })
      .select()
      .single();

    if (error) {
      toast.error("Chyba pri odeslani zpravy.");
      setSendingReply(false);
      return;
    }

    setMessages((prev) => [...prev, msg]);
    setReplyText("");
    setSendingReply(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-2xl font-bold gradient-text">Podpora</h1>

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">
            <Ticket className="h-4 w-4" />
            Moje tikety
          </TabsTrigger>
          <TabsTrigger value="new">
            <MessageCircle className="h-4 w-4" />
            Novy tiket
          </TabsTrigger>
        </TabsList>

        {/* Moje tikety */}
        <TabsContent value="tickets">
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Ticket className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
              <p className="text-lg font-medium text-[var(--card-text-dim)]">
                Zadne tikety
              </p>
              <p className="text-sm text-[var(--card-text-muted)]">
                Zatim jste nevytvorili zadny tiket.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-xl border bg-[var(--card-bg)] shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Ticket header */}
                  <button
                    onClick={() => handleToggleExpand(ticket.id)}
                    className="flex w-full items-center gap-4 p-4 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-[var(--card-text)] truncate">
                          {ticket.subject}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${STATUS_COLORS[ticket.status] || STATUS_COLORS.open}`}
                        >
                          {STATUS_LABELS[ticket.status] || ticket.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--card-text-muted)]">
                        <span>{CATEGORY_LABELS[ticket.category] || ticket.category}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {relativeTime(ticket.created_at)}
                        </span>
                        <span className="capitalize">{ticket.priority}</span>
                      </div>
                    </div>
                    {expandedId === ticket.id ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-[var(--card-text-dim)]" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-[var(--card-text-dim)]" />
                    )}
                  </button>

                  {/* Expanded messages */}
                  {expandedId === ticket.id && (
                    <div className="border-t px-4 pb-4">
                      {ticket.description && (
                        <p className="mt-3 text-sm text-[var(--card-text-muted)] bg-[var(--table-hover)] rounded-lg p-3">
                          {ticket.description}
                        </p>
                      )}

                      {/* Messages thread */}
                      <div className="mt-4 space-y-3">
                        {loadingMessages ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-[var(--card-text-dim)]" />
                          </div>
                        ) : messages.length === 0 ? (
                          <p className="py-4 text-center text-xs text-[var(--card-text-dim)]">
                            Zatim zadne zpravy.
                          </p>
                        ) : (
                          messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`rounded-lg p-3 text-sm ${
                                msg.sender_role === "admin"
                                  ? "bg-blue-50 border border-blue-100 ml-0 mr-8"
                                  : "bg-[var(--table-hover)] ml-8 mr-0"
                              }`}
                            >
                              <div className="mb-1 flex items-center gap-2 text-[10px] text-[var(--card-text-dim)]">
                                <span className="font-medium">
                                  {msg.sender_role === "admin" ? "Podpora" : "Vy"}
                                </span>
                                <span>{new Date(msg.created_at).toLocaleString("cs-CZ")}</span>
                              </div>
                              <p className="text-[var(--card-text)] whitespace-pre-wrap">
                                {msg.message}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Reply */}
                      <div className="mt-4 flex gap-2">
                        <Textarea
                          placeholder="Napiste odpoved..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          className="min-h-[60px] flex-1"
                        />
                        <Button
                          onClick={handleSendReply}
                          disabled={sendingReply || !replyText.trim()}
                          size="sm"
                          className="self-end"
                        >
                          {sendingReply ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Novy tiket */}
        <TabsContent value="new">
          <div className="mt-4 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
            <div className="space-y-5">
              <div className="space-y-1">
                <Label className="text-xs">Predmet *</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Strucny popis problemu"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technicky problem</SelectItem>
                    <SelectItem value="billing">Fakturace</SelectItem>
                    <SelectItem value="feature_request">Pozadavek na funkci</SelectItem>
                    <SelectItem value="question">Obecny dotaz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Popis</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Podrobnejsi popis vaseho problemu nebo dotazu..."
                  rows={5}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Priloha (volitelne)</Label>
                <div className="flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2 text-sm text-[var(--card-text-muted)] hover:bg-[var(--table-hover)] transition-colors">
                    <Paperclip className="h-4 w-4" />
                    {attachment ? attachment.name : "Vybrat soubor"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) =>
                        setAttachment(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                  {attachment && (
                    <button
                      onClick={() => setAttachment(null)}
                      className="text-xs text-[var(--card-text-dim)] hover:text-red-500"
                    >
                      Odebrat
                    </button>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSubmitTicket}
                disabled={submitting || !subject.trim()}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Odeslat tiket
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
