"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsLoggedIn(true);
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();
          
        if (profile) {
          setUserRole(profile.role);
          setUserName(profile.full_name);
        }
      }
    }

    checkUser();

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserRole(null);
    router.push("/");
  };

  const dashboardLink = userRole === "provider" ? "/dashboard/fachman" : userRole === "admin" ? "/admin" : "/dashboard";

  const navLinks = [
    { href: "/poptavky", label: "Poptávky", icon: "📋" },
    { href: "/nabidky", label: "Nabídky", icon: "💼" },
    { href: "/fachmani", label: "Fachmani", icon: "👷" },
    { href: "/feed", label: "Feed", icon: "📸", isNew: true },
    { href: "/cenik", label: "Ceník", icon: "💎" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-white/90 backdrop-blur-xl shadow-lg shadow-black/5 py-2" 
          : "bg-white/70 backdrop-blur-md py-3"
      }`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <Image
                src="/logo.png"
                alt="Fachmani"
                width={320}
                height={100}
                className="h-40 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              {/* Main Links */}
              <div className="flex items-center bg-gray-100/80 rounded-2xl p-1.5">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive(link.href)
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {link.label}
                      {link.isNew && (
                        <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          NEW
                        </span>
                      )}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-200 mx-4"></div>

              {/* Right Side */}
              {isLoggedIn ? (
                <div className="flex items-center gap-2">
                  <NotificationBell />
                  
                  <Link 
                    href="/zpravy" 
                    className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </Link>

                  {/* User Menu */}
                  <div className="relative group">
                    <button className="flex items-center gap-3 pl-3 pr-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                        {userName?.charAt(0) || "?"}
                      </div>
                      <span className="font-semibold text-gray-700 text-sm max-w-24 truncate">{userName?.split(" ")[0] || "Menu"}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 translate-y-2">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                        <p className="text-xs text-gray-500 capitalize">{userRole === "provider" ? "Fachman" : userRole}</p>
                      </div>
                      
                      <Link href={dashboardLink} className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">
                        <span className="text-lg">🏠</span>
                        <span className="text-sm font-medium">Dashboard</span>
                      </Link>
                      
                      {userRole === "provider" && (
                        <>
                          <Link href="/dashboard/profil" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">
                            <span className="text-lg">👤</span>
                            <span className="text-sm font-medium">Můj profil</span>
                          </Link>
                          <Link href="/dashboard/fachman/nabidky" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">
                            <span className="text-lg">💼</span>
                            <span className="text-sm font-medium">Moje nabídky</span>
                          </Link>
                        </>
                      )}
                      
                      <Link href="/zpravy" className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">
                        <span className="text-lg">💬</span>
                        <span className="text-sm font-medium">Zprávy</span>
                      </Link>
                      
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <span className="text-lg">🚪</span>
                          <span className="text-sm font-medium">Odhlásit se</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link 
                    href="/auth/login" 
                    className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-semibold text-sm transition-colors"
                  >
                    Přihlásit se
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-sm rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
                  >
                    Registrace
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
            >
              {isOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          
          <div className="absolute top-20 left-4 right-4 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in">
            <div className="p-4">
              {/* Navigation Links */}
              <div className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
                      isActive(link.href)
                        ? "bg-cyan-50 text-cyan-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">{link.icon}</span>
                      <span className="font-semibold">{link.label}</span>
                    </span>
                    {link.isNew && (
                      <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        NEW
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              <div className="h-px bg-gray-100 my-4"></div>

              {isLoggedIn ? (
                <div className="space-y-1">
                  {/* User Info */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center text-white text-lg font-bold">
                      {userName?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{userName}</p>
                      <p className="text-sm text-gray-500 capitalize">{userRole === "provider" ? "Fachman" : userRole}</p>
                    </div>
                  </div>

                  <Link
                    href={dashboardLink}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-gray-50 rounded-2xl transition-all"
                  >
                    <span className="text-xl">🏠</span>
                    <span className="font-semibold">Dashboard</span>
                  </Link>

                  {userRole === "provider" && (
                    <>
                      <Link
                        href="/dashboard/profil"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-gray-50 rounded-2xl transition-all"
                      >
                        <span className="text-xl">👤</span>
                        <span className="font-semibold">Můj profil</span>
                      </Link>
                      <Link
                        href="/dashboard/fachman/nabidky"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-gray-50 rounded-2xl transition-all"
                      >
                        <span className="text-xl">💼</span>
                        <span className="font-semibold">Moje nabídky</span>
                      </Link>
                    </>
                  )}

                  <Link
                    href="/zpravy"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 text-gray-700 hover:bg-gray-50 rounded-2xl transition-all"
                  >
                    <span className="text-xl">💬</span>
                    <span className="font-semibold">Zprávy</span>
                  </Link>

                  <button
                    onClick={() => { handleLogout(); setIsOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <span className="text-xl">🚪</span>
                    <span className="font-semibold">Odhlásit se</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link
                    href="/auth/login"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center px-6 py-3.5 text-gray-700 font-semibold border-2 border-gray-200 rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    Přihlásit se
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-lg transition-all"
                  >
                    Registrace
                  </Link>
                  <Link
                    href="/auth/register?role=provider"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center px-6 py-3.5 bg-gray-900 text-white font-semibold rounded-2xl hover:bg-gray-800 transition-all"
                  >
                    🔧 Jsem fachman
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}