"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
};

type OtherUser = {
  id: string;
  full_name: string;
};

type Request = {
  id: string;
  title: string;
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [request, setRequest] = useState<Request | null>(null);

  const requestId = params.requestId as string;
  const otherUserId = params.userId as string;

  async function loadMessages(userId: string) {
    const { data } = await supabase
      .from("messages")
      .select("id, content, sender_id, created_at")
      .eq("request_id", requestId)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    if (data) {
      setMessages(data);
    }
  }

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }
      
      setCurrentUser(user.id);

      // Načteme info o druhém uživateli
      const { data: userData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", otherUserId)
        .single();
      
      if (userData) {
        setOtherUser(userData);
      }

      // Načteme info o poptávce
      const { data: requestData } = await supabase
        .from("requests")
        .select("id, title")
        .eq("id", requestId)
        .single();
      
      if (requestData) {
        setRequest(requestData);
      }

      // Načteme zprávy
      await loadMessages(user.id);

      // Označíme zprávy jako přečtené
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("request_id", requestId)
        .eq("sender_id", otherUserId)
        .eq("receiver_id", user.id);

      setLoading(false);
    }

    loadData();
  }, [requestId, otherUserId, router]);

  useEffect(() => {
    // Real-time subscription pro nové zprávy
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Přidáme zprávu pokud je součástí této konverzace
          if (
            (newMsg.sender_id === currentUser && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUser)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, currentUser, otherUserId]);

  useEffect(() => {
    // Scroll na konec při nové zprávě
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    setSending(true);

    const { error } = await supabase.from("messages").insert({
      request_id: requestId,
      sender_id: currentUser,
      receiver_id: otherUserId,
      content: newMessage.trim(),
    });

    if (!error) {
      // Notifikace pro příjemce
      await supabase.from("notifications").insert({
        user_id: otherUserId,
        type: "new_message",
        title: "Nová zpráva",
        message: `Máte novou zprávu: "${newMessage.trim().substring(0, 50)}${newMessage.trim().length > 50 ? "..." : ""}"`,
        link: `/zpravy/${requestId}/${currentUser}`,
      });

      setNewMessage("");
      await loadMessages(currentUser);
    }

    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Načítám...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hlavička */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/zpravy" className="text-blue-600 hover:underline text-sm">
              ← Zpět na zprávy
            </Link>
            <h1 className="font-semibold">{otherUser?.full_name}</h1>
            <p className="text-sm text-gray-500">{request?.title}</p>
          </div>
          <Link
            href={`/poptavka/${requestId}`}
            className="text-blue-600 hover:underline text-sm"
          >
            Zobrazit poptávku
          </Link>
        </div>
      </nav>

      {/* Zprávy */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl mx-auto w-full">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Zatím žádné zprávy. Napište první!
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === currentUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                    msg.sender_id === currentUser
                      ? "bg-blue-600 text-white"
                      : "bg-white shadow"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.sender_id === currentUser ? "text-blue-200" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString("cs-CZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Formulář pro odeslání */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Napište zprávu..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "..." : "Odeslat"}
          </button>
        </form>
      </div>
    </div>
  );
}