"use client";

import { useTranslations } from "next-intl";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { useCart } from "@/lib/cart-context";
import { unmarkAdded } from "@/lib/session-flags";
import type { CartItem } from "@/types";

/** Строка корзины: галочка «в заказ», количество, удаление. Снятая галочка — товар остаётся в корзине. */
export function CartItemRow({ item }: { item: CartItem }) {
  const t = useTranslations("cart");
  const price = usePrice();
  const text = useProductText();
  const { changeQuantity, removeItem, toggleSelected } = useCart();
  const name = text(item.product).name;

  return (
    <div className="flex gap-3 items-start border-b border-border pb-4 last:border-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.selected}
        aria-label={t("select", { name })}
        onClick={() => toggleSelected(item.product.id)}
        className={[
          "mt-0.5 size-6 shrink-0 rounded-md border flex items-center justify-center transition active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          item.selected ? "bg-accent border-accent text-white" : "bg-card border-border",
        ].join(" ")}
      >
        {item.selected && <Check className="size-4" strokeWidth={2.5} aria-hidden />}
      </button>

      <div className={["flex-1 min-w-0 transition-opacity", item.selected ? "" : "opacity-55"].join(" ")}>
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-xs text-muted mb-2">{item.product.brand}</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-accent-soft rounded-full px-1 py-1">
            <button
              type="button"
              onClick={() => changeQuantity(item.product.id, -1)}
              aria-label={t("decrease", { name })}
              className="w-6 h-6 rounded-full bg-white flex items-center justify-center transition active:scale-90"
            >
              <Minus className="size-3" strokeWidth={2.5} aria-hidden />
            </button>
            <span className="text-xs font-medium w-5 text-center tabular-nums">{item.quantity}</span>
            <button
              type="button"
              onClick={() => changeQuantity(item.product.id, 1)}
              aria-label={t("increase", { name })}
              className="w-6 h-6 rounded-full bg-white flex items-center justify-center transition active:scale-90"
            >
              <Plus className="size-3" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              removeItem(item.product.id);
              unmarkAdded(item.product.id);
            }}
            aria-label={t("remove", { name })}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted transition hover:text-error hover:bg-error-soft"
          >
            <Trash2 className="size-3.5" strokeWidth={1.85} aria-hidden />
          </button>
        </div>
      </div>

      <div className={["text-sm font-display tabular-nums shrink-0", item.selected ? "" : "text-muted"].join(" ")}>
        {price(item.product.price * item.quantity)}
      </div>
    </div>
  );
}
