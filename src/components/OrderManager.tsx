"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/types";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/orderStatus";

function OrderRow({ order, onUpdated }: { order: Order; onUpdated: (updated: Order) => void }) {
  const [saving, setSaving] = useState(false);

  async function handleStatusChange(status: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdated(data.order);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-black/5 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-medium">#{order.number}</span>
        <select
          value={order.status}
          disabled={saving}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-full bg-accent-soft text-accent text-xs px-3 py-1.5 outline-none disabled:opacity-50"
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="text-sm text-muted mb-2">{new Date(order.createdAt).toLocaleString("ru-RU")}</div>
      <div className="text-sm mb-2">
        {order.customerName} · {order.customerPhone}
      </div>
      <div className="flex flex-col gap-1 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{(item.price * item.quantity).toLocaleString("ru-RU")} сом</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between font-display text-lg pt-2 border-t border-black/10">
        <span>Итого</span>
        <span>{order.totalPrice.toLocaleString("ru-RU")} сом</span>
      </div>
      {order.branch && (
        <div className="text-xs text-muted mt-2">
          Филиал: {order.branch.name} · {order.branch.address}
        </div>
      )}
    </div>
  );
}

export function OrderManager() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  async function load() {
    const res = await fetch("/api/admin/orders");
    const data = await res.json();
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    // Fetching data on mount (a genuine "synchronize with an external
    // system" effect, per https://react.dev/learn/synchronizing-with-effects)
    // — not a derived-state case, so there's no render-time equivalent here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  function handleUpdated(updated: Order) {
    setOrders((prev) => (prev ? prev.map((o) => (o.id === updated.id ? updated : o)) : prev));
  }

  return (
    <div className="bg-card rounded-2xl border border-black/5 p-6">
      <h2 className="font-medium mb-1">Заказы</h2>
      <p className="text-sm text-muted mb-4">Меняйте статус заказа по мере обработки в WhatsApp.</p>

      {orders === null && <p className="text-muted text-sm">Загружаем…</p>}

      {orders !== null && orders.length === 0 && <p className="text-muted text-sm">Заказов пока нет.</p>}

      {orders && orders.length > 0 && (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}
