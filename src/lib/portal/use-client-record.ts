import { useEffect, useState } from "react";

interface ClientRecord {
  id: string;
  advisor_id: string | null;
  is_osvc: boolean;
  first_name: string | null;
  last_name: string | null;
  onboarding_completed: boolean;
}

/**
 * Hook that fetches the client record for the current user via /api/portal/me.
 * Auto-creates a client record if one doesn't exist (server-side, bypasses RLS).
 */
export function useClientRecord() {
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchClient() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/me");
      if (!res.ok) {
        if (res.status === 401) {
          setLoading(false);
          return;
        }
        setError("Nepodařilo se načíst klientský profil.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setClient(data.client || null);
    } catch {
      setError("Nepodařilo se načíst klientský profil.");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchClient();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { client, loading, error, refetch: fetchClient };
}
