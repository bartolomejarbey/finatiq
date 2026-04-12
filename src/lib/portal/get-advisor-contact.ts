import { createClient } from "@/lib/supabase/client";

export type AdvisorContact = {
  phone: string | null;
  email: string | null;
  name: string | null;
};

export async function getAdvisorContact(clientId: string): Promise<AdvisorContact> {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("advisor_id")
    .eq("id", clientId)
    .single();

  if (!client?.advisor_id) {
    return { phone: null, email: null, name: null };
  }

  const { data: advisor } = await supabase
    .from("advisors")
    .select("company_name, email, phone")
    .eq("id", client.advisor_id)
    .single();

  return {
    phone: advisor?.phone || null,
    email: advisor?.email || null,
    name: advisor?.company_name || null,
  };
}
