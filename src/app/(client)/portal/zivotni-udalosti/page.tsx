"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  Baby,
  Scale,
  Briefcase,
  AlertCircle,
  Home,
  Building,
  Clock,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = [
  { value: "marriage", label: "Svatba", icon: Heart, color: "bg-pink-100 text-pink-700" },
  { value: "baby", label: "Narození dítěte", icon: Baby, color: "bg-blue-100 text-blue-700" },
  { value: "divorce", label: "Rozvod", icon: Scale, color: "bg-[var(--table-header)] text-[var(--card-text)]" },
  { value: "new_job", label: "Nové zaměstnání", icon: Briefcase, color: "bg-green-100 text-green-700" },
  { value: "job_loss", label: "Ztráta zaměstnání", icon: AlertCircle, color: "bg-red-100 text-red-700" },
  { value: "buy_property", label: "Koupě nemovitosti", icon: Home, color: "bg-amber-100 text-amber-700" },
  { value: "sell_property", label: "Prodej nemovitosti", icon: Building, color: "bg-orange-100 text-orange-700" },
  { value: "retirement", label: "Odchod do důchodu", icon: Clock, color: "bg-purple-100 text-purple-700" },
  { value: "other", label: "Jiná změna", icon: Sparkles, color: "bg-cyan-100 text-cyan-700" },
] as const;

const ADVISOR_ACTIONS: Record<string, string> = {
  marriage: "Aktualizujte finanční plán pro pár, zkontrolujte pojištění",
  baby: "Zkontrolujte pojistnou ochranu, nabídněte spoření pro dítě",
  divorce: "Oddělte finance, aktualizujte smlouvy",
  new_job: "Aktualizujte finanční plán, zkontrolujte příjmy",
  job_loss: "Zkontrolujte nouzovou rezervu, upravte výdaje",
  buy_property: "Nabídněte pojištění nemovitosti, zkontrolujte hypotéku",
  sell_property: "Aktualizujte portfolio, zvažte reinvestici",
  retirement: "Zkontrolujte důchodové spoření, optimalizujte portfolio",
  other: "Zkontrolujte aktuální finanční situaci klienta",
};

interface LifeEvent {
  id: string;
  event_type: string;
  description: string | null;
  event_date: string;
  advisor_notified: boolean;
  advisor_action: string | null;
  created_at: string;
}

export default function ZivotniUdalostiPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchEvents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchEvents() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!client) return;

    const { data } = await supabase
      .from("life_events")
      .select("*")
      .eq("client_id", client.id)
      .order("event_date", { ascending: false });

    setEvents(data || []);
    setLoading(false);
  }

  async function handleSubmit() {
    if (!eventType) {
      toast.error("Vyberte typ události");
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: client } = await supabase
      .from("clients")
      .select("id, advisor_id, first_name, last_name")
      .eq("user_id", user.id)
      .single();
    if (!client) return;

    const advisorAction = ADVISOR_ACTIONS[eventType] || ADVISOR_ACTIONS.other;
    const eventLabel = EVENT_TYPES.find((e) => e.value === eventType)?.label || eventType;

    // Insert life event
    const { error: eventError } = await supabase.from("life_events").insert({
      advisor_id: client.advisor_id,
      client_id: client.id,
      event_type: eventType,
      description: description || null,
      event_date: eventDate,
      advisor_notified: true,
      advisor_action: advisorAction,
    });

    if (eventError) {
      toast.error("Chyba při ukládání události: " + eventError.message);
      setSubmitting(false);
      return;
    }

    // Notify advisor
    const { error: notifError } = await supabase.from("client_notifications").insert({
      advisor_id: client.advisor_id,
      client_id: client.id,
      type: "life_event",
      title: `Životní událost: ${eventLabel}`,
      message: `${client.first_name} ${client.last_name} nahlásil/a: ${eventLabel}. Doporučená akce: ${advisorAction}`,
      is_read: false,
    });
    if (notifError) console.error("Chyba při odesílání notifikace:", notifError.message);

    toast.success("Životní událost nahlášena. Váš poradce bude informován.");
    setShowForm(false);
    setEventType("");
    setDescription("");
    setEventDate(new Date().toISOString().split("T")[0]);
    setSubmitting(false);
    fetchEvents();
  }

  function getEventMeta(type: string) {
    return EVENT_TYPES.find((e) => e.value === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--card-text)]">Životní události</h1>
          <p className="text-sm text-[var(--card-text-muted)] mt-1">
            Informujte poradce o důležitých změnách ve vašem životě
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="mr-2 h-4 w-4" /> Zrušit
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" /> Nahlásit životní změnu
            </>
          )}
        </Button>
      </div>

      {/* Report form */}
      {showForm && (
        <div className="mb-6 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--card-text)] mb-4">
            Nahlásit životní změnu
          </h2>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Typ události</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte typ události" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Datum</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Poznámka (volitelné)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Další podrobnosti pro vašeho poradce..."
                rows={3}
              />
            </div>

            {eventType && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Poradce obdrží doporučení:</strong>{" "}
                  {ADVISOR_ACTIONS[eventType] || ADVISOR_ACTIONS.other}
                </p>
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting || !eventType}>
              {submitting ? "Odesílám..." : "Nahlásit událost"}
            </Button>
          </div>
        </div>
      )}

      {/* Event history */}
      <div className="rounded-xl border bg-[var(--card-bg)] shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
            Historie událostí
          </h2>
        </div>

        {events.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[var(--card-text-muted)]">
            Zatím žádné nahlášené události
          </p>
        ) : (
          <div className="divide-y">
            {events.map((event) => {
              const meta = getEventMeta(event.event_type);
              const Icon = meta.icon;
              return (
                <div key={event.id} className="flex items-start gap-4 px-6 py-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--card-text)]">
                        {meta.label}
                      </span>
                      <Badge
                        className={`text-[10px] ${
                          event.advisor_notified
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {event.advisor_notified
                          ? "Poradce informován"
                          : "Čeká na odeslání"}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="text-sm text-[var(--card-text-muted)] mt-1">
                        {event.description}
                      </p>
                    )}
                    {event.advisor_action && (
                      <p className="text-xs text-blue-600 mt-1">
                        Doporučená akce: {event.advisor_action}
                      </p>
                    )}
                    <p className="text-xs text-[var(--card-text-muted)] mt-1">
                      {new Date(event.event_date).toLocaleDateString("cs-CZ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
