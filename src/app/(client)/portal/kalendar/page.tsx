"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { usePortalForm } from "@/lib/forms/use-portal-form";

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
}

interface ClientRecord {
  id: string;
  first_name: string;
  last_name: string;
  advisor_id: string;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
  });
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DAYS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek"];
const HOURS = Array.from({ length: 8 }, (_, i) => i + 9); // 9-16 (slots 9:00-17:00)

export default function KlientKalendarPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(
    getMonday(new Date())
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    day: Date;
    hour: number;
  } | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const bookingForm = usePortalForm<"title">();

  async function fetchData() {
      setLoading(true);
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, advisor_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (clientError && clientError.code !== "PGRST116") {
        setError("Nepodařilo se načíst klientský profil.");
        setLoading(false);
        return;
      }

      if (clientData) {
        setClient(clientData);

        const { data: appts, error: appointmentsError } = await supabase
          .from("appointments")
          .select("*")
          .eq("client_id", clientData.id)
          .eq("status", "scheduled")
          .gt("start_time", new Date().toISOString())
          .order("start_time", { ascending: true });
        if (appointmentsError) {
          setError("Nepodařilo se načíst schůzky.");
          setLoading(false);
          return;
        }

        setAppointments(appts || []);
      }
      setLoading(false);
    }
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePrevWeek() {
    const prev = new Date(selectedWeekStart);
    prev.setDate(prev.getDate() - 7);
    setSelectedWeekStart(prev);
  }

  function handleNextWeek() {
    const next = new Date(selectedWeekStart);
    next.setDate(next.getDate() + 7);
    setSelectedWeekStart(next);
  }

  function handleSlotClick(dayIndex: number, hour: number) {
    const day = new Date(selectedWeekStart);
    day.setDate(day.getDate() + dayIndex);
    setSelectedSlot({ day, hour });
    setFormTitle("");
    setFormDescription("");
    setSheetOpen(true);
  }

  function getSlotStartTime(): string {
    if (!selectedSlot) return "";
    const d = new Date(selectedSlot.day);
    d.setHours(selectedSlot.hour, 0, 0, 0);
    return d.toISOString();
  }

  function getSlotEndTime(): string {
    if (!selectedSlot) return "";
    const d = new Date(selectedSlot.day);
    d.setHours(selectedSlot.hour + 1, 0, 0, 0);
    return d.toISOString();
  }

  function getSlotLabel(): string {
    if (!selectedSlot) return "";
    const d = new Date(selectedSlot.day);
    return `${d.toLocaleDateString("cs-CZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })}, ${selectedSlot.hour}:00 - ${selectedSlot.hour + 1}:00`;
  }

  async function handleSubmit() {
    if (!bookingForm.validateRequired([{ name: "title", value: formTitle }])) return;
    if (!client || !selectedSlot) return;
    setSubmitting(true);

    const startTime = getSlotStartTime();
    const endTime = getSlotEndTime();

    const { data: appt, error } = await supabase
      .from("appointments")
      .insert({
        advisor_id: client.advisor_id,
        client_id: client.id,
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        start_time: startTime,
        end_time: endTime,
        status: "scheduled",
      })
      .select()
      .single();

    if (error) {
      toast.error("Nepodařilo se vytvořit schůzku.");
      setSubmitting(false);
      return;
    }

    // Create notification for the advisor
    const dateLabel = new Date(startTime).toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const { error: notifError } = await supabase.from("client_notifications").insert({
      advisor_id: client.advisor_id,
      client_id: client.id,
      type: "appointment_booked",
      message: `Klient ${client.first_name} ${client.last_name} si zarezervoval schůzku na ${dateLabel}`,
    });
    if (notifError) console.error("Chyba při odesílání notifikace:", notifError.message);

    setAppointments((prev) => [...prev, appt].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ));
    setSheetOpen(false);
    setSubmitting(false);
    toast.success("Schůzka byla úspěšně zarezervována.");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }
  if (error) return <div className="mx-auto max-w-5xl p-8"><ErrorState description={error} onRetry={fetchData} /></div>;

  const weekEnd = new Date(selectedWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-2xl font-bold gradient-text">
        Rezervace schůzky
      </h1>

      {/* Week navigation */}
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={handlePrevWeek} aria-label="Předchozí týden">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-[var(--card-text)]">
          {formatDate(selectedWeekStart)} &ndash; {formatDate(weekEnd)}
        </span>
        <Button variant="outline" size="sm" onClick={handleNextWeek} aria-label="Další týden">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekly grid */}
      <div className="mb-8 overflow-hidden rounded-xl border bg-[var(--card-bg)] shadow-sm">
        <div className="grid grid-cols-6">
          {/* Header row */}
          <div className="border-b border-r bg-[var(--table-hover)] p-2" />
          {DAYS.map((day, i) => {
            const d = new Date(selectedWeekStart);
            d.setDate(d.getDate() + i);
            return (
              <div
                key={day}
                className="border-b border-r bg-[var(--table-hover)] p-2 text-center text-xs font-medium text-[var(--card-text-muted)]"
              >
                <div>{day}</div>
                <div className="text-[var(--card-text-dim)]">{formatDate(d)}</div>
              </div>
            );
          })}

          {/* Time slots */}
          {HOURS.map((hour) => (
            <>
              <div
                key={`label-${hour}`}
                className="border-b border-r p-2 text-right text-xs text-[var(--card-text-muted)]"
              >
                {hour}:00
              </div>
              {DAYS.map((_, dayIndex) => {
                const slotDate = new Date(selectedWeekStart);
                slotDate.setDate(slotDate.getDate() + dayIndex);
                slotDate.setHours(hour, 0, 0, 0);
                const isPast = slotDate < new Date();

                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className={`border-b border-r p-1 ${
                      isPast
                        ? "bg-[var(--table-hover)] cursor-not-allowed"
                        : "cursor-pointer hover:bg-blue-50 transition-colors"
                    }`}
                    onClick={() => !isPast && handleSlotClick(dayIndex, hour)}
                  >
                    {!isPast && (
                      <span className="text-[10px] text-blue-400">
                        Volné
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Booking Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nová schůzka</SheetTitle>
            <SheetDescription>{getSlotLabel()}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1">
              <FormField
                id="appointment-title"
                label="Název schůzky"
                requiredLabel
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  bookingForm.clearError("title");
                }}
                placeholder="Např. Konzultace k hypotéce"
                ref={bookingForm.registerRef("title")}
                error={bookingForm.errors.title}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Popis (nepovinné)</Label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Další podrobnosti..."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Začátek</Label>
              <Input value={getSlotStartTime() ? `${selectedSlot?.hour}:00` : ""} readOnly />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Konec</Label>
              <Input
                value={
                  selectedSlot ? `${selectedSlot.hour + 1}:00` : ""
                }
                readOnly
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Zarezervovat schůzku
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Upcoming appointments */}
      <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
          <Calendar className="h-4 w-4" />
          Nadcházející schůzky
        </h2>

        {appointments.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-[var(--card-text-dim)]">
            <Calendar className="mb-2 h-10 w-10" />
            <p className="text-sm">Žádné nadcházející schůzky</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-[var(--card-text-muted)]">
                  <th className="pb-2 pr-4 font-medium">Název</th>
                  <th className="pb-2 pr-4 font-medium">Datum</th>
                  <th className="pb-2 pr-4 font-medium">Čas</th>
                  <th className="pb-2 pr-4 font-medium">Místo</th>
                  <th className="pb-2 font-medium">Stav</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium text-[var(--card-text)]">
                      {appt.title}
                    </td>
                    <td className="py-3 pr-4 text-[var(--card-text-muted)]">
                      {formatDateFull(appt.start_time)}
                    </td>
                    <td className="py-3 pr-4 text-[var(--card-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(appt.start_time)} &ndash;{" "}
                        {formatTime(appt.end_time)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--card-text-muted)]">
                      {appt.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {appt.location}
                        </span>
                      ) : (
                        <span className="text-[var(--card-text-dim)]">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700"
                      >
                        Naplánováno
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
