"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, CheckCircle2, ExternalLink, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function CalendarSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("advisors")
        .select("google_calendar_token")
        .eq("user_id", user.id)
        .single();
      if (data?.google_calendar_token) {
        setConnected(true);
        setCalendarEmail(data.google_calendar_token.email || null);
      }
      setLoading(false);
    }
    load();

    // Check URL params for success/error
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success("Google Calendar propojen.");
    }
    if (params.get("error")) {
      toast.error("Propojení se nezdařilo. Zkuste to znovu.");
    }
  }, []);

  function handleConnect() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
    if (!clientId) {
      toast.error("Google Calendar není nakonfigurován.");
      return;
    }
    const redirectUri = `${window.location.origin}/api/calendar/callback`;
    const scope = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email";
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&access_type=offline&prompt=consent`;
    window.location.href = url;
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("advisors")
      .update({ google_calendar_token: null })
      .eq("user_id", user.id);
    setConnected(false);
    setCalendarEmail(null);
    setDisconnecting(false);
    toast.success("Google Calendar odpojen.");
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--card-text-muted,#6b7280)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="h-6 w-6" style={{ color: "var(--card-text-muted, #6b7280)" }} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--card-text, #111827)" }}>
          Propojení s Google Calendar
        </h1>
      </div>

      <div className="rounded-xl border p-6" style={{ backgroundColor: "var(--card-bg, white)", borderColor: "var(--card-border, #e5e7eb)" }}>
        {connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="font-medium" style={{ color: "var(--card-text, #111827)" }}>
                  Propojeno
                </p>
                {calendarEmail && (
                  <p className="text-sm" style={{ color: "var(--card-text-muted, #6b7280)" }}>
                    {calendarEmail}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm" style={{ color: "var(--card-text-muted, #6b7280)" }}>
              Vaše schůzky se automaticky synchronizují s Google Calendar.
            </p>
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="gap-2"
            >
              {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
              Odpojit
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-medium" style={{ color: "var(--card-text, #111827)" }}>
                Nepropojeno
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--card-text-muted, #6b7280)" }}>
                Propojte Google Calendar pro automatickou synchronizaci schůzek.
              </p>
            </div>
            <Button onClick={handleConnect} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Propojit Google Calendar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
