"use client";

import { useTranslations } from "next-intl";
import { BadgePercent, ChevronRight } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { usePrice } from "@/lib/use-price";
import { usePathname } from "@/i18n/navigation";
import { OPEN_CART_EVENT } from "@/components/CartDrawer";
import { useReservedBlock } from "@/lib/reserved-block";

/**
 * Полоса «До оптовых цен осталось N» под шапкой в каталоге и на странице товара — клиенту не нужно открывать
 * корзину, чтобы видеть, сколько добрать до опта (просьба владельца 29.09). Всё из корзины (useCart().wholesale):
 * после заказа отмеченные товары уходят из корзины — полоса исчезает и при следующем добавлении начинает заново.
 * Нажатие открывает корзину.
 */
export function WholesaleStrip() {
  const t = useTranslations("wholesale");
  const price = usePrice();
  const pathname = usePathname();
  const { wholesale, selectedCount, hydrated } = useCart();

  const onShoppingPage = pathname.startsWith("/catalog") || pathname.startsWith("/product/");
  const visible = hydrated && wholesale.threshold !== null && selectedCount > 0 && !(wholesale.qualifies && !wholesale.applied);
  // Полоса появляется после загрузки корзины и сдвигала экран вниз: если в прошлый раз она была —
  // держим под неё место (у большинства корзина пуста, поэтому «по умолчанию» место не держим).
  const reserve = useReservedBlock("wholesale-strip", !hydrated ? "loading" : visible ? "present" : "absent", false);
  if (!onShoppingPage) return null;
  if (!visible) return reserve ? <div className="h-12 border-t-2 border-accent bg-gradient-to-r from-accent/15 to-accent/25" aria-hidden /> : null;
  // после проверок выше порог точно задан
  const threshold = wholesale.threshold ?? 1;

  const share = Math.min(100, Math.round((wholesale.retailTotal / threshold) * 100));
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_CART_EVENT))}
      className={[
        "promo-sheen w-full border-t-2 text-left transition active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        wholesale.qualifies ? "border-success bg-success-soft text-success" : "border-accent bg-gradient-to-r from-accent/15 to-accent/25 text-accent-strong",
      ].join(" ")}
    >
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2.5">
        <BadgePercent className="size-4.5 shrink-0" strokeWidth={2} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold leading-snug">
            {wholesale.qualifies ? t("stripApplied", { amount: price(wholesale.savings) }) : t("progress", { amount: price(wholesale.remaining) })}
          </div>
          {!wholesale.qualifies && (
            <div className="h-1.5 rounded-full bg-white/80 overflow-hidden mt-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}>
              <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${share}%` }} />
            </div>
          )}
        </div>
        <ChevronRight className="size-4 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
      </div>
    </button>
  );
}
