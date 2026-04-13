export type AdvisorContact = {
  phone: string | null;
  email: string | null;
  name: string | null;
};

let cached: AdvisorContact | null = null;

export async function getAdvisorContact(_clientId: string): Promise<AdvisorContact> {
  if (cached) return cached;

  try {
    const res = await fetch("/api/portal/me");
    if (!res.ok) return { phone: null, email: null, name: null };
    const data = await res.json();
    const contact = data.advisorContact || { phone: null, email: null, name: null };
    cached = contact;
    return contact;
  } catch {
    return { phone: null, email: null, name: null };
  }
}

export function clearAdvisorContactCache() {
  cached = null;
}
