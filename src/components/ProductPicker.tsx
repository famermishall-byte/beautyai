"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import type { Product } from "@/types";

export type PickedProduct = { id: string; name: string; brand: string; imageUrl: string | null; price: number };

export function ProductPicker({
  picked,
  onPick,
}: {
  picked: PickedProduct | null;
  onPick: (product: PickedProduct | null) => void;
}) {
  const t = useTranslations("productPicker");
  const price = usePrice();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(query.trim())}`)
        .then((res) => (res.ok ? res.json() : { products: [] }))
        .then((data: { products: Product[] }) => {
          if (!cancelled) setResults((data.products ?? []).slice(0, 8));
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      cancelled = true;
    };
  }, [query]);

  if (picked) {
    return (
      <div className="flex items-center gap-3 rounded-control border border-border bg-card p-3">
        <div className="w-12 h-12 rounded-control overflow-hidden bg-accent-soft shrink-0">
          {picked.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={picked.imageUrl} alt={picked.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-2xs uppercase tracking-wide text-muted font-medium truncate">{picked.brand}</div>
          <div className="text-sm font-medium truncate">{picked.name}</div>
          <div className="text-xs text-muted">{price(picked.price)}</div>
        </div>
        <button
          type="button"
          onClick={() => onPick(null)}
          aria-label={t("clear")}
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted transition hover:bg-state-hover hover:text-error shrink-0"
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" strokeWidth={2} aria-hidden />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t("placeholder")}
          className="w-full rounded-control border border-border bg-background pl-10 pr-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-accent"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-raised mt-1 w-full rounded-control border border-border bg-card shadow-card max-h-72 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onPick({ id: product.id, name: product.name, brand: product.brand, imageUrl: product.imageUrl, price: product.price });
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 p-2.5 text-left transition hover:bg-state-hover border-b border-border last:border-0"
            >
              <div className="w-10 h-10 rounded-control overflow-hidden bg-accent-soft shrink-0">
                {product.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xs uppercase tracking-wide text-muted font-medium truncate">{product.brand}</div>
                <div className="text-sm truncate">{product.name}</div>
              </div>
              <div className="text-xs text-muted shrink-0">{price(product.price)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
