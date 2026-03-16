import { NextResponse } from "next/server";

const store = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetMs: entry.resetTime - now };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count, resetMs: entry.resetTime - now };
}

export function getRateLimitKey(ip: string, route: string): string {
  return `${ip}:${route}`;
}

/** Helper: extract IP from request headers */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/** Helper: check rate limit and return 429 Response if exceeded */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const result = rateLimit(key, limit, windowMs);
  if (!result.success) {
    const minutes = Math.ceil(result.resetMs / 60000);
    return NextResponse.json(
      { error: `Příliš mnoho požadavků. Zkuste to za ${minutes} minut.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(result.resetMs / 1000)) } }
    );
  }
  return null;
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) store.delete(key);
    }
  }, 300_000);
}
