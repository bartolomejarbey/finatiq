import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // AUTH: verify the requester is a logged-in advisor
    const cookieStore = await cookies();
    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: advisor } = await authSupabase
      .from("advisors")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!advisor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { client_id, password } = await request.json();

    if (!client_id || !password) {
      return NextResponse.json({ error: "Chybí client_id nebo heslo." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Heslo musí mít alespoň 6 znaků." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get client — must belong to this advisor
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email, user_id, advisor_id")
      .eq("id", client_id)
      .eq("advisor_id", advisor.id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Klient nenalezen." }, { status: 404 });
    }

    if (client.user_id) {
      return NextResponse.json({ error: "Klient už má přístup do portálu." }, { status: 400 });
    }

    if (!client.email) {
      return NextResponse.json({ error: "Klient nemá nastavený email." }, { status: 400 });
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: client.email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 3. Link user_id to client
    await supabase
      .from("clients")
      .update({ user_id: authData.user.id })
      .eq("id", client_id);

    return NextResponse.json({
      ok: true,
      email: client.email,
      message: `Klient ${client.first_name} ${client.last_name} může nyní přistupovat do portálu.`,
    });
  } catch {
    return NextResponse.json({ error: "Nepodařilo se vytvořit přístup." }, { status: 500 });
  }
}
