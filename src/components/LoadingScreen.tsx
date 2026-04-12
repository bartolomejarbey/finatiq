"use client";

import { Loader2 } from "lucide-react";

interface LoadingScreenProps {
  logoUrl?: string | null;
  appName?: string;
  primaryColor?: string;
}

export default function LoadingScreen({
  logoUrl,
  appName,
  primaryColor,
}: LoadingScreenProps) {
  const color = primaryColor || "var(--color-primary, #2563EB)";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={appName || "Finatiq"}
            className="h-20 w-auto animate-pulse"
          />
        ) : (
          <span
            className="animate-pulse text-3xl font-bold"
            style={{ color }}
          >
            {appName || "Finatiq"}
          </span>
        )}

        <Loader2
          className="h-8 w-8 animate-spin"
          style={{ color }}
        />

        <p className="text-sm font-medium" style={{ color }}>
          Načítání...
        </p>
      </div>
    </div>
  );
}
