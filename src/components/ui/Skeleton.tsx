export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-[var(--radius-control)] ${className}`} aria-hidden />;
}

function ProductCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] bg-card border border-border overflow-hidden flex flex-col">
      <Skeleton className="aspect-[4/5] rounded-none" />
      <div className="p-3.5 flex flex-col gap-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-5 w-1/2 mt-1" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
