"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { OrderItem } from "@/types";
import { describeChanges, isReduced, orderTotal, orderedQty } from "@/lib/orderEdit";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
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
  const t = useTranslations("orderConsole");
  const ts = useTranslations("orderStatus");
  const money = usePrice();
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
        setMessage({ ok: false, text: data.error ?? t("actionFailed") });
        return;
      }
      const next = data.order as ConsoleOrder;
      setOrder(next);
      setQuantities(next.items.map((i) => i.quantity));
      setMessage({ ok: true, text: okText });
    } catch {
      setMessage({ ok: false, text: t("offline") });
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
      <h1 className="font-display text-2xl mb-1">{t("orderTitle", { number: order.number })}</h1>
      <p className="text-sm text-muted mb-1">
        {order.customerName} · {order.customerPhone}
      </p>
      <p className="text-sm mb-5">
        {t("status")}: <span className="font-medium">{getOrderStatusAdminLabel(ts, order.status)}</span>
        {order.branchName ? <span className="text-muted"> · {order.branchName}</span> : null}
      </p>

      <ul className="bg-card rounded-card border border-border divide-y divide-border mb-4">
        {order.items.map((item, i) => {
          const q = quantities[i];
          const max = orderedQty(item);
          const gone = q === 0;
          return (
            <li key={i} className="p-4 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className={["text-sm font-medium leading-snug", gone ? "line-through text-muted" : ""].join(" ")}>{item.name}</div>
                <div className="text-xs text-muted">
                  {item.brand} · {money(item.price)} {max !== q ? `· ${t("ordered", { n: max })}` : ""}
                </div>
                {gone && <div className="text-xs font-medium text-error mt-0.5">{t("noStock")}</div>}
              </div>
              {editable ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setQty(i, q - 1)}
                    disabled={busy || q <= 0}
                    aria-label={t("decrease")}
                    className="w-9 h-9 rounded-full border border-border flex items-center justify-center disabled:opacity-30 active:scale-90"
                  >
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{q}</span>
                  <button
                    onClick={() => setQty(i, q + 1)}
                    disabled={busy || q >= max}
                    aria-label={t("increase")}
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
        <span className="font-display text-lg">{t("total")}</span>
        <span className="font-display text-2xl tabular-nums">{money(changed ? newTotal : order.totalPrice)}</span>
      </div>
      {(order.originalTotal !== null || changed) && (
        <div className="text-xs text-muted text-right mb-4">{t("was", { total: money(order.originalTotal ?? order.totalPrice) })}</div>
      )}

      {!editable && (
        <p className="rounded-control bg-accent-soft px-4 py-3 text-sm mb-4">
          {order.status === "cancelled"
            ? t("cancelled")
            : t("alreadyPaid")}
        </p>
      )}

      {message && (
        <p role="status" className={["rounded-control px-4 py-3 text-sm font-medium mb-4", message.ok ? "bg-success-soft text-success" : "bg-error-soft text-error"].join(" ")}>
          {message.text}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {editable && changed && (
          <button
            onClick={() => call({ action: "edit", quantities }, t("editedOk"))}
            disabled={busy}
            className="rounded-full bg-accent text-on-accent py-3.5 text-base font-semibold transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? t("saving") : t("saveChanges", { total: money(newTotal) })}
          </button>
        )}
        {editable && (
          <button
            onClick={() => call({ action: "status", status: "paid" }, t("paidOk"))}
            disabled={busy || changed}
            className="rounded-full bg-success text-on-accent py-3.5 text-base font-semibold transition active:scale-[0.98] disabled:opacity-40"
          >
            💰 {t("paymentReceived")}
          </button>
        )}
        {editable && changed && <p className="text-xs text-muted text-center">{t("saveFirst")}</p>}
        {reduced && (
          <a
            href={buildWhatsAppUrl(whatsappDigits(order.customerPhone), customerText)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border py-3 text-center text-sm font-medium"
          >
            {t("writeToCustomer")}
          </a>
        )}
        {editable && (
          <button
            onClick={() => {
              if (confirm(t("cancelConfirm"))) call({ action: "status", status: "cancelled" }, t("cancelled"));
            }}
            disabled={busy}
            className="text-sm text-muted underline py-2 disabled:opacity-50"
          >
            {t("cancelOrder")}
          </button>
        )}
      </div>
    </main>
  );
}
