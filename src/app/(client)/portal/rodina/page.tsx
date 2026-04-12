"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PortalPageContainer } from "@/components/portal/PortalPageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Wallet, TrendingDown, TrendingUp, UserCircle } from "lucide-react";

interface FamilyMember {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  access_level: string;
  totalAssets: number;
  totalLiabilities: number;
}

const REL_LABELS: Record<string, string> = {
  partner: "Partner",
  spouse: "Manžel/ka",
  parent: "Rodič",
  child: "Dítě",
};

const REL_COLORS: Record<string, string> = {
  partner: "bg-purple-100 text-purple-700",
  spouse: "bg-pink-100 text-pink-700",
  parent: "bg-blue-100 text-blue-700",
  child: "bg-green-100 text-green-700",
};

function formatCZK(v: number) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(v);
}

export default function RodinaPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [myAssets, setMyAssets] = useState(0);
  const [myLiabilities, setMyLiabilities] = useState(0);
  const [hasFamily, setHasFamily] = useState(false);

  useEffect(() => {
    fetchFamily();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchFamily() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: client } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .eq("user_id", user.id)
      .single();
    if (!client) { setLoading(false); return; }

    // Get my financials
    const [investments, contracts] = await Promise.all([
      supabase.from("investments").select("current_value").eq("client_id", client.id),
      supabase.from("contracts").select("remaining_balance, type").eq("client_id", client.id),
    ]);

    const assets = (investments.data || []).reduce((s, i) => s + (i.current_value || 0), 0);
    const liabilities = (contracts.data || [])
      .filter((c) => c.type === "uver" || c.type === "hypoteka")
      .reduce((s, c) => s + (c.remaining_balance || 0), 0);
    setMyAssets(assets);
    setMyLiabilities(liabilities);

    // Get family links
    const { data: links } = await supabase
      .from("family_links")
      .select("id, primary_client_id, family_client_id, relationship, access_level")
      .or(`primary_client_id.eq.${client.id},family_client_id.eq.${client.id}`);

    if (!links || links.length === 0) {
      setHasFamily(false);
      setLoading(false);
      return;
    }

    setHasFamily(true);

    // Get other family members' data
    const familyMembers: FamilyMember[] = [];
    for (const link of links) {
      const otherId = link.primary_client_id === client.id
        ? link.family_client_id
        : link.primary_client_id;

      const { data: other } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("id", otherId)
        .single();

      if (!other) continue;

      const [otherInv, otherContracts] = await Promise.all([
        supabase.from("investments").select("current_value").eq("client_id", otherId),
        supabase.from("contracts").select("remaining_balance, type").eq("client_id", otherId),
      ]);

      const otherAssets = (otherInv.data || []).reduce((s, i) => s + (i.current_value || 0), 0);
      const otherLiab = (otherContracts.data || [])
        .filter((c) => c.type === "uver" || c.type === "hypoteka")
        .reduce((s, c) => s + (c.remaining_balance || 0), 0);

      familyMembers.push({
        id: other.id,
        first_name: other.first_name,
        last_name: other.last_name,
        relationship: link.relationship,
        access_level: link.access_level,
        totalAssets: otherAssets,
        totalLiabilities: otherLiab,
      });
    }

    setMembers(familyMembers);
    setLoading(false);
  }

  if (loading) {
    return (
      <PortalPageContainer className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </PortalPageContainer>
    );
  }

  if (!hasFamily) {
    return (
      <PortalPageContainer>
        <h1 className="text-2xl font-bold text-[var(--card-text)] mb-6 flex items-center gap-2">
          <Users className="h-6 w-6" /> Rodinný účet
        </h1>
        <div className="rounded-xl border bg-[var(--card-bg)] p-12 text-center shadow-sm">
          <Users className="h-16 w-16 text-[var(--card-text-dim)] mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[var(--card-text)] mb-2">
            Nemáte propojený rodinný účet
          </h2>
          <p className="text-sm text-[var(--card-text-muted)] max-w-md mx-auto">
            Požádejte svého poradce o propojení rodinného účtu. Získáte přehled
            o financích celé rodiny — společný majetek, závazky i finanční cíle.
          </p>
        </div>
      </PortalPageContainer>
    );
  }

  const totalFamilyAssets = myAssets + members.reduce((s, m) => s + m.totalAssets, 0);
  const totalFamilyLiab = myLiabilities + members.reduce((s, m) => s + m.totalLiabilities, 0);
  const netWorth = totalFamilyAssets - totalFamilyLiab;

  return (
    <PortalPageContainer>
      <h1 className="text-2xl font-bold gradient-text mb-6 flex items-center gap-2">
        <Users className="h-6 w-6" /> Rodinný účet
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-[var(--card-text-muted)] mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Celkový majetek rodiny
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCZK(totalFamilyAssets)}
          </p>
        </div>

        <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-[var(--card-text-muted)] mb-1">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Společné závazky
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCZK(totalFamilyLiab)}
          </p>
        </div>

        <div className="rounded-xl border bg-[var(--card-bg)] p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-[var(--card-text-muted)] mb-1">
            <Wallet className="h-4 w-4 text-blue-500" />
            Čistá hodnota rodiny
          </div>
          <p className={`text-2xl font-bold ${netWorth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatCZK(netWorth)}
          </p>
        </div>
      </div>

      {/* Family members */}
      <div className="rounded-xl border bg-[var(--card-bg)] shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--card-text)]">
            Členové rodiny
          </h2>
        </div>

        <div className="divide-y">
          {/* Current user */}
          <div className="flex items-center gap-4 px-6 py-4 bg-blue-50/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <UserCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-[var(--card-text)]">Vy</span>
              <Badge className="ml-2 text-[10px] bg-blue-100 text-blue-700">Vlastník</Badge>
            </div>
            <div className="text-right text-sm">
              <p className="text-emerald-600 font-medium">{formatCZK(myAssets)}</p>
              <p className="text-red-500 text-xs">{formatCZK(myLiabilities)} závazky</p>
            </div>
          </div>

          {/* Other members */}
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-4 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--table-header)] text-[var(--card-text-muted)]">
                <UserCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-[var(--card-text)]">
                  {member.first_name} {member.last_name}
                </span>
                <Badge
                  className={`ml-2 text-[10px] ${REL_COLORS[member.relationship] || "bg-[var(--table-header)] text-[var(--card-text)]"}`}
                >
                  {REL_LABELS[member.relationship] || member.relationship}
                </Badge>
                {member.access_level === "readonly" && (
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    Pouze čtení
                  </Badge>
                )}
              </div>
              <div className="text-right text-sm">
                <p className="text-emerald-600 font-medium">{formatCZK(member.totalAssets)}</p>
                <p className="text-red-500 text-xs">{formatCZK(member.totalLiabilities)} závazky</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PortalPageContainer>
  );
}
