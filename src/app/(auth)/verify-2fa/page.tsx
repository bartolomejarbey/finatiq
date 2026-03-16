"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Verify2FAPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <Verify2FAForm />
    </Suspense>
  );
}

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("uid") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setError("Chybí identifikace uživatele.");
      return;
    }
    if (code.length !== 6) {
      setError("Kód musí mít 6 číslic.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Neplatný kód");
        toast.error("Neplatný kód");
        setLoading(false);
        return;
      }

      toast.success("Ověření úspěšné");
      router.push("/advisor");
    } catch {
      setError("Při ověřování došlo k chybě. Zkuste to znovu.");
      toast.error("Neplatný kód");
      setLoading(false);
    }
  }

  async function handleResendCode() {
    if (!userId) return;
    setResending(true);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, type: "2fa" }),
      });

      if (res.ok) {
        toast.success("Nový kód byl odeslán na váš email.");
      } else {
        toast.error("Nepodařilo se odeslat nový kód.");
      }
    } catch {
      toast.error("Nepodařilo se odeslat nový kód.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-2xl p-8 shadow-xl"
        style={{
          backgroundColor: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e2e8f0)",
        }}
      >
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10">
          <ShieldCheck className="h-7 w-7 text-blue-500" />
        </div>

        {/* Title */}
        <h1
          className="text-center text-2xl font-bold"
          style={{ color: "var(--text-primary, #0f172a)" }}
        >
          Dvoufaktorové ověření
        </h1>
        <p
          className="mt-2 text-center text-sm"
          style={{ color: "var(--text-secondary, #64748b)" }}
        >
          Zadejte 6místný kód zaslaný na váš email
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(val);
              }}
              className="text-center text-2xl font-mono tracking-[0.5em] py-3"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ověřit
          </Button>
        </form>

        {/* Resend link */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            className="text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ color: "var(--color-primary, #2563eb)" }}
          >
            {resending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Odesílání...
              </span>
            ) : (
              "Poslat kód znovu"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
