import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface GoogleCalendarToken {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email?: string;
}

async function refreshAccessToken(token: GoogleCalendarToken): Promise<GoogleCalendarToken | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
      refresh_token: token.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    ...token,
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
}

async function getValidToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  advisorId: string,
  token: GoogleCalendarToken,
): Promise<GoogleCalendarToken | null> {
  if (Date.now() < token.expires_at - 60_000) return token;
  const refreshed = await refreshAccessToken(token);
  if (!refreshed) return null;
  await supabase.from("advisors").update({ google_calendar_token: refreshed }).eq("id", advisorId);
  return refreshed;
}

// POST — create event in Google Calendar + Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { advisor_id, client_id, deal_id, title, description, start_time, end_time, location } = body;

    if (!advisor_id || !title || !start_time || !end_time) {
      return NextResponse.json({ error: "Chybí povinná pole: advisor_id, title, start_time, end_time" }, { status: 400 });
    }

    const supabase = await createClient();
    let google_event_id: string | null = null;

    // Try to create in Google Calendar
    const { data: advisor } = await supabase
      .from("advisors")
      .select("google_calendar_token")
      .eq("id", advisor_id)
      .single();

    if (advisor?.google_calendar_token) {
      const token = await getValidToken(supabase, advisor_id, advisor.google_calendar_token as GoogleCalendarToken);
      if (token) {
        const gcalRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary: title,
            description: description || "",
            start: { dateTime: start_time, timeZone: "Europe/Prague" },
            end: { dateTime: end_time, timeZone: "Europe/Prague" },
            location: location || "",
          }),
        });
        if (gcalRes.ok) {
          const gcalEvent = await gcalRes.json();
          google_event_id = gcalEvent.id || null;
        }
      }
    }

    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        advisor_id,
        client_id: client_id || null,
        deal_id: deal_id || null,
        title,
        description: description || null,
        start_time,
        end_time,
        location: location || null,
        status: "scheduled",
        google_event_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating appointment:", error);
      return NextResponse.json({ error: "Nepodařilo se vytvořit schůzku." }, { status: 500 });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    console.error("Calendar sync error:", err);
    return NextResponse.json({ error: "Interní chyba serveru." }, { status: 500 });
  }
}

// GET — fetch events from Google Calendar
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: advisor } = await supabase
      .from("advisors")
      .select("id, google_calendar_token")
      .eq("user_id", user.id)
      .single();

    if (!advisor?.google_calendar_token) {
      return NextResponse.json({ events: [], connected: false });
    }

    const token = await getValidToken(supabase, advisor.id, advisor.google_calendar_token as GoogleCalendarToken);
    if (!token) {
      return NextResponse.json({ events: [], connected: false, error: "token_expired" });
    }

    const { searchParams } = new URL(req.url);
    const timeMin = searchParams.get("timeMin") || new Date().toISOString();
    const timeMax = searchParams.get("timeMax") || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const gcalRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`,
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );

    if (!gcalRes.ok) {
      return NextResponse.json({ events: [], connected: true, error: "fetch_failed" });
    }

    const gcalData = await gcalRes.json();
    const events = (gcalData.items || []).map((e: Record<string, unknown>) => ({
      id: e.id,
      title: e.summary || "",
      description: e.description || "",
      start_time: (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date,
      end_time: (e.end as Record<string, string>)?.dateTime || (e.end as Record<string, string>)?.date,
      location: e.location || null,
      status: "scheduled",
    }));

    return NextResponse.json({ events, connected: true });
  } catch (err) {
    console.error("Calendar GET error:", err);
    return NextResponse.json({ events: [], error: "Interní chyba." }, { status: 500 });
  }
}
