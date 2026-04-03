import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // Rate limit: 5 registrations per hour per IP
  const ip = getClientIp(request);
  const limited = checkRateLimit(`${ip}:client-self-register`, 5, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const { advisor_slug, first_name, last_name, email, phone, password } =
      await request.json();

    if (!advisor_slug || !email || !password) {
      return NextResponse.json(
        { error: "Vyplňte všechna povinná pole." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Heslo musí mít alespoň 6 znaků." },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Find advisor by slug
    const { data: advisor, error: advError } = await supabase
      .from("advisors")
      .select("id, allow_client_registration")
      .eq("login_slug", advisor_slug)
      .single();

    if (advError || !advisor) {
      return NextResponse.json(
        { error: "Poradce nebyl nalezen." },
        { status: 404 }
      );
    }

    if (!advisor.allow_client_registration) {
      return NextResponse.json(
        { error: "Registrace klientů není u tohoto poradce povolena." },
        { status: 403 }
      );
    }

    // 2. Check if email already exists as a client for this advisor
    const { data: existing } = await supabase
      .from("clients")
      .select("id, user_id")
      .eq("advisor_id", advisor.id)
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existing?.user_id) {
      return NextResponse.json(
        { error: "Účet s tímto emailem již existuje. Přihlaste se." },
        { status: 400 }
      );
    }

    // 3. Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Účet s tímto emailem již existuje." },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 4. Create or update client record
    if (existing) {
      // Client record exists (advisor created it) but no user_id — link it
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          user_id: authData.user.id,
          first_name: first_name?.trim() || existing.id,
          last_name: last_name?.trim() || null,
          phone: phone?.trim() || null,
        })
        .eq("id", existing.id);
      if (updateError) {
        console.error("Failed to update client with user_id:", updateError.message);
        return NextResponse.json(
          { error: "Nepodařilo se propojit klientský účet." },
          { status: 500 }
        );
      }
    } else {
      // Create new client record
      const { error: insertError } = await supabase.from("clients").insert({
        advisor_id: advisor.id,
        user_id: authData.user.id,
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
      });
      if (insertError) {
        console.error("Failed to insert new client:", insertError.message);
        return NextResponse.json(
          { error: "Nepodařilo se vytvořit klientský záznam." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Registrace proběhla úspěšně. Nyní se můžete přihlásit.",
    });
  } catch {
    return NextResponse.json(
      { error: "Nepodařilo se dokončit registraci." },
      { status: 500 }
    );
  }
}
