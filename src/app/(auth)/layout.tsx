import { CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gray-900 p-12">
        <div>
          <h1 className="text-2xl font-bold text-white">FinAdvisor</h1>
          <p className="mt-4 max-w-sm text-lg text-gray-400">
            Spravujte finance svých klientů na jednom místě
          </p>

          <div className="mt-10 space-y-5">
            {[
              "CRM a obchodní pipeline",
              "Klientský portál s automatizací",
              "AI asistent pro poradce",
            ].map((text) => (
              <div key={text} className="flex items-center gap-3 text-gray-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-400" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500">
          Platforma pro finančního poradce
        </p>
      </div>

      {/* Right content panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white px-4 py-12">
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <h1 className="text-2xl font-bold text-gray-900">FinAdvisor</h1>
        </div>
        <div className="w-full max-w-lg px-4">{children}</div>
      </div>
    </div>
  );
}
