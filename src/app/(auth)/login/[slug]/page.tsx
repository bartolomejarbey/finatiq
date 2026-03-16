"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface AdvisorBrand {
  app_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent_color: string | null;
  custom_login_title: string | null;
  custom_login_subtitle: string | null;
  company_name: string | null;
}

export default function AdvisorLoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [brand, setBrand] = useState<AdvisorBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchBrand() {
      try {
        const res = await fetch(`/api/advisor-brand?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data: AdvisorBrand = await res.json();
        setBrand(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchBrand();
  }, [slug]);

  const primaryColor = brand?.brand_primary || "#2563EB";

  if (loading) {
    return <LoadingScreen />;
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060d1a]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Stránka nenalezena</CardTitle>
            <CardDescription>
              Zadaný odkaz není platný. Zkontrolujte prosím URL adresu.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Nesprávný email nebo heslo");
        setSubmitting(false);
        return;
      }

      router.push("/portal");
    } catch {
      setError("Nesprávný email nebo heslo");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}08 0%, ${primaryColor}15 50%, ${primaryColor}08 100%)`,
      }}
    >
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            {brand?.logo_url ? (
              <img
                src={brand.logo_url}
                alt={brand.app_name || "Logo"}
                className="h-16 w-auto"
              />
            ) : (
              <span
                className="text-2xl font-bold"
                style={{ color: primaryColor }}
              >
                {brand?.app_name || "FinAdvisor"}
              </span>
            )}
          </div>
          <CardTitle className="text-xl">
            {brand?.custom_login_title || "Přihlášení do klientského portálu"}
          </CardTitle>
          <CardDescription>
            {brand?.custom_login_subtitle || "Zadejte své přihlašovací údaje"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vas@email.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <Input
                id="password"
                type="password"
                placeholder="Vaše heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full text-white"
              style={{ backgroundColor: primaryColor }}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Přihlásit se
            </Button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-sm hover:underline"
                style={{ color: primaryColor }}
              >
                Zapomenuté heslo?
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
