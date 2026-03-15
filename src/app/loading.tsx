export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060d1a]">
      <div className="text-center">
        <div
          className="mx-auto mb-6 text-lg font-bold uppercase tracking-[4px] text-white"
          style={{
            fontFamily: "Oswald, sans-serif",
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        >
          FINATIQ
        </div>
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]"
              style={{
                animation: "bounce 1.4s infinite ease-in-out both",
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
