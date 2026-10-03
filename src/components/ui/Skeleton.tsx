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

/** Заготовка горизонтальной ленты товаров (ширина карточки — как PRODUCT_RAIL_ITEM). */
export function ProductRailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden -mx-4 px-4 pb-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="w-40 shrink-0">
          <ProductCardSkeleton />
        </div>
      ))}
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
