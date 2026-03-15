import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const origin = url.origin;
  const redirectBase = `${origin}/advisor/nastaveni/meta-ads`;

  // Handle user denial
  if (error) {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent("Chybí autorizační kód")}`
    );
  }

  // Authenticate user
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent("Nejste přihlášeni")}`
    );
  }

  const clientId = process.env.NEXT_PUBLIC_META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  const redirectUri = `${origin}/api/meta/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent("Meta App není nakonfigurována na serveru")}`
    );
  }

  try {
    // Step 1: Exchange code for short-lived token
    const tokenRes = await fetch(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[META OAuth] Token exchange failed:", errBody);
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent("Nepodařilo se získat přístupový token")}`
      );
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    if (!shortLivedToken) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent("Meta nevrátila přístupový token")}`
      );
    }

    // Step 2: Exchange for long-lived token (60 days)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`
    );

    if (!longLivedRes.ok) {
      const errBody = await longLivedRes.text();
      console.error("[META OAuth] Long-lived token exchange failed:", errBody);
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent("Nepodařilo se získat dlouhodobý token")}`
      );
    }

    const longLivedData = await longLivedRes.json();
    const longLivedToken = longLivedData.access_token;

    if (!longLivedToken) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent("Meta nevrátila dlouhodobý token")}`
      );
    }

    // Step 3: Fetch ad accounts
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${longLivedToken}&fields=id,name,account_id`
    );

    let adAccountId: string | null = null;

    if (adAccountsRes.ok) {
      const adAccountsData = await adAccountsRes.json();
      const accounts = adAccountsData.data || [];
      if (accounts.length > 0) {
        adAccountId = accounts[0].account_id || accounts[0].id;
      }
    } else {
      console.error(
        "[META OAuth] Failed to fetch ad accounts:",
        await adAccountsRes.text()
      );
    }

    // Step 4: Save to advisors table
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await supabaseAdmin
      .from("advisors")
      .update({
        meta_token: longLivedToken,
        meta_ad_account_id: adAccountId,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[META OAuth] Failed to save token:", updateError);
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent("Nepodařilo se uložit propojení")}`
      );
    }

    return NextResponse.redirect(`${redirectBase}?success=true`);
  } catch (err) {
    console.error("[META OAuth] Unexpected error:", err);
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent("Neočekávaná chyba při propojení")}`
    );
  }
}
