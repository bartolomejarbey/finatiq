import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

export type PortalActor = {
  userId: string;
  clientId: string | null;
  advisorId: string | null;
};

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getAuthenticatedUser() {
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

  return user;
}

export async function getPortalActor(admin: SupabaseAdmin, userId: string): Promise<PortalActor> {
  const [{ data: client }, { data: advisor }] = await Promise.all([
    admin.from("clients").select("id, advisor_id").eq("user_id", userId).maybeSingle(),
    admin.from("advisors").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  return {
    userId,
    clientId: client?.id ?? null,
    advisorId: advisor?.id ?? client?.advisor_id ?? null,
  };
}

export async function canAccessClient(
  admin: SupabaseAdmin,
  actor: PortalActor,
  clientId: string
) {
  if (actor.clientId === clientId) return true;
  if (!actor.advisorId) return false;

  const { data: client } = await admin
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("advisor_id", actor.advisorId)
    .maybeSingle();

  return !!client;
}

export async function requirePortalActor() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { error: "Unauthorized" as const, status: 401 as const };
  }

  const admin = createAdminClient();
  const actor = await getPortalActor(admin, user.id);

  return { user, admin, actor };
}

export async function requireClientAccess(clientId: string) {
  const auth = await requirePortalActor();
  if ("error" in auth) return auth;

  const allowed = await canAccessClient(auth.admin, auth.actor, clientId);
  if (!allowed) {
    return { error: "Forbidden" as const, status: 403 as const };
  }

  return auth;
}
