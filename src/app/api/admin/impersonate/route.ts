import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify superadmin role
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: adminRecord } = await supabaseAdmin
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!adminRecord || adminRecord.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { advisor_id } = await request.json();
  if (!advisor_id) {
    return NextResponse.json({ error: "advisor_id je povinné" }, { status: 400 });
  }

  // Get advisor's user_id
  const { data: advisor } = await supabaseAdmin
    .from("advisors")
    .select("user_id, company_name")
    .eq("id", advisor_id)
    .single();

  if (!advisor) {
    return NextResponse.json({ error: "Poradce nenalezen" }, { status: 404 });
  }

  // Log the impersonation
  await logAudit(
    user.id,
    "superadmin",
    "impersonate",
    "advisor",
    advisor_id,
    undefined,
    { advisor_name: advisor.company_name },
    request.headers.get("x-forwarded-for") || undefined
  );

  // Generate a magic link for the advisor's account
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: (await supabaseAdmin.auth.admin.getUserById(advisor.user_id)).data.user?.email || "",
  });

  if (linkError || !linkData) {
    return NextResponse.json({ error: "Nepodařilo se vytvořit přihlašovací odkaz" }, { status: 500 });
  }

  // Extract token from the link
  const url = new URL(linkData.properties.action_link);
  const token = url.searchParams.get("token");
  const type = url.searchParams.get("type");

  return NextResponse.json({
    ok: true,
    redirect_url: `/api/auth/callback?token_hash=${token}&type=${type}&next=/advisor&impersonating=true`,
    advisor_name: advisor.company_name,
  });
}
