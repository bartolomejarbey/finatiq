import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/advisor/nastaveni/kalendar?error=cancelled", request.url));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
        redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/calendar/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Google token exchange failed:", err);
      return NextResponse.redirect(new URL("/advisor/nastaveni/kalendar?error=token_failed", request.url));
    }

    const tokens = await tokenRes.json();

    // Get user email from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = userRes.ok ? await userRes.json() : null;

    // Save tokens to advisor record
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    await supabase
      .from("advisors")
      .update({
        google_calendar_token: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Date.now() + (tokens.expires_in * 1000),
          email: userInfo?.email || null,
        },
      })
      .eq("user_id", user.id);

    return NextResponse.redirect(new URL("/advisor/nastaveni/kalendar?success=true", request.url));
  } catch (err) {
    console.error("Google Calendar callback error:", err);
    return NextResponse.redirect(new URL("/advisor/nastaveni/kalendar?error=unknown", request.url));
  }
}
