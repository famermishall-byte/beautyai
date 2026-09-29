"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Store, Truck } from "lucide-react";
import type { DeliveryMethod } from "@/lib/delivery";
import { usePrice } from "@/lib/use-price";
import { useCart } from "@/lib/cart-context";
import { useSession } from "@/lib/session-context";
import type { SentOrder } from "@/components/cart/CartOrderSent";
import { WholesaleProgress } from "@/components/cart/WholesaleProgress";
import type { Branch, Order } from "@/types";

// Тот же ключ, что в каталоге и на странице товара, — филиал, выбранный там, подставляется сюда.
const BRANCH_STORAGE_KEY = "beautyai-branch";

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent";

/** Филиал + имя + телефон + «Отправить в WhatsApp» — в заказ уходят только отмеченные товары. */
export function CartCheckoutForm({ onSent }: { onSent: (order: SentOrder) => void }) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const price = usePrice();
  const { selectedCount, selectedTotal, flush, reload, wholesale } = useCart();
  const { session } = useSession();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState(session?.displayName ?? "");
  const [phone, setPhone] = useState("");
  // Как получить заказ (docs/superpowers/specs/2026-09-29-order-delivery-design.md); проверка — parseDeliveryInput на сервере.
  const [method, setMethod] = useState<DeliveryMethod>("pickup");
  const [address, setAddress] = useState("");
  const [time, setTime] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches?: Branch[] }) => {
        if (cancelled) return;
        const list = data.branches ?? [];
        setBranches(list);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(BRANCH_STORAGE_KEY);
        } catch {
          // недоступно — клиент выберет сам
        }
        const preset = stored && list.some((b) => b.id === stored) ? stored : list.length === 1 ? list[0].id : "";
        setBranchId((current) => current || preset);
      })
      .catch(() => {});
    // Контакты из последнего заказа — клиенту не нужно вводить телефон каждый раз.
    fetch("/api/orders")
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data: { orders?: Order[] }) => {
        if (cancelled) return;
        const last = data.orders?.[0];
        if (!last) return;
        setName((current) => current || last.customerName);
        setPhone((current) => current || last.customerPhone);
        // Адрес — из последнего заказа с доставкой, чтобы не вводить его заново.
        const lastDelivery = data.orders?.find((o) => o.deliveryMethod === "delivery" && o.deliveryAddress);
        if (lastDelivery) {
          setAddress((current) => current || lastDelivery.deliveryAddress!);
          setCourierPhone((current) => current || lastDelivery.courierPhone || "");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const addressMissing = method === "delivery" && address.trim().length < 5;
  const canSubmit = selectedCount > 0 && !!branchId && !!name.trim() && !!phone.trim() && !addressMissing && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      // Галочки/количества, изменённые секунду назад, должны дойти до сервера раньше заказа.
      // Если какое-то изменение не сохранилось, сервер оформил бы не то, что клиент видит, — стоп.
      if (!(await flush())) {
        setError(tCart("saveFailed"));
        return;
      }
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          customerName: name,
          customerPhone: phone,
          deliveryMethod: method,
          ...(method === "delivery" ? { deliveryAddress: address, deliveryTime: time, courierPhone } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("failed"));
        return;
      }
      window.open(data.whatsappUrl, "_blank")?.focus();
      // Сервер уже убрал заказанные строки — подтягиваем корзину, в ней остаются неотмеченные.
      await reload().catch(() => {});
      onSent({ orderNumber: data.orderNumber, whatsappUrl: data.whatsappUrl });
    } catch {
      setError(t("somethingWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <label className="block">
        <span className="block text-xs font-medium text-muted mb-1.5">{t("branch")}</span>
        {branches.length === 0 ? (
          <p className="text-sm text-muted">{t("noBranches")}</p>
        ) : (
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputClass}>
            <option value="" disabled>
              {t("branchPlaceholder")}
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.address}
              </option>
            ))}
          </select>
        )}
      </label>
      <input className={inputClass} placeholder={t("namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      <input className={inputClass} placeholder={t("phonePlaceholder")} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" />

      <fieldset>
        <legend className="block text-xs font-medium text-muted mb-1.5">{t("howToGet")}</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {(
            [
              { key: "pickup", icon: Store, label: t("pickup") },
              { key: "delivery", icon: Truck, label: t("delivery") },
            ] as const
          ).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={method === key}
              onClick={() => setMethod(key)}
              className={[
                "rounded-[var(--radius-control)] border px-3 py-3 text-sm font-medium flex items-center justify-center gap-2 min-h-11 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                method === key ? "border-accent bg-accent-soft text-accent-strong" : "border-border bg-card text-foreground",
              ].join(" ")}
            >
              <Icon className="size-4.5 shrink-0" strokeWidth={1.9} aria-hidden />
              {label}
            </button>
          ))}
        </div>
        {method === "pickup" && <p className="text-xs text-muted mt-1.5">{t("pickupHint")}</p>}
      </fieldset>

      {method === "delivery" && (
        <div className="flex flex-col gap-3 animate-rise-in">
          <label className="block">
            <span className="block text-xs font-medium text-muted mb-1.5">{t("addressLabel")}</span>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder={t("addressPlaceholder")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
              maxLength={300}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted mb-1.5">{t("timeLabel")}</span>
            <input className={inputClass} placeholder={t("timePlaceholder")} value={time} onChange={(e) => setTime(e.target.value)} maxLength={100} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-muted mb-1.5">{t("courierPhoneLabel")}</span>
            <input
              className={inputClass}
              placeholder={t("courierPhonePlaceholder")}
              value={courierPhone}
              onChange={(e) => setCourierPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
            <span className="block text-xs text-muted mt-1.5">{t("courierPhoneHint")}</span>
          </label>
        </div>
      )}

      <WholesaleProgress summary={wholesale} />

      <div className="flex justify-between font-display text-xl mt-1">
        <span>{t("totalSelected", { count: selectedCount })}</span>
        <span className="tabular-nums">{price(selectedTotal)}</span>
      </div>
      <p className="text-xs text-muted -mt-1">{tCart("unselectedStay")}</p>

      {error && <p className="rounded-xl bg-error-soft text-error text-sm px-4 py-3">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-full bg-[#25D366] text-white px-6 py-3.5 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 flex items-center justify-center gap-2"
      >
        <MessageCircle className="size-4.5" strokeWidth={2} aria-hidden />
        {submitting ? t("sending") : selectedCount === 0 ? t("nothingSelected") : addressMissing ? t("enterAddress") : t("sendWhatsApp")}
      </button>
    </div>
  );
}
