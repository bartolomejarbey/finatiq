"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Share2,
  Copy,
  Mail,
  MessageCircle,
  Users,
  Phone,
  CheckCircle2,
  Clock,
  Gift,
} from "lucide-react";

interface Referral {
  id: string;
  referral_code: string;
  referred_name: string;
  referred_email: string | null;
  status: string;
  created_at: string;
}

interface ClientInfo {
  id: string;
  first_name: string;
  last_name: string;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "pending":
      return { label: "Odeslaný", color: "bg-yellow-100 text-yellow-800" };
    case "contacted":
      return { label: "Kontaktovaný", color: "bg-blue-100 text-blue-800" };
    case "converted":
      return { label: "Konvertovaný", color: "bg-green-100 text-green-800" };
    case "expired":
      return { label: "Vypršený", color: "bg-[var(--table-header)] text-[var(--card-text)]" };
    default:
      return { label: status, color: "bg-[var(--table-header)] text-[var(--card-text)]" };
  }
}

export default function ReferralPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clientData } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("user_id", user.id)
        .single();
      if (!clientData) {
        setLoading(false);
        return;
      }

      setClient(clientData);

      // Generate referral code from client UUID (first 6 chars uppercase)
      const code = clientData.id.replace(/-/g, "").substring(0, 6).toUpperCase();
      setReferralCode(code);

      // Fetch referrals for this client
      const { data: refs } = await supabase
        .from("referrals")
        .select("*")
        .eq("referring_client_id", clientData.id)
        .order("created_at", { ascending: false });

      setReferrals(refs || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shareLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/ref/${referralCode}`
      : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Odkaz zkopirovan do schranky");
    } catch {
      toast.error("Nepodařilo se zkopirovat odkaz");
    }
  }

  function shareEmail() {
    const subject = encodeURIComponent("Doporučuji skvělého finančního poradce");
    const body = encodeURIComponent(
      `Ahoj,\n\nchci ti doporučit svého finančního poradce. Podivej se na tento odkaz:\n\n${shareLink}\n\nS pozdravem,\n${client?.first_name || ""}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(
      `Ahoj! Doporučuji ti skvělého finančního poradce. Podivej se: ${shareLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  const totalReferrals = referrals.length;
  const contacted = referrals.filter((r) => r.status === "contacted").length;
  const converted = referrals.filter((r) => r.status === "converted").length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Gift className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Doporučte sveho poradce</h1>
        </div>
        <p className="text-blue-100">
          Sdílejte svuj odkaz s přateli a rodinou. Za každe uspěšne doporučeni
          ziskate odmenu.
        </p>
      </div>

      {/* Share section */}
      <div className="mb-8 rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--card-text)]">
          <Share2 className="h-5 w-5 text-blue-600" />
          Vas doporučujici odkaz
        </h2>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 rounded-lg border bg-[var(--table-hover)] px-4 py-3 font-mono text-sm text-[var(--card-text)]">
            {shareLink || "Načitani..."}
          </div>
          <Button onClick={copyLink} variant="outline" className="gap-2">
            <Copy className="h-4 w-4" />
            Zkopirovat
          </Button>
        </div>

        <div className="mb-2 text-xs text-[var(--card-text-muted)]">Vas kod: <span className="font-bold text-[var(--card-text)]">{referralCode}</span></div>

        <div className="flex gap-3">
          <Button onClick={copyLink} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Copy className="h-4 w-4" />
            Zkopirovat odkaz
          </Button>
          <Button onClick={shareEmail} variant="outline" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button onClick={shareWhatsApp} variant="outline" className="gap-2 text-green-600 border-green-200 hover:bg-green-50">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--card-text-muted)]">Celkem doporučeni</p>
              <p className="text-lg font-bold text-[var(--card-text)]">{totalReferrals}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Phone className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--card-text-muted)]">Kontaktovani</p>
              <p className="text-lg font-bold text-[var(--card-text)]">{contacted}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-[var(--card-bg)] p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-[var(--card-text-muted)]">Konvertovani</p>
              <p className="text-lg font-bold text-[var(--card-text)]">{converted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral list */}
      <div className="rounded-xl border bg-[var(--card-bg)] shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
            Vase doporučeni
          </h2>
        </div>
        {referrals.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Gift className="mb-4 h-12 w-12 text-[var(--card-text-dim)]" />
            <p className="text-lg font-medium text-[var(--card-text-dim)]">
              Zatim žadna doporučeni
            </p>
            <p className="mt-1 text-sm text-[var(--card-text-dim)]">
              Sdílejte svuj odkaz a sledujte doporučeni zde
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {referrals.map((ref) => {
              const status = getStatusConfig(ref.status);
              return (
                <div
                  key={ref.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[var(--table-hover)]"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--card-text)]">
                      {ref.referred_name || "Neznamy"}
                    </p>
                    {ref.referred_email && (
                      <p className="text-xs text-[var(--card-text-muted)]">{ref.referred_email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[var(--card-text-muted)]">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(ref.created_at).toLocaleDateString("cs-CZ")}
                    </span>
                    <Badge className={`text-[10px] ${status.color}`}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
