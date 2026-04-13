import { NextRequest, NextResponse } from "next/server";
import { requireClientAccess } from "@/lib/api/portal-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;

    if (!clientId) {
      return NextResponse.json(
        { error: "Chybí clientId parametr" },
        { status: 400 }
      );
    }

    const auth = await requireClientAccess(clientId);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data: messages, error } = await auth.admin
      .from("messages")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Nepodařilo se načíst zprávy" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: messages || [] });
  } catch {
    return NextResponse.json(
      { error: "Interní chyba serveru" },
      { status: 500 }
    );
  }
}
