import { cn } from "@/shared/lib/utils";

interface SkeletonProps {
  className?: string;
  count?: number;
}

function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse rounded-lg bg-gray-200", className)}
        />
      ))}
    </>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-6 w-24 mt-2" />
      </div>
    </div>
  );
}
