"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import type { Order } from "@/types";
import { getOrderStatusLabel } from "@/lib/orderStatus";
import { Link } from "@/i18n/navigation";
import { Package, ShoppingBag, MapPin } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Notice } from "@/components/ui/Notice";
import { OrderStatusBadge } from "@/components/ui/OrderStatusBadge";
import { buttonClasses } from "@/components/ui/Button";

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
    <main className="flex-1 px-4 pt-8 pb-10 max-w-2xl mx-auto w-full">
      <PageHeader icon={Package} title={t("title")} subtitle={t("subtitle")} />

      {orders === null && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label={t("loading")}>
          <Skeleton className="h-44 w-full rounded-card" />
          <Skeleton className="h-44 w-full rounded-card" />
        </div>
      )}

      {orders !== null && orders.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title={t("empty")}
          action={
            <Link href="/" className={buttonClasses({ size: "lg" })}>
              {t("toCatalog")}
            </Link>
          }
        />
      )}

      {orders && orders.length > 0 && (
        <div className="flex flex-col gap-4">
          {orders.map((order, i) => (
            <article
              key={order.id}
              className="surface-card p-4 animate-rise-in"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="font-display text-lg tabular-nums">#{order.number}</span>
                <OrderStatusBadge status={order.status} label={getOrderStatusLabel(ts, order.status)} />
              </div>
              <div className="text-xs text-muted mb-3">{new Date(order.createdAt).toLocaleString(locale)}</div>
              {order.editedAt && order.originalTotal !== null && order.originalTotal !== order.totalPrice && (
                <Notice tone="warning" className="mb-3">
                  {t("editedBanner")}
                </Notice>
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
                      <span className="shrink-0 tabular-nums">{item.quantity === 0 ? "—" : price(item.price * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between font-display text-lg pt-3 border-t border-border">
                <span>{t("total")}</span>
                <span className="tabular-nums">{price(order.totalPrice)}</span>
              </div>
              {order.originalTotal !== null && order.originalTotal !== order.totalPrice && (
                <div className="text-xs text-muted text-right">
                  {t("editedTotals", { was: price(order.originalTotal), now: price(order.totalPrice) })}
                </div>
              )}
              <div className="flex items-start gap-1.5 text-xs text-muted mt-3">
                <MapPin className="size-3.5 shrink-0 mt-px" strokeWidth={2} aria-hidden />
                {t("branchLine", { name: order.branch.name, address: order.branch.address })}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
