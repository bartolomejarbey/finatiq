"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  status: string;
  client_id: string | null;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

type FilterMode = "today" | "week" | "month";
type ViewMode = "list" | "calendar";

function formatDate(dateStr: string): string {
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

function getStatusBadge(status: string) {
  switch (status) {
    case "scheduled":
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          Naplánováno
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
          Dokončeno
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="secondary" className="bg-red-50 text-red-700">
          Zrušeno
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function AdvisorKalendarPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<FilterMode>("week");
  const [view, setView] = useState<ViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

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

      const { data: appts } = await supabase
        .from("appointments")
        .select("*")
        .eq("advisor_id", adv.id)
        .order("start_time", { ascending: true });

      const { data: cls } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("advisor_id", adv.id);

      setAppointments(appts || []);
      setClients(cls || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getClientName(clientId: string | null): string {
    if (!clientId) return "\u2014";
    const c = clients.find((cl) => cl.id === clientId);
    return c ? `${c.first_name} ${c.last_name}` : "\u2014";
  }

  function getFilteredAppointments(): Appointment[] {
    const now = new Date();
    return appointments.filter((appt) => {
      const start = new Date(appt.start_time);
      if (filter === "today") {
        return start.toDateString() === now.toDateString();
      }
      if (filter === "week") {
        const weekStart = new Date(now);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return start >= weekStart && start < weekEnd;
      }
      if (filter === "month") {
        return (
          start.getMonth() === now.getMonth() &&
          start.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }

  function getAppointmentsForDay(day: number): Appointment[] {
    return appointments.filter((appt) => {
      const d = new Date(appt.start_time);
      return (
        d.getDate() === day &&
        d.getMonth() === calendarMonth &&
        d.getFullYear() === calendarYear
      );
    });
  }

  async function handleUpdateStatus(id: string, status: "completed" | "cancelled") {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast.error("Nepodařilo se aktualizovat stav.");
      return;
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    toast.success(
      status === "completed" ? "Schůzka označena jako dokončená." : "Schůzka byla zrušena."
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const filtered = getFilteredAppointments();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const monthLabel = new Date(calendarYear, calendarMonth).toLocaleDateString(
    "cs-CZ",
    { month: "long", year: "numeric" }
  );

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold gradient-text">Kalendář</h1>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List className="mr-1 h-4 w-4" />
            Seznam
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setView("calendar");
              setSelectedDay(null);
            }}
          >
            <Calendar className="mr-1 h-4 w-4" />
            Kalendář
          </Button>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="mb-6 flex gap-2">
        {([
          ["today", "Dnes"],
          ["week", "Tento týden"],
          ["month", "Tento měsíc"],
        ] as [FilterMode, string][]).map(([key, label]) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* List view */}
      {view === "list" && (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-[var(--card-text-dim)]">
              <Calendar className="mb-2 h-10 w-10" />
              <p className="text-sm">Žádné schůzky pro zvolené období</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-[var(--card-text-muted)]">
                    <th className="p-4 pb-2 font-medium">Datum</th>
                    <th className="p-4 pb-2 font-medium">Čas</th>
                    <th className="p-4 pb-2 font-medium">Klient</th>
                    <th className="p-4 pb-2 font-medium">Název</th>
                    <th className="p-4 pb-2 font-medium">Místo</th>
                    <th className="p-4 pb-2 font-medium">Stav</th>
                    <th className="p-4 pb-2 font-medium">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((appt) => (
                    <tr key={appt.id} className="border-b last:border-0">
                      <td className="p-4 text-[var(--card-text-muted)]">
                        {formatDate(appt.start_time)}
                      </td>
                      <td className="p-4 text-[var(--card-text-muted)]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(appt.start_time)} &ndash;{" "}
                          {formatTime(appt.end_time)}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-[var(--card-text)]">
                        {getClientName(appt.client_id)}
                      </td>
                      <td className="p-4 text-[var(--card-text)]">{appt.title}</td>
                      <td className="p-4 text-[var(--card-text-muted)]">
                        {appt.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {appt.location}
                          </span>
                        ) : (
                          <span className="text-[var(--card-text-dim)]">&mdash;</span>
                        )}
                      </td>
                      <td className="p-4">{getStatusBadge(appt.status)}</td>
                      <td className="p-4">
                        {appt.status === "scheduled" && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                              onClick={() =>
                                handleUpdateStatus(appt.id, "completed")
                              }
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Dokončit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-500 hover:text-red-600"
                              onClick={() =>
                                handleUpdateStatus(appt.id, "cancelled")
                              }
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Zrušit
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Calendar view */}
      {view === "calendar" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm">
            {/* Month navigation */}
            <div className="mb-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (calendarMonth === 0) {
                    setCalendarMonth(11);
                    setCalendarYear((y) => y - 1);
                  } else {
                    setCalendarMonth((m) => m - 1);
                  }
                  setSelectedDay(null);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium capitalize text-[var(--card-text)]">
                {monthLabel}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (calendarMonth === 11) {
                    setCalendarMonth(0);
                    setCalendarYear((y) => y + 1);
                  } else {
                    setCalendarMonth((m) => m + 1);
                  }
                  setSelectedDay(null);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 text-center text-xs font-medium text-[var(--card-text-dim)]">
              {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="h-14" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayAppts = getAppointmentsForDay(day);
                const isToday =
                  day === new Date().getDate() &&
                  calendarMonth === new Date().getMonth() &&
                  calendarYear === new Date().getFullYear();
                const isSelected = selectedDay === day;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex h-14 cursor-pointer flex-col items-center justify-center rounded-lg border transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : isToday
                        ? "border-blue-200 bg-blue-50/50"
                        : "border-transparent hover:bg-[var(--table-hover)]"
                    }`}
                  >
                    <span
                      className={`text-sm ${
                        isToday ? "font-bold text-blue-600" : "text-[var(--card-text)]"
                      }`}
                    >
                      {day}
                    </span>
                    {dayAppts.length > 0 && (
                      <div className="mt-0.5 flex gap-0.5">
                        {dayAppts.slice(0, 3).map((a) => (
                          <div
                            key={a.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              a.status === "completed"
                                ? "bg-emerald-500"
                                : a.status === "cancelled"
                                ? "bg-red-400"
                                : "bg-blue-500"
                            }`}
                          />
                        ))}
                        {dayAppts.length > 3 && (
                          <span className="text-[9px] text-[var(--card-text-dim)]">
                            +{dayAppts.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDay && (
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-[var(--card-text)]">
                {new Date(calendarYear, calendarMonth, selectedDay).toLocaleDateString("cs-CZ", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              {getAppointmentsForDay(selectedDay).length === 0 ? (
                <p className="text-sm text-[var(--card-text-muted)]">
                  Žádné schůzky v tento den
                </p>
              ) : (
                <div className="space-y-3">
                  {getAppointmentsForDay(selectedDay).map((appt) => (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-[var(--card-text)]">
                          {appt.title}
                        </p>
                        <p className="flex items-center gap-2 text-xs text-[var(--card-text-muted)]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(appt.start_time)} &ndash;{" "}
                            {formatTime(appt.end_time)}
                          </span>
                          {appt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {appt.location}
                            </span>
                          )}
                          <span>
                            Klient: {getClientName(appt.client_id)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(appt.status)}
                        {appt.status === "scheduled" && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                              onClick={() =>
                                handleUpdateStatus(appt.id, "completed")
                              }
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-500 hover:text-red-600"
                              onClick={() =>
                                handleUpdateStatus(appt.id, "cancelled")
                              }
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
