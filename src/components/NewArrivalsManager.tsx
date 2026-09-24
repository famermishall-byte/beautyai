"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { ProductPicker } from "@/components/ProductPicker";
import { Button } from "@/components/ui/Button";
import { usePrice } from "@/lib/use-price";
import type { NewArrival } from "@/types";

/**
 * Список товаров для верхнего слайдера на главной и плитки «Новинки» в каталоге — owner/admin
 * сам выбирает, что туда попадёт, и в каком порядке (стрелки вверх/вниз меняют priority местами
 * с соседом). Один и тот же список кормит оба места, см. /api/new-arrivals.
 */
export function NewArrivalsManager() {
  const t = useTranslations("newArrivalsManager");
  const price = usePrice();
  const [items, setItems] = useState<NewArrival[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/new-arrivals")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: NewArrival[] }) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePick(product: { id: string } | null) {
    if (!product) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/new-arrivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("addFailed"));
        return;
      }
      load();
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/new-arrivals/${id}`, { method: "DELETE" });
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= items.length) return;
    const a = items[index];
    const b = items[other];
    setBusyId(a.id);
    try {
      await Promise.all([
        fetch(`/api/admin/new-arrivals/${a.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: b.priority }),
        }),
        fetch(`/api/admin/new-arrivals/${b.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: a.priority }),
        }),
      ]);
      const next = [...items];
      next[index] = { ...b, priority: a.priority };
      next[other] = { ...a, priority: b.priority };
      next.sort((x, y) => x.priority - y.priority);
      setItems(next);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Loader2 className="size-5 animate-spin text-muted mx-auto my-8" aria-hidden />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("intro")}</p>

      <div className="bg-card border border-border rounded-[var(--radius-card)] p-4">
        <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t("addLabel")}
        </div>
        <ProductPicker picked={null} onPick={handlePick} />
        {adding && <p className="text-xs text-muted mt-2">{t("adding")}</p>}
        {error && <p className="text-sm bg-error-soft text-error rounded-[var(--radius-control)] px-4 py-3 mt-2">{error}</p>}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={item.id} className="bg-card border border-border rounded-[var(--radius-card)] p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-accent-soft shrink-0">
                {item.product?.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wide text-muted font-medium truncate">{item.product?.brand}</div>
                <div className="text-sm font-medium truncate">{item.product?.name ?? t("deletedProduct")}</div>
                {item.product && <div className="text-xs text-muted">{price(item.product.price)}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleMove(i, -1)}
                  disabled={i === 0 || busyId === item.id}
                  aria-label={t("moveUp")}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 disabled:opacity-30"
                >
                  <ArrowUp className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(i, 1)}
                  disabled={i === items.length - 1 || busyId === item.id}
                  aria-label={t("moveDown")}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted transition hover:bg-black/5 disabled:opacity-30"
                >
                  <ArrowDown className="size-4" strokeWidth={2} aria-hidden />
                </button>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(item.id)} disabled={busyId === item.id}>
                  <Trash2 className="size-4" strokeWidth={1.85} aria-hidden />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
