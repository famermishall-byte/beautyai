"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-context";
import { skinTypeLabel, type SkinType } from "@/lib/skincare";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { SKIN_TYPE_CATEGORIES } from "@/lib/personalization";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/types";

const CARDS = [
  {
    href: "/routine",
    emoji: "🧴",
    title: "Мой уход",
    text: "Порядок утром и вечером",
  },
  {
    href: "/catalog?tab=search",
    emoji: "🔎",
    title: "Найти товар",
    text: "По названию или бренду",
  },
  {
    href: "/catalog?tab=budget",
    emoji: "💰",
    title: "По бюджету",
    text: "Товары в вашей цене",
  },
  {
    href: "/mybag",
    emoji: "❤️",
    title: "Моя косметичка",
    text: "Сохранённые товары",
  },
];

export default function Home() {
  const { session } = useSession();
  const skinLabel = skinTypeLabel(session?.skinType ?? null);
  const skinType = session?.skinType as SkinType | null | undefined;

  const [recommended, setRecommended] = useState<Product[]>([]);

  useEffect(() => {
    if (!skinType || !(skinType in SKIN_TYPE_CATEGORIES)) return;
    const categories = SKIN_TYPE_CATEGORIES[skinType].join(",");
    // Fetching data on mount/when skin type changes — see the same
    // pattern/rationale in BranchManager.tsx.
    fetch(`/api/products?category=${encodeURIComponent(categories)}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setRecommended((data.products ?? []).slice(0, 6)))
      .catch(() => setRecommended([]));
  }, [skinType]);

  return (
    <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">{session?.storeName || "ОПТОВЫЕ ЦЕНЫ 01"}</h1>
        <p className="text-muted mt-2">Красота начинается с правильного ухода</p>
      </div>

      <div className="bg-card rounded-2xl border border-black/5 p-5 mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted mb-1">Моя кожа</div>
          <div className="font-display text-xl">
            {skinLabel ?? "Расскажите нам о своей коже"}
          </div>
        </div>
        <Link
          href="/skin-profile"
          className="shrink-0 rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium transition hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Настроить
        </Link>
      </div>

      <div className="text-sm text-muted mb-3">Категории</div>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {CATEGORY_GROUPS.map((group, i) => (
          <Link
            key={group.name}
            href={`/catalog?group=${encodeURIComponent(group.name)}`}
            className={[
              "bg-card rounded-2xl border border-black/5 p-4 flex items-center gap-3 transition hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              // Last tile spans both columns when the count is odd, matching the design mockup.
              i === CATEGORY_GROUPS.length - 1 && CATEGORY_GROUPS.length % 2 === 1 ? "col-span-2" : "",
            ].join(" ")}
          >
            <span className="text-2xl shrink-0">{group.emoji}</span>
            <div className="flex flex-col">
              <span className="font-display text-base leading-snug">{group.name}</span>
              <span className="text-xs text-muted">
                {group.children.length > 0 ? `${group.children.length} разделов` : "все товары"}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {recommended.length > 0 && (
        <>
          <div className="text-sm text-muted mb-3">Подобрано для вас</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {recommended.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}

      <div className="text-sm text-muted mb-3">Ярлыки</div>
      <div className="grid grid-cols-2 gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-card rounded-2xl border border-black/5 p-5 flex flex-col gap-2 transition hover:border-accent/40 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="text-3xl">{card.emoji}</span>
            <span className="font-display text-lg leading-snug">{card.title}</span>
            <span className="text-sm text-muted">{card.text}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
