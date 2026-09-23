"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, SlidersHorizontal, MapPin, PackageSearch, ShoppingBag, Percent, ChevronRight, LayoutGrid } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { BannerGate } from "@/components/BannerInterstitial";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CATEGORIES, CATEGORY_GROUPS, CATEGORY_KEYS, groupCategoryFilter, subKey, type CategoryGroup, type CatalogSub } from "@/lib/categories";
import { HAIR_TYPE_KEYS, SKIN_TYPE_KEYS, hairTypesOf, skinTypesOf } from "@/lib/attributes";
import type { Banner, Branch, Product } from "@/types";
import { Link } from "@/i18n/navigation";

const BRANCH_STORAGE_KEY = "beautyai-branch";

const BUDGETS = [1000, 2000, 3000, 5000];

const SORTS = ["name", "price-asc", "price-desc"] as const;
type Sort = (typeof SORTS)[number];

// The "all" item of a group is a URL value (?item=Все), not display text.
const ALL_ITEM = "Все";

/** Display-text helpers over messages: catalogGroups.*, categories.*. */
function useCatalogLabels() {
  const tg = useTranslations("catalogGroups");
  const tcat = useTranslations("categories");
  return {
    groupTitle: (g: CategoryGroup) => tg(`${g.key}.title`),
    subLabel: (g: CategoryGroup, sub: CatalogSub) => tg(`${g.key}.subs.${subKey(sub)}`),
    category: (name: string) => (CATEGORY_KEYS[name] ? tcat(CATEGORY_KEYS[name]) : name),
  };
}

function CatalogContent() {
  const t = useTranslations("catalog");
  const tc = useTranslations("common");
  const ta = useTranslations("attributes");
  const locale = useLocale();
  const labels = useCatalogLabels();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");

  // Arriving via a search-screen tile (?group=...): a group with subcategories
  // shows them as chips (see render below); a group without any (e.g.
  // "Макияж") filters straight to that category.
  const groupParam = searchParams.get("group");
  const itemParam = searchParams.get("item");
  const promo = searchParams.get("promo") === "1";
  const showAll = searchParams.get("all") === "1" || promo;
  const activeGroup = CATEGORY_GROUPS.find((g) => g.name === groupParam) ?? null;
  const activeItem = activeGroup?.subs.find((i) => i.label === itemParam) ?? null;
  const groupFilter = activeGroup ? groupCategoryFilter(activeGroup) : null;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(groupFilter);
  const [budget, setBudget] = useState<number | null | undefined>(undefined);
  const [brand, setBrand] = useState<string | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [productType, setProductType] = useState<string | null>(null);
  const [hairType, setHairType] = useState<string | null>(null);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [volume, setVolume] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("name");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);

  // Preselect "любой бюджет" when arriving via the "По бюджету" home-screen
  // shortcut. Adjusting state during render (guarded by a "did the source
  // value change?" check) is the React-recommended replacement for a
  // useEffect here — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab === "budget") setFiltersOpen(true);
  }

  const groupKey = `${groupParam ?? ""}|${itemParam ?? ""}`;
  const [prevGroupKey, setPrevGroupKey] = useState(groupKey);
  if (groupKey !== prevGroupKey) {
    setPrevGroupKey(groupKey);
    setCategory(groupFilter);
    setBrand(null);
    setProductType(null);
    setHairType(null);
    setSkinType(null);
    setVolume(null);
  }

  useEffect(() => {
    if (initialTab === "search") {
      searchInputRef.current?.focus();
    }
  }, [initialTab]);

  useEffect(() => {
    // Fetching data on mount — see the same pattern/rationale in BranchManager.tsx.
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : { branches: [] }))
      .then((data: { branches: Branch[] }) => {
        const list = data.branches ?? [];
        setBranches(list);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(BRANCH_STORAGE_KEY);
        } catch {
          // недоступно — просто не запомним выбор
        }
        const valid = stored && list.some((b) => b.id === stored) ? stored : null;
        setBranchId(valid ?? (list.length === 1 ? list[0].id : null));
      })
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    // Баннеры админа нужны только на странице «Акции» — на остальных не запрашиваем.
    if (!promo) return;
    fetch("/api/banners")
      .then((res) => (res.ok ? res.json() : { banners: [] }))
      .then((data: { banners: Banner[] }) => setBanners(data.banners ?? []))
      .catch(() => setBanners([]));
  }, [promo]);

  function handleSelectBranch(id: string) {
    setBranchId(id);
    try {
      localStorage.setItem(BRANCH_STORAGE_KEY, id);
    } catch {
      // недоступно — выбор просто не сохранится между визитами
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (typeof budget === "number") params.set("maxPrice", String(budget));
    if (branchId) params.set("branchId", branchId);

    // Data fetching triggered by filter changes — this mirrors React's own
    // documented fetch-in-effect pattern (setting a loading flag synchronously
    // before the async request starts, per
    // https://react.dev/learn/you-might-not-need-an-effect#fetching-data).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/products?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setProducts(data.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [query, category, budget, branchId]);

  // Brand/in-stock/sort apply client-side over the fetched page — the
  // catalog is small (tens of items per store), so a second network
  // round-trip for these buys nothing.
  // Products of the open collection: an attribute section (e.g. "Сухие волосы") narrows the
  // fetched category set by product attributes, without any duplicated rows in the database.
  // Plain derivations (React Compiler memoizes them) — the list is small.
  const itemHair = activeItem?.attr?.hairType;
  const itemTag = activeItem?.tag;
  let scoped = products;
  if (itemHair) scoped = scoped.filter((p) => hairTypesOf(p).includes(itemHair));
  if (itemTag) scoped = scoped.filter((p) => p.attributes?.tags?.includes(itemTag));
  // «Акции»: товары со скидкой (акция) и товары с меткой «Хит» — одним списком, баннеры сверху отдельно.
  if (promo) scoped = scoped.filter((p) => (p.attributes?.oldPrice ?? 0) > p.price || Boolean(p.attributes?.hit));

  const distinct = (values: (string | undefined)[]) => [...new Set(values.filter(Boolean) as string[])].sort();
  const brands = distinct(scoped.map((p) => p.brand));
  const productTypes = distinct(scoped.map((p) => p.attributes?.productType));
  const volumes = distinct(scoped.map((p) => p.attributes?.volume));
  const hairTypes = HAIR_TYPE_KEYS.filter((k) => scoped.some((p) => hairTypesOf(p).includes(k)));
  const skinTypes = SKIN_TYPE_KEYS.filter((k) => scoped.some((p) => skinTypesOf(p).includes(k)));

  let visible = scoped;
  if (brand) visible = visible.filter((p) => p.brand === brand);
  if (productType) visible = visible.filter((p) => p.attributes?.productType === productType);
  if (volume) visible = visible.filter((p) => p.attributes?.volume === volume);
  if (hairType) visible = visible.filter((p) => hairTypesOf(p).includes(hairType));
  if (skinType) visible = visible.filter((p) => skinTypesOf(p).includes(skinType));
  if (onlyInStock) visible = visible.filter((p) => p.branchQuantity === undefined || (p.branchQuantity ?? 0) > 0);
  visible = [...visible].sort((x, y) => {
    if (sort === "price-asc") return x.price - y.price;
    if (sort === "price-desc") return y.price - x.price;
    return x.name.localeCompare(y.name, locale);
  });

  // The search screen opens as a grid of category tiles; anything that narrows
  // the catalog (a query, a tile, "Все продукты", the budget shortcut) swaps
  // the grid for the product list.
  const browsing = !groupParam && !showAll && !query.trim() && category === null && initialTab !== "budget";
  // A group with sections (e.g. "Уход за кожей") opens its own menu of sections
  // + "Хит продаж" before the product list.
  const groupMenu = !!activeGroup && !itemParam && !showAll && !query.trim();

  const activeFilterCount = [brand, productType, volume, hairType, skinType, onlyInStock || null, typeof budget === "number" ? budget : null, sort !== "name" ? sort : null].filter(
    Boolean
  ).length;

  function resetFilters() {
    setBrand(null);
    setProductType(null);
    setVolume(null);
    setHairType(null);
    setSkinType(null);
    setOnlyInStock(false);
    setBudget(undefined);
    setSort("name");
  }

  return (
    <main className="flex-1 px-4 pt-6 pb-32 max-w-5xl mx-auto w-full">
      <BannerGate page="catalog" />
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted" strokeWidth={2} aria-hidden />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="w-full rounded-full border border-border bg-card pl-11 pr-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
        {!browsing && !groupMenu && (
          <button
            onClick={() => setFiltersOpen(true)}
            aria-label={t("filtersAndSort")}
            className="relative shrink-0 w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center transition hover:border-accent/40 active:scale-95"
          >
            <SlidersHorizontal className="size-4.5" strokeWidth={2} aria-hidden />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
      </div>

      {!browsing && (
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-accent transition mb-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <LayoutGrid className="size-3.5" strokeWidth={2} aria-hidden />
          {tc("allCatalog")}
        </Link>
      )}
      <h1 className="font-display text-3xl mb-4">{promo ? t("promo") : activeItem && activeGroup ? labels.subLabel(activeGroup, activeItem) : activeGroup && !browsing ? labels.groupTitle(activeGroup) : t("title")}</h1>

      {branches.length > 1 && (
        <div className="mb-4 -mx-4 px-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted mb-2">
            <MapPin className="size-3.5" strokeWidth={2} aria-hidden />
            {t("branch")}
          </div>
          <div className="flex gap-2 w-max">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => handleSelectBranch(b.id)}
                className={[
                  "rounded-full px-3.5 py-2 text-sm font-medium transition whitespace-nowrap",
                  branchId === b.id ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
                ].join(" ")}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {browsing ? (
        <CategoryTiles />
      ) : groupMenu ? (
        <GroupMenu group={activeGroup!} />
      ) : (
        <>
      {promo && banners.length > 0 && (
        <div className="mb-4 flex flex-col gap-3">
          {banners.map((banner) => {
            // Баннер может быть без привязанного товара (общая акция) — мы уже на «Акции»,
            // так что просто показываем карточку без ссылки, вместо перехода в никуда/на себя.
            const cardClass =
              "tile-sheen relative overflow-hidden rounded-[22px] bg-card border border-border shadow-[var(--shadow-card)] flex items-center gap-4 p-3";
            const inner = (
              <>
                {banner.imageUrl && (
                  <div className="relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-accent-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base leading-snug truncate">{banner.title}</div>
                  {banner.subtitle && <div className="text-xs text-muted truncate mt-0.5">{banner.subtitle}</div>}
                </div>
                {banner.productId && <ChevronRight className="size-4.5 text-muted shrink-0" strokeWidth={2} aria-hidden />}
              </>
            );
            return banner.productId ? (
              <Link key={banner.id} href={`/product/${banner.productId}`} className={`${cardClass} transition active:scale-[0.99]`}>
                {inner}
              </Link>
            ) : (
              <div key={banner.id} className={cardClass}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
      <div className="mb-2 -mx-4 px-4 overflow-x-auto">
        <div className="text-xs font-medium text-muted mb-2">{activeGroup ? labels.groupTitle(activeGroup) : t("category")}</div>
        <div className="flex gap-2 w-max">
          {activeGroup ? (
            <>
              <SubChip href={`/catalog?group=${encodeURIComponent(activeGroup.name)}&item=${encodeURIComponent(ALL_ITEM)}`} label={t("all")} active={!activeItem} />
              {activeGroup.subs.map((sub) => (
                <SubChip
                  key={sub.label}
                  href={`/catalog?group=${encodeURIComponent(activeGroup.name)}&item=${encodeURIComponent(sub.label)}`}
                  label={labels.subLabel(activeGroup, sub)}
                  active={activeItem?.label === sub.label}
                />
              ))}
            </>
          ) : (
            <>
              <CategoryChip label={t("all")} active={category === null} onClick={() => setCategory(null)} />
              {CATEGORIES.map((c) => (
                <CategoryChip key={c} label={labels.category(c)} active={category === c} onClick={() => setCategory(category === c ? null : c)} />
              ))}
            </>
          )}
        </div>
      </div>

      <div className="text-sm text-muted mb-4">
        {loading ? t("searching") : t("productCount", { count: visible.length })}
      </div>

      {loading ? (
        <ProductGridSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={t("nothingFound")}
          description={t("nothingFoundHint")}
          action={
            activeFilterCount > 0 ? (
              <Button variant="secondary" onClick={resetFilters}>
                {t("resetFilters")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {visible.map((product, i) => (
            <div key={product.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
        </>
      )}

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("filtersAndSort")}
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={resetFilters}>
              {t("reset")}
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setFiltersOpen(false)}>
              {t("show", { count: visible.length })}
            </Button>
          </div>
        }
      >
        <FilterSection title={t("sort")}>
          <div className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <CategoryChip key={s} label={t(`sorts.${s}`)} active={sort === s} onClick={() => setSort(s)} />
            ))}
          </div>
        </FilterSection>

        <FilterSection title={t("priceSom")}>
          <div className="flex flex-wrap gap-2">
            <CategoryChip label={t("anyFemale")} active={budget === undefined} onClick={() => setBudget(undefined)} />
            {BUDGETS.map((b) => (
              <CategoryChip
                key={b}
                label={t("upTo", { amount: b.toLocaleString(locale) })}
                active={budget === b}
                onClick={() => setBudget(budget === b ? undefined : b)}
              />
            ))}
          </div>
        </FilterSection>

        {brands.length > 1 && (
          <FilterSection title={t("brand")}>
            <div className="flex flex-wrap gap-2">
              <CategoryChip label={t("allBrands")} active={brand === null} onClick={() => setBrand(null)} />
              {brands.map((b) => (
                <CategoryChip key={b} label={b} active={brand === b} onClick={() => setBrand(brand === b ? null : b)} />
              ))}
            </div>
          </FilterSection>
        )}

        {productTypes.length > 1 && (
          <FilterSection title={t("productType")}>
            <div className="flex flex-wrap gap-2">
              <CategoryChip label={t("all")} active={productType === null} onClick={() => setProductType(null)} />
              {productTypes.map((pt) => (
                <CategoryChip key={pt} label={pt} active={productType === pt} onClick={() => setProductType(productType === pt ? null : pt)} />
              ))}
            </div>
          </FilterSection>
        )}

        {hairTypes.length > 1 && !activeItem?.attr?.hairType && (
          <FilterSection title={t("hairType")}>
            <div className="flex flex-wrap gap-2">
              <CategoryChip label={t("anyMale")} active={hairType === null} onClick={() => setHairType(null)} />
              {hairTypes.map((k) => (
                <CategoryChip key={k} label={ta(`hairTypes.${k}`)} active={hairType === k} onClick={() => setHairType(hairType === k ? null : k)} />
              ))}
            </div>
          </FilterSection>
        )}

        {skinTypes.length > 1 && (
          <FilterSection title={t("skinType")}>
            <div className="flex flex-wrap gap-2">
              <CategoryChip label={t("anyMale")} active={skinType === null} onClick={() => setSkinType(null)} />
              {skinTypes.map((k) => (
                <CategoryChip key={k} label={ta(`skinTypes.${k}`)} active={skinType === k} onClick={() => setSkinType(skinType === k ? null : k)} />
              ))}
            </div>
          </FilterSection>
        )}

        {volumes.length > 1 && (
          <FilterSection title={t("volume")}>
            <div className="flex flex-wrap gap-2">
              <CategoryChip label={t("anyMale")} active={volume === null} onClick={() => setVolume(null)} />
              {volumes.map((v) => (
                <CategoryChip key={v} label={v} active={volume === v} onClick={() => setVolume(volume === v ? null : v)} />
              ))}
            </div>
          </FilterSection>
        )}

        <FilterSection title={t("availability")}>
          <button
            onClick={() => setOnlyInStock((v) => !v)}
            className={[
              "w-full flex items-center justify-between rounded-[var(--radius-control)] px-4 py-3.5 text-sm font-medium transition border",
              onlyInStock ? "bg-accent-soft border-accent/30 text-accent-strong" : "bg-card border-border text-foreground",
            ].join(" ")}
          >
            {t("onlyInStock")}
            <span
              className={[
                "w-11 h-6 rounded-full flex items-center px-0.5 transition-colors shrink-0",
                onlyInStock ? "bg-accent justify-end" : "bg-border-strong justify-start",
              ].join(" ")}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </span>
          </button>
        </FilterSection>
      </BottomSheet>
    </main>
  );
}

const TILE_BASE =
  "tile-sheen relative h-28 overflow-hidden rounded-[22px] p-3.5 transition active:scale-[0.98] hover:shadow-[var(--shadow-float)]";

function sheenDelay(i: number) {
  return { ["--sheen-delay" as string]: `${(i % 6) * 0.7}s` } as React.CSSProperties;
}

function CategoryTiles() {
  const t = useTranslations("catalog");
  const labels = useCatalogLabels();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Link href="/catalog?all=1" className={`${TILE_BASE} bg-accent text-white`} style={sheenDelay(0)}>
          <span className="relative text-[15px] font-semibold leading-tight">{t("allProducts")}</span>
          <ShoppingBag className="absolute -bottom-1 -right-1 size-20 text-white/25" strokeWidth={1.5} aria-hidden />
        </Link>
        {CATEGORY_GROUPS.map((group, i) => {
          const { name, icon: Icon } = group;
          return (
          <Link
            key={name}
            href={`/catalog?group=${encodeURIComponent(name)}`}
            className={`${TILE_BASE} bg-card border border-border shadow-[var(--shadow-card)]`}
            style={sheenDelay(i + 1)}
          >
            <span className="relative block max-w-[60%] text-[15px] font-semibold leading-tight">{labels.groupTitle(group)}</span>
            <span className="absolute bottom-2.5 right-2.5 flex items-center justify-center size-14 rounded-2xl bg-accent-soft text-accent">
              <Icon className="size-8" strokeWidth={1.6} aria-hidden />
            </span>
          </Link>
          );
        })}
      </div>
      <Link
        href="/catalog?promo=1"
        className="tile-sheen relative overflow-hidden rounded-[22px] bg-gradient-to-r from-accent to-accent-strong text-white px-5 py-5 flex items-center justify-between transition active:scale-[0.99]"
      >
        <div className="relative">
          <div className="font-display text-2xl leading-none">{t("promo")}</div>
          <div className="text-sm text-white/85 mt-1.5">{t("promoHint")}</div>
        </div>
        <Percent className="relative size-12 text-white/30 shrink-0" strokeWidth={1.75} aria-hidden />
      </Link>
    </div>
  );
}

// Second level: the list of sub-categories of a main category (e.g. "Уход за лицом" → Умывание, Кремы…) and "Хиты".
function GroupMenu({ group }: { group: CategoryGroup }) {
  const t = useTranslations("catalog");
  const labels = useCatalogLabels();
  const [hits, setHits] = useState<Product[]>([]);
  const filter = groupCategoryFilter(group);
  const base = `/catalog?group=${encodeURIComponent(group.name)}`;

  useEffect(() => {
    fetch(`/api/products/bestsellers?category=${encodeURIComponent(filter)}`)
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: Product[] }) => setHits(data.products ?? []))
      .catch(() => setHits([]));
  }, [filter]);

  const rows = [
    { label: t("allProducts"), href: `${base}&item=${encodeURIComponent(ALL_ITEM)}` },
    ...group.subs.map((i) => ({ label: labels.subLabel(group, i), href: `${base}&item=${encodeURIComponent(i.label)}` })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card rounded-[28px] px-5 py-1 shadow-[var(--shadow-card)]">
        {rows.map((r) => (
          <Link
            key={r.label}
            href={r.href}
            className="flex items-center justify-between gap-3 py-4 text-[17px] border-b border-border last:border-b-0 transition active:opacity-60"
          >
            {r.label}
            <ChevronRight className="size-5 text-foreground shrink-0" strokeWidth={2} aria-hidden />
          </Link>
        ))}
      </div>

      {hits.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">{t("hits")}</h2>
            <Link
              href={`${base}&item=${encodeURIComponent(ALL_ITEM)}`}
              className="flex items-center gap-1 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium"
            >
              {t("all")} <ChevronRight className="size-4" strokeWidth={2} aria-hidden />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 scroll-pl-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {hits.map((product) => (
              <div key={product.id} className="w-44 shrink-0 snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SubChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={[
        "rounded-full px-3.5 py-2 text-sm font-medium transition whitespace-nowrap",
        active ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3.5 py-2 text-sm font-medium transition whitespace-nowrap",
        active ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="text-sm font-medium mb-2.5">{title}</div>
      {children}
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogContent />
    </Suspense>
  );
}
