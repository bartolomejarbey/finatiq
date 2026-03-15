import { Loader2 } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060d1a]">
      <Loader2 className="h-8 w-8 animate-spin text-[#22d3ee]" />
    </div>
  );
}
