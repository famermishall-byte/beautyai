"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";

export function CartDrawer() {
  const { items, totalCount, totalPrice, changeQuantity, removeItem } = useCart();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function goToCheckout() {
    setOpen(false);
    router.push("/checkout");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Открыть корзину"
        className="fixed bottom-6 right-6 z-40 rounded-full bg-foreground text-background shadow-lg px-5 py-3 flex items-center gap-2 transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <span>🛍️ Корзина</span>
        {totalCount > 0 && (
          <span className="bg-accent text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-background h-full shadow-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl">Корзина</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Закрыть корзину"
                className="text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full transition hover:bg-black/5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                ×
              </button>
            </div>

            {items.length === 0 ? (
              <p className="text-muted">Корзина пока пуста.</p>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col gap-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3 items-start border-b border-black/5 pb-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.product.name}</div>
                      <div className="text-xs text-muted">{item.product.brand}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => changeQuantity(item.product.id, -1)}
                          aria-label={`Уменьшить количество: ${item.product.name}`}
                          className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center transition hover:bg-black/5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          −
                        </button>
                        <span className="text-sm w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => changeQuantity(item.product.id, 1)}
                          aria-label={`Увеличить количество: ${item.product.name}`}
                          className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center transition hover:bg-black/5 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-xs text-muted underline ml-2 transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                    <div className="text-sm font-display">
                      {(item.product.price * item.quantity).toLocaleString("ru-RU")} сом
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-black/10 mt-4">
              <div className="flex justify-between font-display text-xl mb-3">
                <span>Итого</span>
                <span>{totalPrice.toLocaleString("ru-RU")} сом</span>
              </div>
              {items.length > 0 && (
                <button
                  onClick={goToCheckout}
                  className="w-full rounded-full bg-foreground text-background px-4 py-3 text-sm font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 mb-2"
                >
                  Оформить заказ
                </button>
              )}
              <p className="text-xs text-muted">
                Оплата пока не подключена — заказ передаётся продавцу через WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
