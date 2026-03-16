import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const domain = request.nextUrl.searchParams.get("domain");

  if (!slug && !domain) {
    return NextResponse.json(
      { error: "Chybí parametr slug nebo domain" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const fields = "id, app_name, logo_url, brand_primary, brand_accent_color, custom_login_title, custom_login_subtitle, company_name, login_slug, allow_client_registration";

  let query;
  if (domain) {
    const cleanDomain = domain.replace(/^www\./, "");
    query = supabase.from("advisors").select(fields).eq("custom_domain", cleanDomain).single();
  } else {
    query = supabase.from("advisors").select(fields).eq("login_slug", slug!).single();
  }

  const { data: advisor, error } = await query;

  if (error || !advisor) {
    return NextResponse.json(
      { error: "Poradce nenalezen" },
      { status: 404 }
    );
  }

  return NextResponse.json(advisor);
}
