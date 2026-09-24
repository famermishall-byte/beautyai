"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2, Check } from "lucide-react";
import { ProductPicker } from "@/components/ProductPicker";
import { Button } from "@/components/ui/Button";
import { usePrice } from "@/lib/use-price";
import { NEW_ARRIVALS_HOME_COUNT } from "@/lib/new-arrivals";
import type { NewArrival } from "@/types";

type Item = { productId: string; name: string; brand: string; imageUrl: string | null; price: number };

function toItem(a: NewArrival): Item | null {
  if (!a.product) return null;
  return { productId: a.productId, name: a.product.name, brand: a.product.brand, imageUrl: a.product.imageUrl, price: a.product.price };
}

/**
 * Список товаров для верхнего слайдера на главной и плитки «Новинки» в каталоге — owner/admin
 * сам выбирает состав и порядок. Добавление/удаление/перестановка меняют только то, что видно
 * на экране — на сервер уходит целиком по кнопке «Сохранить» (по просьбе владельца, 24.09: было
 * непонятно, применились ли изменения, раз ничего явно не подтверждало сохранение).
 */
export function NewArrivalsManager() {
  const t = useTranslations("newArrivalsManager");
  const price = usePrice();
  const [items, setItems] = useState<Item[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/new-arrivals")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: NewArrival[] }) => {
        const loaded = (data.items ?? []).map(toItem).filter((i): i is Item => i !== null);
        setItems(loaded);
        setSavedIds(loaded.map((i) => i.productId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dirty = items.length !== savedIds.length || items.some((it, i) => it.productId !== savedIds[i]);

  function handlePick(product: { id: string; name: string; brand: string; imageUrl: string | null; price: number } | null) {
    if (!product) return;
    setJustSaved(false);
    setItems((prev) => (prev.some((i) => i.productId === product.id) ? prev : [...prev, { productId: product.id, name: product.name, brand: product.brand, imageUrl: product.imageUrl, price: product.price }]));
  }

  function handleRemove(productId: string) {
    setJustSaved(false);
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function handleMove(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (other < 0 || other >= items.length) return;
    setJustSaved(false);
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[other]] = [next[other], next[index]];
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/new-arrivals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: items.map((i) => i.productId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("saveFailed"));
        return;
      }
      setSavedIds(items.map((i) => i.productId));
      setJustSaved(true);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader2 className="size-5 animate-spin text-muted mx-auto my-8" aria-hidden />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("intro")}</p>

      <div className="surface-card p-4">
        <div className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t("addLabel")}
        </div>
        <ProductPicker picked={null} onPick={handlePick} />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={item.productId}>
              {i === NEW_ARRIVALS_HOME_COUNT && (
                <div className="flex items-center gap-2 my-1 text-xs text-muted">
                  <div className="flex-1 h-px bg-border" />
                  {t("belowCutoff", { count: NEW_ARRIVALS_HOME_COUNT })}
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <div className="surface-card p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-control overflow-hidden bg-accent-soft shrink-0">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-2xs uppercase tracking-wide text-muted font-medium truncate">{item.brand}</div>
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-xs text-muted">{price(item.price)}</div>
                  {i < NEW_ARRIVALS_HOME_COUNT && <div className="text-2xs text-accent font-medium mt-0.5">{t("onHome")}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleMove(i, -1)}
                    disabled={i === 0}
                    aria-label={t("moveUp")}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-state-hover disabled:opacity-30 focus-ring"
                  >
                    <ArrowUp className="size-4" strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(i, 1)}
                    disabled={i === items.length - 1}
                    aria-label={t("moveDown")}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted transition hover:bg-state-hover disabled:opacity-30 focus-ring"
                  >
                    <ArrowDown className="size-4" strokeWidth={2} aria-hidden />
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(item.productId)}>
                    <Trash2 className="size-4" strokeWidth={1.85} aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm bg-error-soft text-error rounded-control px-4 py-3">{error}</p>}

      <div className="flex items-center gap-3 sticky bottom-4">
        <Button size="lg" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {saving ? t("saving") : t("save")}
        </Button>
        {justSaved && !dirty && (
          <span className="text-sm text-success flex items-center gap-1">
            <Check className="size-4" strokeWidth={2.5} aria-hidden />
            {t("saved")}
          </span>
        )}
        {dirty && !saving && <span className="text-xs text-muted">{t("unsavedHint")}</span>}
      </div>
    </div>
  );
}
