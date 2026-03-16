import { CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#060d1a]">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#0a1628] p-12">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Oswald, sans-serif" }}>
            Finatiq
          </h1>
          <p className="mt-4 max-w-sm text-lg text-white/40" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Spravujte finance svých klientů na jednom místě
          </p>

          <div className="mt-10 space-y-5">
            {[
              "CRM a obchodní pipeline",
              "Klientský portál s automatizací",
              "AI asistent pro poradce",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 text-white/60">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-cyan-400" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-white/20">
          Platforma pro finančního poradce
        </p>
      </div>

      {/* Right content panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-[#060d1a] px-4 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Oswald, sans-serif" }}>
            Finatiq
          </h1>
        </div>
        <div className="w-full max-w-lg px-4">{children}</div>
      </div>
    </div>
  );
}
