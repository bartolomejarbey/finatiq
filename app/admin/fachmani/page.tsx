"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "../components/AdminLayout";
import Link from "next/link";

type Fachman = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  description: string | null;
  is_verified: boolean;
  subscription_type: string;
  avg_rating: number | null;
  review_count: number | null;
  created_at: string;
};

export default function AdminFachmani() {
  const [fachmani, setFachmani] = useState<Fachman[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    loadFachmani();
  }, []);

  const loadFachmani = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, location, description, is_verified, subscription_type, avg_rating, review_count, created_at")
      .eq("role", "provider")
      .order("created_at", { ascending: false });

    setFachmani(data || []);
    setLoading(false);
  };

  const handleVerify = async (id: string, verify: boolean) => {
    await supabase
      .from("profiles")
      .update({ is_verified: verify })
      .eq("id", id);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("admin_activity_log").insert({
      admin_id: user?.id,
      action: verify ? "verify_user" : "unverify_user",
      target_type: "user",
      target_id: id,
    });

    loadFachmani();
  };

  const filteredFachmani = fachmani.filter((f) => {
    const matchesSearch =
      f.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase()) ||
      f.location?.toLowerCase().includes(search.toLowerCase());

    if (filter === "verified") return matchesSearch && f.is_verified;
    if (filter === "unverified") return matchesSearch && !f.is_verified;
    if (filter === "premium") return matchesSearch && f.subscription_type === "premium";
    if (filter === "business") return matchesSearch && f.subscription_type === "business";
    return matchesSearch;
  });

  const getSubscriptionBadge = (sub: string) => {
    switch (sub) {
      case "premium":
        return { label: "Premium", color: "bg-purple-500/20 text-purple-400" };
      case "business":
        return { label: "Business", color: "bg-amber-500/20 text-amber-400" };
      default:
        return { label: "Free", color: "bg-slate-500/20 text-slate-400" };
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">👷 Fachmani</h1>
            <p className="text-slate-400">
              Celkem {fachmani.length} fachmanů • {fachmani.filter(f => f.is_verified).length} ověřených
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Hledat podle jména, emailu nebo lokality..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "Všichni" },
              { key: "verified", label: "✅ Ověření" },
              { key: "unverified", label: "🔴 Neověření" },
              { key: "premium", label: "⭐ Premium" },
              { key: "business", label: "💎 Business" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filter === f.key
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredFachmani.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Žádní fachmani nenalezeni
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Fachman
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Lokalita
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Stav
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Předplatné
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Hodnocení
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Registrace
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredFachmani.map((fachman) => {
                    const subBadge = getSubscriptionBadge(fachman.subscription_type);
                    return (
                      <tr key={fachman.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold">
                              {fachman.full_name?.charAt(0) || "?"}
                            </div>
                            <div>
                              <p className="text-white font-medium">{fachman.full_name || "Bez jména"}</p>
                              <p className="text-slate-500 text-sm">{fachman.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {fachman.location || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                            fachman.is_verified
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {fachman.is_verified ? "✅ Ověřen" : "⏳ Neověřen"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${subBadge.color}`}>
                            {subBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {fachman.avg_rating ? (
                            <span className="flex items-center gap-1">
                              ⭐ {Number(fachman.avg_rating).toFixed(1)}
                              <span className="text-slate-500">({fachman.review_count || 0})</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm">
                          {new Date(fachman.created_at).toLocaleDateString("cs-CZ")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!fachman.is_verified ? (
                              <button
                                onClick={() => handleVerify(fachman.id, true)}
                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                              >
                                ✅ Ověřit
                              </button>
                            ) : (
                              <button
                                onClick={() => handleVerify(fachman.id, false)}
                                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
                              >
                                Zrušit ověření
                              </button>
                            )}
                            <Link
                              href={`/fachman/${fachman.id}`}
                              target="_blank"
                              className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white transition-colors"
                            >
                              Zobrazit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
