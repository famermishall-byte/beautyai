"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { OrderItem } from "@/types";
import { describeChanges, isReduced, orderTotal, orderedQty } from "@/lib/orderEdit";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { getOrderStatusAdminLabel } from "@/lib/orderStatus";

export type ConsoleOrder = {
  number: string;
  customerName: string;
  customerPhone: string;
  status: string;
  totalPrice: number;
  originalTotal: number | null;
  items: OrderItem[];
  branchName: string | null;
  editedAt: string | null;
};

const money = (n: number) => `${n.toLocaleString("ru-RU")} сом`;

// Kyrgyz numbers are often typed as 0700123456 or 700123456 — wa.me needs the country code.
function whatsappDigits(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 9) return `996${d}`;
  if (d.length === 10 && d.startsWith("0")) return `996${d.slice(1)}`;
  return d;
}

// The page a seller opens from the link in WhatsApp: fix the order (reduce / remove what is not there),
// mark the payment, or cancel — no login. Everything shows up at once in the app for the admin, the branch
// manager and the customer.
export function OrderConsole({ token, initial }: { token: string; initial: ConsoleOrder }) {
  const [order, setOrder] = useState<ConsoleOrder>(initial);
  const [quantities, setQuantities] = useState<number[]>(initial.items.map((i) => i.quantity));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const editable = order.status === "sent" || order.status === "confirmed";
  const changed = quantities.some((q, i) => q !== order.items[i].quantity);
  const newTotal = orderTotal(order.items, quantities);
  const reduced = isReduced(order.items);

  function setQty(i: number, q: number) {
    const max = orderedQty(order.items[i]);
    setQuantities((prev) => prev.map((v, idx) => (idx === i ? Math.max(0, Math.min(max, q)) : v)));
    setMessage(null);
  }

  async function call(payload: object, okText: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/o/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Не удалось выполнить действие." });
        return;
      }
      const next = data.order as ConsoleOrder;
      setOrder(next);
      setQuantities(next.items.map((i) => i.quantity));
      setMessage({ ok: true, text: okText });
    } catch {
      setMessage({ ok: false, text: "Нет связи. Изменения не сохранены." });
    } finally {
      setBusy(false);
    }
  }

  const changes = describeChanges(order.items);
  const customerText =
    changes.length > 0
      ? `Здравствуйте, ${order.customerName}! По вашему заказу №${order.number}: ${changes.join("; ")}. Новая сумма заказа — ${money(order.totalPrice)}. Подтверждаете?`
      : `Здравствуйте, ${order.customerName}! По вашему заказу №${order.number}.`;

  return (
    <main className="min-h-screen px-4 py-8 max-w-md mx-auto w-full">
      <h1 className="font-display text-2xl mb-1">Заказ №{order.number}</h1>
      <p className="text-sm text-muted mb-1">
        {order.customerName} · {order.customerPhone}
      </p>
      <p className="text-sm mb-5">
        Статус: <span className="font-medium">{getOrderStatusAdminLabel(order.status)}</span>
        {order.branchName ? <span className="text-muted"> · {order.branchName}</span> : null}
      </p>

      <ul className="bg-card rounded-2xl border border-border divide-y divide-border mb-4">
        {order.items.map((item, i) => {
          const q = quantities[i];
          const max = orderedQty(item);
          const gone = q === 0;
          return (
            <li key={i} className="p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className={["text-sm font-medium leading-snug", gone ? "line-through text-muted" : ""].join(" ")}>{item.name}</div>
                <div className="text-xs text-muted">
                  {item.brand} · {money(item.price)} {max !== q ? `· заказано ${max}` : ""}
                </div>
                {gone && <div className="text-xs font-medium text-error mt-0.5">нет в наличии</div>}
              </div>
              {editable ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setQty(i, q - 1)}
                    disabled={busy || q <= 0}
                    aria-label="Уменьшить"
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center disabled:opacity-30 active:scale-90"
                  >
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{q}</span>
                  <button
                    onClick={() => setQty(i, q + 1)}
                    disabled={busy || q >= max}
                    aria-label="Увеличить"
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center disabled:opacity-30 active:scale-90"
                  >
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <span className="text-sm tabular-nums shrink-0">× {q}</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-baseline justify-between mb-1">
        <span className="font-display text-lg">Итого</span>
        <span className="font-display text-2xl tabular-nums">{money(changed ? newTotal : order.totalPrice)}</span>
      </div>
      {(order.originalTotal !== null || changed) && (
        <div className="text-xs text-muted text-right mb-4">было {money(order.originalTotal ?? order.totalPrice)}</div>
      )}

      {!editable && (
        <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm mb-4">
          {order.status === "cancelled"
            ? "Заказ отменён."
            : "Заказ уже оплачен, состав менять нельзя. Если нужно изменить, обратитесь к администратору."}
        </p>
      )}

      {message && (
        <p role="status" className={["rounded-xl px-4 py-3 text-sm font-medium mb-4", message.ok ? "bg-success-soft text-success" : "bg-error-soft text-error"].join(" ")}>
          {message.text}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {editable && changed && (
          <button
            onClick={() => call({ action: "edit", quantities }, "Заказ изменён ✓ Сумма обновлена у администратора и у покупателя.")}
            disabled={busy}
            className="rounded-full bg-accent text-white py-3.5 text-base font-semibold transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Сохраняем…" : `Сохранить изменения · ${money(newTotal)}`}
          </button>
        )}
        {editable && (
          <button
            onClick={() => call({ action: "status", status: "paid" }, "Оплата отмечена ✓ Заказ учтён в продажах.")}
            disabled={busy || changed}
            className="rounded-full bg-success text-white py-3.5 text-base font-semibold transition active:scale-[0.98] disabled:opacity-40"
          >
            💰 Оплата получена
          </button>
        )}
        {editable && changed && <p className="text-xs text-muted text-center">Сначала сохраните изменения, потом отмечайте оплату.</p>}
        {reduced && (
          <a
            href={buildWhatsAppUrl(whatsappDigits(order.customerPhone), customerText)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border py-3 text-center text-sm font-medium"
          >
            Написать покупателю об изменениях
          </a>
        )}
        {editable && (
          <button
            onClick={() => {
              if (confirm("Отменить заказ?")) call({ action: "status", status: "cancelled" }, "Заказ отменён.");
            }}
            disabled={busy}
            className="text-sm text-muted underline py-2 disabled:opacity-50"
          >
            Отменить заказ
          </button>
        )}
      </div>
    </main>
  );
}
