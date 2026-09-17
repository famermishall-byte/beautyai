"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/types";
import { getOrderStatusLabel } from "@/lib/orderStatus";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data.orders ?? []));
  }, []);

  return (
    <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-2">Мои покупки</h1>
      <p className="text-muted mb-8">Заказы, оформленные с вашего аккаунта.</p>

      {orders === null && <p className="text-muted text-sm">Загружаем…</p>}

      {orders !== null && orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted mb-6">У вас пока нет заказов.</p>
          <Link
            href="/"
            className="inline-block rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95"
          >
            Перейти в каталог
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
                  {getOrderStatusLabel(order.status)}
                </span>
              </div>
              <div className="text-sm text-muted mb-2">{new Date(order.createdAt).toLocaleString("ru-RU")}</div>
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
              <div className="text-xs text-muted mt-2">
                Филиал: {order.branch.name} · {order.branch.address}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
