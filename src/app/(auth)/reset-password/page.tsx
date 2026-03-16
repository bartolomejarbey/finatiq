"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-red-600 mb-4">Neplatný odkaz pro obnovení hesla.</p>
        <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Vyžádat nový odkaz
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Hesla se neshodují.");
      return;
    }
    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Nepodařilo se změnit heslo.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Něco se pokazilo. Zkuste to znovu.");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Heslo změněno</h2>
        <p className="text-sm text-white/50 mb-6">
          Vaše heslo bylo úspěšně změněno. Nyní se můžete přihlásit.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
        >
          Přihlásit se
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="password">Nové heslo</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimálně 6 znaků"
          required
          minLength={6}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Potvrzení hesla</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Zadejte heslo znovu"
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading || !password || !confirmPassword}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Lock className="mr-2 h-4 w-4" />
        )}
        Změnit heslo
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060d1a] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-8 backdrop-blur-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Oswald, sans-serif" }}>Nové heslo</h1>
            <p className="text-sm text-white/40 mt-1">Zadejte své nové heslo</p>
          </div>
          <Suspense fallback={<div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto text-white/30" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
