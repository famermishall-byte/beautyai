"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { useProductText } from "@/lib/product-text";
import { ArrowLeft, Heart, Sparkle, Minus, Plus, Check, PackageX } from "lucide-react";
import type { Product } from "@/types";
import { useCart } from "@/lib/cart-context";
import { useMyBag } from "@/lib/mybag-context";
import { useGoBack } from "@/lib/use-go-back";
import { LOW_STOCK_MAX } from "@/lib/stock";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/i18n/navigation";

const BRANCH_STORAGE_KEY = "beautyai-branch";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("product");
  const tc = useTranslations("common");
  const price = usePrice();
  const text = useProductText();
  const goBack = useGoBack("/catalog");
  const { addItem, items, changeQuantity } = useCart();
  const { toggle, isSaved } = useMyBag();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    let branchId: string | null = null;
    try {
      branchId = localStorage.getItem(BRANCH_STORAGE_KEY);
    } catch {
      // недоступно — просто без учёта остатка по филиалу
    }
    const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
    // Fetching data on mount — see the same pattern/rationale in BranchManager.tsx.
    fetch(`/api/products/${id}${qs}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { product: Product }) => {
        setProduct(data.product);
        return fetch(`/api/products?category=${encodeURIComponent(data.product.category)}`);
      })
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setRelated((data.products ?? []).filter((p) => p.id !== id).slice(0, 6)))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="flex-1 max-w-2xl mx-auto w-full">
        <Skeleton className="aspect-square rounded-none" />
        <div className="px-4 pt-5 flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-8 w-32" />
        </div>
      </main>
    );
  }

  if (notFound || !product) {
    return (
      <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
        <EmptyState
          icon={PackageX}
          title={t("notFound")}
          description={t("notFoundHint")}
          tone="error"
          action={
            <Link href="/catalog">
              <Button variant="secondary">{t("toCatalog")}</Button>
            </Link>
          }
        />
      </main>
    );
  }

  const saved = isSaved(product.id);
  const inCart = items.find((i) => i.product.id === product.id);
  const outOfStock = product.branchQuantity === 0;

  function handleAdd() {
    if (!product) return;
    addItem(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full animate-rise-in">
      <div className="relative aspect-square bg-accent-soft">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={text(product).name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkle className="size-16 text-accent/35" strokeWidth={1.2} aria-hidden />
          </div>
        )}

        <button
          onClick={goBack}
          aria-label={tc("back")}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-sm transition hover:scale-105 active:scale-90"
        >
          <ArrowLeft className="size-4.5" strokeWidth={2} aria-hidden />
        </button>
        <button
          onClick={() => toggle(product)}
          aria-label={saved ? t("removeFromBag") : t("saveToBag")}
          aria-pressed={saved}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/95 backdrop-blur flex items-center justify-center shadow-sm transition hover:scale-105 active:scale-90"
        >
          <Heart
            className={["size-4.5", saved ? "animate-pop text-accent" : "text-foreground/60"].join(" ")}
            strokeWidth={2}
            fill={saved ? "currentColor" : "none"}
            aria-hidden
          />
        </button>

        {outOfStock && (
          <div className="absolute inset-x-0 bottom-0 bg-foreground/75 backdrop-blur-sm text-white text-sm font-medium text-center py-2">
            {t("outOfStock")}
          </div>
        )}
      </div>

      <div className="px-4 pt-5">
        <div className="text-xs uppercase tracking-wide text-muted font-medium mb-1">{product.brand}</div>
        <h1 className="font-display text-2xl leading-snug mb-3">{text(product).name}</h1>

        <div className="flex items-center justify-between mb-5">
          <span className="font-display text-3xl tabular-nums">{price(product.price)}</span>
          {product.branchQuantity !== undefined && product.branchQuantity !== null && product.branchQuantity > 0 && (
            <span className={["text-sm font-medium", product.branchQuantity <= LOW_STOCK_MAX ? "text-warning" : "text-success"].join(" ")}>
              {product.branchQuantity <= LOW_STOCK_MAX ? t("lowStock") : t("inStock")}
            </span>
          )}
        </div>

        {(text(product).description || text(product).characteristics || text(product).purpose) && (
          <div className="flex flex-col gap-4 mb-6">
            {text(product).description && (
              <Section title={t("description")}>
                <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{text(product).description}</p>
              </Section>
            )}
            {text(product).characteristics && (
              <Section title={t("characteristics")}>
                <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{text(product).characteristics}</p>
              </Section>
            )}
            {text(product).purpose && (
              <Section title={t("suitableFor")}>
                <p className="text-sm text-muted leading-relaxed whitespace-pre-line">{text(product).purpose}</p>
              </Section>
            )}
          </div>
        )}

        {related.length > 0 && (
          <div className="mb-6">
            <h2 className="font-display text-lg mb-3">{t("related")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="sticky z-30 bg-card/95 backdrop-blur-xl border-t border-border px-4 py-3.5 flex items-center gap-3"
        style={{ bottom: "calc(var(--bottom-nav-h) + env(safe-area-inset-bottom))" }}
      >
        {inCart ? (
          <div className="flex items-center gap-3 rounded-full bg-accent-soft px-2 py-1.5 flex-1 justify-between max-w-[9rem]">
            <button
              onClick={() => changeQuantity(product.id, -1)}
              aria-label={t("decrease")}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center transition active:scale-90"
            >
              <Minus className="size-3.5" strokeWidth={2.25} aria-hidden />
            </button>
            <span className="font-medium tabular-nums">{inCart.quantity}</span>
            <button
              onClick={() => changeQuantity(product.id, 1)}
              aria-label={t("increase")}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center transition active:scale-90"
            >
              <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        ) : (
          <Button variant="primary" size="lg" fullWidth disabled={outOfStock} onClick={handleAdd}>
            {justAdded ? (
              <>
                <Check className="size-4.5" strokeWidth={2.5} aria-hidden /> {t("added")}
              </>
            ) : outOfStock ? (
              t("outOfStock")
            ) : (
              t("addToCart")
            )}
          </Button>
        )}
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-lg mb-1.5">{title}</h2>
      {children}
    </div>
  );
}
