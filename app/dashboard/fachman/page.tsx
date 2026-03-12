"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
  subscription_type: string;
};

type Request = {
  id: string;
  title: string;
  description: string;
  location: string;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  created_at: string;
  expires_at: string;
  category_name?: string;
  category_icon?: string;
  offers_count?: number;
};

type Offer = {
  id: string;
  request_id: string;
  price: number;
  message: string;
  status: string;
  created_at: string;
  request_title?: string;
  request_location?: string;
};

type PlatformSettings = {
  free_offers_per_month: number;
};

export default function FachmanDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"requests" | "offers">("requests");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string }[]>([]);
  
  // Nastavení z databáze
  const [settings, setSettings] = useState<PlatformSettings>({ free_offers_per_month: 3 });
  const [offersThisMonth, setOffersThisMonth] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Načteme profil
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profileData || profileData.role !== "provider") {
      router.push("/dashboard");
      return;
    }

    setProfile(profileData);

    // Načteme nastavení platformy
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "platform_settings")
      .single();

    if (settingsData?.value) {
      setSettings(settingsData.value);
    }

    // Načteme kategorie
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, icon")
      .order("name");

    setCategories(categoriesData || []);

    // Načteme aktivní poptávky
    const { data: requestsData } = await supabase
      .from("requests")
      .select(`
        *,
        categories (name, icon)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (requestsData) {
      // Spočítáme nabídky pro každou poptávku
      const requestIds = requestsData.map(r => r.id);
      const { data: offersCountData } = await supabase
        .from("offers")
        .select("request_id")
        .in("request_id", requestIds);

      const offersCounts: Record<string, number> = {};
      offersCountData?.forEach(o => {
        offersCounts[o.request_id] = (offersCounts[o.request_id] || 0) + 1;
      });

      setRequests(requestsData.map(r => ({
        ...r,
        category_name: r.categories?.name,
        category_icon: r.categories?.icon,
        offers_count: offersCounts[r.id] || 0,
      })));
    }

    // Načteme moje nabídky
    const { data: myOffersData } = await supabase
      .from("offers")
      .select(`
        *,
        requests (title, location)
      `)
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (myOffersData) {
      setMyOffers(myOffersData.map(o => ({
        ...o,
        request_title: o.requests?.title,
        request_location: o.requests?.location,
      })));

      // Spočítáme nabídky tento měsíc
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthOffers = myOffersData.filter(o => 
        new Date(o.created_at) >= startOfMonth
      ).length;
      setOffersThisMonth(thisMonthOffers);
    }

    setLoading(false);
  };

  const daysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const filteredRequests = requests.filter(r => {
    if (locationFilter && !r.location.toLowerCase().includes(locationFilter.toLowerCase())) {
      return false;
    }
    if (categoryFilter && r.categories?.id !== categoryFilter) {
      return false;
    }
    return true;
  });

  const isPremium = profile?.subscription_type === "premium" || profile?.subscription_type === "business";
  const canSendOffer = isPremium || offersThisMonth < settings.free_offers_per_month;
  const remainingFreeOffers = Math.max(0, settings.free_offers_per_month - offersThisMonth);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Ahoj, {profile?.full_name}!</p>
          </div>
          <div className="flex items-center gap-3">
            {!profile?.is_verified && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                ⏳ Čeká na ověření
              </span>
            )}
            {isPremium ? (
              <span className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-sm font-medium">
                ⭐ {profile?.subscription_type === "business" ? "Business" : "Premium"}
              </span>
            ) : (
              <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                Free tarif
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Aktivní poptávky</p>
            <p className="text-3xl font-bold text-gray-900">{requests.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Moje nabídky</p>
            <p className="text-3xl font-bold text-gray-900">{myOffers.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm mb-1">Přijaté nabídky</p>
            <p className="text-3xl font-bold text-emerald-600">
              {myOffers.filter(o => o.status === "accepted").length}
            </p>
          </div>
          <div className={`rounded-2xl p-6 shadow-sm border ${
            isPremium 
              ? "bg-cyan-50 border-cyan-200" 
              : remainingFreeOffers > 0 
                ? "bg-white border-gray-100"
                : "bg-red-50 border-red-200"
          }`}>
            <p className="text-gray-500 text-sm mb-1">
              {isPremium ? "Neomezené nabídky" : "Zbývá nabídek"}
            </p>
            <p className={`text-3xl font-bold ${
              isPremium 
                ? "text-cyan-600" 
                : remainingFreeOffers > 0 
                  ? "text-gray-900"
                  : "text-red-600"
            }`}>
              {isPremium ? "∞" : `${remainingFreeOffers}/${settings.free_offers_per_month}`}
            </p>
            {!isPremium && (
              <Link href="/cenik" className="text-cyan-600 text-sm font-medium hover:underline">
                Upgradovat →
              </Link>
            )}
          </div>
        </div>

        {/* Upozornění na limit */}
        {!isPremium && remainingFreeOffers === 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-800">Vyčerpali jste limit nabídek</h3>
                <p className="text-red-700 text-sm">
                  Tento měsíc jste již odeslali {settings.free_offers_per_month} nabídek. 
                  Přejděte na Premium pro neomezené nabídky.
                </p>
                <Link 
                  href="/cenik" 
                  className="inline-block mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
                >
                  Upgradovat na Premium
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === "requests"
                ? "bg-cyan-500 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            📋 Dostupné poptávky ({filteredRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("offers")}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === "offers"
                ? "bg-cyan-500 text-white shadow-md"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            📨 Moje nabídky ({myOffers.length})
          </button>
        </div>

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lokalita</label>
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Např. Praha..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Všechny kategorie</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => { setLocationFilter(""); setCategoryFilter(""); }}
                    className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
                  >
                    Zrušit filtry
                  </button>
                </div>
              </div>
            </div>

            {/* Request List */}
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Žádné poptávky</h3>
                <p className="text-gray-600">Momentálně nejsou žádné aktivní poptávky odpovídající vašim filtrům.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map(request => (
                  <div key={request.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {request.category_icon && (
                            <span className="text-xl">{request.category_icon}</span>
                          )}
                          <h3 className="text-lg font-bold text-gray-900">{request.title}</h3>
                        </div>
                        <p className="text-gray-600 line-clamp-2 mb-3">{request.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">
                            📍 {request.location}
                          </span>
                          {(request.budget_min || request.budget_max) && (
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">
                              💰 {request.budget_min?.toLocaleString()} - {request.budget_max?.toLocaleString()} Kč
                            </span>
                          )}
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-sm">
                            📨 {request.offers_count} nabídek
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-sm ${
                            daysLeft(request.expires_at) <= 3 
                              ? "bg-red-100 text-red-700" 
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            ⏰ {daysLeft(request.expires_at)} dní
                          </span>
                        </div>
                      </div>
                      <div className="flex lg:flex-col gap-2">
                        <Link
                          href={`/poptavka/${request.id}`}
                          className="flex-1 lg:flex-none text-center px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                        >
                          Detail
                        </Link>
                        {canSendOffer ? (
                          <Link
                            href={`/poptavka/${request.id}#nabidka`}
                            className="flex-1 lg:flex-none text-center px-4 py-2 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-all font-medium"
                          >
                            Poslat nabídku
                          </Link>
                        ) : (
                          <span className="flex-1 lg:flex-none text-center px-4 py-2 bg-gray-200 text-gray-500 rounded-xl cursor-not-allowed font-medium">
                            Limit vyčerpán
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Offers Tab */}
        {activeTab === "offers" && (
          <>
            {myOffers.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <div className="text-5xl mb-4">📨</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Žádné nabídky</h3>
                <p className="text-gray-600">Zatím jste neodeslali žádné nabídky.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myOffers.map(offer => (
                  <div key={offer.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-gray-900">{offer.request_title}</h3>
                        <p className="text-gray-500 text-sm">📍 {offer.request_location}</p>
                        <p className="text-gray-600 text-sm mt-2 line-clamp-2">{offer.message}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-cyan-600">{offer.price?.toLocaleString()} Kč</p>
                          <p className="text-gray-400 text-xs">
                            {new Date(offer.created_at).toLocaleDateString("cs-CZ")}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          offer.status === "accepted" 
                            ? "bg-emerald-100 text-emerald-700"
                            : offer.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {offer.status === "accepted" ? "✅ Přijato" 
                            : offer.status === "rejected" ? "❌ Odmítnuto" 
                            : "⏳ Čeká"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          <Link
            href={`/fachman/${profile?.id}`}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center"
          >
            <div className="text-3xl mb-2">👤</div>
            <h3 className="font-semibold text-gray-900">Můj profil</h3>
            <p className="text-gray-500 text-sm">Zobrazit veřejný profil</p>
          </Link>
          <Link
            href="/dashboard/fachman/profil"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center"
          >
            <div className="text-3xl mb-2">✏️</div>
            <h3 className="font-semibold text-gray-900">Upravit profil</h3>
            <p className="text-gray-500 text-sm">Bio, kategorie, lokality</p>
          </Link>
          <Link
            href="/zpravy"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-center"
          >
            <div className="text-3xl mb-2">💬</div>
            <h3 className="font-semibold text-gray-900">Zprávy</h3>
            <p className="text-gray-500 text-sm">Komunikace se zákazníky</p>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}