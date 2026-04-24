import { Skeleton } from "@/components/ui/skeleton";

export default function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-4 p-4 border border-[var(--border)] rounded-2xl bg-[var(--bg-surface)] max-w-sm">
      {/* Image Placeholder */}
      <Skeleton className="h-48 w-full rounded-xl" />
      
      <div className="flex items-center space-x-4">
        {/* Avatar Placeholder */}
        <Skeleton className="h-12 w-12 rounded-full" />
        
        <div className="space-y-2 flex-1">
          {/* Header/Title Placeholder */}
          <Skeleton className="h-4 w-3/4" />
          {/* Subtitle Placeholder */}
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
      </div>
    </div>
  );
}
