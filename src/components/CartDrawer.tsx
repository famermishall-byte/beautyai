"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useSession } from "@/lib/session-context";
import { EmptyState } from "@/components/ui/EmptyState";
import { BannerGate } from "@/components/BannerInterstitial";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { CartCheckoutForm } from "@/components/cart/CartCheckoutForm";
import { CartOrderSent, type SentOrder } from "@/components/cart/CartOrderSent";
import { usePathname } from "@/i18n/navigation";

/** Открыть корзину из другого места (полоса опта под шапкой — WholesaleStrip). */
export const OPEN_CART_EVENT = "beautyai:open-cart";

export function CartDrawer() {
  const t = useTranslations("cart");
  const { items, totalCount, selectedCount, setAllSelected, reload, saveFailed } = useCart();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<SentOrder | null>(null);
  const pathname = usePathname();
  const { isAdmin } = useSession();

  useEffect(() => {
    const open = () => {
      setOpen(true);
      reload().catch(() => {});
    };
    window.addEventListener(OPEN_CART_EVENT, open);
    return () => window.removeEventListener(OPEN_CART_EVENT, open);
  }, [reload]);

  // Admins/owners don't shop through their own account — see proxy.ts.
  if (isAdmin) return null;
  // A product page has its own sticky "add to cart" bar above the bottom nav — float the cart above that bar.
  const onProduct = pathname.startsWith("/product/");
  const allSelected = items.length > 0 && items.every((i) => i.selected);

  function openDrawer() {
    setOpen(true);
    // Корзина могла измениться на другом устройстве.
    reload().catch(() => {});
  }

  function close() {
    setOpen(false);
    setSent(null);
  }

  return (
    <>
      <button
        onClick={openDrawer}
        aria-label={t("open")}
        style={onProduct ? { bottom: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 5.5rem)" } : undefined}
        className={["fixed right-4 z-40", onProduct ? "" : "bottom-24"].join(" ") + " rounded-full bg-accent text-white shadow-[var(--shadow-float)] pl-4 pr-3.5 py-3.5 flex items-center gap-2 transition hover:bg-accent-strong active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"}
      >
        <ShoppingBag className="size-4.5" strokeWidth={2} aria-hidden />
        <span className="text-sm font-medium">{t("title")}</span>
        {totalCount > 0 && (
          <span className="bg-white text-accent rounded-full text-xs font-semibold min-w-[20px] h-5 px-1 flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <BannerGate page="checkout" />
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]" onClick={close} />
          <div className="relative w-full max-w-sm bg-background h-full shadow-xl flex flex-col animate-sheet-in">
            <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border">
              <h2 className="font-display text-2xl">{t("title")}</h2>
              <button
                onClick={close}
                aria-label={t("close")}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-card border border-border transition hover:bg-black/5 active:scale-90"
              >
                <X className="size-4.5" strokeWidth={2} aria-hidden />
              </button>
            </div>

            {sent ? (
              <CartOrderSent order={sent} />
            ) : items.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState icon={ShoppingBag} title={t("empty")} description={t("emptyHint")} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setAllSelected(!allSelected)}
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    {t("selectAll")}
                  </button>
                  <span className="text-muted tabular-nums">{t("selectedSummary", { selected: selectedCount, total: totalCount })}</span>
                </div>

                {saveFailed && <p className="rounded-xl bg-error-soft text-error text-sm px-4 py-3">{t("saveFailed")}</p>}

                <div className="flex flex-col gap-4">
                  {items.map((item) => (
                    <CartItemRow key={item.product.id} item={item} />
                  ))}
                </div>

                <div className="border-t border-border pt-4">
                  <CartCheckoutForm onSent={setSent} />
                </div>
              </div>
            )}

            {!sent && (
              <div className="px-5 pt-3 pb-5 border-t border-border bg-card/60">
                <p className="text-xs text-muted text-center leading-relaxed">{t("paymentNote")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
