"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Store, TriangleAlert, Truck } from "lucide-react";
import { addressComplete, formatDeliveryAddress, type AddressParts, type DeliveryMethod } from "@/lib/delivery";
import { getStoredCity } from "@/lib/city";
import { desktopWhatsAppUrls, isMobileUserAgent } from "@/lib/whatsapp";

// Адрес доставки по полям — только на этом телефоне, чтобы в следующий раз не вводить заново.
const ADDRESS_STORAGE_KEY = "beautyai-delivery-address";
import { usePrice } from "@/lib/use-price";
import { useCart } from "@/lib/cart-context";
import { useSession } from "@/lib/session-context";
import type { SentOrder } from "@/components/cart/CartOrderSent";
import { WholesaleProgress } from "@/components/cart/WholesaleProgress";
import { Button } from "@/components/ui/Button";
import type { Branch, Order } from "@/types";

// Тот же ключ, что в каталоге и на странице товара, — филиал, выбранный там, подставляется сюда.
const BRANCH_STORAGE_KEY = "beautyai-branch";

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-border bg-card px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent";

/** Филиал + имя + телефон + «Отправить в WhatsApp» — в заказ уходят только отмеченные товары. */
export function CartCheckoutForm({ onSent }: { onSent: (order: SentOrder) => void }) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const tCommon = useTranslations("common");
  const price = usePrice();
  const { selectedCount, selectedTotal, flush, reload, wholesale } = useCart();
  const { session } = useSession();

  const [branches, setBranches] = useState<Branch[]>([]);
  // список филиалов не загрузился — это не «филиалы не настроены»
  const [branchesFailed, setBranchesFailed] = useState(false);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [branchesKey, setBranchesKey] = useState(0);
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState(session?.displayName ?? "");
  const [phone, setPhone] = useState("");
  // Как получить заказ (docs/superpowers/specs/2026-09-29-order-delivery-design.md); проверка — parseDeliveryInput на сервере.
  const [method, setMethod] = useState<DeliveryMethod>("pickup");
  // Адрес по полям: город, улица, дом, квартира (просьба владельца 29.09); в заказ уходит одной строкой — formatDeliveryAddress.
  const [addr, setAddr] = useState<AddressParts>({ city: "", street: "", house: "", flat: "" });
  const [time, setTime] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  // После отправки продавцу заказ не изменить и не отменить — клиент подтверждает, что проверил (решение владельца 29.09).
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAddrPart = (part: keyof AddressParts) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr((a) => ({ ...a, [part]: e.target.value }));

  useEffect(() => {
    // Прошлый адрес с этого телефона (удобство, не обязательное хранение), иначе — город, выбранный в приложении.
    let saved: AddressParts | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(ADDRESS_STORAGE_KEY) ?? "null");
    } catch {
      // недоступно или испорчено — просто без подстановки
    }
    const city = getStoredCity();
    Promise.resolve().then(() =>
      setAddr((a) => (a.city || a.street ? a : saved && typeof saved.city === "string" ? { ...a, ...saved } : { ...a, city: city ?? "" }))
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { branches?: Branch[] }) => {
        if (cancelled) return;
        const list = data.branches ?? [];
        setBranches(list);
        setBranchesLoaded(true);
        setBranchesFailed(false);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(BRANCH_STORAGE_KEY);
        } catch {
          // недоступно — клиент выберет сам
        }
        const preset = stored && list.some((b) => b.id === stored) ? stored : list.length === 1 ? list[0].id : "";
        setBranchId((current) => current || preset);
      })
      .catch(() => {
        if (!cancelled) setBranchesFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [branchesKey]);

  useEffect(() => {
    let cancelled = false;
    // Контакты из последнего заказа — клиенту не нужно вводить телефон каждый раз.
    fetch("/api/orders")
      .then((res) => (res.ok ? res.json() : { orders: [] }))
      .then((data: { orders?: Order[] }) => {
        if (cancelled) return;
        const last = data.orders?.[0];
        if (!last) return;
        setName((current) => current || last.customerName);
        setPhone((current) => current || last.customerPhone);
        // Телефон для курьера — из последнего заказа с доставкой.
        const lastDelivery = data.orders?.find((o) => o.deliveryMethod === "delivery");
        if (lastDelivery?.courierPhone) setCourierPhone((current) => current || lastDelivery.courierPhone || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const addressMissing = method === "delivery" && !addressComplete(addr);
  const canSubmit = selectedCount > 0 && !!branchId && !!name.trim() && !!phone.trim() && !addressMissing && confirmed && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    // Телефон: вкладку под wa.me открываем СРАЗУ по нажатию — после сохранения заказа (секунды ожидания) браузер
    // считает window.open уже не ответом на клик и блокирует его. Компьютер: вкладка не нужна — открываем
    // приложение WhatsApp напрямую (страница wa.me на компьютере у части людей не срабатывает, жалоба 01.10).
    const mobile = isMobileUserAgent(navigator.userAgent);
    let waTab: Window | null = null;
    if (mobile) {
      try {
        waTab = window.open("", "_blank");
      } catch {
        waTab = null;
      }
    }
    // Заказ мог сохраниться, а ответ — потеряться по дороге (обрыв связи): прежде чем показать ошибку,
    // спрашиваем сервер, нет ли только что оформленного заказа в этот филиал на эту сумму.
    const expectedTotal = selectedTotal;
    const findPlacedOrder = async (): Promise<SentOrder | null> => {
      try {
        const res = await fetch(`/api/orders/recent?branchId=${encodeURIComponent(branchId)}&total=${expectedTotal}`);
        if (!res.ok) return null;
        const data = (await res.json()) as { order?: SentOrder | null };
        return data.order ?? null;
      } catch {
        return null;
      }
    };
    const showRecovered = async (placed: SentOrder) => {
      sent = true;
      if (waTab && !waTab.closed) waTab.location.href = placed.whatsappUrl;
      await reload().catch(() => {});
      onSent(placed);
    };
    let sent = false;
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
          ...(method === "delivery" ? { deliveryAddress: formatDeliveryAddress(addr), deliveryTime: time, courierPhone } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // 400 «отметьте товар» при непустом выборе на экране — признак того, что прошлая попытка всё же прошла
        const placed = res.status === 400 ? await findPlacedOrder() : null;
        if (placed) {
          await showRecovered(placed);
          return;
        }
        setError(data.error ?? t("failed"));
        return;
      }
      if (method === "delivery") {
        try {
          localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addr));
        } catch {
          // недоступно — в следующий раз адрес просто не подставится
        }
      }
      sent = true;
      const desktop = mobile ? null : desktopWhatsAppUrls(data.whatsappUrl);
      if (desktop) {
        // браузер спросит «Открыть приложение WhatsApp?»; если не откроется — кнопки на экране «Заказ отправлен»
        window.location.href = desktop.app;
      } else if (waTab && !waTab.closed) {
        waTab.location.href = data.whatsappUrl;
        waTab.focus();
      } else {
        // вкладку не дали открыть — пробуем как раньше; если и это заблокировано, есть кнопка «Открыть WhatsApp снова»
        window.open(data.whatsappUrl, "_blank")?.focus();
      }
      // Сервер уже убрал заказанные строки — подтягиваем корзину, в ней остаются неотмеченные.
      await reload().catch(() => {});
      onSent({ orderNumber: data.orderNumber, whatsappUrl: data.whatsappUrl });
    } catch {
      const placed = await findPlacedOrder();
      if (placed) await showRecovered(placed);
      else setError(t("somethingWrong"));
    } finally {
      // заказ не оформлен — пустая вкладка не нужна
      if (!sent) waTab?.close();
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      {/* не внутри <label>: кнопка в label получила бы его текст как своё название */}
      {branchesFailed && (
        <div>
          <span className="block text-xs font-medium text-muted mb-1.5">{t("branch")}</span>
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-error-soft text-error text-sm px-4 py-2.5">
            {t("branchesFailed")}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 h-10!"
              onClick={() => {
                setBranchesFailed(false);
                setBranchesKey((k) => k + 1);
              }}
            >
              {tCommon("retry")}
            </Button>
          </div>
        </div>
      )}
      <label className={branchesFailed ? "hidden" : "block"}>
        <span className="block text-xs font-medium text-muted mb-1.5">{t("branch")}</span>
        {!branchesLoaded ? (
          // пока список грузится — заготовка высотой с поле, чтобы форма не дёргалась
          <span className="skeleton block h-[46px] rounded-[var(--radius-control)]" aria-hidden />
        ) : branches.length === 0 ? (
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
          <fieldset className="flex flex-col gap-2">
            <legend className="block text-xs font-medium text-muted mb-1.5">{t("addressLabel")}</legend>
            <input className={inputClass} aria-label={t("cityLabel")} placeholder={t("cityLabel")} value={addr.city} onChange={setAddrPart("city")} autoComplete="address-level2" maxLength={60} />
            <input className={inputClass} aria-label={t("streetLabel")} placeholder={t("streetPlaceholder")} value={addr.street} onChange={setAddrPart("street")} autoComplete="address-line1" maxLength={120} />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputClass} aria-label={t("houseLabel")} placeholder={t("houseLabel")} value={addr.house} onChange={setAddrPart("house")} maxLength={30} />
              <input className={inputClass} aria-label={t("flatLabel")} placeholder={t("flatLabel")} value={addr.flat} onChange={setAddrPart("flat")} autoComplete="address-line2" maxLength={30} />
            </div>
          </fieldset>
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

      <div className="rounded-[var(--radius-card)] border border-warning/40 bg-warning-soft px-4 py-3 flex flex-col gap-2.5">
        <div className="flex gap-2.5 text-warning">
          <TriangleAlert className="size-5 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
          <p className="text-sm font-semibold leading-snug">{t("finalWarning")}</p>
        </div>
        <label className="flex items-center gap-2.5 text-sm font-medium text-foreground min-h-11 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="size-5 shrink-0 accent-[var(--accent)]"
          />
          {t("confirmChecked")}
        </label>
      </div>

      {error && <p className="rounded-xl bg-error-soft text-error text-sm px-4 py-3">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-full bg-[#25D366] text-white px-6 py-3.5 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 flex items-center justify-center gap-2"
      >
        <MessageCircle className="size-4.5" strokeWidth={2} aria-hidden />
        {submitting
          ? t("sending")
          : selectedCount === 0
            ? t("nothingSelected")
            : addressMissing
              ? t("enterAddress")
              : !confirmed
                ? t("confirmFirst")
                : t("sendWhatsApp")}
      </button>
    </div>
  );
}
