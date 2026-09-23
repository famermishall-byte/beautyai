"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, ChevronRight, Wand2, Flame } from "lucide-react";
import { useSession } from "@/lib/session-context";
import { skinTypeLabel, type SkinType } from "@/lib/skincare";
import { SKIN_TYPE_CATEGORIES, skinFit } from "@/lib/personalization";
import { ProductCard } from "@/components/ProductCard";
import { HeroSlider } from "@/components/HeroSlider";
import { BuyAgainPrompt } from "@/components/BuyAgainPrompt";
import { Skeleton, ProductGridSkeleton } from "@/components/ui/Skeleton";
import type { Product } from "@/types";
import { Link } from "@/i18n/navigation";

const SLIDES = 5;
const POPULAR = 8;
const FOR_YOU = 12;

// There is no sales data yet, so "popular" is a stand-in: products with a
// photo first, interleaved across categories so the slider and the popular
// grid show variety instead of five creams in a row. Swap this for a real
// signal (an admin "хит" flag or order counts) once one exists.
function pickShowcase(all: Product[]): Product[] {
  const withImage = all.filter((p) => p.imageUrl);
  const pool = withImage.length >= SLIDES ? withImage : [...withImage, ...all.filter((p) => !p.imageUrl)];
  const byCategory = new Map<string, Product[]>();
  for (const p of pool) {
    const list = byCategory.get(p.category);
    if (list) list.push(p);
    else byCategory.set(p.category, [p]);
  }
  const lists = [...byCategory.values()];
  const out: Product[] = [];
  for (let i = 0; out.length < pool.length; i++) {
    let added = false;
    for (const list of lists) {
      if (list[i]) {
        out.push(list[i]);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}

export default function Home() {
  const t = useTranslations("home");
  const tSkin = useTranslations("skin");
  const { session } = useSession();
  const skinLabel = skinTypeLabel(tSkin, session?.skinType ?? null);
  const skinType = session?.skinType as SkinType | null | undefined;

  const [showcase, setShowcase] = useState<Product[]>([]);
  const [forYou, setForYou] = useState<Product[]>([]);
  const [promoProducts, setPromoProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetching data on mount — see the same pattern/rationale in BranchManager.tsx.
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setShowcase(pickShowcase(data.products ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!skinType || !(skinType in SKIN_TYPE_CATEGORIES)) return;
    const categories = SKIN_TYPE_CATEGORIES[skinType].join(",");
    fetch(`/api/products?category=${encodeURIComponent(categories)}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => {
        const list = data.products ?? [];
        // Best skin-type fit first, then products with a photo (a rail of empty
        // placeholders reads as broken). Products that name only *other* skin
        // types are dropped unless that would leave the rail nearly empty.
        const ranked = list
          .map((p) => ({ p, fit: skinFit(p, skinType), img: p.imageUrl ? 1 : 0 }))
          .sort((a, b) => b.fit - a.fit || b.img - a.img);
        const fitting = ranked.filter((r) => r.fit > 0);
        const chosen = fitting.length >= 10 ? fitting : ranked;
        setForYou(chosen.slice(0, FOR_YOU).map((r) => r.p));
      })
      .catch(() => setForYou([]));
  }, [skinType]);

  useEffect(() => {
    fetch("/api/promotions")
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setPromoProducts(data.products ?? []))
      .catch(() => setPromoProducts([]));
  }, []);

  const slides = showcase.slice(0, SLIDES);
  const popular = showcase.slice(0, POPULAR);

  return (
    <main className="flex-1 pb-6">
      <BuyAgainPrompt />
      <div className="px-4 max-w-2xl mx-auto w-full pt-3 flex flex-col gap-8">
        {loading ? (
          <Skeleton className="aspect-[16/11] rounded-[var(--radius-card)]" />
        ) : slides.length > 0 ? (
          <HeroSlider products={slides} />
        ) : null}

        <Section title={t("forYou")} icon={Sparkles} hint={skinLabel ? t("skinHint", { type: skinLabel.toLowerCase() }) : undefined}>
          {forYou.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 scroll-pl-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {forYou.map((product) => (
                <div key={product.id} className="w-40 shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          ) : (
            <Link
              href="/profile"
              className="bg-card rounded-[var(--radius-card)] border border-border p-4.5 flex items-center justify-between gap-4 shadow-[var(--shadow-card)] transition hover:border-accent/30 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex items-center justify-center w-11 h-11 rounded-full bg-accent-soft text-accent shrink-0">
                  <Wand2 className="size-5" strokeWidth={1.85} aria-hidden />
                </span>
                <div>
                  <div className="font-display text-lg leading-tight">{t("tellAboutSkin")}</div>
                  <div className="text-xs text-muted mt-0.5">{t("fillQuestionnaire")}</div>
                </div>
              </div>
              <ChevronRight className="size-4.5 text-muted shrink-0" strokeWidth={2} aria-hidden />
            </Link>
          )}
        </Section>

        {promoProducts.length > 0 && (
          <Section title={t("promoTitle")} icon={Flame}>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 scroll-pl-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {promoProducts.map((product) => (
                <div key={product.id} className="w-40 shrink-0 snap-start">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title={t("popular")} action={{ href: "/catalog", label: t("wholeCatalog") }}>
          {loading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {popular.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </Section>

        <Link
          href="/routine"
          className="bg-accent-soft rounded-[var(--radius-card)] p-5 flex items-center justify-between gap-4 transition hover:brightness-[0.98] active:scale-[0.99]"
        >
          <div>
            <div className="font-display text-lg mb-1">{t("myCare")}</div>
            <div className="text-sm text-accent-strong/80">{t("myCareHint")}</div>
          </div>
          <ChevronRight className="size-5 text-accent shrink-0" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </main>
  );
}

function Section({
  title,
  icon: Icon,
  hint,
  action,
  children,
}: {
  title: string;
  icon?: typeof Sparkles;
  hint?: string;
  action?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            {Icon && <Icon className="size-4 text-accent" strokeWidth={2} aria-hidden />}
            <h2 className="font-display text-xl">{title}</h2>
          </div>
          {hint && <div className="text-xs text-muted mt-0.5">{hint}</div>}
        </div>
        {action && (
          <Link href={action.href} className="text-xs font-medium text-accent flex items-center gap-0.5 hover:underline pb-0.5">
            {action.label}
            <ChevronRight className="size-3.5" strokeWidth={2} aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
