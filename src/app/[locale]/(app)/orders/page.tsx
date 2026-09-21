"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import type { Order } from "@/types";
import { getOrderStatusLabel } from "@/lib/orderStatus";
import { Link } from "@/i18n/navigation";

export default function OrdersPage() {
  const t = useTranslations("orders");
  const ts = useTranslations("orderStatus");
  const locale = useLocale();
  const price = usePrice();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    // The seller may change the order (or mark it paid) while the customer has this page open — re-read every
    // 20 s and when the tab comes back into focus, so the new list and total appear without a manual refresh.
    const load = () =>
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => setOrders(data.orders ?? []))
        .catch(() => {});
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 20_000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-2">{t("title")}</h1>
      <p className="text-muted mb-8">{t("subtitle")}</p>

      {orders === null && <p className="text-muted text-sm">{t("loading")}</p>}

      {orders !== null && orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted mb-6">{t("empty")}</p>
          <Link
            href="/"
            className="inline-block rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95"
          >
            {t("toCatalog")}
          </Link>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-card rounded-xl border border-black/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">#{order.number}</span>
                <span className="text-xs bg-accent-soft text-accent rounded-full px-2 py-1">
                  {getOrderStatusLabel(ts, order.status)}
                </span>
              </div>
              <div className="text-sm text-muted mb-2">{new Date(order.createdAt).toLocaleString(locale)}</div>
              {order.editedAt && order.originalTotal !== null && order.originalTotal !== order.totalPrice && (
                <div className="rounded-lg bg-warning-soft text-warning text-sm font-medium px-3 py-2 mb-2">
                  {t("editedBanner")}
                </div>
              )}
              <div className="flex flex-col gap-1 mb-3">
                {order.items.map((item, i) => {
                  const ordered = item.orderedQuantity ?? item.quantity;
                  return (
                    <div key={i} className="flex justify-between gap-3 text-sm">
                      <span className={item.quantity === 0 ? "line-through text-muted" : ""}>
                        {item.name} × {item.quantity === 0 ? ordered : item.quantity}
                        {item.quantity === 0 && <span className="no-underline text-xs text-error ml-2 inline-block">{t("unavailable")}</span>}
                        {item.quantity > 0 && item.quantity < ordered && <span className="text-xs text-error ml-2">{t("wasQty", { n: ordered })}</span>}
                      </span>
                      <span className="shrink-0">{item.quantity === 0 ? "—" : price(item.price * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between font-display text-lg pt-2 border-t border-black/10">
                <span>{t("total")}</span>
                <span>{price(order.totalPrice)}</span>
              </div>
              {order.originalTotal !== null && order.originalTotal !== order.totalPrice && (
                <div className="text-xs text-muted text-right">
                  {t("editedTotals", { was: price(order.originalTotal), now: price(order.totalPrice) })}
                </div>
              )}
              <div className="text-xs text-muted mt-2">
                {t("branchLine", { name: order.branch.name, address: order.branch.address })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
