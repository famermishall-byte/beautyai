"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingBag, X, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useSession } from "@/lib/session-context";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function CartDrawer() {
  const { items, totalCount, totalPrice, changeQuantity, removeItem } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin } = useSession();

  function goToCheckout() {
    setOpen(false);
    router.push("/checkout");
  }

  // The floating cart is on EVERY storefront page, so an order can be placed from wherever the customer is.
  // Only checkout itself hides it — the cart is already open there.
  if (pathname.startsWith("/checkout")) return null;
  // A product page has its own sticky "add to cart" bar above the bottom nav — float the cart above that bar.
  const onProduct = pathname.startsWith("/product/");
  // Admins/owners don't shop through their own account — see proxy.ts.
  if (isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Открыть корзину"
        style={onProduct ? { bottom: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 5.5rem)" } : undefined}
        className={["fixed right-4 z-40", onProduct ? "" : "bottom-24"].join(" ") + " rounded-full bg-accent text-white shadow-[var(--shadow-float)] pl-4 pr-3.5 py-3.5 flex items-center gap-2 transition hover:bg-accent-strong active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"}
      >
        <ShoppingBag className="size-4.5" strokeWidth={2} aria-hidden />
        <span className="text-sm font-medium">Корзина</span>
        {totalCount > 0 && (
          <span className="bg-white text-accent rounded-full text-xs font-semibold min-w-[20px] h-5 px-1 flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-background h-full shadow-xl flex flex-col animate-sheet-in">
            <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border">
              <h2 className="font-display text-2xl">Корзина</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Закрыть корзину"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border transition hover:bg-black/5 active:scale-90"
              >
                <X className="size-4.5" strokeWidth={2} aria-hidden />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState icon={ShoppingBag} title="Корзина пуста" description="Добавьте товары из каталога." />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 flex flex-col gap-4 py-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3 items-start border-b border-border pb-4 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.product.name}</div>
                      <div className="text-xs text-muted mb-2">{item.product.brand}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-accent-soft rounded-full px-1 py-1">
                          <button
                            onClick={() => changeQuantity(item.product.id, -1)}
                            aria-label={`Уменьшить количество: ${item.product.name}`}
                            className="w-6 h-6 rounded-full bg-white flex items-center justify-center transition active:scale-90"
                          >
                            <Minus className="size-3" strokeWidth={2.5} aria-hidden />
                          </button>
                          <span className="text-xs font-medium w-5 text-center tabular-nums">{item.quantity}</span>
                          <button
                            onClick={() => changeQuantity(item.product.id, 1)}
                            aria-label={`Увеличить количество: ${item.product.name}`}
                            className="w-6 h-6 rounded-full bg-white flex items-center justify-center transition active:scale-90"
                          >
                            <Plus className="size-3" strokeWidth={2.5} aria-hidden />
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          aria-label={`Удалить: ${item.product.name}`}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-muted transition hover:text-error hover:bg-error-soft"
                        >
                          <Trash2 className="size-3.5" strokeWidth={1.85} aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-display tabular-nums shrink-0">
                      {(item.product.price * item.quantity).toLocaleString("ru-RU")} сом
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-5 pt-4 pb-5 border-t border-border bg-card/60">
              <div className="flex justify-between font-display text-xl mb-3.5">
                <span>Итого</span>
                <span className="tabular-nums">{totalPrice.toLocaleString("ru-RU")} сом</span>
              </div>
              {items.length > 0 && (
                <Button variant="primary" size="lg" fullWidth onClick={goToCheckout} className="mb-2.5">
                  Оформить заказ
                </Button>
              )}
              <p className="text-xs text-muted text-center leading-relaxed">
                Оплата пока не подключена — заказ передаётся продавцу через WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
