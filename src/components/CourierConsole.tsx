"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Phone } from "lucide-react";
import { usePrice } from "@/lib/use-price";
import { whatsappDigits } from "@/lib/whatsapp";
import { DeliveryInfo } from "@/components/DeliveryInfo";
import type { OrderItem } from "@/types";

export type CourierOrder = {
  number: string;
  customerName: string;
  customerPhone: string;
  courierPhone: string | null;
  deliveryAddress: string | null;
  deliveryTime: string | null;
  status: string;
  totalPrice: number;
  paid: boolean;
  items: OrderItem[];
  branchName: string | null;
  branchPhone: string | null;
  deliveredAt: string | null;
};

/**
 * Что видит курьер по ссылке (docs/superpowers/specs/2026-09-29-order-delivery-design.md): куда, когда, кому звонить,
 * сколько взять с клиента и одна кнопка «Доставлен». Менять состав или отменять он не может.
 */
export function CourierConsole({ token, initial }: { token: string; initial: CourierOrder }) {
  const t = useTranslations("courier");
  const money = usePrice();
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = order.items.filter((i) => i.quantity > 0);

  async function markDelivered() {
    const question = order.paid ? t("confirmDelivered") : t("confirmDeliveredPaid", { total: money(order.totalPrice) });
    if (!confirm(question)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/c/${token}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("failed"));
        return;
      }
      setOrder(data.order as CourierOrder);
    } catch {
      setError(t("offline"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 max-w-md mx-auto w-full">
      <h1 className="font-display text-2xl mb-1">{t("title", { number: order.number })}</h1>
      <p className="text-sm text-muted mb-4">
        {order.customerName} · {order.customerPhone}
        {order.branchName ? ` · ${order.branchName}` : ""}
      </p>

      <div className="mb-4">
        <DeliveryInfo
          method="delivery"
          address={order.deliveryAddress}
          time={order.deliveryTime}
          customerPhone={order.customerPhone}
          courierPhone={order.courierPhone}
        />
      </div>

      <ul className="bg-card rounded-2xl border border-border divide-y divide-border mb-4">
        {items.map((item, i) => (
          <li key={i} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0">{item.name}</span>
            <span className="shrink-0 tabular-nums">× {item.quantity}</span>
          </li>
        ))}
      </ul>

      <div
        className={[
          "rounded-xl px-4 py-3 mb-5 flex items-baseline justify-between gap-3",
          order.paid ? "bg-success-soft text-success" : "bg-warning-soft text-warning",
        ].join(" ")}
      >
        <span className="text-sm font-semibold">{order.paid ? t("paid") : t("collect")}</span>
        <span className="font-display text-2xl tabular-nums">{money(order.totalPrice)}</span>
      </div>

      {error && <p className="rounded-xl bg-error-soft text-error text-sm px-4 py-3 mb-3">{error}</p>}

      {order.status === "completed" ? (
        <div className="rounded-xl bg-success-soft text-success px-4 py-4 flex items-center gap-2.5 font-semibold">
          <CheckCircle2 className="size-5 shrink-0" strokeWidth={2} aria-hidden />
          {t("done")}
        </div>
      ) : order.status === "shipped" ? (
        <button
          onClick={markDelivered}
          disabled={busy}
          className="w-full rounded-full bg-accent text-white py-4 text-base font-semibold transition active:scale-[0.98] disabled:opacity-50"
        >
          ✅ {busy ? t("saving") : order.paid ? t("delivered") : t("deliveredPaid")}
        </button>
      ) : (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm">{order.status === "cancelled" ? t("cancelled") : t("notShipped")}</p>
      )}

      {order.branchPhone && (
        <a
          href={`tel:+${whatsappDigits(order.branchPhone)}`}
          className="mt-4 w-full rounded-full border border-border bg-card py-3 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Phone className="size-4" strokeWidth={1.9} aria-hidden />
          {t("callShop")}
        </a>
      )}
    </main>
  );
}
