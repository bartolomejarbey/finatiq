import { Skeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}
