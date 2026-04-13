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
  User,
  Plus,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { ModuleGate } from "@/components/ModuleGate";

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

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusConfig(status: string) {
  switch (status) {
    case "scheduled":
      return { label: "Naplánováno", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500" };
    case "completed":
      return { label: "Dokončeno", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" };
    case "cancelled":
      return { label: "Zrušeno", color: "text-red-600", bg: "bg-red-50 border-red-200", dot: "bg-red-400" };
    default:
      return { label: status, color: "text-gray-600", bg: "bg-gray-50 border-gray-200", dot: "bg-gray-400" };
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function AdvisorKalendarPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<FilterMode>("week");
  const [view, setView] = useState<ViewMode>("calendar");
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());

  useEffect(() => {
    async function fetchData() {
      const { data: adv } = await supabase.from("advisors").select("id").single();
      if (!adv) { setLoading(false); return; }

      const { data: appts } = await supabase
        .from("appointments").select("*").eq("advisor_id", adv.id)
        .order("start_time", { ascending: true });

      const { data: cls } = await supabase
        .from("clients").select("id, first_name, last_name").eq("advisor_id", adv.id);

      setAppointments(appts || []);
      setClients(cls || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getClientName(clientId: string | null): string {
    if (!clientId) return "—";
    const c = clients.find((cl) => cl.id === clientId);
    return c ? `${c.first_name} ${c.last_name}` : "—";
  }

  function getFilteredAppointments(): Appointment[] {
    const now = new Date();
    return appointments.filter((appt) => {
      const start = new Date(appt.start_time);
      if (filter === "today") return start.toDateString() === now.toDateString();
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
        return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  function getAppointmentsForDay(day: number): Appointment[] {
    return appointments.filter((appt) => {
      const d = new Date(appt.start_time);
      return d.getDate() === day && d.getMonth() === calendarMonth && d.getFullYear() === calendarYear;
    });
  }

  async function handleUpdateStatus(id: string, status: "completed" | "cancelled") {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error("Nepodařilo se aktualizovat stav."); return; }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success(status === "completed" ? "Schůzka dokončena." : "Schůzka zrušena.");
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <Skeleton className="h-[500px] rounded-2xl" />
      </div>
    );
  }

  const filtered = getFilteredAppointments();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const monthLabel = new Date(calendarYear, calendarMonth).toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });

  const todayAppts = appointments.filter((a) => new Date(a.start_time).toDateString() === new Date().toDateString());
  const scheduledCount = appointments.filter((a) => a.status === "scheduled").length;

  return (
    <ModuleGate moduleKey="calendar" moduleName="Kalendář" moduleDescription="Plánujte schůzky s klienty a synchronizujte s Google Calendar — vše na jednom místě.">
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Kalendář</h1>
          <p className="mt-1 text-sm text-[var(--card-text-muted)]">Plánujte a sledujte schůzky s klienty</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="sm"
            className="rounded-xl"
            onClick={() => setView("list")}
          >
            <List className="mr-1.5 h-4 w-4" />
            Seznam
          </Button>
          <Button
            variant={view === "calendar" ? "default" : "outline"}
            size="sm"
            className="rounded-xl"
            onClick={() => { setView("calendar"); }}
          >
            <Calendar className="mr-1.5 h-4 w-4" />
            Kalendář
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <CalendarDays className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{todayAppts.length}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Dnes</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">{scheduledCount}</p>
              <p className="text-xs text-[var(--card-text-muted)]">Naplánované</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--card-text)]">
                {appointments.filter((a) => a.status === "completed").length}
              </p>
              <p className="text-xs text-[var(--card-text-muted)]">Dokončené</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter buttons — list view only */}
      {view === "list" && (
        <div className="flex gap-2">
          {([["today", "Dnes"], ["week", "Tento týden"], ["month", "Tento měsíc"]] as [FilterMode, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                filter === key
                  ? "bg-[var(--color-primary)] text-white shadow-md shadow-blue-500/20"
                  : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--card-text-muted)] hover:bg-[var(--table-hover)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] py-20 shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--table-hover)]">
                <Calendar className="h-8 w-8 text-[var(--card-text-dim)]" />
              </div>
              <p className="mt-4 text-lg font-medium text-[var(--card-text-dim)]">Žádné schůzky</p>
              <p className="mt-1 text-sm text-[var(--card-text-dim)]">Pro zvolené období nejsou naplánovány žádné schůzky</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((appt) => {
                const sc = getStatusConfig(appt.status);
                return (
                  <div key={appt.id} className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-start gap-4">
                      {/* Time column */}
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50">
                        <span className="text-xs font-medium text-blue-600">
                          {new Date(appt.start_time).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}
                        </span>
                        <span className="text-[10px] text-blue-500">
                          {formatTime(appt.start_time)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--card-text)]">{appt.title}</p>
                        <div className="mt-1.5 flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
                            <Clock className="h-3 w-3" />
                            {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
                          </span>
                          {appt.location && (
                            <span className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
                              <MapPin className="h-3 w-3" />
                              {appt.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
                            <User className="h-3 w-3" />
                            {getClientName(appt.client_id)}
                          </span>
                        </div>
                      </div>

                      {/* Status & actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`${sc.bg} ${sc.color} border text-[10px]`}>
                          {sc.label}
                        </Badge>
                        {appt.status === "scheduled" && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={() => handleUpdateStatus(appt.id, "completed")}
                              title="Označit jako dokončenou"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 rounded-lg p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleUpdateStatus(appt.id, "cancelled")}
                              title="Zrušit schůzku"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Calendar view */}
      {view === "calendar" && (
        <div className="grid grid-cols-[1fr_340px] gap-6">
          {/* Calendar grid */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm">
            {/* Month navigation */}
            <div className="mb-6 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-xl p-0 hover:bg-[var(--table-hover)]"
                onClick={() => {
                  if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear((y) => y - 1); }
                  else setCalendarMonth((m) => m - 1);
                  setSelectedDay(null);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-semibold capitalize text-[var(--card-text)]">{monthLabel}</h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 rounded-xl p-0 hover:bg-[var(--table-hover)]"
                onClick={() => {
                  if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear((y) => y + 1); }
                  else setCalendarMonth((m) => m + 1);
                  setSelectedDay(null);
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Day headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--card-text-dim)]">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayAppts = getAppointmentsForDay(day);
                const isToday = day === new Date().getDate() && calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear();
                const isSelected = selectedDay === day;
                const hasAppts = dayAppts.length > 0;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`group/day relative flex aspect-square flex-col items-center justify-center rounded-xl transition-all ${
                      isSelected
                        ? "bg-[var(--color-primary)] text-white shadow-lg shadow-blue-500/30 scale-105"
                        : isToday
                        ? "bg-blue-50 ring-2 ring-blue-400 ring-offset-1"
                        : hasAppts
                        ? "hover:bg-[var(--table-hover)] hover:shadow-sm"
                        : "hover:bg-[var(--table-hover)]"
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      isSelected ? "text-white" :
                      isToday ? "text-blue-700 font-bold" :
                      "text-[var(--card-text)]"
                    }`}>
                      {day}
                    </span>
                    {hasAppts && (
                      <div className="mt-1 flex gap-0.5">
                        {dayAppts.slice(0, 3).map((a) => (
                          <div
                            key={a.id}
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSelected ? "bg-white/70" : getStatusConfig(a.status).dot
                            }`}
                          />
                        ))}
                        {dayAppts.length > 3 && (
                          <span className={`text-[8px] leading-none ${isSelected ? "text-white/70" : "text-[var(--card-text-dim)]"}`}>
                            +{dayAppts.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center gap-5 border-t border-[var(--card-border)] pt-4">
              <span className="text-xs font-medium text-[var(--card-text-dim)]">Legenda:</span>
              <div className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Naplánováno
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Dokončeno
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
                <span className="h-2 w-2 rounded-full bg-red-400" /> Zrušeno
              </div>
            </div>
          </div>

          {/* Sidebar — selected day detail */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--card-text)]">
                {selectedDay ? (
                  new Date(calendarYear, calendarMonth, selectedDay).toLocaleDateString("cs-CZ", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                ) : "Vyberte den"}
              </h3>
              {selectedDay && (
                <p className="mt-0.5 text-xs text-[var(--card-text-muted)]">
                  {getAppointmentsForDay(selectedDay).length} schůzek
                </p>
              )}
            </div>

            {selectedDay && getAppointmentsForDay(selectedDay).length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] py-12">
                <Calendar className="h-8 w-8 text-[var(--card-text-dim)]" />
                <p className="mt-3 text-sm text-[var(--card-text-dim)]">Žádné schůzky</p>
                <p className="mt-0.5 text-xs text-[var(--card-text-dim)]">Tento den je volný</p>
              </div>
            ) : (
              selectedDay && getAppointmentsForDay(selectedDay).map((appt) => {
                const sc = getStatusConfig(appt.status);
                return (
                  <div key={appt.id} className={`rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${sc.bg}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <p className="font-semibold text-sm text-[var(--card-text)]">{appt.title}</p>
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
                            <Clock className="h-3 w-3" />
                            {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
                          </p>
                          {appt.location && (
                            <p className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
                              <MapPin className="h-3 w-3" />
                              {appt.location}
                            </p>
                          )}
                          <p className="flex items-center gap-1.5 text-xs text-[var(--card-text-muted)]">
                            <User className="h-3 w-3" />
                            {getClientName(appt.client_id)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${sc.bg} ${sc.color} border text-[10px] shrink-0`}>
                        {sc.label}
                      </Badge>
                    </div>
                    {appt.status === "scheduled" && (
                      <div className="mt-3 flex gap-2 border-t border-[var(--card-border)] pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 rounded-lg text-xs text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                          onClick={() => handleUpdateStatus(appt.id, "completed")}
                        >
                          <CheckCircle2 className="mr-1.5 h-3 w-3" />
                          Dokončit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-8 rounded-lg text-xs text-red-500 hover:bg-red-50 border-red-200"
                          onClick={() => handleUpdateStatus(appt.id, "cancelled")}
                        >
                          <XCircle className="mr-1.5 h-3 w-3" />
                          Zrušit
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
    </ModuleGate>
  );
}
