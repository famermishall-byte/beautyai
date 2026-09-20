"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useMyBag } from "@/lib/mybag-context";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function MyBagPage() {
  const { products, loading } = useMyBag();

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-5xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1.5">Моя косметичка</h1>
      <p className="text-muted text-sm mb-6">Товары, которые вы сохранили.</p>

      {loading ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Пока пусто"
          description="Нажмите на сердечко на карточке товара, чтобы сохранить его сюда."
          action={
            <Link href="/catalog">
              <Button>Перейти в каталог</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
