import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, advisor_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ docs: [], client_id: "", advisor_id: null });
  }

  const { data: docs, error } = await supabaseAdmin
    .from("documents")
    .select("id, name, vault_category, valid_until, shared_with_advisor, file_url, created_at")
    .eq("client_id", client.id)
    .eq("is_vault", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Chyba při načítání trezoru: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    docs: docs || [],
    client_id: client.id,
    advisor_id: client.advisor_id,
  });
}

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, advisor_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
  }

  const body = await request.json();

  const { data: doc, error: insertError } = await supabaseAdmin
    .from("documents")
    .insert({
      client_id: client.id,
      advisor_id: client.advisor_id,
      name: body.name,
      file_url: body.file_url,
      is_vault: true,
      vault_category: body.vault_category || "ostatni",
      valid_until: body.valid_until || null,
      shared_with_advisor: body.shared_with_advisor || false,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: "Chyba při ukládání dokumentu: " + insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ doc });
}

export async function PATCH(request: Request) {
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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  const { error } = await supabaseAdmin
    .from("documents")
    .update(updates)
    .eq("id", id)
    .eq("client_id", client.id);

  if (error) {
    return NextResponse.json(
      { error: "Chyba při aktualizaci: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Klient nenalezen" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Chybí ID dokumentu" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("client_id", client.id);

  if (error) {
    return NextResponse.json(
      { error: "Chyba při mazání: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
