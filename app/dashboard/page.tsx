"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import { Icons } from "@/app/components/Icons";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

type Request = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  expires_at: string;
  location: string;
  category_name?: string;
  category_icon?: string;
  offers_count?: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);

      if (profileData.role === "provider") {
        router.push("/dashboard/fachman");
        return;
      }
    }

    // Načteme poptávky s kategoriemi
    const { data: requestsData } = await supabase
      .from("requests")
      .select(`
        id, title, status, created_at, expires_at, location,
        categories (name, icon)
      `)
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });

    if (requestsData) {
      // Spočítáme nabídky pro každou poptávku
      const requestIds = requestsData.map(r => r.id);
      const { data: offersData } = await supabase
        .from("offers")
        .select("request_id")
        .in("request_id", requestIds);

      const offersCounts: Record<string, number> = {};
      offersData?.forEach(o => {
        offersCounts[o.request_id] = (offersCounts[o.request_id] || 0) + 1;
      });

      setRequests(requestsData.map(r => ({
        ...r,
        category_name: (r.categories as any)?.name,
        category_icon: (r.categories as any)?.icon,
        offers_count: offersCounts[r.id] || 0,
      })));
    }

    setLoading(false);
  };

  const daysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const days = daysLeft(expiresAt);
    if (status === "completed") {
      return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">✓ Dokončeno</span>;
    }
    if (status === "cancelled") {
      return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">Zrušeno</span>;
    }
    if (days === 0) {
      return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">Vypršelo</span>;
    }
    if (days <= 3) {
      return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">⏰ {days} dny</span>;
    }
    return <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-medium">Aktivní • {days} dní</span>;
  };

  const activeRequests = requests.filter(r => r.status === "active" && daysLeft(r.expires_at) > 0);
  const totalOffers = requests.reduce((sum, r) => sum + (r.offers_count || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 pt-28 pb-8">
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 ${mounted ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Moje poptávky</h1>
            <p className="text-gray-600">Ahoj, {profile?.full_name}! 👋</p>
          </div>
          <Link
            href="/nova-poptavka"
            className="inline-flex items-center justify-center gap-2 gradient-bg text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            + Nová poptávka
          </Link>
        </div>

        {/* Stats */}
        <div className={`grid sm:grid-cols-3 gap-4 mb-8 ${mounted ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                <span className="text-cyan-600 text-xl">📋</span>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Aktivní poptávky</p>
                <p className="text-2xl font-bold text-gray-900">{activeRequests.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <span className="text-emerald-600 text-xl">📨</span>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Celkem nabídek</p>
                <p className="text-2xl font-bold text-gray-900">{totalOffers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-purple-600 text-xl">✓</span>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Dokončené</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.status === "completed").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className={`bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center ${mounted ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📭</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Zatím žádné poptávky</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Zadejte svou první poptávku a během 24 hodin získejte nabídky od ověřených fachmanů.
            </p>
            <Link
              href="/nova-poptavka"
              className="inline-flex items-center gap-2 gradient-bg text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl transition-all"
            >
              Zadat první poptávku
              {Icons.arrowRight}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request, index) => (
              <Link
                key={request.id}
                href={`/poptavka/${request.id}`}
                className={`block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: `${(index + 2) * 50}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {request.category_icon && (
                        <span className="text-2xl">{request.category_icon}</span>
                      )}
                      <h3 className="text-lg font-bold text-gray-900">{request.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        📍 {request.location}
                      </span>
                      {request.category_name && (
                        <span className="flex items-center gap-1">
                          📁 {request.category_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        📅 {new Date(request.created_at).toLocaleDateString("cs-CZ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {request.offers_count && request.offers_count > 0 ? (
                      <div className="text-center px-4">
                        <p className="text-2xl font-bold text-cyan-600">{request.offers_count}</p>
                        <p className="text-xs text-gray-500">nabídek</p>
                      </div>
                    ) : null}
                    {getStatusBadge(request.status, request.expires_at)}
                    <span className="text-gray-400">
                      {Icons.arrowRight}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className={`mt-12 grid sm:grid-cols-3 gap-4 ${mounted ? 'animate-fade-in-up animation-delay-300' : 'opacity-0'}`}>
          <Link
            href="/fachmani"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center group"
          >
            <div className="text-3xl mb-3">👷</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">Procházet fachmany</h3>
            <p className="text-gray-500 text-sm">Najít profesionály</p>
          </Link>
          <Link
            href="/poptavky"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center group"
          >
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">Veřejné poptávky</h3>
            <p className="text-gray-500 text-sm">Co řeší ostatní</p>
          </Link>
          <Link
            href="/zpravy"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center group"
          >
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-semibold text-gray-900 group-hover:text-cyan-600 transition-colors">Zprávy</h3>
            <p className="text-gray-500 text-sm">Komunikace</p>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}