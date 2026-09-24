"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMyBag } from "@/lib/mybag-context";
import { ProductCard } from "@/components/ProductCard";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export default function MyBagPage() {
  const t = useTranslations("myBag");
  const { products, loading } = useMyBag();

  return (
    <main className="flex-1 px-4 pt-8 pb-10 max-w-5xl mx-auto w-full">
      <h1 className="font-display text-3xl mb-1.5">{t("title")}</h1>
      <p className="text-muted text-sm mb-6">{t("subtitle")}</p>

      {loading ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t("empty")}
          description={t("emptyHint")}
          action={
            <Link href="/catalog">
              <Button>{t("toCatalog")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 auto-rows-fr gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
