import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/* Paths that never require auth */
const alwaysPublicPaths = ["/", "/funkce", "/cenik", "/kontakt", "/proc-my", "/podminky", "/gdpr", "/fakturace", "/p/", "/ref/"];

/* Login/register paths — public for guests, redirect logged-in users to dashboard */
const authPaths = ["/login", "/portal/login", "/register", "/forgot-password", "/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Custom domain detection — BEFORE everything else
  const hostname = request.headers.get("host")?.replace(":3000", "").replace(":3001", "") || "";
  const mainDomains = ["localhost", "finatiq.cz", "www.finatiq.cz"];
  const isCustomDomain = hostname && !mainDomains.includes(hostname) && !hostname.includes("vercel.app");

  if (isCustomDomain) {
    // API calls — pass through (matcher already excludes /api/ but just in case)
    if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
      return NextResponse.next();
    }

    // Auth pages on custom domain — pass through with x-custom-domain header
    if (pathname === "/login" || pathname === "/portal/login" || pathname.startsWith("/login/")) {
      const response = NextResponse.next({ request });
      response.headers.set("x-custom-domain", hostname);
      return response;
    }

    // Protected paths (advisor/portal dashboards) — let normal auth flow handle
    if (pathname.startsWith("/advisor") || pathname.startsWith("/portal") || pathname.startsWith("/superadmin")) {
      // Fall through to normal middleware logic below
    } else {
      // Root or any other path on custom domain → rewrite to /p/custom/[domain]
      const url = request.nextUrl.clone();
      url.pathname = `/p/custom/${hostname}`;
      return NextResponse.rewrite(url);
    }
  }

  // 1. Always-public paths — no auth check at all
  const isAlwaysPublic =
    pathname === "/" ||
    alwaysPublicPaths.some((p) => p !== "/" && pathname.startsWith(p));
  if (isAlwaysPublic) {
    return NextResponse.next();
  }

  // 2. Check if this is a login/auth path
  const isAuthPath = authPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // 3. Create Supabase SSR client (for auth session via cookies)
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 4. Get user with timeout
  let user;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      ),
    ]);
    user = result.data.user;
  } catch {
    // Auth timed out — for login pages pass through, for protected redirect to login
    if (isAuthPath) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/portal") ? "/portal/login" : "/login";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // 5. Auth pages (login, register, etc.)
  if (isAuthPath) {
    if (!user) {
      // Not logged in → show login/register page
      return supabaseResponse;
    }
    // Logged in → detect role and redirect to dashboard
    let role: Role;
    try {
      role = await Promise.race([
        detectRole(user.id),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 5000)
        ),
      ]);
    } catch {
      // Timeout → just show the login page, don't redirect
      return supabaseResponse;
    }

    // If role is null, don't redirect — avoid loop
    if (!role) {
      console.log(`[middleware] auth page ${pathname}, user=${user.id}, role=null → pass through`);
      return supabaseResponse;
    }

    console.log(`[middleware] auth page ${pathname}, role=${role} → ${roleToPath(role)}`);
    const url = request.nextUrl.clone();
    url.pathname = roleToPath(role);
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // 6. Protected paths — require auth
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/portal") ? "/portal/login" : "/login";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // 7. Logged in on protected path — check role with service_role
  let role: Role;
  try {
    role = await Promise.race([
      detectRole(user.id),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      ),
    ]);
  } catch {
    // Role detection timed out → let through without redirect
    return supabaseResponse;
  }

  // If role is null → unknown user, let through (don't loop)
  if (!role) {
    return supabaseResponse;
  }

  const isOnCorrectSection =
    (role === "superadmin" && pathname.startsWith("/superadmin")) ||
    (role === "advisor" && pathname.startsWith("/advisor")) ||
    (role === "client" && pathname.startsWith("/portal"));

  if (!isOnCorrectSection) {
    const target = roleToPath(role);
    console.log(`[middleware] ${pathname}, role=${role} → ${target}`);
    const url = request.nextUrl.clone();
    url.pathname = target;
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  // 8. For advisors: check subscription status — redirect expired to /advisor/predplatne
  if (
    role === "advisor" &&
    pathname.startsWith("/advisor") &&
    pathname !== "/advisor/predplatne" &&
    pathname !== "/advisor/settings" &&
    !pathname.startsWith("/advisor/nastaveni")
  ) {
    try {
      const subStatus = await checkAdvisorSubscription(user!.id);
      if (subStatus === "expired") {
        const url = request.nextUrl.clone();
        url.pathname = "/advisor/predplatne";
        const redirectResponse = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return redirectResponse;
      }
    } catch {
      // If check fails, let through
    }
  }

  return supabaseResponse;
}

type Role = "superadmin" | "advisor" | "client" | null;

/**
 * Detect user role using service_role key via direct REST API (bypasses RLS).
 * Uses fetch instead of JS client because middleware runs in Edge Runtime.
 */
async function detectRole(userId: string): Promise<Role> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  // Check superadmin
  const saRes = await fetch(
    `${url}/rest/v1/superadmins?user_id=eq.${userId}&select=id&limit=1`,
    { headers }
  );
  const saData = await saRes.json();
  if (Array.isArray(saData) && saData.length > 0) return "superadmin";

  // Check client (BEFORE advisor)
  const cliRes = await fetch(
    `${url}/rest/v1/clients?user_id=eq.${userId}&select=id&limit=1`,
    { headers }
  );
  const cliData = await cliRes.json();
  if (Array.isArray(cliData) && cliData.length > 0) return "client";

  // Check advisor
  const advRes = await fetch(
    `${url}/rest/v1/advisors?user_id=eq.${userId}&select=id&limit=1`,
    { headers }
  );
  const advData = await advRes.json();
  if (Array.isArray(advData) && advData.length > 0) return "advisor";

  return null;
}

async function checkAdvisorSubscription(userId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(
    `${url}/rest/v1/advisors?user_id=eq.${userId}&select=subscription_status&limit=1`,
    { headers }
  );
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return data[0].subscription_status || null;
  }
  return null;
}

function roleToPath(role: Role): string {
  switch (role) {
    case "superadmin":
      return "/superadmin";
    case "advisor":
      return "/advisor";
    case "client":
      return "/portal";
    default:
      return "/login";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|api/).*)",
  ],
};
