"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIChatWidget({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Dobrý den! Jsem váš finanční asistent. Jak vám mohu pomoci?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, message: text }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || data.error || "Omlouvám se, něco se pokazilo." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Nepodařilo se spojit s asistentem. Zkuste to později." },
      ]);
    }

    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, var(--color-primary, #06b6d4), var(--color-secondary, #3b82f6))" }}
        aria-label="Otevřít chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border overflow-hidden"
      style={{
        height: "min(500px, calc(100vh - 6rem))",
        backgroundColor: "var(--card-bg, #ffffff)",
        borderColor: "var(--card-border, #e2e8f0)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ background: "linear-gradient(135deg, var(--color-primary, #06b6d4), var(--color-secondary, #3b82f6))" }}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Finanční asistent</span>
        </div>
        <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/20 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "text-white rounded-br-md"
                  : "rounded-bl-md"
              }`}
              style={
                msg.role === "user"
                  ? { backgroundColor: "var(--color-primary, #2563eb)" }
                  : { backgroundColor: "var(--table-hover, #f1f5f9)", color: "var(--card-text, #1e293b)" }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-4 py-2.5" style={{ backgroundColor: "var(--table-hover, #f1f5f9)" }}>
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--card-text-dim, #9ca3af)" }} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-2 border-t p-3"
        style={{ borderColor: "var(--card-border, #e2e8f0)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Napište svůj dotaz..."
          className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2"
          style={{
            backgroundColor: "var(--table-hover, #f8fafc)",
            borderColor: "var(--card-border, #e2e8f0)",
            color: "var(--card-text, #1e293b)",
          }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white disabled:opacity-40 transition-colors"
          style={{ backgroundColor: "var(--color-primary, #2563eb)" }}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
