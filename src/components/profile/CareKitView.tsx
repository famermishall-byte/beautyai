"use client";

import { useState } from "react";
import { Check, Lightbulb, Plus, ShoppingBag, Sparkle } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/Button";
import type { CareKit } from "@/lib/kit";
import type { Product } from "@/types";
import { Link } from "@/i18n/navigation";

function KitRow({ label, product }: { label: string; product: Product | null }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-14 h-14 rounded-[var(--radius-control)] bg-accent-soft/60 shrink-0" aria-hidden />
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted font-medium">{label}</div>
          <div className="text-sm text-muted">Подходящего товара пока нет в каталоге</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <Link href={`/product/${product.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-14 h-14 rounded-[var(--radius-control)] bg-accent-soft overflow-hidden shrink-0 flex items-center justify-center">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Sparkle className="size-5 text-accent/40" strokeWidth={1.4} aria-hidden />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-accent font-medium">{label}</div>
          <div className="text-sm font-medium leading-snug line-clamp-2">{product.name}</div>
          <div className="text-xs text-muted tabular-nums">
            {product.brand} · {product.price.toLocaleString("ru-RU")} сом
          </div>
        </div>
      </Link>
      <button
        onClick={() => {
          addItem(product);
          setAdded(true);
          setTimeout(() => setAdded(false), 1200);
        }}
        aria-label={`Добавить «${product.name}» в корзину`}
        className={[
          "shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90",
          added ? "bg-success text-white" : "bg-accent text-white hover:bg-accent-strong",
        ].join(" ")}
      >
        {added ? <Check className="size-4.5" strokeWidth={2.5} aria-hidden /> : <Plus className="size-4.5" strokeWidth={2.25} aria-hidden />}
      </button>
    </div>
  );
}

export function CareKitView({ kit }: { kit: CareKit }) {
  const { addItem } = useCart();
  const [addedAll, setAddedAll] = useState(false);

  const kitProducts = [...kit.skinSteps.map((s) => s.product), ...kit.hairProducts].filter((p): p is Product => p !== null);
  const total = kitProducts.reduce((sum, p) => sum + p.price, 0);
  const hasTips = kit.skinTips.length > 0 || kit.hairTips.length > 0;

  function addAll() {
    kitProducts.forEach((p) => addItem(p));
    setAddedAll(true);
    setTimeout(() => setAddedAll(false), 1800);
  }

  return (
    <div className="flex flex-col gap-4">
      {kit.skinSteps.length > 0 && (
        <div className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-display text-lg">Для кожи лица</h3>
          </div>
          <div className="divide-y divide-border">
            {kit.skinSteps.map((step) => (
              <KitRow key={step.label} label={step.label} product={step.product} />
            ))}
          </div>
        </div>
      )}

      {(kit.hairProducts.length > 0 || kit.hairTips.length > 0) && (
        <div className="bg-card rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-display text-lg">Для волос</h3>
          </div>
          <div className="divide-y divide-border">
            {kit.hairProducts.length > 0 ? (
              kit.hairProducts.map((p) => <KitRow key={p.id} label="Уход за волосами" product={p} />)
            ) : (
              <KitRow label="Уход за волосами" product={null} />
            )}
          </div>
        </div>
      )}

      {kitProducts.length > 0 && (
        <Button size="lg" fullWidth onClick={addAll} variant={addedAll ? "secondary" : "primary"}>
          {addedAll ? (
            <>
              <Check className="size-4.5" strokeWidth={2.5} aria-hidden /> Набор в корзине
            </>
          ) : (
            <>
              <ShoppingBag className="size-4.5" strokeWidth={2} aria-hidden />
              Добавить весь набор · {total.toLocaleString("ru-RU")} сом
            </>
          )}
        </Button>
      )}

      {hasTips && (
        <div className="bg-accent-soft rounded-[var(--radius-card)] p-5">
          <div className="flex items-center gap-2 mb-3 text-accent-strong">
            <Lightbulb className="size-4.5" strokeWidth={2} aria-hidden />
            <h3 className="font-display text-lg">Советы</h3>
          </div>
          <ul className="flex flex-col gap-2.5 text-sm text-accent-strong/90 leading-relaxed">
            {[...kit.skinTips, ...kit.hairTips].map((tip) => (
              <li key={tip} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
