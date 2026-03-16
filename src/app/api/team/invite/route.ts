import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/resend";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, role } = await request.json();
  if (!email) {
    return NextResponse.json({ error: "Email je povinný" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: advisor } = await admin
    .from("advisors")
    .select("id, company_name")
    .eq("user_id", user.id)
    .single();

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  // Create team member record
  const { data: member, error } = await admin
    .from("advisor_team_members")
    .insert({
      advisor_id: advisor.id,
      email,
      role: role || "assistant",
      permissions:
        role === "viewer"
          ? {
              clients_read: true,
              clients_write: false,
              deals_read: true,
              deals_write: false,
              settings: false,
            }
          : {
              clients_read: true,
              clients_write: true,
              deals_read: true,
              deals_write: true,
              settings: false,
            },
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit pozvánku" },
      { status: 500 }
    );
  }

  // Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.finatiq.cz";
  await sendEmail({
    to: email,
    subject: `Pozvánka do týmu ${advisor.company_name} — Finatiq`,
    html: `<p>Byli jste pozváni do týmu <strong>${advisor.company_name}</strong> na platformě Finatiq.</p><p><a href="${appUrl}/join-team?token=${member.id}">Přijmout pozvánku</a></p>`,
  });

  return NextResponse.json({ ok: true });
}
