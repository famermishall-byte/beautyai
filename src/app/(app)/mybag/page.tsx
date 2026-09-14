"use client";

import Link from "next/link";
import { useMyBag } from "@/lib/mybag-context";
import { ProductCard } from "@/components/ProductCard";

export default function MyBagPage() {
  const { products, loading } = useMyBag();

  return (
    <main className="flex-1 px-4 py-10 max-w-5xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-2">Моя косметичка</h1>
      <p className="text-muted mb-8">Товары, которые вы сохранили.</p>

      {loading ? (
        <p className="text-muted animate-pulse">Загружаем…</p>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🤍</div>
          <p className="text-muted mb-6">Пока пусто — нажмите на сердечко на карточке товара, чтобы сохранить.</p>
          <Link
            href="/catalog"
            className="inline-block rounded-full bg-foreground text-background px-6 py-3 font-medium transition hover:opacity-90 active:scale-95"
          >
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
