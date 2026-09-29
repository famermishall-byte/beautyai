"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
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
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = selectedCount > 0 && !!branchId && !!name.trim() && !!phone.trim() && !submitting;

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
        body: JSON.stringify({ branchId, customerName: name, customerPhone: phone }),
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
        {submitting ? t("sending") : selectedCount === 0 ? t("nothingSelected") : t("sendWhatsApp")}
      </button>
    </div>
  );
}
